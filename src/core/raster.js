// WebKit repeatedly rasterizes filtered SVGs while their HTML parent scales.
// Keep the live, accessible SVG in place and use one bounded bitmap for travel.
const NS = "http://www.w3.org/2000/svg";
const properties = [
  "color",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "visibility",
  "display",
  "filter",
  "clip-path",
  "paint-order",
  "vector-effect",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
  "stop-color",
  "stop-opacity",
  "transform",
  "transform-origin",
  "transform-box",
  "shape-rendering",
  "mix-blend-mode",
];
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

async function embeddedFonts() {
  const faces = [];
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (rule.type !== window.CSSRule.FONT_FACE_RULE) continue;
      const source = rule.style.getPropertyValue("src");
      const match = source.match(/url\(["']?([^"')]+)["']?\)/);
      if (match?.[1].startsWith("data:")) {
        faces.push(Promise.resolve(rule.cssText));
        continue;
      }
      if (!match || !/(metropolis-|mono-.*-latin)/.test(match[1])) continue;
      faces.push(
        (async () => {
          const response = await window.fetch(
            new window.URL(match[1], sheet.href || location.href),
          );
          if (!response.ok) throw new Error("Font unavailable");
          const blob = await response.blob();
          const data = await new Promise((resolve, reject) => {
            const reader = new window.FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          return rule.cssText.replace(match[0], `url("${data}")`);
        })(),
      );
    }
  }
  return (await Promise.all(faces)).join("");
}

