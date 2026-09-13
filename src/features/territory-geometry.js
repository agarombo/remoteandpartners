import { u } from "../content.js";
import { P, pts, n1, box } from "../geometry/primitives.js";
const WSTATES = {
  TX: { sfr: 1 },
  ID: { sfr: 1 },
  MI: { twh: 1 },
  MA: { twh: 1 },
  NY: { twh: 1 },
  MD: { twh: 1 },
  VA: { twh: 1 },
  DC: { twh: 1 },
};
const WTOTAL = 2500;
/* territorio activo aunque todavía no tengamos la cifra cerrada */
const WON = (s) => Object.prototype.hasOwnProperty.call(WSTATES, s);
/* retícula de estados: mapa de operaciones, no de fronteras */
const GRID = [
  ["AK", 0, 0],
  ["ME", 11, 0],
  ["VT", 10, 1],
  ["NH", 11, 1],
  ["WA", 1, 2],
  ["ID", 2, 2],
  ["MT", 3, 2],
  ["ND", 4, 2],
  ["MN", 5, 2],
  ["IL", 6, 2],
  ["WI", 7, 2],
  ["MI", 8, 2],
  ["NY", 9, 2],
  ["RI", 10, 2],
  ["MA", 11, 2],
  ["OR", 1, 3],
  ["NV", 2, 3],
  ["WY", 3, 3],
  ["SD", 4, 3],
  ["IA", 5, 3],
  ["IN", 6, 3],
  ["OH", 7, 3],
  ["PA", 8, 3],
  ["NJ", 9, 3],
  ["CT", 10, 3],
  ["CA", 1, 4],
  ["UT", 2, 4],
  ["CO", 3, 4],
  ["NE", 4, 4],
  ["MO", 5, 4],
  ["KY", 6, 4],
  ["WV", 7, 4],
  ["VA", 8, 4],
  ["MD", 9, 4],
  ["DE", 10, 4],
  ["AZ", 2, 5],
  ["NM", 3, 5],
  ["KS", 4, 5],
  ["AR", 5, 5],
  ["TN", 6, 5],
  ["NC", 7, 5],
  ["SC", 8, 5],
  ["DC", 9, 5],
  ["OK", 3, 6],
  ["LA", 4, 6],
  ["MS", 5, 6],
  ["AL", 6, 6],
  ["GA", 7, 6],
  ["HI", 0, 7],
  ["TX", 3, 7],
  ["FL", 8, 7],
];
/* dos tipologías reales, no cuatro inventadas */
const TYPES = [
  ["sfr", "SINGLE FAMILY"],
  ["twh", "TOWNHOUSE"],
];
const REGION = {};
Object.keys(WSTATES)
  .sort()
  .forEach((s, i) => {
    REGION[s] = String(i + 1).padStart(2, "0");
  });

const MAPY = 2600; /* el territorio queda por debajo: la ciudad flota sobre él */

/* ---------- las tipologías en miniatura ----------
   Lo que se planta en cada región no es una casita genérica: es la misma
   volumetría que se explora en TYPOLOGY. Donde hicimos unifamiliar aparece
   una unifamiliar —dos plantas y el garaje adelantado—, y donde hicimos
   adosados aparece la tira con sus hastiales repetidos. */
