import { u, dx } from "../content.js";
import { byId, show, toggle, setAttribute } from "../core/dom.js";
import { createTasks } from "../core/tasks.js";
import {
  MAPY,
  WSTATES,
  GRID,
  TYPES,
  mapSVG,
  typologySVG,
} from "./territory-geometry.js";
import { territoryHTML } from "./territory-view.js";

export function createFeature(app) {
  const panel = byId("panel"),
    map = byId("usmap"),
    typo = byId("typo"),
    tasks = createTasks();
  const state = { mode: "territory", sel: null };
  for (const node of [map, typo])
    setAttribute(node, "transform", `translate(0,${MAPY})`);
  function mount() {
    if (!map.hasChildNodes()) map.innerHTML = mapSVG();
    if (state.mode === "typology" && !typo.hasChildNodes())
      typo.innerHTML = typologySVG();
    toggle(map, "hide", state.mode !== "territory");
    toggle(typo, "hide", state.mode !== "typology");
  }
  function fit() {
    app.camera.fit(state.mode === "territory" ? "#usmap .st" : "#typo .ty");
  }
  function render() {
    if (!app.state.arrived) return;
    panel.style.setProperty("--accent", "var(--blue-3)");
    panel.innerHTML = territoryHTML(state);
    show(panel, true);
    fit();
    app.request();
  }
  function setMode(mode) {
    state.mode = mode;
    state.sel = null;
    mount();
    for (const node of [
      ...map.querySelectorAll(".st"),
      ...typo.querySelectorAll(".ty"),
    ])
      node.classList.remove("sel");
    app.sound.tick();
    render();
  }
  return {
    open() {
      tasks.reset();
      state.sel = null;
      app.state.arrived = false;
      mount();
      const label = dx(app.scene.byId("work"), "label");
      byId("ro").textContent = label + " · " + u("extTerr");
      app.status(label, u("extTerr"));
      app.sound.connect();
      app.camera.go({ k: 0.15, x: 0, y: 0 }, 1500);
      tasks.after(1600, () => {
        app.status(u("leaving"), "...");
        document.body.classList.add("mapmode");
        app.camera.go({ k: 0.13, x: 0, y: MAPY * 0.5 }, 1500);
      });
      tasks.after(3200, () => {
        app.status(u("detected"), "");
        app.sound.linked();
        app.camera.go(
          { k: app.camera.mobile() ? 0.92 : 1.25, x: 0, y: MAPY },
          1600,
        );
      });
      tasks.after(4900, () => {
        app.status();
        app.state.arrived = true;
        render();
      });
    },
    render,
    setMode,
    resize: fit,
    click(target) {
      const mode = target.closest("[data-m]");
      if (mode) {
        setMode(mode.dataset.m);
        return;
      }
      if (target.closest(".back")) {
        app.navigate("city");
        return;
      }
      const node = target.closest(".st.on, .ty");
      if (!node || !app.state.arrived) return;
      if (node.dataset.s && !WSTATES[node.dataset.s]) return;
      state.sel = node.dataset.s || node.dataset.t;
      const nodes = node.dataset.s
        ? map.querySelectorAll(".st")
        : typo.querySelectorAll(".ty");
      for (const item of nodes) toggle(item, "sel", item === node);
      app.sound.pick(
        node.dataset.s
          ? GRID.findIndex((g) => g[0] === state.sel) % 5
          : TYPES.findIndex((t) => t[0] === state.sel),
      );
      render();
    },
    close() {
      tasks.reset();
      app.state.arrived = false;
      app.status();
    },
  };
}
