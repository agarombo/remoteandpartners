import { U, FT } from "../geometry/primitives.js";
import { approach } from "../motion.js";
import { byId, setAttribute, setText, toggle } from "./dom.js";

const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
export function createCamera(state, request) {
  const world = byId("world"),
    layer = byId("cameraLayer"),
    bar = byId("scaleBar"),
    label = byId("scaleTxt");
  let pose = { k: 0.4, x: 0, y: 0 },
    travel = null,
    anchor = null,
    mobileAnchor = null;
  let viewport, committed;
  const webkit =
    /AppleWebKit/.test(window.navigator.userAgent) &&
    /Safari\//.test(window.navigator.userAgent) &&
    !/(Chrome|Chromium|Edg|OPR)\//.test(window.navigator.userAgent);
  let raster,
    rasterModule,
    preparation,
    preparedTravel,
    rasterFailed = false;
  toggle(document.documentElement, "raster-camera", webkit);

  function cancelPreparation() {
    preparation?.abort();
    preparation = null;
    preparedTravel = null;
  }
  const mobile = () => window.innerWidth < 820;
  const zoom = (value) => (mobile() ? value * 0.55 : value);
  const home = () => ({ k: mobile() ? 0.31 : 0.57, x: 0, y: 0 });
  function resize() {
    cancelPreparation();
    raster?.clear();
    const rect = document.querySelector(".app").getBoundingClientRect();
    const factor = Math.max(rect.width / 1600, rect.height / 1000);
    const width = rect.width / factor,
      height = rect.height / factor;
    viewport = {
      factor,
      width,
      height,
      left: (1600 - width) / 2,
      top: (1000 - height) / 2,
    };
    updateScale();
    request();
  }
  function updateScale() {
    const pixels = (U / FT) * pose.k * viewport.factor;
    const feet =
      [10, 25, 50, 100, 250, 500, 1000].find((value) => value * pixels > 46) ||
      1000;
    const width = (feet * pixels).toFixed(1) + "px";
    if (bar.style.width !== width) bar.style.width = width;
    setText(label, `0 — ${feet} FT`);
  }
  function destination() {
    if (state.capture) return [800, 500];
    if (mobile())
      return [
        800,
        mobileAnchor ??
          { territory: 420, lab: 235, services: 245, network: 245 }[
            state.view
          ] ??
          515,
      ];
    if (state.view === "origin") return [500, 520];
    if (state.view === "territory")
      return state.arrived ? [600, 480] : [810, 535];
    if (state.view === "lab") return [700, 415];
    if (state.person !== null) return [500, 540];
    if (state.view === "contact" && state.contact !== "running")
      return [600, 520];
    return state.current ? [620, 540] : [810, 535];
  }
  function go(target, duration = 1000) {
    cancelPreparation();
    if (anchor && !state.reduced && !state.capture)
      raster?.resume(
        {
          k: pose.k,
          x: anchor[0] - pose.x * pose.k,
          y: anchor[1] - pose.y * pose.k,
        },
        viewport,
      );
    travel = {
      from: { ...pose },
      to: { ...target },
      start: performance.now(),
      duration,
    };
    toggle(document.documentElement, "still", false);
    request();
  }
  function render(now, elapsed) {
    const next = destination();
    if (!anchor || state.reduced) anchor = next;
    const cached = webkit && !state.reduced && !state.capture && !rasterFailed;
    if (!cached) {
      cancelPreparation();
      raster?.clear();
    }
    if (
      cached &&
      travel &&
      !raster?.available &&
      preparedTravel !== travel &&
      committed
    ) {
      const journey = travel;
      // A cold capture (initial load or resize) starts from the actual pose,
      // with no HTML scale leaking into its bounds or interaction coordinates.
      committed = { k: pose.k, x: anchor[0] - pose.x * pose.k, y: anchor[1] - pose.y * pose.k };
      setAttribute(world, "transform", `translate(${committed.x.toFixed(2)},${committed.y.toFixed(2)}) scale(${committed.k.toFixed(4)})`);
      layer.style.transform = "none";
      preparedTravel = journey;
      preparation = new window.AbortController();
      const controller = preparation;
      rasterModule ||= import("./raster.js");
      rasterModule
        .then((module) => {
          controller.signal.throwIfAborted();
          raster ||= module.createRaster(byId("stage"), layer, request);
          return raster.prepare({
            viewport,
            base: { ...committed },
            signal: controller.signal,
          });
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            rasterFailed = true;
            raster?.clear();
          }
        })
        .finally(() => {
          if (preparation !== controller) return;
          preparation = null;
          journey.start = performance.now();
          request();
        });
    }
    if (travel && !preparation) {
      const progress = state.reduced
        ? 1
        : Math.min(1, (now - travel.start) / Math.max(1, travel.duration));
      const t = ease(progress),
        oldScale = pose.k;
      for (const key of ["k", "x", "y"])
        pose[key] = travel.from[key] + (travel.to[key] - travel.from[key]) * t;
      if (progress === 1) travel = null;
      if (pose.k !== oldScale) updateScale();
    }
    if (!preparation)
      anchor = anchor.map((value, i) => approach(value, next[i], elapsed));
    const moving = !!travel || anchor.some((value, i) => value !== next[i]);
    const matrix = {
      k: pose.k,
      x: anchor[0] - pose.x * pose.k,
      y: anchor[1] - pose.y * pose.k,
      moving,
    };
    // Commit SVG coordinates only at rest. During travel Chrome composites a
    // relative HTML transform over the existing scene instead of repainting
    // every vector/filter for each intermediate camera position.
    if (!committed || !moving) {
      if (!moving) raster?.rest();
      const transform = `translate(${matrix.x.toFixed(2)},${matrix.y.toFixed(2)}) scale(${matrix.k.toFixed(4)})`;
      setAttribute(world, "transform", transform);
      if (layer.style.transform !== "none") layer.style.transform = "none";
      committed = { ...matrix };
      if (cached && !moving && raster?.dirty && !preparation) {
        preparation = new window.AbortController();
        const controller = preparation;
        raster
          .prepare({
            viewport,
            base: { ...matrix },
            signal: controller.signal,
            display: false,
          })
          .catch(() => {
            if (!controller.signal.aborted) rasterFailed = true;
          })
          .finally(() => {
            if (preparation !== controller) return;
            preparation = null;
            if (rasterFailed) raster.clear();
            request();
          });
      }
    } else {
      const scale = matrix.k / committed.k;
      const offsetX = -viewport.left * viewport.factor,
        offsetY = -viewport.top * viewport.factor;
      const x =
        viewport.factor * (matrix.x - scale * committed.x) +
        (1 - scale) * offsetX;
      const y =
        viewport.factor * (matrix.y - scale * committed.y) +
        (1 - scale) * offsetY;
      const transform = `translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0) scale(${scale.toFixed(6)})`;
      if (raster?.active) raster.move(matrix, viewport);
      else layer.style.transform = transform;
    }
    toggle(document.documentElement, "still", !moving);
    return matrix;
  }
  function bounds(nodes, overrides = new Map()) {
    const inverse = world.getScreenCTM()?.inverse();
    if (!inverse) return null;
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (const node of nodes) {
      const box = node.getBBox(),
        local = overrides.get(node);
      const transform = local
        ? node.parentNode.getScreenCTM()
        : node.getScreenCTM();
      if (!box.width || !box.height || !transform) continue;
      const matrix = inverse.multiply(transform);
      for (let [x, y] of [
        [box.x, box.y],
        [box.x + box.width, box.y],
        [box.x + box.width, box.y + box.height],
        [box.x, box.y + box.height],
      ]) {
        if (local)
          [x, y] = [
            local[0] * x + local[2] * y + local[4],
            local[1] * x + local[3] * y + local[5],
          ];
        const px = matrix.a * x + matrix.c * y + matrix.e,
          py = matrix.b * x + matrix.d * y + matrix.f;
        left = Math.min(left, px);
        right = Math.max(right, px);
        top = Math.min(top, py);
        bottom = Math.max(bottom, py);
      }
    }
    return right > left
      ? { x: left, y: top, width: right - left, height: bottom - top }
      : null;
  }
  function fit(selector, duration = 650, overrides) {
    if (!mobile() || state.capture) return;
    const box = bounds(document.querySelectorAll(selector), overrides);
    if (!box) return;
    const panel = byId(state.view === "lab" ? "lab" : "panel");
    const height = panel.offsetHeight;
    const top =
      viewport.top +
      (byId("nav").getBoundingClientRect().bottom + 14) / viewport.factor;
    const bottom =
      viewport.top + viewport.height - (height + 16) / viewport.factor;
    if (bottom - top < 90) return;
    mobileAnchor = (top + bottom) / 2;
    go(
      {
        k: Math.min(
          (viewport.width * 0.86) / box.width,
          ((bottom - top) * 0.86) / box.height,
        ),
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      },
      duration,
    );
  }
  resize();
  return {
    go,
    render,
    resize,
    bounds,
    fit,
    mobile,
    zoom,
    home,
    animateOverview: !webkit,
    invalidate() {
      raster?.invalidate();
    },
    get viewport() {
      return viewport;
    },
    clearFit() {
      mobileAnchor = null;
    },
    island(isle) {
      return { k: zoom(1.8), x: isle.wx, y: isle.wy + isle.topY * 0.26 };
    },
    lab(isle, mode) {
      return {
        k: zoom(mode === "autocad" ? 2.9 : 2.7),
        x: isle.wx,
        y: isle.wy - (mode === "autocad" ? 16 : 55),
      };
    },
    capture(selector, padding) {
      const box = bounds(document.querySelectorAll(selector));
      if (!box) return;
      pose = {
        k: Math.min(
          (1000 * padding) / box.width,
          (1000 * padding) / box.height,
        ),
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      };
      travel = null;
      cancelPreparation();
      raster?.clear();
      anchor = [800, 500];
      render(performance.now(), 0);
    },
  };
}