function miniModel(kind, cx, cy, sc) {
  const q = (a, b, z) => [
    cx + (a - b) * 0.866 * sc,
    cy + ((a + b) * 0.5 - z) * sc,
  ];
  const P2 = (p) => p[0].toFixed(1) + "," + p[1].toFixed(1);
  const poly = (pp, f) =>
    '<polygon points="' + pp.map(P2).join(" ") + '" fill="var(--' + f + ')"/>';
  /* un cuerpo a dos aguas, con el hastial mirando al frente */
  const gab = (x0, y0, w, d, z, h, ri, hue) => {
    const A = q(x0, y0, z),
      B = q(x0 + w, y0, z),
      C = q(x0 + w, y0 + d, z);
    const a = q(x0, y0, z + h),
      b = q(x0 + w, y0, z + h),
      c = q(x0 + w, y0 + d, z + h),
      e = q(x0, y0 + d, z + h);
    const R0 = q(x0 + w / 2, y0, z + h + ri),
      R1 = q(x0 + w / 2, y0 + d, z + h + ri);
    return (
      poly([A, B, b, a], hue + "-3") +
      poly([B, C, c, b], hue + "-2") +
      poly([a, b, R0], hue + "-1") +
      poly([b, c, R1, R0], hue + "-2") +
      poly([a, R0, R1, e], hue + "-1")
    );
  };
  const slab = (x0, y0, w, d, z, h, hue) => {
    const A = q(x0, y0, z),
      B = q(x0 + w, y0, z),
      C = q(x0 + w, y0 + d, z);
    const a = q(x0, y0, z + h),
      b = q(x0 + w, y0, z + h),
      c = q(x0 + w, y0 + d, z + h),
      e = q(x0, y0 + d, z + h);
    return (
      poly([A, B, b, a], hue + "-3") +
      poly([B, C, c, b], hue + "-2") +
      poly([a, b, c, e], hue + "-1")
    );
  };

  if (kind === "twh") {
    /* tira de tres unidades pegadas, cada una con su hastial al frente */
    let s = slab(-0.6, -0.6, 16.2, 8.2, 0, 1, "slate");
    for (let i = 0; i < 3; i++) s += gab(i * 5.2, 0, 4.9, 7, 1, 8, 3.6, "blue");
    return s;
  }
  /* unifamiliar: cuerpo de dos plantas, hastial al frente y garaje bajo */
  let s = slab(-0.6, -0.6, 10.4, 8.6, 0, 0.9, "slate");
  s += gab(0, 1.6, 6.4, 6.4, 0.9, 8.2, 3.4, "blue"); /* cuerpo */
  s += gab(6.6, 0, 5.2, 5.6, 0, 4.4, 2.4, "blue"); /* garaje adelantado */
  return s;
}

/* ---------- el territorio ----------
   La retícula se acuesta en axonometría suave: sigue leyéndose de oeste a este
   como cualquier mapa de Estados Unidos, pero tiene profundidad. Lo que se
   levanta encima —las casitas— va recto, que es como se dibuja una implantación:
   el plano se tumba, los objetos no. */
const CW = 30,
  CH = 26; /* celda del mapa, antes de acostarla */
const MPX = (-11 * CW) / 2,
  MPY = (-8 * CH) / 2;
/* el plano tumbado: corre a la derecha al alejarse y se comprime en vertical */
const MSX = 0.4,
  MSY = -0.115,
  MDY = 0.58;
const mpt = (x, y) => [x + y * MSX, x * MSY + y * MDY];
const mx = (c) => MPX + c * CW,
  my = (r) => MPY + r * CH;
const mp = (x, y) => {
  const p = mpt(x, y);
  return p[0].toFixed(1) + "," + p[1].toFixed(1);
};

function mapSVG() {
  let s = "";
  s +=
    '<circle class="hq-dot" cx="0" cy="' +
    -MAPY +
    '" r="5"/>' +
    '<text class="hq-txt" x="16" y="' +
    (-MAPY + 3) +
    '">REMOTE CITY · HQ NETWORK</text>';

  /* de atrás hacia adelante, que en un plano tumbado también manda el orden */
  GRID.slice()
    .sort((a, b) => a[2] - b[2])
    .forEach((g) => {
      const code = g[0],
        X = mx(g[1]),
        Y = my(g[2]),
        W = CW - 4,
        H = CH - 4;
      const on = WON(code);
      let t =
        '<g class="st' +
        (on ? " on" : "") +
        '" data-s="' +
        code +
        '"' +
        (on ? ' tabindex="0" role="button" aria-label="' + code + '"' : "") +
        ">";
      /* la celda, ya acostada */
      const quad =
        mp(X, Y) +
        " " +
        mp(X + W, Y) +
        " " +
        mp(X + W, Y + H) +
        " " +
        mp(X, Y + H);
      t +=
        '<polygon class="st-cell' +
        (on ? " on" : "") +
        '" points="' +
        quad +
        '"/>';
      if (on) {
        const sfr = !!WSTATES[code].sfr;
        /* la casita se planta en el punto del plano, pero se dibuja de pie */
        /* la volumetría de la tipología, plantada en el punto del plano */
        /* el modelo crece hacia la izquierda desde su origen: hay que anclarlo
         a la derecha de la celda para que caiga centrado */
        const p = mpt(X + (sfr ? 11 : 12), Y + 6);
        t += miniModel(sfr ? "sfr" : "twh", p[0], p[1], sfr ? 0.82 : 0.66);
        const lp = mpt(X + 4, Y + H - 3);
        t +=
          '<text class="st-code" x="' +
          lp[0].toFixed(1) +
          '" y="' +
          lp[1].toFixed(1) +
          '">' +
          code +
          "</text>";
      }
      t += '<polygon points="' + quad + '" fill="transparent"/></g>';
      s += t;
    });

  /* el total, al pie del territorio */
  const tp = mpt(MPX - 16, my(10) + 44);
  s +=
    '<text class="tot-n" x="' +
    tp[0].toFixed(1) +
    '" y="' +
    tp[1].toFixed(1) +
    '">+2,500</text>' +
    '<text class="tot-l" x="' +
    (tp[0] + 2).toFixed(1) +
    '" y="' +
    (tp[1] + 26).toFixed(1) +
    '">' +
    u("totLine") +
    "</text>";
  return s;
}

