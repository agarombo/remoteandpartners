import { DISTRICTS, dx } from "../content.js";
import { NB, nbVoidLv } from "../geometry/building.js";
import { P } from "../geometry/primitives.js";
import { byId, show, toggle } from "../core/dom.js";
import { createTasks } from "../core/tasks.js";
import { personHTML, districtHTML } from "./network-view.js";

export function createFeature(app) {
  const panel = byId("panel"),
    tasks = createTasks();
  let isle,
    person = null;
  const seats = () => isle.g.querySelectorAll(".seat, .seat-tag");
  function render() {
    panel.classList.remove("form");
    toggle(panel, "person", person !== null);
    const data = DISTRICTS.find((d) => d.id === isle.id);
    panel.style.setProperty(
      "--accent",
      `var(--${person === null ? isle.hue : data.people[person].hue}-3)`,
    );
    panel.innerHTML = person === null ? districtHTML(isle) : personHTML(person);
    show(panel, true);
    app.request();
  }
  function focusPerson() {
    const slot = NB.vols.find((v) => v.pi === person),
      rotated = slot.side === "x";
    const x = rotated
      ? NB.x + slot.x + slot.w - NB.vd * 0.5
      : NB.x + slot.x + slot.vx + NB.vw * 0.5;
    const y = rotated
      ? NB.y + slot.y + slot.vx + NB.vw * 0.5
      : NB.y + slot.y + slot.d - NB.vd * 0.5;
    const [px, py] = P(x, y, nbVoidLv(slot) * NB.lh + 0.5);
    app.camera.go({
      k: app.camera.zoom(1.9),
      x: isle.wx + (px + 18) * 0.5,
      y: isle.wy + py * 0.5,
    });
  }
  function select(index) {
    const count = isle.people.length;
    person = ((index % count) + count) % count;
    app.state.person = person;
    tasks.reset();
    toggle(isle.g, "mode-seat", true);
    for (const node of seats()) toggle(node, "on", +node.dataset.i === person);
    app.sound.pick(person);
    focusPerson();
    render();
  }
  return {
    open({ view, person: requestedPerson }) {
      isle = app.scene.byId(view === "services" ? "services" : "team");
      person = null;
      app.state.person = null;
      app.scene.select(isle.id);
      byId("ro").textContent =
        `${dx(isle, "label")} · SECTOR ${String(isle.i + 1).padStart(2, "0")}`;
      app.camera.go(app.camera.island(isle), 1250);
      app.sound.land(isle.i);
      render();
      if (view === "network") {
        if (Number.isInteger(requestedPerson)) select(requestedPerson);
        else tasks.after(1300, () => select(0));
      }
    },
    render,
    resize() {
      if (person === null) app.camera.go(app.camera.island(isle), 450);
      else focusPerson();
    },
    click(target) {
      const profile = target.closest("[data-p], .seat, .seat-tag");
      if (profile) {
        select(+(profile.dataset.p ?? profile.dataset.i));
        return;
      }
      if (target.closest(".back")) {
        if (person === null) app.navigate("city");
        else {
          person = null;
          app.state.person = null;
          isle.g.classList.remove("mode-seat");
          for (const node of seats()) node.classList.remove("on");
          app.camera.go(app.camera.island(isle));
          render();
        }
      }
    },
    key(direction) {
      if (person !== null) select(person + direction);
    },
    close() {
      tasks.reset();
      if (isle) {
        isle.g.classList.remove("mode-seat");
        for (const node of seats()) node.classList.remove("on");
      }
      person = null;
      app.state.person = null;
      panel.classList.remove("person");
    },
  };
}