export function createRaster(stage, layer, request) {
  let canvas = null,
    active = false,
    imageBase,
    lastMatrix,
    imageViewport,
    imageRegion;
  let revision = 0,
    savedRevision = -1;
  const fonts = embeddedFonts().catch(() => "");
  const invalidate = () => {
    revision++;
    request();
  };
  new window.MutationObserver(invalidate).observe(
    stage.querySelector("#world"),
    {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    },
  );
  const surface = document.createElement("div");
  surface.className = "raster-layer";
  surface.setAttribute("aria-hidden", "true");
  function move(matrix, viewport) {
    lastMatrix = matrix;
    if (!imageBase) return;
    const scale = matrix.k / imageBase.k;
    const x =
      viewport.factor * (matrix.x - scale * imageBase.x) -
      (1 - scale) * viewport.left * viewport.factor;
    const y =
      viewport.factor * (matrix.y - scale * imageBase.y) -
      (1 - scale) * viewport.top * viewport.factor;
    surface.style.transform = `translate3d(${x + scale * imageRegion.x}px,${y + scale * imageRegion.y}px,0) scale(${scale / imageRegion.ratio})`;
    surface.style.opacity = layer.style.opacity || "1";
  }
  function rest() {
    if (!active) return;
    stage.style.opacity = "";
    stage.classList.remove("rasterizing");
    surface.remove();
    active = false;
    delete layer.dataset.raster;
  }
  function clear() {
    rest();
    stage.classList.remove("rasterizing");
    if (canvas) {
      canvas.remove();
      canvas.width = canvas.height = 0;
      canvas = null;
    }
    surface.remove();
    surface.replaceChildren();
    imageBase = imageRegion = imageViewport = lastMatrix = null;
    delete layer.dataset.raster;
  }
  function resume(matrix, viewport) {
    if (!canvas || imageViewport !== viewport) return;
    active = true;
    stage.style.opacity = "0";
    layer.after(surface);
    move(matrix, viewport);
    layer.style.transform = "none";
    layer.dataset.raster = "ready";
  }
  async function prepare({ viewport, base, signal, display = true }) {
    if (!display) {
      const transitions = stage
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation.playState === "running" &&
            animation.effect.getTiming().iterations !== Infinity,
        );
      await Promise.all(
        transitions.map((animation) => animation.finished.catch(() => {})),
      );
      signal.throwIfAborted();
    }
    const version = revision;
    const fontCSS = await fonts;
    signal.throwIfAborted();
    if (display) stage.classList.add("rasterizing");
    layer.dataset.raster = "preparing";
    // Let the navigation/panel update reach the screen before copying the scene.
    await pause();
    signal.throwIfAborted();
    const { factor, left, top, width, height } = viewport;
    const w = width * factor,
      h = height * factor;
    // Cache the whole scene, including culled islands, so the next destination
    // can start immediately without rebuilding a viewport-sized image first.
    const origin = document.querySelector(".app").getBoundingClientRect();
    const bounds = stage.querySelector("#world").getBoundingClientRect();
    let x0 = Math.min(0, bounds.x - origin.x),
      y0 = Math.min(0, bounds.y - origin.y);
    let x1 = Math.max(w, bounds.right - origin.x),
      y1 = Math.max(h, bounds.bottom - origin.y);
    const margin = 128;
    x0 = Math.floor(x0 - margin);
    y0 = Math.floor(y0 - margin);
    x1 = Math.ceil(x1 + margin);
    y1 = Math.ceil(y1 + margin);
    const widthPx = x1 - x0,
      heightPx = y1 - y0;
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      Math.sqrt((4 * 1024 * 1024) / (widthPx * heightPx)),
      4096 / Math.max(widthPx, heightPx),
    );
    const copy = stage.cloneNode(true);
    const nodes = [stage, ...stage.querySelectorAll("*")];
    const copies = [copy, ...copy.querySelectorAll("*")];
    const styles = new Map();
    for (let i = 0; i < nodes.length; i++) {
      if (i % 400 === 0) {
        await pause();
        signal.throwIfAborted();
      }
      const computed = window.getComputedStyle(nodes[i]);
      const culled = nodes[i].closest('.isl[data-offscreen="true"]');
      const fixedStroke =
        computed.getPropertyValue("vector-effect") === "non-scaling-stroke";
      const css = properties
        .map((name) => {
          let value = (
            name === "visibility" && culled
              ? "visible"
              : computed.getPropertyValue(name)
          ).replace(/url\(["']?[^)#]*#([^"')]+)["']?\)/g, "url(#$1)");
          if (
            fixedStroke &&
            ["stroke-width", "stroke-dasharray", "stroke-dashoffset"].includes(
              name,
            )
          )
            value = value.replace(/-?\d*\.?\d+(?:px)?/g, (number) =>
              String(parseFloat(number) * ratio),
            );
          return value ? `${name}:${value}` : "";
        })
        .filter(Boolean)
        .join(";");
      if (!styles.has(css)) styles.set(css, "r" + styles.size);
      copies[i].removeAttribute("style");
      copies[i].setAttribute("class", styles.get(css));
    }
    const sheet = document.createElementNS(NS, "style");
    sheet.textContent =
      fontCSS + [...styles].map(([css, name]) => `.${name}{${css}}`).join("");
    copy.prepend(sheet);
    // The haze filter is defined in the separate static background SVG.
    copy
      .querySelector("defs")
      .append(document.getElementById("blur").cloneNode(true));
    copy.removeAttribute("class");
    copy.setAttribute("xmlns", NS);
    copy.setAttribute("width", Math.max(1, Math.round(widthPx * ratio)));
    copy.setAttribute("height", Math.max(1, Math.round(heightPx * ratio)));
    copy.setAttribute(
      "viewBox",
      `${left + x0 / factor} ${top + y0 / factor} ${widthPx / factor} ${heightPx / factor}`,
    );
    copy.setAttribute("preserveAspectRatio", "none");
    const url = window.URL.createObjectURL(
      new window.Blob([new window.XMLSerializer().serializeToString(copy)], {
        type: "image/svg+xml",
      }),
    );
    const image = new window.Image();
    const abort = () => {
      image.src = "";
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      image.src = url;
      await image.decode();
      signal.throwIfAborted();
      if (!display && version !== revision) return;
      const next = document.createElement("canvas");
      next.width = Math.max(1, Math.round(widthPx * ratio));
      next.height = Math.max(1, Math.round(heightPx * ratio));
      next.getContext("2d").drawImage(image, 0, 0, next.width, next.height);
      next.className = "camera-raster";
      next.setAttribute("aria-hidden", "true");
      next.style.cssText = "left:0;top:0;width:100%;height:100%";
      canvas?.remove();
      if (canvas) canvas.width = canvas.height = 0;
      canvas = next;
      imageBase = base;
      imageViewport = viewport;
      imageRegion = { x: x0, y: y0, ratio };
      savedRevision = version;
      surface.style.width = next.width + "px";
      surface.style.height = next.height + "px";
      surface.replaceChildren(canvas);
      // Preserve district clicks during travel without repainting the SVG.
      for (const island of stage.querySelectorAll('.isl[role="button"]')) {
        const bounds = island.getBoundingClientRect();
        const hit = document.createElement("span");
        hit.dataset.island = island.dataset.island;
        hit.className = "raster-hit";
        hit.style.cssText = `left:${(bounds.x - origin.x - x0) * ratio}px;top:${(bounds.y - origin.y - y0) * ratio}px;width:${bounds.width * ratio}px;height:${bounds.height * ratio}px`;
        surface.append(hit);
      }
      if (display) {
        active = true;
        layer.after(surface);
        move(lastMatrix || base, viewport);
        layer.style.transform = "none";
        stage.style.opacity = "0";
        layer.dataset.raster = "ready";
      } else {
        stage.classList.remove("rasterizing");
        delete layer.dataset.raster;
      }
    } finally {
      signal.removeEventListener("abort", abort);
      window.URL.revokeObjectURL(url);
      if (!display && !signal.aborted && !active) delete layer.dataset.raster;
    }
  }
  return {
    prepare,
    clear,
    rest,
    resume,
    move,
    invalidate,
    get active() {
      return active;
    },
    get available() {
      return !!canvas;
    },
    get dirty() {
      return savedRevision !== revision;
    },
  };
}
