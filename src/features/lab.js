import { LANG, SHEETS, u } from "../content.js";
import { PB } from "../geometry/building.js";
import { ftin } from "../geometry/primitives.js";
import {
  projBim,
  projCut,
  projNotes,
  QS,
  QF,
  planMatrix,
  isoMatrix,
} from "../geometry/drawings.js";
import {
  byId,
  svgElement,
  setAttribute,
  setText,
  toggle,
  show,
  block,
} from "../core/dom.js";
import { createTasks } from "../core/tasks.js";

export function createFeature(app) {
  const lab = byId("lab"),
    controls = byId("labCtrl"),
    tasks = createTasks(),
    sheets = new Map();
  const isle = app.scene.byId("services"),
    cut = isle.g.querySelector(".proj-cut"),
    bim = isle.g.querySelector(".proj-bim");
  let mode,
    sheet = 0,
    flat = false,
    discipline = {},
    layers,
    controlsLanguage;
  function fit(duration = 950) {
    if (!app.camera.mobile()) return;
    if (mode === "autocad") {
      const plan = cut.querySelector(".plan-g");
      const matrix = (flat ? planMatrix() : isoMatrix())
        .slice(7, -1)
        .split(",")
        .map(Number);
      // Measure the destination, not an intermediate CSS animation frame.
      app.camera.fit(
        ".isl.focus .plan-g, .isl.focus .cut-3d, .isl.focus .notes-" +
          (flat ? "flat" : "iso"),
        duration,
        new Map([[plan, matrix]]),
      );
    } else app.camera.fit(".isl.focus .proj-bim", duration);
  }
  function setFlat(on) {
    if (mode !== "autocad") return;
    flat = on;
    toggle(isle.g, "flat", on);
    if (on && cut.parentNode.lastElementChild !== cut)
      cut.parentNode.append(cut);
    const plan = cut.querySelector(".plan-g");
    if (plan) plan.style.transform = on ? planMatrix() : isoMatrix();
    setText(byId("labFlip"), on ? u("toIso") : u("toFlat"));
    if (app.camera.mobile()) fit();
    else
      app.camera.go(
        on
          ? { k: app.camera.zoom(3.3), x: isle.wx, y: isle.wy - 55 }
          : app.camera.lab(isle, mode),
        950,
      );
  }
  function render() {
    setText(byId("labClose"), u("labBack"));
    if (mode === "autocad") {
      const drawing = SHEETS[sheet],
        key = LANG + ":" + drawing.id;
      const accent =
        drawing.hue === "ink" ? "var(--ink)" : `var(--${drawing.hue}-3)`;
      lab.style.setProperty("--accent", accent);
      isle.g.style.setProperty("--accent", accent);
      if (!sheets.has(key)) {
        const view = svgElement("g");
        view.innerHTML =
          projCut(drawing.id) +
          '<g class="notes-iso">' +
          projNotes(sheet) +
          '</g><g class="notes-flat">' +
          projNotes(sheet, (x, y) => [x * QS, y * QS + QF]) +
          "</g>";
        sheets.set(key, view);
      }
      const view = sheets.get(key);
      // Configure a cached drawing before mounting it so it never flashes in
      // its old projection when another sheet is selected mid-animation.
      view.querySelector(".plan-g").style.transform = flat
        ? planMatrix()
        : isoMatrix();
      if (cut.firstElementChild !== view) cut.replaceChildren(view);
      setText(byId("labTitle"), u("sheets")[sheet][1]);
      setText(
        byId("labEyebrow"),
        `SERVICES · AUTOCAD · ${u("level")} 0${PB.cut}`,
      );
      byId("labBlock").innerHTML = block([
        [u("sheet"), drawing.code],
        [u("scale"), '1/4" = 1\'-0"'],
        [u("cut"), "+" + ftin(PB.cut * PB.lh)],
      ]);
      if (controlsLanguage !== LANG) {
        controls.innerHTML =
          '<div class="sheets"><ol>' +
          SHEETS.map(
            (_, i) =>
              `<li data-i="${i}" role="button" tabindex="0"><b></b>${u("sheets")[i][0]}</li>`,
          ).join("") +
          `</ol><button class="lab-btn" id="labFlip" type="button"></button><button class="lab-btn" id="labDet" type="button">${u("openDet")}</button><button class="lab-btn go" id="labNext" type="button">${u("next")}</button></div>`;
      }
      for (const item of controls.querySelectorAll("[data-i]"))
        setAttribute(item, "aria-current", +item.dataset.i === sheet);
      setText(byId("labFlip"), flat ? u("toIso") : u("toFlat"));
    } else {
      lab.style.setProperty("--accent", "var(--purple-3)");
      setText(byId("labTitle"), u("federated"));
      setText(
        byId("labEyebrow"),
        `SERVICES · REVIT · ${Object.values(discipline).filter(Boolean).length} ${u("discActive")}`,
      );
      if (controlsLanguage !== LANG) {
        byId("labBlock").innerHTML = block([
          [u("model"), "RVT-01"],
          [u("levels"), PB.lv + " " + u("roof")],
          [u("lod"), "LOD 350"],
        ]);
        controls.innerHTML =
          '<div class="discs">' +
          ["arc", "str", "mep"]
            .map(
              (key, i) =>
                `<button type="button" data-k="${key}" style="--c:var(--${["purple", "blue", "magenta"][i]}-3)"><u></u>${u("disc")[i]}</button>`,
            )
            .join("") +
          `</div><button class="lab-btn go" id="labDoc" type="button">${u("viewDoc")}</button>`;
      }
      for (const key of Object.keys(discipline)) {
        for (const layer of layers[key])
          toggle(layer, "lay-off", !discipline[key]);
        setAttribute(
          controls.querySelector(`[data-k="${key}"]`),
          "aria-pressed",
          discipline[key],
        );
      }
      toggle(bim, "xray", discipline.arc && (discipline.str || discipline.mep));
    }
    controlsLanguage = LANG;
    app.request();
  }
  function select(index) {
    const next = ((index % SHEETS.length) + SHEETS.length) % SHEETS.length;
    if (next === sheet) return;
    sheet = next;
    app.sound.tick();
    render();
    // All four sheets use the same drawing envelope. Keep the camera still
    // when changing sheets; only explicit projection changes move it.
  }
  return {
    open(options) {
      mode = options.mode === "revit" ? "revit" : "autocad";
      sheet = 0;
      flat = false;
      controlsLanguage = null;
      discipline = { arc: true, str: true, mep: true };
      app.scene.select("services");
      if (mode === "revit" && !layers) {
        bim.innerHTML = projBim();
        layers = Object.fromEntries(
          Object.keys(discipline).map((key) => [
            key,
            [...bim.querySelectorAll(".lay-" + key)],
          ]),
        );
      }
      isle.g.classList.remove("flat");
      toggle(isle.g, "mode-cut", mode === "autocad");
      toggle(isle.g, "mode-bim", mode === "revit");
      render();
      show(lab, true, "on");
      if (app.camera.mobile()) fit(1200);
      else app.camera.go(app.camera.lab(isle, mode), 1200);
      app.sound.pick(mode === "autocad" ? 1 : 3);
      if (mode === "autocad") tasks.after(1500, () => setFlat(true));
    },
    render,
    select,
    setFlat,
    resize() {
      fit();
    },
    key(direction) {
      if (mode === "autocad") select(sheet + direction);
    },
    click(target) {
      const button = target.closest("button, [data-i]");
      if (!button) return;
      if (button.dataset.i !== undefined) select(+button.dataset.i);
      else if (button.dataset.k) {
        discipline[button.dataset.k] = !discipline[button.dataset.k];
        app.sound.tick();
        render();
      } else if (button.id === "labFlip") {
        tasks.reset();
        setFlat(!flat);
      } else if (button.id === "labNext") select(sheet + 1);
      else if (button.id === "labDet") app.openDetail("wall");
      else if (button.id === "labDoc") app.navigate("lab", { mode: "autocad" });
      else if (button.id === "labClose") app.navigate("services");
    },
    close() {
      tasks.reset();
      show(lab, false, "on");
      isle.g.classList.remove("mode-cut", "mode-bim", "flat");
      mode = null;
    },
  };
}
