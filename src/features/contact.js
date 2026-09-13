import { MAIL, u } from "../content.js";
import {
  byId,
  svgElement,
  setAttribute,
  setText,
  toggle,
  show,
} from "../core/dom.js";
import { createTasks } from "../core/tasks.js";
import { mountNode } from "./contact-node.js";
import { contactHTML, sentHTML } from "./contact-view.js";

export function createFeature(app) {
  const tasks = createTasks(),
    panel = byId("panel"),
    pulse = byId("pulses"),
    node = byId("usernode");
  const draft = { fName: "", fCompany: "", fEmail: "", fProject: "" },
    wants = new Set();
  let dots = [],
    started = 0,
    id;
  function labels() {
    const phase = app.state.contact,
      ready = ["linked", "form", "sent"].includes(phase);
    setText(
      byId("connLabel"),
      u(
        phase === "running"
          ? "establishing"
          : ready
            ? "startProject"
            : "connect",
      ),
    );
    setText(byId("connSub"), u(ready ? "nodeReady" : "channel"));
    setText(
      byId("connShort"),
      u(phase === "running" ? "cShortRun" : ready ? "cShortGo" : "cShort"),
    );
    toggle(byId("connect"), "live", phase !== "idle");
    toggle(byId("connect"), "busy", phase === "running");
  }
  function save() {
    for (const key of Object.keys(draft))
      if (byId(key)) draft[key] = byId(key).value;
  }
  function href() {
    const body = [
      ...["fName", "fCompany", "fEmail"].map(
        (key) => u(key) + ": " + draft[key].trim(),
      ),
      u("fNeed") + ": " + ([...wants].join(", ") || "—"),
      "",
      u("fProject") + ":",
      draft.fProject.trim(),
    ].join("\n");
    return (
      "mailto:" +
      MAIL +
      "?subject=" +
      encodeURIComponent("NEW CONNECTION · EXTERNAL NODE") +
      "&body=" +
      encodeURIComponent(body)
    );
  }
  function render() {
    labels();
    if (!["form", "sent"].includes(app.state.contact)) return;
    save();
    panel.classList.add("form");
    panel.style.setProperty("--accent", "var(--coral-3)");
    panel.innerHTML =
      app.state.contact === "sent"
        ? sentHTML(id)
        : contactHTML([...wants], href());
    for (const key of Object.keys(draft))
      if (byId(key)) byId(key).value = draft[key];
    show(panel, true);
    app.request();
  }
  function carry(on) {
    toggle(byId("islands"), "recede", on);
    for (const link of app.scene.links) toggle(link.el, "carrying", on);
  }
  function linked() {
    if (app.state.contact !== "running") return;
    tasks.reset();
    dots = [];
    pulse.replaceChildren();
    carry(false);
    app.state.contact = "linked";
    labels();
    node.classList.add("on");
    const shock = byId("shock");
    shock.classList.remove("go");
    void shock.getBoundingClientRect();
    shock.classList.add("go");
    app.sound.linked();
    app.request();
    tasks.after(420, () => {
      app.state.contact = "form";
      render();
    });
  }
  return {
    open() {
      mountNode(node);
      app.state.contact = "running";
      labels();
      carry(true);
      app.camera.go(
        { ...app.camera.home(), k: app.camera.home().k * 0.92 },
        900,
      );
      app.sound.connect();
      started = performance.now();
      dots = app.scene.links.map((link) => {
        const outer =
          Math.abs(link.a.wx) + Math.abs(link.a.wy) >
          Math.abs(link.b.wx) + Math.abs(link.b.wy);
        const from = outer ? link.a : link.b,
          to = outer ? link.b : link.a,
          distance = Math.hypot(from.wx - to.wx, from.wy - to.wy);
        const element = svgElement("circle", {
          class: "pulse",
          r: 3.4,
          cx: from.wx,
          cy: from.wy,
        });
        pulse.append(element);
        return {
          element,
          from,
          to,
          delay: Math.max(0, 520 - distance * 0.45),
          duration: 420 + distance * 0.5,
        };
      });
      tasks.after(app.state.reduced ? 0 : 2600, linked);
      app.request();
    },
    render,
    tick(now) {
      if (!dots.length) return false;
      let live = false;
      for (const dot of dots) {
        const t = (now - started - dot.delay) / dot.duration;
        if (t < 1) live = true;
        if (t < 0 || t >= 1) {
          setAttribute(dot.element, "opacity", 0);
          continue;
        }
        const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        setAttribute(
          dot.element,
          "cx",
          (dot.from.wx + (dot.to.wx - dot.from.wx) * ease).toFixed(1),
        );
        setAttribute(
          dot.element,
          "cy",
          (dot.from.wy + (dot.to.wy - dot.from.wy) * ease).toFixed(1),
        );
        setAttribute(
          dot.element,
          "opacity",
          Math.min(1, t * 6) * Math.min(1, (1 - t) * 4),
        );
      }
      if (!live) linked();
      return live;
    },
    input() {
      save();
      if (byId("fSend")) byId("fSend").href = href();
    },
    click(target) {
      const chip = target.closest("[data-w]");
      if (chip) {
        const want = chip.dataset.w;
        wants.has(want) ? wants.delete(want) : wants.add(want);
        setAttribute(chip, "aria-pressed", wants.has(want));
        save();
        byId("fSend").href = href();
        app.sound.tick();
      } else if (target.closest("#fSend"))
        tasks.after(120, () => {
          save();
          id =
            "EXT-" +
            String(40 + Math.floor(Math.random() * 60)).padStart(4, "0");
          app.state.contact = "sent";
          render();
          app.sound.linked();
        });
      else if (target.closest(".back")) app.navigate("city");
    },
    close() {
      save();
      tasks.reset();
      dots = [];
      pulse.replaceChildren();
      node.classList.remove("on");
      carry(false);
      app.state.contact = "idle";
      labels();
      panel.classList.remove("form");
    },
  };
}
