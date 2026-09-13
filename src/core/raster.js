// WebKit repeatedly rasterizes filtered SVGs while their HTML parent scales.
// Keep the live, accessible SVG in place and use one bounded bitmap for travel.
const NS = "http://www.w3.org/2000/svg";
const properties = [
  "color", "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width",
  "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit",
  "stroke-dasharray", "stroke-dashoffset", "opacity", "visibility", "display",
  "filter", "clip-path", "paint-order", "vector-effect", "font-family",
  "font-size", "font-weight", "font-style", "letter-spacing", "text-anchor",
  "dominant-baseline", "stop-color", "stop-opacity", "transform",
  "transform-origin", "transform-box", "shape-rendering", "mix-blend-mode",
];
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

export function createRaster(stage, layer) {
  let canvas = null, active = false, imageBase, lastMatrix, imageViewport;
  const surface = document.createElement("div");
  surface.className = "raster-layer";
  surface.setAttribute("aria-hidden", "true");
  function move(matrix, viewport) {
    lastMatrix = matrix;
    if (!imageBase) return;
    const scale = matrix.k / imageBase.k;
    const x = viewport.factor * (matrix.x - scale * imageBase.x) - (1 - scale) * viewport.left * viewport.factor;
    const y = viewport.factor * (matrix.y - scale * imageBase.y) - (1 - scale) * viewport.top * viewport.factor;
    surface.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`;
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
    delete layer.dataset.raster;
  }
  function resume(matrix, viewport) {
    if (!canvas || imageViewport !== viewport) return;
    active = true;
    stage.style.opacity = "0";
    layer.after(surface);
    move(matrix, viewport);
    layer.style.transform = "none";
    layer.dataset.raster = "preparing";
  }
  async function prepare({ viewport, base, frames, signal }) {
    stage.classList.add("rasterizing");
    layer.dataset.raster = "preparing";
    // Let the navigation/panel update reach the screen before copying the scene.
    await pause();
    signal.throwIfAborted();
    const { factor, left, top, width, height } = viewport;
    const w = width * factor, h = height * factor;
    let x0 = 0, y0 = 0, x1 = w, y1 = h, maximumScale = 1;
    for (const matrix of frames) {
      const scale = matrix.k / base.k;
      const x = factor * (matrix.x - scale * base.x) - (1 - scale) * left * factor;
      const y = factor * (matrix.y - scale * base.y) - (1 - scale) * top * factor;
      x0 = Math.min(x0, -x / scale);
      y0 = Math.min(y0, -y / scale);
      x1 = Math.max(x1, (w - x) / scale);
      y1 = Math.max(y1, (h - y) / scale);
      maximumScale = Math.max(maximumScale, scale);
    }
    const margin = 64;
    x0 = Math.floor(x0 - margin); y0 = Math.floor(y0 - margin);
    x1 = Math.ceil(x1 + margin); y1 = Math.ceil(y1 + margin);
    const widthPx = x1 - x0, heightPx = y1 - y0;
    const ratio = Math.min(
      (window.devicePixelRatio || 1) * maximumScale,
      Math.sqrt(4 * 1024 * 1024 / (widthPx * heightPx)),
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
      const css = properties.map((name) => {
        const value = computed.getPropertyValue(name).replace(
          /url\(["']?[^)#]*#([^"')]+)["']?\)/g, "url(#$1)",
        );
        return value ? `${name}:${value}` : "";
      }).filter(Boolean).join(";");
      if (!styles.has(css)) styles.set(css, "r" + styles.size);
      copies[i].removeAttribute("style");
      copies[i].setAttribute("class", styles.get(css));
    }
    const sheet = document.createElementNS(NS, "style");
    sheet.textContent = [...styles].map(([css, name]) => `.${name}{${css}}`).join("");
    copy.prepend(sheet);
    // The haze filter is defined in the separate static background SVG.
    copy.querySelector("defs").append(document.getElementById("blur").cloneNode(true));
    copy.removeAttribute("class");
    copy.setAttribute("xmlns", NS);
    copy.setAttribute("width", Math.max(1, Math.round(widthPx * ratio)));
    copy.setAttribute("height", Math.max(1, Math.round(heightPx * ratio)));
    copy.setAttribute("viewBox", `${left + x0 / factor} ${top + y0 / factor} ${widthPx / factor} ${heightPx / factor}`);
    copy.setAttribute("preserveAspectRatio", "none");
    const url = window.URL.createObjectURL(new window.Blob([new window.XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }));
    const image = new window.Image();
    const abort = () => { image.src = ""; };
    signal.addEventListener("abort", abort, { once: true });
    try {
      image.src = url;
      await image.decode();
      signal.throwIfAborted();
      const next = document.createElement("canvas");
      next.width = Math.max(1, Math.round(widthPx * ratio));
      next.height = Math.max(1, Math.round(heightPx * ratio));
      next.getContext("2d").drawImage(image, 0, 0, next.width, next.height);
      next.className = "camera-raster";
      next.setAttribute("aria-hidden", "true");
      next.style.cssText = `left:${x0}px;top:${y0}px;width:${widthPx}px;height:${heightPx}px`;
      canvas?.remove();
      if (canvas) canvas.width = canvas.height = 0;
      canvas = next;
      imageBase = base;
      imageViewport = viewport;
      active = true;
      surface.replaceChildren(canvas);
      // Preserve district clicks during travel without repainting the SVG.
      const origin = document.querySelector(".app").getBoundingClientRect();
      for (const island of stage.querySelectorAll('.isl[role="button"]')) {
        const bounds = island.getBoundingClientRect();
        const hit = document.createElement("button");
        hit.type = "button";
        hit.tabIndex = -1;
        hit.dataset.island = island.dataset.island;
        hit.className = "raster-hit";
        hit.style.cssText = `left:${bounds.x - origin.x}px;top:${bounds.y - origin.y}px;width:${bounds.width}px;height:${bounds.height}px`;
        surface.append(hit);
      }
      layer.after(surface);
      move(lastMatrix || frames[0], viewport);
      layer.style.transform = "none";
      stage.style.opacity = "0";
      layer.dataset.raster = "ready";
    } finally {
      signal.removeEventListener("abort", abort);
      window.URL.revokeObjectURL(url);
    }
  }
  return { prepare, clear, rest, resume, move, get active() { return active; } };
}