/* ---------- tipologías ---------- */
/* ---------- volúmenes de tipología ----------
   No son iconos: son las dos casas que documentamos de verdad. La unifamiliar
   de Idaho —cuerpo bajo y ancho, hastial de entrada y garaje adelantado— y la
   tira de adosados, con su hastial repetido por unidad y el porche corrido. */

/* cuerpo con cubierta a dos aguas; la cumbrera corre en Y, así que el hastial
   mira al frente, que es como se ven estas casas desde la calle */
function gabY(bx, by, w, d, z, h, rise, c1, c2) {
  const A = P(bx, by, z + h),
    B = P(bx + w, by, z + h);
  const C = P(bx + w, by + d, z + h),
    D = P(bx, by + d, z + h);
  const R0 = P(bx + w / 2, by, z + h + rise),
    R1 = P(bx + w / 2, by + d, z + h + rise);
  return (
    box(bx, by, w, d, z, h, c1) +
    '<polygon class="f" points="' +
    pts([B, C, R1, R0]) +
    '" fill="var(--' +
    c2 +
    '-2)"/>' +
    '<polygon class="f" points="' +
    pts([A, D, R1, R0]) +
    '" fill="var(--' +
    c2 +
    '-3)"/>' +
    '<polygon class="f" points="' +
    pts([B, A, R0]) +
    '" fill="var(--' +
    c2 +
    '-1)"/>'
  );
}
/* la misma, girada: cumbrera en X para los cuerpos que se ven de lado */
function gabX(bx, by, w, d, z, h, rise, c1, c2) {
  const A = P(bx, by, z + h),
    B = P(bx + w, by, z + h);
  const C = P(bx + w, by + d, z + h),
    D = P(bx, by + d, z + h);
  const R0 = P(bx, by + d / 2, z + h + rise),
    R1 = P(bx + w, by + d / 2, z + h + rise);
  return (
    box(bx, by, w, d, z, h, c1) +
    '<polygon class="f" points="' +
    pts([A, B, R1, R0]) +
    '" fill="var(--' +
    c2 +
    '-2)"/>' +
    '<polygon class="f" points="' +
    pts([D, C, R1, R0]) +
    '" fill="var(--' +
    c2 +
    '-3)"/>' +
    '<polygon class="f" points="' +
    pts([B, C, R1]) +
    '" fill="var(--' +
    c2 +
    '-1)"/>'
  );
}

