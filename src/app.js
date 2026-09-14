import { LANG, setLanguage, u } from "./content.js";
import { createFrameLoop } from "./motion.js";
import { createScene } from "./core/scene.js";
import { createCamera } from "./core/camera.js";
import { createSound } from "./core/sound.js";
import { createPanel } from "./core/panel.js";
import { byId, setText, setAttribute, toggle, show } from "./core/dom.js";

// Features own their DOM and pending work. Only this router changes the view.
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const state = {
  view: "city",
  current: null,
  hovered: null,
  person: null,
  contact: "idle",
  arrived: false,
  returning: false,
  capture: false,
  reduced: preference.matches,
};
let loop,
  active = null,
  modal = null,
  modalOpen = false,
  revision = 0,
  detailRevision = 0,
  intro = 0;
const request = () => loop?.request();
const camera = createCamera(state, request),
  scene = createScene(state),
  sound = createSound();
const panel = byId("panel"),
  world = byId("cameraLayer");
const panelUI = createPanel(panel, () => {
  const back = panel.querySelector(".back");
  if (back && !modalOpen) active?.click(back);
});
const loaders = {
  services: () => import("./features/network.js"),
  network: () => import("./features/network.js"),
  origin: () => import("./features/origin.js"),
  territory: () => import("./features/territory.js"),
  lab: () => import("./features/lab.js"),
  contact: () => import("./features/contact.js"),
};
const features = new Map();
const app = {
  state,
  camera,
  scene,
  sound,
  request,
  navigate,
  openDetail,
  status,
  setLook,
  renderPanel: (html) => panelUI.render(html),
  stop: () => loop.stop(),
};
function feature(view) {
  const key = view === "services" ? "network" : view;
  if (!features.has(key))
    features.set(
      key,
      loaders[view]()
        .then((module) => module.createFeature(app))
        .catch((error) => {
          features.delete(key);
          throw error;
        }),
    );
  return features.get(key);
}
function status(title = "", subtitle = "") {
  setText(byId("msTitle"), title);
  setText(byId("msSub"), subtitle);
  toggle(byId("mapStatus"), "on", !!title);
}
function closeDetail() {
  detailRevision++;
  if (modalOpen) modal.close();
  modalOpen = false;
}
async function openDetail(kind) {
  const ticket = ++detailRevision;
  try {
    const module = await import("./features/detail.js");
    if (ticket !== detailRevision) return;
    modal ||= module.createFeature(app);
    modalOpen = true;
    modal.open(kind);
  } catch {
    if (ticket === detailRevision)
      status(
        LANG === "en"
          ? "Refresh the page to load this view."
          : "Actualizá la página para cargar esta vista.",
      );
  }
}
function clearView() {
  panelUI.cancel();
  active?.close();
  active = null;
  closeDetail();
  show(panel, false);
  panel.scrollTop = 0;
  panel.classList.remove("form", "person");
  scene.select(null);
  camera.clearFit();
}
async function navigate(view, options = {}) {
  if (
    state.capture &&
    document.documentElement.classList.contains("shot-ready")
  )
    return;
  if (view === "contact" && state.contact === "running") return;
  const ticket = ++revision;
  closeDetail();
  const leaving = state.view === "territory" || state.returning;
  let next;
  try {
    next = view === "city" ? null : await feature(view);
  } catch {
    if (ticket === revision && state.returning) await navigate("city");
    if (ticket === revision)
      status(
        LANG === "en"
          ? "Refresh the page to load this view."
          : "Actualizá la página para cargar esta vista.",
      );
    return;
  }
  if (ticket !== revision) return;
  clearView();
  state.returning = leaving && view !== "territory";
  state.view = view;
  document.body.dataset.view = view;
  // Keep the map in the drawing until the direct journey has actually landed,
  // including time spent preparing WebKit's travel cache.
  if (!state.returning) document.body.classList.remove("mapmode");
  status();
  active = next;
  if (next) next.open({ view, ...options });
  else {
    setText(byId("ro"), "— — —");
    camera.go(camera.home(), state.returning ? 1400 : 1100);
    sound.back();
  }
  request();
  return next;
}
function setLook(look) {
  setAttribute(document.documentElement, "data-look", look);
  for (const button of byId("looks").querySelectorAll("button"))
    setAttribute(button, "aria-current", button.dataset.look === look);
  camera.invalidate();
}
function translate() {
  document.documentElement.lang = LANG;
  byId("roCity").innerHTML = u("city");
  byId("hintTxt").innerHTML = u("hint");
  setText(byId("sndTxt"), u("sound"));
  setText(byId("labClose"), u("labBack"));
  setText(byId("connLabel"), u("connect"));
  setText(byId("connSub"), u("channel"));
  setText(byId("connShort"), u("cShort"));
  toggle(byId("langBtn"), "en", LANG === "en");
  setAttribute(
    byId("langBtn"),
    "aria-label",
    LANG === "es" ? "Switch to English" : "Cambiar a español",
  );
  [...byId("looks").querySelectorAll("button")].forEach((button, i) =>
    setText(button, u("looks")[i]),
  );
  scene.translate();
  active?.render();
  if (modalOpen) modal.render();
  request();
}
const routes = {
  about: "origin",
  services: "services",
  team: "network",
  work: "territory",
};
function action(event) {
  const target = event.target;
  if (!target.closest) return;
  if (target.closest("#detClose")) {
    closeDetail();
    return;
  }
  if (target.closest("#detail")) return;
  if (target.closest("#langBtn")) {
    setLanguage(LANG === "en" ? "es" : "en");
    translate();
    sound.tick();
    return;
  }
  if (target.closest("#sndBtn")) {
    sound.toggle();
    return;
  }
  const look = target.closest("[data-look]");
  if (look?.matches("button")) {
    setLook(look.dataset.look);
    sound.tick();
    return;
  }
  if (target.closest("#connect")) {
    navigate("contact");
    return;
  }
  const drawing = target.closest("[data-lab]");
  if (drawing) {
    drawing.dataset.lab === "auto"
      ? openDetail("auto")
      : navigate("lab", { mode: drawing.dataset.lab });
    return;
  }
  if (target.closest(".call")) {
    navigate("contact");
    return;
  }
  if (target.closest(".det-open")) {
    openDetail("wall");
    return;
  }
  const seat = target.closest(".seat, .seat-tag");
  if (seat && state.view !== "network") {
    navigate("network", { person: +seat.dataset.i });
    return;
  }
  if (seat) {
    active?.click(target);
    return;
  }
  const island = target.closest("[data-island]");
  if (island) {
    if (
      island.matches("button") ||
      !state.current ||
      state.current.id === island.dataset.island
    )
      navigate(routes[island.dataset.island]);
    return;
  }
  if (target.closest("#panel, #lab, #usmap, #typo")) active?.click(target);
  else if (
    target.closest("#stage") &&
    ["services", "network"].includes(state.view)
  )
    navigate("city");
  request();
}
document.addEventListener("click", action);
document.addEventListener("input", () => active?.input?.());
addEventListener("keydown", (event) => {
  const target = event.target;
  if (event.key === "Escape") {
    event.preventDefault();
    if (modalOpen) closeDetail();
    else navigate(state.view === "lab" ? "services" : "city");
  } else if (!target.closest?.('input,textarea,[contenteditable="true"]')) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      active?.key?.(event.key === "ArrowRight" ? 1 : -1);
    } else if (
      (event.key === "Enter" || event.key === " ") &&
      target.closest?.(
        '.isl[role="button"],.seat,.seat-tag,.det-open,.st.on,.ty,[data-p],[data-i]',
      )
    ) {
      event.preventDefault();
      action(event);
    }
  }
  request();
});
document.addEventListener("pointerover", (event) => {
  if (state.view !== "city" || state.returning) return;
  const island = event.target.closest?.("[data-island]"),
    id = island?.dataset.island;
  if (id === state.hovered?.id) return;
  scene.hover(id);
  if (id) sound.hover(scene.byId(id).i);
  request();
});
document.addEventListener("pointerout", (event) => {
  if (state.view !== "city" || !state.hovered) return;
  if (
    event.relatedTarget?.closest?.("[data-island]")?.dataset.island ===
    state.hovered.id
  )
    return;
  scene.hover(null);
  request();
});
addEventListener("resize", () => {
  panelUI.cancel();
  camera.clearFit();
  camera.resize();
  if (state.view === "city") camera.go(camera.home(), 450);
  else active?.resize?.();
  request();
});
preference.addEventListener("change", (event) => {
  panelUI.cancel();
  state.reduced = event.matches;
  request();
});
loop = createFrameLoop((now, elapsed) => {
  const matrix = camera.render(now, elapsed);
  if (state.returning && !matrix.moving) {
    state.returning = false;
    document.body.classList.remove("mapmode");
  }
  const drift =
    camera.animateOverview &&
    state.view === "city" &&
    !state.returning &&
    !state.capture &&
    !state.reduced;
  scene.render(now, elapsed, matrix, camera.viewport, drift);
  const moving = active?.tick?.(now);
  if (intro < 1) {
    intro =
      state.reduced || state.capture ? 1 : Math.min(1, intro + elapsed / 1200);
    world.style.opacity = intro;
  }
  return matrix.moving || drift || moving || intro < 1;
});
show(panel, false);
show(byId("detail"), false, "on");
show(byId("lab"), false, "on");
document.body.dataset.view = "city";
setLook("light");
translate();
camera.go(camera.home(), 1800);
request();
if (new URLSearchParams(location.search).has("shot"))
  import("./features/capture.js").then((module) => module.capture(app));
