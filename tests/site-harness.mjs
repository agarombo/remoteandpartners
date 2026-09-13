import { readFileSync } from "node:fs";
import { SourceTextModule } from "node:vm";
import { setImmediate } from "node:timers/promises";
import { dirname, resolve } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

// A deterministic DOM/timer harness, not a browser rendering benchmark.
// SVG measurement stubs exercise mobile/capture control flow only.
export async function loadSite({
  original,
  reduced = false,
  width = 1440,
  query = "",
} = {}) {
  const html = readFileSync(original || resolve("dist/index.html"), "utf8");
  const entry = html.match(/<script[^>]+src="([^"]+)"/);
  const code = original
    ? html.match(/<script>([\s\S]*?)<\/script>/)[1]
    : readFileSync(resolve("dist", entry[1]), "utf8");
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  const dom = new JSDOM(html.replace(/<style>[\s\S]*?<\/style>/g, ""), {
    url: "https://remoteandpartners.test/" + query,
    runScripts: "outside-only",
    virtualConsole,
  });
  const { window } = dom;
  let now = 0,
    nextId = 1,
    hidden = false;
  const frames = new Map(),
    timers = new Map();
  Object.defineProperties(window, {
    innerWidth: { value: width, writable: true },
    innerHeight: { value: 1000, writable: true },
  });
  Object.defineProperty(window.performance, "now", { value: () => now });
  Object.defineProperty(window.document, "hidden", { get: () => hidden });
  const preference = new window.EventTarget();
  preference.matches = reduced;
  window.matchMedia = () => preference;
  window.requestAnimationFrame = (callback) => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  window.setTimeout = (callback, delay = 0) => {
    const id = nextId++;
    timers.set(id, { callback, at: now + delay });
    return id;
  };
  window.clearTimeout = (id) => timers.delete(id);
  window.SVGElement.prototype.getBBox = () => ({
    x: -500,
    y: -300,
    width: 1000,
    height: 600,
  });
  const matrix = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0,
    inverse() {
      return this;
    },
    multiply() {
      return this;
    },
  };
  window.SVGElement.prototype.getScreenCTM = () => matrix;
  window.Element.prototype.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 80,
    width,
    height: 1000,
  });
  let writes = 0;
  const originalSet = window.Element.prototype.setAttribute;
  window.Element.prototype.setAttribute = function (...args) {
    writes++;
    return originalSet.apply(this, args);
  };
  // Execute the production ESM graph, including lazy chunks, in the DOM context.
  const modules = new Map(),
    evaluations = new Map();
  const context = dom.getInternalVMContext();
  const linker = (specifier, parent) =>
    getModule(resolve(dirname(parent.identifier), specifier));
  function getModule(path) {
    if (!modules.has(path))
      modules.set(
        path,
        new SourceTextModule(readFileSync(path, "utf8"), {
          context,
          identifier: path,
          initializeImportMeta(meta) {
            meta.url = new URL(
              path.slice(resolve("dist").length + 1),
              window.location.href,
            ).href;
          },
          async importModuleDynamically(specifier, parent) {
            const module = linker(specifier, parent);
            if (!evaluations.has(module))
              evaluations.set(
                module,
                (async () => {
                  if (module.status === "unlinked") await module.link(linker);
                  if (module.status === "linked") await module.evaluate();
                })(),
              );
            await evaluations.get(module);
            return module;
          },
        }),
      );
    return modules.get(path);
  }
  if (original) window.eval(code);
  else {
    const module = getModule(resolve("dist", entry[1]));
    await module.link(linker);
    await module.evaluate();
  }
  // Vite preloads dependent CSS before resolving import(). Simulate successful
  // local stylesheet loads; real network failures are covered by browser tests.
  async function flush() {
    for (let i = 0; i < 8; i++) {
      for (const link of window.document.querySelectorAll(
        'link[rel="stylesheet"]',
      )) {
        if (!link.dataset.loaded) {
          link.dataset.loaded = "true";
          link.dispatchEvent(new window.Event("load"));
        }
      }
      await setImmediate();
    }
  }
  await flush();

  async function advance(duration, hz = 60) {
    await flush();
    const until = now + duration;
    while (now < until) {
      now = Math.min(until, now + 1000 / hz);
      let due;
      while (
        (due = [...timers.entries()]
          .sort((a, b) => a[1].at - b[1].at)
          .find(([, timer]) => timer.at <= now))
      ) {
        timers.delete(due[0]);
        due[1].callback();
      }
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(now));
    }
    await flush();
    if (errors.length) throw new AggregateError(errors, "Site runtime errors");
  }
  const find = (selector) => {
    const element = window.document.querySelector(selector);
    if (!element) throw new Error("Missing element: " + selector);
    return element;
  };
  return {
    window,
    document: window.document,
    advance,
    find,
    errors,
    async click(selector) {
      find(selector).dispatchEvent(
        new window.MouseEvent("click", { bubbles: true }),
      );
      await advance(1);
    },
    async key(key, selector) {
      (selector ? find(selector) : window).dispatchEvent(
        new window.KeyboardEvent("keydown", { key, bubbles: true }),
      );
      await advance(1);
    },
    get writes() {
      return writes;
    },
    resetWrites() {
      writes = 0;
    },
    get pendingFrames() {
      return frames.size;
    },
    setHidden(value) {
      hidden = value;
      window.document.dispatchEvent(new window.Event("visibilitychange"));
    },
    setReduced(value) {
      preference.matches = value;
      const event = new window.Event("change");
      event.matches = value;
      preference.dispatchEvent(event);
    },
    close() {
      window.close();
    },
  };
}
