import { DISTRICTS, SCENERY, LINKS, dx } from "../content.js";
import { buildIsland } from "../geometry/city.js";
import { P, SP, FT, n1, rng } from "../geometry/primitives.js";
import {
  byId,
  svgElement as el,
  setAttribute,
  setText,
  toggle,
} from "./dom.js";

export function createScene(state) {
  const svg = byId("stage"),
    gShips = byId("ships");
  (function materials() {
    const defs = svg.querySelector("defs");
    const NS2 = "http://www.w3.org/2000/svg";
    const grad = (id, x1, y1, x2, y2, stops) => {
      const g = document.createElementNS(NS2, "linearGradient");
      g.setAttribute("id", id);
      g.setAttribute("x1", x1);
      g.setAttribute("y1", y1);
      g.setAttribute("x2", x2);
      g.setAttribute("y2", y2);
      stops.forEach((st) => {
        const e = document.createElementNS(NS2, "stop");
        e.setAttribute("offset", st[0]);
        e.setAttribute("style", "stop-color:" + st[1]);
        g.appendChild(e);
      });
      defs.appendChild(g);
    };
    const ball = (id, stops) => {
      const g = document.createElementNS(NS2, "radialGradient");
      g.setAttribute("id", id);
      g.setAttribute("cx", ".36");
      g.setAttribute("cy", ".30");
      g.setAttribute("r", ".78");
      stops.forEach((st) => {
        const e = document.createElementNS(NS2, "stop");
        e.setAttribute("offset", st[0]);
        e.setAttribute("style", "stop-color:" + st[1]);
        g.appendChild(e);
      });
      defs.appendChild(g);
    };
    ["stone", "slate", "magenta", "purple", "blue", "orange", "coral"].forEach(
      (h) => {
        const v = (k) => "var(--" + h + "-" + k + ")";
        grad("gt-" + h, 0, 0, 1, 1, [
          [0, "color-mix(in srgb," + v(1) + " 80%,#fff)"],
          [1, v(1)],
        ]);
        grad("gl-" + h, 0, 0, 0, 1, [
          [0, "color-mix(in srgb," + v(2) + " 92%,#fff)"],
          [0.6, v(2)],
          [1, "color-mix(in srgb," + v(2) + " 74%,var(--ink))"],
        ]);
        grad("gr-" + h, 0, 0, 0, 1, [
          [0, v(3)],
          [1, "color-mix(in srgb," + v(3) + " 66%,var(--ink))"],
        ]);
        /* copa de árbol: esfera con la luz arriba a la izquierda */
        ball("tb-" + h, [
          [0, "color-mix(in srgb," + v(1) + " 55%,#fff)"],
          [0.55, v(2)],
          [1, "color-mix(in srgb," + v(3) + " 62%,var(--ink))"],
        ]);
      },
    );
  })();

  /* estrellas: sólo se ven en tema oscuro (opacidad por token) */
  const stars = document.getElementById("stars"),
    sr = rng(4);
  for (let i = 0; i < 90; i++)
    stars.appendChild(
      el("circle", {
        cx: (sr() * 1600).toFixed(0),
        cy: (sr() * 1000).toFixed(0),
        r: (sr() * 1.1 + 0.3).toFixed(2),
        fill: "var(--ink)",
        opacity: "var(--star-op)",
      }),
    );

  /* bruma de fondo */
  const cr = rng(9),
    gc = document.getElementById("clouds");
  for (let i = 0; i < 16; i++)
    gc.appendChild(
      el("ellipse", {
        cx: ((cr() - 0.5) * 2900).toFixed(0),
        cy: ((cr() - 0.5) * 1700).toFixed(0),
        rx: (140 + cr() * 260).toFixed(0),
        ry: (40 + cr() * 70).toFixed(0),
        fill: "var(--haze)",
        opacity: (cr() * 0.26 + 0.12).toFixed(2),
        filter: "url(#blur)",
      }),
    );

  /* anillo orbital punteado con satélites */
  const gOrb = document.getElementById("orbit"),
    ORX = 1500,
    ORY = 760;
  gOrb.appendChild(
    el("ellipse", {
      cx: 0,
      cy: 40,
      rx: ORX,
      ry: ORY,
      fill: "none",
      stroke: "var(--line)",
      "stroke-opacity": ".8",
      "stroke-width": "1.8",
      "stroke-dasharray": "1 13",
      "stroke-linecap": "round",
      "vector-effect": "non-scaling-stroke",
    }),
  );
  const sats = ["orange", "blue", "magenta", "coral", "purple"].map((c, i) => {
    const d = el("circle", { r: "9", fill: "var(--" + c + "-3)" });
    gOrb.appendChild(d);
    return { el: d, t: (i * Math.PI * 2) / 5 };
  });

  /* aeronaves: el isotipo de la marca derivando por el cielo.
   Los trazos se leen del propio logotipo del HUD, así hay una sola fuente. */
  const LOGO_D = [].slice
    .call(document.querySelectorAll(".brand .mark path"))
    .map((p) => p.getAttribute("d"));
  const LOGO_W = 2342.2; /* ancho del isotipo ya volteado */

  function flyer(w, op) {
    const S = w / LOGO_W;
    const g = el("g", { opacity: op });
    g.innerHTML =
      '<g transform="scale(' +
      S.toFixed(5) +
      ')"><g transform="translate(-1500,-1350)">' +
      '<g transform="matrix(1 0 0 -1 0 3000)" fill="url(#skyGrad)">' +
      LOGO_D.map((d) => '<path d="' + d + '"/>').join("") +
      "</g></g></g>";
    gShips.appendChild(g);
    return g;
  }
  const SHIPS = [
    { g: flyer(124, 0.88), x: -1500, y: -680, v: 0.34 },
    { g: flyer(94, 0.62), x: 900, y: 560, v: -0.22 },
    { g: flyer(74, 0.45), x: -400, y: 820, v: 0.28 },
  ];

  const islands = byId("islands"),
    connections = byId("links"),
    tags = byId("tags"),
    nav = byId("nav");
  const isles = DISTRICTS.map((d) => ({ ...d, district: true })).concat(
    SCENERY.map((s, i) => ({
      id: "sc" + i,
      a: s[0],
      b: s[1],
      size: s[2],
      seed: s[3],
      hue: s[4],
      district: false,
    })),
  );
  const fragment = document.createDocumentFragment();
  isles.forEach((isle, i) => {
    const [wx, wy] = P(isle.a * SP, isle.b * SP, 0),
      drawing = buildIsland(isle);
    Object.assign(isle, {
      wx,
      wy,
      i,
      topY: drawing.topY,
      topZ: drawing.topZ,
      alt: 4000 + Math.round(drawing.topZ * FT),
      phase: i * 1.37,
      amp: isle.district ? 4.5 : 6.5,
      dy: 0,
      visible: true,
    });
    const group = el("g", {
      class: "isl",
      transform: "translate(" + n1(wx) + "," + n1(wy) + ")",
      "data-island": isle.id,
    });
    const body = el("g");
    body.innerHTML = drawing.svg;
    group.append(body);
    isle.g = group;
    isle.bob = body;
    toggle(group, "dof", Math.abs(wy) > 118);
    if (isle.district) {
      setAttribute(group, "tabindex", 0);
      setAttribute(group, "role", "button");
      const tag = el("g");
      tag.innerHTML =
        '<line class="tag-line" x1="0" y1="0" x2="0" y2="-28" stroke="var(--' +
        isle.hue +
        '-3)"/><text class="tag-sub" y="-38"></text><text class="tag-name" y="-58" fill="var(--' +
        isle.hue +
        '-4)"></text>';
      tags.append(tag);
      isle.tag = tag;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "c-" + isle.hue;
      button.dataset.island = isle.id;
      button.innerHTML = "<i></i><span></span>";
      nav.append(button);
      isle.navBtn = button;
    } else {
      group.classList.add("scenery");
      group.style.pointerEvents = "none";
    }
    fragment.append(group);
  });
  islands.append(fragment);
  const lookup = new Map(isles.map((isle) => [isle.id, isle]));
  const links = LINKS.map(([a, b]) => {
    const from = isles[a],
      to = isles[b];
    const line = el("line", {
      class: "link",
      x1: n1(from.wx),
      y1: n1(from.wy),
      x2: n1(to.wx),
      y2: n1(to.wy),
    });
    connections.append(
      line,
      el("circle", {
        cx: n1((from.wx + to.wx) / 2),
        cy: n1((from.wy + to.wy) / 2),
        r: "4.5",
        fill: "var(--line)",
        opacity: ".55",
      }),
    );
    return { el: line, a: from, b: to };
  });
  // Measure once, after all scene writes, rather than reading layout per frame.
  for (const isle of isles) isle.bounds = isle.bob.getBBox();
  function translate() {
    for (const isle of isles.filter((i) => i.district)) {
      setText(isle.tag.querySelector(".tag-sub"), dx(isle, "sub"));
      setText(isle.tag.querySelector(".tag-name"), dx(isle, "label"));
      setText(isle.navBtn.querySelector("span"), dx(isle, "label"));
      setAttribute(isle.g, "aria-label", dx(isle, "label"));
    }
  }
  let dirty = true;
  function select(id) {
    dirty = true;
    state.current = id ? lookup.get(id) : null;
    state.hovered = null;
    for (const isle of isles) {
      toggle(isle.g, "focus", isle === state.current);
      toggle(isle.g, "dimmed", !!id && isle !== state.current);
      toggle(isle.g, "hot", false);
      if (isle.navBtn)
        setAttribute(isle.navBtn, "aria-current", isle === state.current);
    }
    for (const link of links) {
      toggle(link.el, "dimmed", !!id);
      toggle(link.el, "hot", false);
    }
  }
  function hover(id) {
    dirty = true;
    const isle = lookup.get(id);
    state.hovered = isle || null;
    for (const item of isles) toggle(item.g, "hot", item === isle);
    for (const link of links)
      toggle(link.el, "hot", !!isle && (link.a === isle || link.b === isle));
  }
  let elapsedMotion = 0,
    motionTime = 0,
    initialized = false,
    lastReduced = state.reduced,
    lastMatrix = "";
  function render(_now, elapsed, matrix, viewport, drift) {
    elapsedMotion += elapsed;
    const animate = drift && !matrix.moving && elapsedMotion >= 1000 / 30;
    const reset = !initialized || lastReduced !== state.reduced;
    const matrixKey = [
      matrix.x,
      matrix.y,
      matrix.k,
      matrix.moving,
      viewport.width,
      viewport.height,
      state.view,
    ].join(":");
    if (!animate && !reset && !dirty && matrixKey === lastMatrix) return;
    lastMatrix = matrixKey;
    dirty = false;
    if (animate) motionTime += Math.min(elapsedMotion, 100);
    const t = motionTime / 1000;
    for (const isle of isles) {
      const b = isle.bounds,
        margin = 80;
      const left = matrix.x + (isle.wx + b.x) * matrix.k,
        top = matrix.y + (isle.wy + b.y - 8) * matrix.k;
      // Keep paint layers stable throughout a journey, especially zooming out.
      // Cull only after settling; revealing islands mid-zoom causes popping.
      const visible =
        matrix.moving ||
        state.capture ||
        isle === state.current ||
        !(
          left + b.width * matrix.k < viewport.left - margin ||
          left > viewport.left + viewport.width + margin ||
          top + (b.height + 16) * matrix.k < viewport.top - margin ||
          top > viewport.top + viewport.height + margin
        );
      if (isle.visible !== visible) {
        isle.g.style.visibility = visible ? "" : "hidden";
        isle.visible = visible;
        setAttribute(isle.g, "data-offscreen", !visible);
      }
      if (visible && (animate || reset)) {
        isle.dy = state.reduced
          ? 0
          : Math.sin(t * 0.55 + isle.phase) * isle.amp;
        setAttribute(
          isle.bob,
          "transform",
          "translate(0," + isle.dy.toFixed(2) + ")",
        );
      }
      if (isle.tag) {
        const on =
          visible &&
          ((isle === state.current && state.view !== "lab") ||
            (!state.current && isle === state.hovered));
        toggle(isle.tag, "on", on);
        if (on)
          setAttribute(
            isle.tag,
            "transform",
            "translate(" +
              (matrix.x + isle.wx * matrix.k).toFixed(1) +
              "," +
              (matrix.y + (isle.wy + isle.topY + isle.dy) * matrix.k).toFixed(
                1,
              ) +
              ")",
          );
      }
    }
    if (animate || reset) {
      sats.forEach((s) => {
        const angle = s.t + (state.reduced ? 0 : t * 0.06);
        setAttribute(s.el, "cx", (Math.cos(angle) * ORX).toFixed(1));
        setAttribute(s.el, "cy", (Math.sin(angle) * ORY + 40).toFixed(1));
      });
      SHIPS.forEach((ship, i) => {
        if (animate) {
          ship.x += (ship.v * Math.min(elapsedMotion, 100)) / (1000 / 60);
          if (ship.x > 1900) ship.x = -1900;
          if (ship.x < -1900) ship.x = 1900;
        }
        setAttribute(
          ship.g,
          "transform",
          "translate(" +
            ship.x.toFixed(1) +
            "," +
            (ship.y + (state.reduced ? 0 : Math.sin(t * 0.4 + i) * 14)).toFixed(
              1,
            ) +
            ") rotate(" +
            (state.reduced ? 0 : Math.sin(t * 0.3 + i) * 3).toFixed(2) +
            ")",
        );
      });
      elapsedMotion = 0;
      initialized = true;
      lastReduced = state.reduced;
    }
  }
  translate();
  return {
    isles,
    links,
    byId: (id) => lookup.get(id),
    select,
    hover,
    translate,
    render,
  };
}
