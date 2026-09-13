import { byId } from "../core/dom.js";

// Loaded only by a capture URL. Regular visitors never download this path.
export async function capture(app) {
  const params = new URLSearchParams(location.search),
    key = params.get("shot");
  const plans = {
    city: {
      look: params.get("look") || "bw",
      selector: "#islands .isl",
      padding: 0.8,
      wait: 500,
    },
    plan: {
      look: "bw",
      selector: "#islands .isl.focus",
      padding: 0.76,
      wait: 3000,
      view: "lab",
      mode: "autocad",
    },
    flat: {
      look: "bw",
      selector: ".plan-g",
      padding: 0.9,
      wait: 3400,
      view: "lab",
      mode: "autocad",
    },
    bim: {
      look: "bw",
      selector: "#islands .isl.focus",
      padding: 0.76,
      wait: 3000,
      view: "lab",
      mode: "revit",
    },
    typo: {
      look: "light",
      selector: "#typo .ty",
      padding: 0.92,
      wait: 6000,
      view: "territory",
    },
    map: {
      look: "light",
      selector: "#usmap .st-cell",
      padding: 0.9,
      wait: 6000,
      view: "territory",
    },
    rings: { look: "bw", selector: "#islands .isl", padding: 0.8, wait: 500 },
  };
  const plan = plans[key];
  if (!plan) return;
  app.state.capture = true;
  document.documentElement.classList.add("shot");
  app.sound.mute();
  app.setLook(plan.look);
  byId("cameraLayer").style.opacity = 1;
  if (plan.view) {
    const feature = await app.navigate(plan.view, { mode: plan.mode });
    if (key === "flat") {
      const sheet = Number(params.get("sheet") || 0);
      feature.select(Number.isFinite(sheet) ? Math.trunc(sheet) : 0);
      feature.setFlat(true);
    }
    if (key === "typo") feature.setMode("typology");
  }
  if (key === "rings") {
    const shock = byId("shock");
    shock.classList.add("go", "frozen");
    [...shock.querySelectorAll(".shockring")].forEach((ring, i) => {
      ring.style.animation = "none";
      ring.style.transform = `scale(${[9, 15, 22][i]})`;
      ring.style.opacity = [0.85, 0.5, 0.24][i];
    });
  }
  setTimeout(() => {
    app.camera.capture(plan.selector, plan.padding);
    app.stop();
    document.documentElement.classList.add("still", "shot-ready");
  }, plan.wait);
}
