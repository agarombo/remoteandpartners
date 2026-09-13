// WebKit travels over bounded bitmap layers while the live SVG stays interactive
// at rest. A separate detail crop retains destination resolution during zoom-in.
const NS = "http://www.w3.org/2000/svg";
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
const limit = 4 * 1024 * 1024;

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

function sceneCSS() {
  return [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .filter((rule) => rule.type !== window.CSSRule.FONT_FACE_RULE)
    .map((rule) =>
      rule.cssText
        .replace(/\bbody\b/g, ".snapshot-body")
        .replace(/\bhtml\b/g, ":root"),
    )
    .join("");
}

export function createRaster(stage, layer, request) {
  let canvas,
    detail,
    active = false,
    imageBase,
    imageViewport,
    imageRegion,
    lastMatrix;
  let revision = 0,
    savedRevision = -1,
    quality = 0;
  const fonts = embeddedFonts().catch(() => "");
  const css = sceneCSS();
  const invalidate = () => {
    revision++;
    request();
  };
  const world = stage.querySelector("#world");
  new window.MutationObserver((records) => {
    // Camera/culling writes do not change the artwork in the reusable cache.
    if (
      records.some(
        (record) =>
          !(record.target === world && record.attributeName === "transform") &&
          !(
            record.target.matches?.(".isl") &&
            ["style", "data-offscreen"].includes(record.attributeName)
          ),
      )
    )
      invalidate();
  }).observe(world, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
  });
  new window.MutationObserver(invalidate).observe(document.body, {
    attributes: true,
    attributeFilter: ["class", "data-view"],
  });
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
  function release(node) {
    if (node) {
      node.remove();
      node.width = node.height = 0;
    }
  }
  function clear() {
    rest();
    stage.classList.remove("rasterizing");
    release(canvas);
    release(detail);
    canvas = detail = null;
    surface.remove();
    surface.replaceChildren();
    imageBase = imageRegion = imageViewport = lastMatrix = null;
    quality = 0;
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
  async function prepare({
    viewport,
    base,
    signal,
    display = true,
    target = base,
  }) {
    const version = revision;
    const fontCSS = await fonts;
    signal.throwIfAborted();
    layer.dataset.raster = "preparing";
    await pause();
    signal.throwIfAborted();
    const { factor, left, top, width, height } = viewport;
    const origin = document.querySelector(".app").getBoundingClientRect();
    const mapmode = document.body.classList.contains("mapmode");
    const hidden = mapmode
      ? "#islands,#links,#ships,#usernode"
      : "#usmap,#typo";
    const copy = stage.cloneNode(true);
    copy.className.baseVal = document.documentElement.className;
    copy.setAttribute("data-look", document.documentElement.dataset.look);
    copy.style.cssText = "opacity:1;position:static;overflow:visible";
    for (const node of copy.querySelectorAll(hidden)) node.remove();
    // Body-dependent scene rules also apply inside the standalone SVG image.
    const body = document.createElementNS(NS, "g");
    body.setAttribute("class", "snapshot-body " + document.body.className);
    body.setAttribute("data-view", document.body.dataset.view);
    const copyWorld = copy.querySelector("#world");
    copyWorld.replaceWith(body);
    body.append(copyWorld);
    for (const node of body.querySelectorAll(hidden)) node.remove();
    for (const node of body.querySelectorAll('.isl[data-offscreen="true"]'))
      node.style.visibility = "";
    const sheet = document.createElementNS(NS, "style");
    sheet.textContent =
      fontCSS +
      css +
      "\n*{transition:none!important;animation:none!important} #stage{width:100%;height:100%;opacity:1!important} .isl{filter:none!important}";
    copy.prepend(sheet);
    copy
      .querySelector("defs")
      .append(document.getElementById("blur").cloneNode(true));
    copy.setAttribute("xmlns", NS);
    // Preserve constant-width strokes at either bitmap resolution. Colors,
    // gradients, text and transforms come directly from the shared stylesheet.
    // Pruned branches change the node list; walk each retained top-level group.
    for (const group of body.querySelector("#world").children) {
      const live = stage.querySelector("#" + group.id);
      const nodes = [live, ...live.querySelectorAll("*")];
      const copies = [group, ...group.querySelectorAll("*")];
      for (let i = 0; i < nodes.length; i++) {
        if (i && i % 1200 === 0) {
          await pause();
          signal.throwIfAborted();
        }
        const computed = window.getComputedStyle(nodes[i]);
        if (computed.vectorEffect !== "non-scaling-stroke") continue;
        for (const name of [
          "stroke-width",
          "stroke-dasharray",
          "stroke-dashoffset",
        ]) {
          const value = computed.getPropertyValue(name);
          if (!value || value === "none" || value === "0px") continue;
          copies[i].style.setProperty(
            name,
            value.replace(
              /-?\d*\.?\d+(?:px)?/g,
              (number) => `calc(${parseFloat(number)}px * var(--raster-ratio))`,
            ),
            "important",
          );
        }
      }
    }
    // Exclude hidden territory from city bounds, and vice versa.
    const bounds = [...world.children]
      .filter((node) => !node.matches(hidden + ",.hide"))
      .map((node) => node.getBoundingClientRect())
      .filter((box) => box.width && box.height);
    const x0 = Math.floor(
      Math.min(0, ...bounds.map((box) => box.x - origin.x)) - 64,
    );
    const y0 = Math.floor(
      Math.min(0, ...bounds.map((box) => box.y - origin.y)) - 64,
    );
    const x1 = Math.ceil(
      Math.max(width * factor, ...bounds.map((box) => box.right - origin.x)) +
        64,
    );
    const y1 = Math.ceil(
      Math.max(height * factor, ...bounds.map((box) => box.bottom - origin.y)) +
        64,
    );
    const widthPx = x1 - x0,
      heightPx = y1 - y0;
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      Math.sqrt(limit / (widthPx * heightPx)),
      4096 / Math.max(widthPx, heightPx),
    );
    async function bitmap(region, density) {
      copy.setAttribute(
        "width",
        Math.max(1, Math.round(region.width * density)),
      );
      copy.setAttribute(
        "height",
        Math.max(1, Math.round(region.height * density)),
      );
      copy.style.setProperty("--raster-ratio", density);
      copy.setAttribute(
        "viewBox",
        `${left + region.x / factor} ${top + region.y / factor} ${region.width / factor} ${region.height / factor}`,
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
        const next = document.createElement("canvas");
        next.width = +copy.getAttribute("width");
        next.height = +copy.getAttribute("height");
        next.getContext("2d").drawImage(image, 0, 0, next.width, next.height);
        next.className = "camera-raster";
        next.setAttribute("aria-hidden", "true");
        return next;
      } finally {
        signal.removeEventListener("abort", abort);
        window.URL.revokeObjectURL(url);
      }
    }
    let next, nextDetail;
    try {
      next = await bitmap(
        { x: x0, y: y0, width: widthPx, height: heightPx },
        ratio,
      );
      const scale = target.k / base.k;
      // Destination viewport expressed in the source snapshot's screen space.
      const tx =
        factor * (target.x - scale * base.x) - (1 - scale) * left * factor;
      const ty =
        factor * (target.y - scale * base.y) - (1 - scale) * top * factor;
      const bx = Math.max(0, Math.floor((-tx / scale - x0) * ratio));
      const by = Math.max(0, Math.floor((-ty / scale - y0) * ratio));
      const bw = Math.min(
        next.width - bx,
        Math.ceil(((width * factor) / scale) * ratio) + 2,
      );
      const bh = Math.min(
        next.height - by,
        Math.ceil(((height * factor) / scale) * ratio) + 2,
      );
      const region = {
        x: x0 + bx / ratio,
        y: y0 + by / ratio,
        width: bw / ratio,
        height: bh / ratio,
      };
      const density = Math.min(
        (window.devicePixelRatio || 1) * scale,
        Math.sqrt(limit / (region.width * region.height)),
        4096 / Math.max(region.width, region.height),
      );
      if (density > ratio * 1.2 && bw > 0 && bh > 0) {
        nextDetail = await bitmap(region, density);
        // Replace this rectangle instead of double-painting translucent shadows.
        next.getContext("2d").clearRect(bx, by, bw, bh);
        nextDetail.style.cssText = `left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px`;
      }
      signal.throwIfAborted();
      if (version !== revision) {
        release(next);
        release(nextDetail);
        return;
      }
      release(canvas);
      release(detail);
      canvas = next;
      detail = nextDetail;
      imageBase = base;
      imageViewport = viewport;
      imageRegion = { x: x0, y: y0, ratio };
      savedRevision = version;
      quality = target.k;
      surface.style.width = next.width + "px";
      surface.style.height = next.height + "px";
      canvas.style.cssText = "left:0;top:0;width:100%;height:100%";
      surface.replaceChildren(canvas);
      if (detail) surface.append(detail);
      surface.dataset.scene = mapmode ? "territory" : "city";
      for (const island of stage.querySelectorAll('.isl[role="button"]')) {
        if (mapmode) break;
        const box = island.getBoundingClientRect();
        const hit = document.createElement("span");
        hit.dataset.island = island.dataset.island;
        hit.className = "raster-hit";
        hit.style.cssText = `left:${(box.x - origin.x - x0) * ratio}px;top:${(box.y - origin.y - y0) * ratio}px;width:${box.width * ratio}px;height:${box.height * ratio}px`;
        surface.append(hit);
      }
      if (display || active) {
        stage.classList.add("rasterizing");
        resume(lastMatrix || base, viewport);
      } else delete layer.dataset.raster;
    } catch (error) {
      release(next);
      release(nextDetail);
      throw error;
    } finally {
      if (!signal.aborted && !active) delete layer.dataset.raster;
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
    needsDetail(target) {
      return target.k > quality * 1.1;
    },
  };
}
