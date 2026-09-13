import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

// A deterministic DOM/timer harness, not a browser rendering benchmark.
// SVG measurement stubs exercise mobile/capture control flow only.
export function loadSite({ original, reduced = false, width = 1440, query = '' } = {}) {
  const html = readFileSync(original || resolve('dist/index.html'), 'utf8');
  const entry = html.match(/<script[^>]+src="([^"]+)"/);
  const code = original
    ? html.match(/<script>([\s\S]*?)<\/script>/)[1]
    : readFileSync(resolve('dist', entry[1]), 'utf8');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html.replace(/<style>[\s\S]*?<\/style>/g, ''), {
    url: 'https://remoteandpartners.test/' + query,
    runScripts: 'outside-only', virtualConsole,
  });
  const { window } = dom;
  let now = 0, nextId = 1, hidden = false;
  const frames = new Map(), timers = new Map();
  Object.defineProperties(window, {
    innerWidth: { value: width, writable: true },
    innerHeight: { value: 1000, writable: true },
  });
  Object.defineProperty(window.performance, 'now', { value: () => now });
  Object.defineProperty(window.document, 'hidden', { get: () => hidden });
  const preference = new window.EventTarget();
  preference.matches = reduced;
  window.matchMedia = () => preference;
  window.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.setTimeout = (callback, delay = 0) => {
    const id = nextId++; timers.set(id, { callback, at: now + delay }); return id;
  };
  window.clearTimeout = id => timers.delete(id);
  window.SVGElement.prototype.getBBox = () => ({ x: -500, y: -300, width: 1000, height: 600 });
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; }, multiply() { return this; } };
  window.SVGElement.prototype.getScreenCTM = () => matrix;
  window.Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, bottom: 80, width, height: 1000 });
  let writes = 0;
  const originalSet = window.Element.prototype.setAttribute;
  window.Element.prototype.setAttribute = function (...args) {
    writes++;
    return originalSet.apply(this, args);
  };
  // JSDOM has no module loader; supply only the module's actual URL. All
  // application code and Vite's bundled dependency/asset resolution still run.
  const moduleUrl = new URL(entry?.[1] || 'index.html', window.location.href).href;
  window.eval(code.replaceAll('import.meta.url', JSON.stringify(moduleUrl)));

  function advance(duration, hz = 60) {
    const until = now + duration;
    while (now < until) {
      now = Math.min(until, now + 1000 / hz);
      let due;
      while ((due = [...timers.entries()].sort((a,b) => a[1].at-b[1].at).find(([, timer]) => timer.at <= now))) {
        timers.delete(due[0]); due[1].callback();
      }
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach(callback => callback(now));
    }
    if (errors.length) throw new AggregateError(errors, 'Site runtime errors');
  }
  const find = selector => {
    const element = window.document.querySelector(selector);
    if (!element) throw new Error('Missing element: ' + selector);
    return element;
  };
  return {
    window, document: window.document, advance, find, errors,
    click(selector) { find(selector).dispatchEvent(new window.MouseEvent('click', { bubbles: true })); advance(1); },
    key(key, selector) { (selector ? find(selector) : window).dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true })); advance(1); },
    get writes() { return writes; }, resetWrites() { writes = 0; },
    get pendingFrames() { return frames.size; },
    setHidden(value) { hidden = value; window.document.dispatchEvent(new window.Event('visibilitychange')); },
    setReduced(value) {
      preference.matches = value;
      const event = new window.Event('change');
      event.matches = value; preference.dispatchEvent(event);
    },
    close() { window.close(); },
  };
}