function typoModel(k, x, y) {
  let s = "";

  if (k === "sfr") {
    /* dos plantas con revestimiento vertical, garaje de una planta adelantado
       y porche cubierto: la producción típica de Texas e Idaho.
       Se pinta de atrás hacia adelante, que en isométrica es la profundidad. */
    s += box(x + 0.26, y + 0.82, 1.94, 1.26, 0, 0.1, "slate"); /* zócalo */
    s += gabX(
      x + 0.3,
      y + 0.86,
      1.86,
      1.18,
      0.1,
      0.9,
      0.4,
      "blue",
      "blue",
    ); /* cuerpo de dos plantas */
    s += box(x + 0.52, y + 1.3, 0.16, 0.16, 1.0, 0.3, "slate"); /* chimenea */
    s += gabY(
      x + 0.4,
      y + 0.28,
      0.88,
      0.92,
      0.1,
      0.98,
      0.46,
      "blue",
      "blue",
    ); /* hastial al frente */
    /* porche cubierto sobre la planta baja */
    s += box(x + 1.34, y + 0.3, 0.82, 0.28, 0.58, 0.05, "slate");
    [0, 1, 2].forEach(
      (i) =>
        (s += box(
          x + 1.4 + i * 0.34,
          y + 0.32,
          0.05,
          0.05,
          0.1,
          0.48,
          "slate",
        )),
    );
    /* garaje: una sola planta, adelantado y con su hastial */
    s += box(x + 2.16, y + 0.22, 1.22, 1.3, 0, 0.1, "slate");
    s += gabY(x + 2.2, y + 0.26, 1.14, 1.22, 0.1, 0.52, 0.34, "blue", "blue");
    return s;
  }

  if (k === "twh") {
    /* primero el zócalo corrido, que es lo que queda debajo de todo */
    s += box(x + 0.24, y + 0.51, 3.2, 1.43, 0, 0.16, "slate");
    /* cuatro unidades pegadas, cada una con su hastial al frente */
    for (let i = 0; i < 4; i++) {
      const bx = x + 0.28 + i * 0.78;
      s += gabY(bx, y + 0.55, 0.74, 1.35, 0.16, 0.82, 0.44, "blue", "blue");
      if (i < 3) s += box(bx + 0.74, y + 0.6, 0.04, 1.25, 0.16, 0.62, "slate");
    }
    /* el porche es una marquesina, no un muro: va a altura de alero */
    s += box(x + 0.26, y + 0.3, 3.16, 0.3, 0.6, 0.05, "slate");
    for (let i = 0; i < 5; i++)
      s += box(x + 0.3 + i * 0.78, y + 0.32, 0.05, 0.05, 0.16, 0.44, "slate");
    return s;
  }

  return s;
}

function typologySVG() {
  const spots = [
    [-4.6, -1.9],
    [0.9, -1.9],
    [-4.6, 1.8],
    [0.9, 1.8],
  ];
  let s = "";
  TYPES.forEach((t, i) => {
    const x = spots[i][0],
      y = spots[i][1];
    /* el rótulo sale del conjunto: a la izquierda o a la derecha según la columna */
    const left = i % 2 === 0;
    const c = left ? P(x - 0.5, y + 3.1, 0) : P(x + 3.7, y - 0.5, 0);
    const lx = c[0] + (left ? -13 : 13);
    s +=
      '<g class="ty" data-t="' +
      t[0] +
      '" tabindex="0" role="button" aria-label="' +
      t[1] +
      '">' +
      '<polygon class="ty-plate" points="' +
      pts([
        P(x - 0.5, y - 0.5, 0),
        P(x + 3.7, y - 0.5, 0),
        P(x + 3.7, y + 3.1, 0),
        P(x - 0.5, y + 3.1, 0),
      ]) +
      '"/>' +
      typoModel(t[0], x, y) +
      '<polygon points="' +
      pts([
        P(x - 0.5, y - 0.5, 2.6),
        P(x + 3.7, y - 0.5, 2.6),
        P(x + 3.7, y + 3.1, 2.6),
        P(x - 0.5, y + 3.1, 2.6),
      ]) +
      '" fill="transparent"/>' +
      '<line class="ty-lead" x1="' +
      n1(c[0]) +
      '" y1="' +
      n1(c[1]) +
      '" x2="' +
      n1(lx) +
      '" y2="' +
      n1(c[1]) +
      '"/>' +
      '<circle class="ty-dot" cx="' +
      n1(c[0]) +
      '" cy="' +
      n1(c[1]) +
      '" r="1.5"/>' +
      '<text class="ty-name" x="' +
      n1(lx + (left ? -5 : 5)) +
      '" y="' +
      n1(c[1] + 2.4) +
      '" text-anchor="' +
      (left ? "end" : "start") +
      '">' +
      t[1] +
      "</text></g>";
  });
  return s;
}

export { WSTATES, WTOTAL, TYPES, REGION, GRID, MAPY, mapSVG, typologySVG };
