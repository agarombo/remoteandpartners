import { u } from "../content.js";
import { byId, show, toggle } from "../core/dom.js";
import { createTasks } from "../core/tasks.js";
import { originHTML } from "./origin-view.js";

export function createFeature(app) {
  const panel = byId("panel"),
    tasks = createTasks(),
    { isles, links } = app.scene;
  const order = [...isles].sort(
    (a, b) => Math.abs(a.wx) + Math.abs(a.wy) - Math.abs(b.wx) - Math.abs(b.wy),
  );
  const counts = [1, 3, 7, 11, isles.length];
  let step = 0;
  function stats() {
    const box = byId("oStats");
    if (!box) return;
    const nodes = isles.filter((i) => i.g.classList.contains("built")).length;
    const connected = links.filter((l) =>
      l.el.classList.contains("built"),
    ).length;
    box.innerHTML = [
      [nodes, "oNodes"],
      [connected, "oConn"],
      [Math.min(5, Math.max(1, Math.ceil(nodes / 3))), "oDisc"],
    ]
      .map(
        ([n, key]) =>
          `<div><span class="n">${String(n).padStart(2, "0")}</span><span class="l">${u(key)}</span></div>`,
      )
      .join("");
  }
  function connect() {
    for (const link of links)
      toggle(
        link.el,
        "built",
        link.a.g.classList.contains("built") &&
          link.b.g.classList.contains("built"),
      );
    stats();
  }
  function render() {
    panel.style.setProperty("--accent", "var(--magenta-3)");
    panel.innerHTML = originHTML(step, isles.length);
    stats();
    show(panel, true);
    byId("ro").textContent = u("oSector")[step];
    app.camera.fit("#islands .isl");
    app.request();
  }
  function select(next) {
    if (next < 0 || next > 4) return;
    const backward = next < step;
    step = next;
    tasks.reset();
    toggle(document.body, "wiremode", step === 3);
    if (step === 0) {
      for (const isle of isles) isle.g.classList.add("built");
      for (const link of links) link.el.classList.add("built");
      links.forEach((link, i) =>
        tasks.after(300 + i * 38, () => {
          link.el.classList.remove("built");
          stats();
        }),
      );
      [...order]
        .reverse()
        .slice(0, -1)
        .forEach((isle, i) =>
          tasks.after(1150 + i * 120, () => {
            isle.g.classList.remove("built");
            stats();
            if (i % 3 === 0) app.sound.pick(i % 5);
          }),
        );
    } else {
      order.forEach((isle, i) => {
        if (i >= counts[step]) isle.g.classList.remove("built");
        else if (!isle.g.classList.contains("built"))
          tasks.after(
            backward ? 0 : 120 + (i - Math.max(0, counts[step] - 6)) * 220,
            () => {
              isle.g.classList.add("built");
              connect();
              app.sound.pick(i % 5);
            },
          );
      });
      connect();
    }
    render();
    app.sound.tick();
  }
  return {
    open() {
      step = 0;
      document.body.classList.add("originmode");
      app.camera.go(app.camera.home(), 700);
      select(0);
    },
    render,
    resize() {
      if (app.camera.mobile()) app.camera.fit("#islands .isl");
      else app.camera.go(app.camera.home(), 450);
    },
    key(direction) {
      select(step + direction);
    },
    click(target) {
      if (target.closest("#oNext")) select(step + 1);
      else if (target.closest("#oPrev")) select(step - 1);
      else if (target.closest("#oGo")) app.navigate("network");
      else if (target.closest(".back")) app.navigate("city");
    },
    close() {
      tasks.reset();
      document.body.classList.remove("originmode", "wiremode");
      for (const isle of isles) isle.g.classList.remove("built");
      for (const link of links) link.el.classList.remove("built", "hot");
    },
  };
}
