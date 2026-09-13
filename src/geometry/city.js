import {
  box,
  windows,
  seg,
  P,
  shadows,
  SHK,
  n1,
  pts,
  IX,
  U,
  rng,
  IZ,
  IY,
  ftin,
} from "./primitives.js";
import { PB, NB, nbVoidLv } from "./building.js";
import { flat, FA, FB } from "./primitives.js";
import { DISTRICTS, dx } from "../content.js";

function tower(rnd, x, y, sx, sy, levels, c) {
  let s = "",
    z = 0;
  const LH = 1,
    GH = 1.4; /* altura de planta y de planta baja */

  /* planta baja retranqueada, acristalada, con las cuatro columnas a la vista
     y una marquesina fina sobre la entrada */
  s +=
    box(x + 0.34, y + 0.34, sx - 0.68, sy - 0.68, 0, GH, "stone") +
    windows(x + 0.34, y + 0.34, sx - 0.68, sy - 0.68, 0, GH);
  s += box(
    x + sx * 0.5 - 0.45,
    y + sy - 0.34,
    0.9,
    0.42,
    GH * 0.62,
    0.05,
    "stone",
  );
  [
    [x + 0.1, y + 0.1],
    [x + sx - 0.24, y + 0.1],
    [x + 0.1, y + sy - 0.24],
    [x + sx - 0.24, y + sy - 0.24],
  ]
    .sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
    .forEach((p) => {
      s += box(p[0], p[1], 0.14, 0.14, 0, GH, c);
    });
  z = GH;

  /* plantas tipo: losa + volumen + carpintería. Cada torre decide una vez si
     lleva balcones en la cara iluminada y parasoles en la de penumbra. */
  const balc = rnd() > 0.45,
    fins = rnd() > 0.5;
  let tx = x,
    ty = y,
    tw = sx,
    th = sy;
  for (let i = 0; i < levels; i++) {
    const set = i > levels * 0.64 ? 0.24 : 0;
    tx = x + set;
    ty = y + set;
    tw = sx - set * 2;
    th = sy - set * 2;
    s += box(tx - 0.08, ty - 0.08, tw + 0.16, th + 0.16, z, 0.08, "stone");
    s += box(tx, ty, tw, th, z + 0.08, LH - 0.08, c, 1);
    s += windows(tx, ty, tw, th, z + 0.08, LH - 0.08);
    if (balc && i > 0 && i % 2 === 1) {
      /* balcón: losa volada y baranda, en un tramo de la fachada iluminada */
      const bx = tx + tw * 0.18,
        bw = tw * 0.42,
        by = ty + th;
      s += box(bx, by, bw, 0.26, z + 0.08, 0.05, "stone");
      s +=
        seg(
          P(bx, by + 0.26, z + 0.13),
          P(bx + bw, by + 0.26, z + 0.13),
          "stone-4",
          ".4",
          ".9",
        ) +
        seg(
          P(bx, by + 0.26, z + 0.13),
          P(bx, by + 0.26, z + 0.46),
          "stone-4",
          ".4",
          ".9",
        ) +
        seg(
          P(bx + bw, by + 0.26, z + 0.13),
          P(bx + bw, by + 0.26, z + 0.46),
          "stone-4",
          ".4",
          ".9",
        ) +
        seg(
          P(bx, by + 0.26, z + 0.46),
          P(bx + bw, by + 0.26, z + 0.46),
          "stone-4",
          ".55",
          "1",
        );
    }
    if (fins)
      s += box(
        tx + tw,
        ty + 0.1,
        0.13,
        th - 0.2,
        z + LH - 0.14,
        0.045,
        "stone",
      ); /* parasol corrido */
    z += LH;
  }

  /* núcleo de circulación adosado al frente, con sus descansos */
  const cw = 0.46,
    cx = x + sx * 0.5 - cw / 2,
    cy = y + sy;
  s += box(cx, cy, cw, cw, 0, z - 0.6, "stone");
  for (let i = 1; i < Math.round(z - 0.6); i++)
    s += seg(P(cx, cy + cw, i), P(cx + cw, cy + cw, i), "stone-4", ".45", ".8");

  /* cubierta: parapeto, caja de escalera, tanque sobre patas y antena */
  s += box(tx - 0.06, ty - 0.06, tw + 0.12, th + 0.12, z, 0.12, "stone");
  if (rnd() > 0.35)
    s += box(tx + 0.16, ty + 0.16, 0.5, 0.5, z + 0.12, 0.45, "stone");
  if (rnd() > 0.45) {
    const bx = tx + tw - 0.72,
      by = ty + th - 0.72;
    s +=
      box(bx, by, 0.09, 0.09, z + 0.12, 0.32, "stone") +
      box(bx + 0.42, by + 0.42, 0.09, 0.09, z + 0.12, 0.32, "stone");
    s += box(bx - 0.06, by - 0.06, 0.6, 0.6, z + 0.44, 0.34, "stone");
  }
  if (rnd() > 0.5) {
    const a0 = P(tx + tw * 0.5, ty + th * 0.5, z + 0.12),
      a1 = P(tx + tw * 0.5, ty + th * 0.5, z + 1.6);
    s +=
      seg(a0, a1, "stone-4", ".7") +
      seg(a1, P(tx, ty + th, z + 0.12), "stone-4", ".35", ".6") +
      seg(a1, P(tx + tw, ty, z + 0.12), "stone-4", ".35", ".6");
  }
  return { svg: s, top: z + 0.12 };
}

function tree(rnd, x, y, c) {
  const hh = 0.8 + rnd() * 0.7,
    p0 = P(x, y, 0),
    p1 = P(x, y, hh);
  if (shadows.current) {
    const q = P(x + SHK[0] * hh * 0.6, y + SHK[1] * hh * 0.6, 0);
    shadows.current.push(
      '<ellipse cx="' +
        n1(q[0]) +
        '" cy="' +
        n1(q[1]) +
        '" rx="4.2" ry="2.1"/>',
    );
  }
  /* copa como esfera de maqueta: dos bolas con la luz arriba a la izquierda,
     sobre un tronco fino. Se consumen las mismas llamadas a rnd() que antes
     para no mover el resto del azar de la isla. */
  const r1 = 2.7 + rnd() * 1.7,
    dx = (rnd() - 0.5) * 3,
    r2 = r1 * (0.55 + rnd() * 0.2);
  let s =
    '<line x1="' +
    n1(p0[0]) +
    '" y1="' +
    n1(p0[1]) +
    '" x2="' +
    n1(p1[0]) +
    '" y2="' +
    n1(p1[1]) +
    '" stroke="var(--slate-4)" stroke-width="1.1" stroke-linecap="round"/>' +
    '<circle cx="' +
    n1(p1[0] + dx * 0.4) +
    '" cy="' +
    n1(p1[1] - r1 * 0.75) +
    '" r="' +
    n1(r1) +
    '" fill="url(#tb-' +
    c +
    ')"/>' +
    '<circle cx="' +
    n1(p1[0] + dx + r1 * 0.55) +
    '" cy="' +
    n1(p1[1] - r1 * 0.35) +
    '" r="' +
    n1(r2) +
    '" fill="url(#tb-' +
    c +
    ')"/>';
  for (let i = 0; i < 15; i++) rnd();
  return s;
}

function projSolid() {
  const b = PB;
  let s = "";
  for (let i = 0; i < b.lv; i++) {
    const z = i * b.lh;
    s +=
      box(b.x - 0.07, b.y - 0.07, b.w + 0.14, b.d + 0.14, z, 0.07, "stone") +
      box(b.x, b.y, b.w, b.d, z + 0.07, b.lh - 0.07, "purple") +
      windows(b.x, b.y, b.w, b.d, z + 0.07, b.lh - 0.07);
  }
  const zt = b.lv * b.lh;
  s +=
    box(b.x - 0.07, b.y - 0.07, b.w + 0.14, b.d + 0.14, zt, 0.1, "stone") +
    box(b.x + 0.45, b.y + 0.4, 0.85, 0.8, zt + 0.1, 0.44, "stone") +
    box(b.x + b.w - 1.7, b.y + b.d - 1.3, 1.1, 0.8, zt + 0.1, 0.3, "stone");
  return s;
}

function station(p, i, ox, oy, z, rot) {
  const hue = p.hue,
    vw = NB.vw,
    vd = NB.vd,
    it = [];
  /* Coordenadas locales del vano: "a" corre a lo ancho y "b" avanza hacia la
     abertura. Si el cuerpo se abre por la cara derecha, el puesto gira con él
     y no hay que reescribir un solo mueble. La profundidad de pintado es a+b,
     que es la misma con giro y sin él. */
  const B = rot
    ? (a, b, w, d, zz, hh, c) => box(ox + b, oy + a, d, w, zz, hh, c)
    : (a, b, w, d, zz, hh, c) => box(ox + a, oy + b, w, d, zz, hh, c);
  const Q = rot
    ? (a, b, zz) => P(ox + b, oy + a, zz)
    : (a, b, zz) => P(ox + a, oy + b, zz);
  const W = rot ? vd : vw,
    DP = rot ? vw : vd; /* la huella, ya girada */

  it.push({
    d: -9,
    s:
      '<polygon class="seat-plate" points="' +
      pts([
        P(ox, oy, z),
        P(ox + W, oy, z),
        P(ox + W, oy + DP, z),
        P(ox, oy + DP, z),
      ]) +
      '" fill="var(--' +
      hue +
      '-1)"/>',
  });
  /* persona sentada, contra el fondo del vano */
  it.push({
    d: 0.58,
    s:
      B(0.42, 0.16, 0.34, 0.3, z, 0.22, "stone") +
      B(0.42, 0.12, 0.34, 0.06, z + 0.22, 0.32, hue),
  });
  const hp = Q(0.59, 0.34, z + 0.22);
  it.push({
    d: 0.68,
    s:
      B(0.46, 0.22, 0.26, 0.24, z + 0.22, 0.3, hue) +
      '<circle cx="' +
      n1(hp[0]) +
      '" cy="' +
      n1(hp[1] - 11.8) +
      '" r="2.9" fill="var(--ink-soft)"/>',
  });
  /* escritorio y monitor, contra el vano */
  it.push({
    d: 0.92,
    s:
      B(0.32, 0.6, 0.05, 0.3, z, 0.3, "stone") +
      B(1.06, 0.6, 0.05, 0.3, z, 0.3, "stone") +
      B(0.24, 0.55, 0.96, 0.42, z + 0.3, 0.06, "stone"),
  });
  it.push({
    d: 1.12,
    s:
      B(0.52, 0.6, 0.05, 0.28, z + 0.36, 0.03, "slate") +
      B(0.5, 0.58, 0.04, 0.32, z + 0.39, 0.22, "slate") +
      B(0.475, 0.57, 0.025, 0.34, z + 0.4, 0.2, hue),
  });
  const pl = Q(1.32, 0.85, z + 0.12);
  it.push({
    d: 2.05,
    s:
      B(1.26, 0.79, 0.13, 0.13, z, 0.12, "stone") +
      '<circle cx="' +
      n1(pl[0]) +
      '" cy="' +
      n1(pl[1] - 4.2) +
      '" r="3.6" fill="var(--slate-2)" opacity=".75"/>',
  });

  return (
    '<g class="seat" data-i="' +
    i +
    '" tabindex="0" role="button" aria-label="' +
    p.name +
    '">' +
    it
      .sort((a, b) => a.d - b.d)
      .map((o) => o.s)
      .join("") +
    '<polygon points="' +
    pts([
      P(ox, oy, z + 0.75),
      P(ox + W, oy, z + 0.75),
      P(ox + W, oy + DP, z + 0.75),
      P(ox, oy + DP, z + 0.75),
    ]) +
    '" fill="transparent"/>' +
    "</g>"
  );
}

function netTags(people) {
  const b = NB;
  const right = Math.max.apply(
    null,
    b.vols.map((v) => b.x + v.x + v.w),
  );
  return b.vols
    .map((v) => {
      const k = v.pi,
        lv = nbVoidLv(v);
      const rot = v.side === "x",
        zv = lv * b.lh + 0.08,
        hue = people[k].hue;
      const vx = rot ? b.x + v.x + v.w - b.vd : b.x + v.x + v.vx;
      const vy = rot ? b.y + v.y + v.vx : b.y + v.y + v.d - b.vd;
      /* la línea de llamada nace en el borde exterior de la abertura */
      const a = rot
        ? P(vx + b.vd, vy + b.vw * 0.5, zv + 0.42)
        : P(vx + b.vw, vy + b.vd * 0.55, zv + 0.42);
      const bu = [(right - b.y) * IX * U + 44, a[1] - 24];
      return (
        '<g class="seat-tag" data-i="' +
        k +
        '" tabindex="0" role="button" aria-label="' +
        people[k].name +
        '">' +
        '<polyline class="seat-lead" points="' +
        n1(a[0]) +
        "," +
        n1(a[1]) +
        " " +
        n1(a[0] + 22) +
        "," +
        n1(bu[1]) +
        " " +
        n1(bu[0] - 8) +
        "," +
        n1(bu[1]) +
        '" stroke="var(--' +
        hue +
        '-3)"/>' +
        '<circle class="seat-dot" cx="' +
        n1(a[0]) +
        '" cy="' +
        n1(a[1]) +
        '" r="1.7" fill="var(--' +
        hue +
        '-3)"/>' +
        '<circle class="seat-bub" cx="' +
        n1(bu[0]) +
        '" cy="' +
        n1(bu[1]) +
        '" r="7.6" stroke="var(--' +
        hue +
        '-3)"/>' +
        '<text class="seat-num" x="' +
        n1(bu[0]) +
        '" y="' +
        n1(bu[1] + 1.7) +
        '" fill="var(--' +
        hue +
        '-3)">0' +
        (k + 1) +
        "</text>" +
        '<text class="seat-name" x="' +
        n1(bu[0] + 12) +
        '" y="' +
        n1(bu[1] + 2.2) +
        '" fill="var(--' +
        hue +
        '-4)">' +
        people[k].name.split(" ")[0].toUpperCase() +
        "</text></g>"
      );
    })
    .join("");
}

function netBuilding(people, hue) {
  const b = NB;
  /* los cuerpos se pintan de atrás hacia adelante */
  const order = b.vols
    .slice()
    .sort(
      (p, q) => p.x + p.y + (p.w + p.d) / 2 - (q.x + q.y + (q.w + q.d) / 2),
    );
  let s = "";
  order.forEach((v) => {
    const bx = b.x + v.x,
      by = b.y + v.y,
      back = v.d - b.vd,
      vlv = nbVoidLv(v);
    for (let i = 0; i < v.lv; i++) {
      const z = i * b.lh,
        zv = z + 0.08;
      s += box(bx - 0.07, by - 0.07, v.w + 0.14, v.d + 0.14, z, 0.08, "stone");
      if (i !== vlv) {
        s +=
          box(bx, by, v.w, v.d, zv, b.lh - 0.08, hue) +
          windows(bx, by, v.w, v.d, zv, b.lh - 0.08);
      } else {
        /* por defecto el vano se abre a la cara de mayor Y; con side:"x" se
           abre a la de mayor X. El resto del paño se arma igual en los dos
           casos: fondo ciego, machón de atrás, dintel, puesto y machón de
           delante, que va el último porque es el que puede tapar. */
        const rot = v.side === "x";
        const wall = (x, y, w, d) =>
          box(x, y, w, d, zv, b.lh - 0.08, hue) +
          windows(x, y, w, d, zv, b.lh - 0.08);
        const vx = rot ? bx + v.w - b.vd : bx + v.vx;
        const vy = rot ? by + v.vx : by + back;
        const vsx = rot ? b.vd : b.vw,
          vsy = rot ? b.vw : b.vd;
        const r = (rot ? v.d : v.w) - (v.vx + b.vw);
        s += rot ? wall(bx, by, v.w - b.vd, v.d) : wall(bx, by, v.w, back);
        if (v.vx > 0.02)
          s += rot ? wall(vx, by, b.vd, v.vx) : wall(bx, vy, v.vx, b.vd);
        s += box(
          vx,
          vy,
          vsx,
          vsy,
          zv + b.lh - 0.3,
          0.22,
          "stone",
        ); /* dintel del vano */
        s += station(people[v.pi], v.pi, vx, vy, zv, rot);
        if (r > 0.02)
          s += rot
            ? wall(vx, vy + b.vw, b.vd, r)
            : wall(vx + b.vw, vy, r, b.vd);
      }
    }
    /* remate: losa de cubierta y algún equipo */
    const zt = v.lv * b.lh;
    s += box(bx - 0.09, by - 0.09, v.w + 0.18, v.d + 0.18, zt, 0.11, "stone");
    if (v.w > 1.8)
      s += box(bx + 0.35, by + 0.3, 0.6, 0.5, zt + 0.11, 0.34, "stone");
    else
      s += box(
        bx + v.w - 0.7,
        by + v.d - 0.6,
        0.5,
        0.4,
        zt + 0.11,
        0.24,
        "stone",
      );
  });
  return s;
}

function workStation(hue) {
  let s = "";
  /* marcas de la plataforma, planas sobre la losa */
  let m =
    '<circle class="pad-ring" cx="0" cy="0" r="2.05"/>' +
    '<circle class="pad-ring2" cx="0" cy="0" r="1.35"/>';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    m +=
      '<line class="pad-tick" x1="' +
      (Math.cos(a) * 1.5).toFixed(2) +
      '" y1="' +
      (Math.sin(a) * 1.5).toFixed(2) +
      '" x2="' +
      (Math.cos(a) * 1.98).toFixed(2) +
      '" y2="' +
      (Math.sin(a) * 1.98).toFixed(2) +
      '"/>';
  }
  m +=
    '<rect class="pad-mark" x="-.46" y="-.7" width=".2" height="1.4"/>' +
    '<rect class="pad-mark" x=".26" y="-.7" width=".2" height="1.4"/>' +
    '<rect class="pad-mark" x="-.46" y="-.1" width=".92" height=".2"/>';
  s += '<g transform="' + flat(0, 0, 0.03) + '">' + m + "</g>";
  /* la nave amarrada, sobre sus patas */
  [
    [-0.95, -0.75],
    [0.5, -0.75],
    [-0.95, 0.4],
    [0.5, 0.4],
  ].forEach((p) => (s += box(p[0], p[1], 0.13, 0.13, 0, 0.6, "slate")));
  s +=
    box(-1, -0.8, 1.65, 1.3, 0.6, 0.5, hue) +
    box(-0.8, -0.6, 1.25, 0.9, 1.1, 0.32, "stone") +
    box(-0.55, -0.35, 0.75, 0.4, 1.42, 0.14, hue);
  /* torre de control con su mástil y baliza */
  s +=
    box(2, -2.6, 0.5, 0.5, 0, 3.2, "stone") +
    box(1.78, -2.82, 0.94, 0.94, 3.2, 0.55, hue) +
    box(1.95, -2.65, 0.6, 0.6, 3.75, 0.16, "stone");
  const t1 = P(2.25, -2.35, 3.91),
    t2 = P(2.25, -2.35, 4.8);
  s +=
    '<line class="mast" x1="' +
    n1(t1[0]) +
    '" y1="' +
    n1(t1[1]) +
    '" x2="' +
    n1(t2[0]) +
    '" y2="' +
    n1(t2[1]) +
    '"/>' +
    '<circle class="beacon" cx="' +
    n1(t2[0]) +
    '" cy="' +
    n1(t2[1]) +
    '" r="2.3"/>';
  /* balizas de pista */
  [
    [-2.1, -2.1],
    [2.1, 2.1],
    [-2.1, 2.1],
  ].forEach((p) => {
    const q = P(p[0], p[1], 0.18);
    s +=
      box(p[0] - 0.09, p[1] - 0.09, 0.18, 0.18, 0, 0.18, "slate") +
      '<circle class="padlight" cx="' +
      n1(q[0]) +
      '" cy="' +
      n1(q[1] - 2) +
      '" r="1.7"/>';
  });
  /* vector de descenso hacia el territorio */
  const d0 = P(0, 0, -0.6),
    d1 = P(0, 0, -4.6);
  s +=
    '<line class="traj" x1="' +
    n1(d0[0]) +
    '" y1="' +
    n1(d0[1]) +
    '" x2="' +
    n1(d1[0]) +
    '" y2="' +
    n1(d1[1]) +
    '"/>' +
    '<polygon class="traj-tip" points="' +
    n1(d1[0] - 3.4) +
    "," +
    n1(d1[1] - 5) +
    " " +
    n1(d1[0] + 3.4) +
    "," +
    n1(d1[1] - 5) +
    " " +
    n1(d1[0]) +
    "," +
    n1(d1[1] + 2) +
    '"/>';
  return s;
}

function buildIsland(sp) {
  const rnd = rng(sp.seed),
    n = sp.size,
    h = n / 2;
  const c = sp.hue;
  /* las islas sin distrito asignado quedan en gris: el color marca lo navegable */
  const acc = sp.district ? sp.hue : "slate";
  let s = "";

  /* raíz: cono invertido, sub-raíces y enredaderas colgantes */
  const apex = P(
    (rnd() - 0.5) * 0.8,
    (rnd() - 0.5) * 0.8,
    -n * (0.85 + rnd() * 0.4),
  );
  s +=
    '<polygon class="f" points="' +
    pts([P(-h, h, -0.5), P(h, h, -0.5), apex]) +
    '" fill="var(--stone-2)"/>';
  s +=
    '<polygon class="f" points="' +
    pts([P(h, -h, -0.5), P(h, h, -0.5), apex]) +
    '" fill="var(--stone-3)"/>';
  for (let i = 0; i < 4; i++) {
    const ex = -h + rnd() * n;
    const sub = P(
      ex + (rnd() - 0.5),
      h - rnd() * 1.4,
      -n * (0.35 + rnd() * 0.5),
    );
    s +=
      '<polygon points="' +
      pts([P(ex - 0.7, h, -0.5), P(ex + 0.7, h, -0.5), sub]) +
      '" fill="var(--stone-3)" opacity=".9"/>';
  }
  for (let i = 0; i < 7; i++) {
    const t = rnd();
    const a =
      t < 0.5 ? P(-h + t * 2 * n, h, -0.5) : P(h, h - (t - 0.5) * 2 * n, -0.5);
    const len = 12 + rnd() * 30,
      dx = (rnd() - 0.5) * 7;
    s +=
      '<path d="M' +
      n1(a[0]) +
      " " +
      n1(a[1]) +
      " q" +
      n1(dx) +
      " " +
      n1(len * 0.6) +
      " " +
      n1(dx * 0.6) +
      " " +
      n1(len) +
      '" stroke="var(--' +
      acc +
      '-2)" stroke-width=".85" fill="none" opacity=".5"/>';
  }

  /* viga de fundación bajo la losa */
  s += box(-h + 0.45, -h + 0.45, n - 0.9, n - 0.9, -0.95, 0.45, "stone");

  /* plataforma: losa, estratos del canto y solado de la plaza */
  s += box(-h, -h, n, n, -0.5, 0.5, "stone");
  s +=
    '<polyline points="' +
    pts([P(-h, h, -0.16), P(h, h, -0.16), P(h, -h, -0.16)]) +
    '" fill="none" stroke="var(--stone-4)" stroke-width=".45" opacity=".75"/>';
  s +=
    '<polyline points="' +
    pts([P(-h, h, -0.33), P(h, h, -0.33), P(h, -h, -0.33)]) +
    '" fill="none" stroke="var(--stone-4)" stroke-width=".35" opacity=".45"/>';
  const ins = 0.55;
  s +=
    '<polygon points="' +
    pts([
      P(-h + ins, -h + ins, 0),
      P(h - ins, -h + ins, 0),
      P(h - ins, h - ins, 0),
      P(-h + ins, h - ins, 0),
    ]) +
    '" fill="url(#gt-stone)" opacity=".75"/>';
  for (let i = 1; i < n; i++) {
    s += seg(
      P(-h + i, -h + ins, 0),
      P(-h + i, h - ins, 0),
      "stone-4",
      ".3",
      ".45",
    );
    s += seg(
      P(-h + ins, -h + i, 0),
      P(h - ins, -h + i, 0),
      "stone-4",
      ".3",
      ".45",
    );
  }
  /* desde aquí, todo lo que se levanta deja sombra sobre la losa */
  shadows.current = [];

  /* elementos ordenados por profundidad (algoritmo del pintor) */
  const items = [];
  /* las torres se agrupan en el centro de la plataforma, la más alta al medio */
  const slots = [
    [0, 0],
    [-1, 0.65],
    [0.9, -0.75],
    [-0.85, -0.95],
    [1, 1.05],
  ];
  const proj = sp.id === "services"; /* el distrito central lleva el proyecto */
  const net = sp.id === "team"; /* la red vive en un edificio abierto */
  const port = sp.id === "work"; /* WORK es la terminal de partida */
  const nT = proj || net || port ? 2 : n > 6.5 ? 5 : n > 4.5 ? 3 : 2;
  let topZ = 0;
  if (proj) {
    topZ = PB.lv * PB.lh + 0.52;
    items.push({
      d: PB.x + PB.y + (PB.w + PB.d) / 2,
      s: '<g class="proj-solid">' + projSolid() + "</g>",
    });
  }
  if (port) {
    topZ = 5.2;
    items.push({ d: 0, s: workStation(c) });
  }
  if (net) {
    topZ =
      Math.max.apply(
        null,
        NB.vols.map((v) => v.lv * NB.lh),
      ) + 0.6;
    items.push({ d: 0, s: netBuilding(sp.people, sp.hue) });
  }
  for (
    let i = proj || net || port ? 3 : 0;
    i < (proj || net || port ? 5 : nT);
    i++
  ) {
    const sx = proj || net || port ? 1.2 : 1.5 + rnd() * 1.0,
      sy = proj || net || port ? 1.2 : 1.5 + rnd() * 1.0;
    const anx = proj
      ? [
          [-3.2, 1.9],
          [2, -3.2],
        ][i - 3]
      : net
        ? [
            [-3.4, 2.4],
            [2.2, -3.4],
          ][i - 3]
        : port
          ? [
              [-3.1, 2.4],
              [2.6, 2.4],
            ][i - 3]
          : null; /* anexos en las esquinas libres */
    const x = anx
      ? anx[0]
      : slots[i][0] * n * 0.21 - sx / 2 + (rnd() - 0.5) * 0.5;
    const y = anx
      ? anx[1]
      : slots[i][1] * n * 0.21 - sy / 2 + (rnd() - 0.5) * 0.5;
    const lv =
      net || port
        ? 2
        : proj
          ? Math.round(2 + rnd() * 2)
          : i === 0
            ? Math.round(5 + rnd() * 3 + n * 0.35)
            : Math.round(2 + rnd() * 4);
    /* en la isla de la red los anexos van neutros: el protagonista es el edificio abierto */
    const col =
      net || port
        ? rnd() > 0.5
          ? "stone"
          : "slate"
        : sp.district
          ? i === 0
            ? c
            : rnd() > 0.35
              ? c
              : "stone"
          : rnd() > 0.5
            ? "stone"
            : "slate";
    const t = tower(rnd, x, y, sx, sy, lv, col);
    if (t.top > topZ) topZ = t.top;
    items.push({ d: x + y + (sx + sy) / 2, s: t.svg });
  }
  /* los árboles bordean el perímetro, como en el distrito residencial */
  for (let i = 0, m = Math.round(5 + n); i < m; i++) {
    const side = i % 4,
      t = 0.7 + rnd() * (n - 1.4);
    const x = side === 0 ? -h + 0.6 : side === 1 ? h - 0.6 : -h + t;
    const y =
      side === 0 || side === 1 ? -h + t : side === 2 ? -h + 0.6 : h - 0.6;
    items.push({ d: x + y, s: tree(rnd, x, y, acc) });
  }

  /* barandas de las dos aristas frontales */
  let rail = "";
  for (let i = 0; i <= n; i++) {
    const A = P(-h + i, h, 0),
      B = P(-h + i, h, 0.5),
      C = P(h, -h + i, 0),
      D = P(h, -h + i, 0.5);
    rail +=
      '<line x1="' +
      n1(A[0]) +
      '" y1="' +
      n1(A[1]) +
      '" x2="' +
      n1(B[0]) +
      '" y2="' +
      n1(B[1]) +
      '" stroke="var(--stone-4)" stroke-width=".5"/>' +
      '<line x1="' +
      n1(C[0]) +
      '" y1="' +
      n1(C[1]) +
      '" x2="' +
      n1(D[0]) +
      '" y2="' +
      n1(D[1]) +
      '" stroke="var(--stone-4)" stroke-width=".5"/>';
  }
  rail +=
    '<polyline points="' +
    pts([P(-h, h, 0.5), P(h, h, 0.5), P(h, -h, 0.5)]) +
    '" fill="none" stroke="var(--stone-4)" stroke-width=".6"/>';
  items.push({ d: n * 2, s: rail });

  /* placa de maqueta en el canto del zócalo: nombre del distrito y escala */
  if (sp.district) {
    const d = DISTRICTS.find((q) => q.id === sp.id),
      k = DISTRICTS.indexOf(d);
    const o = P(-h + 0.55, h, -0.07);
    const M =
      "matrix(" +
      FA.toFixed(3) +
      "," +
      FB.toFixed(3) +
      ",0," +
      (IZ * U).toFixed(3) +
      "," +
      n1(o[0]) +
      "," +
      n1(o[1]) +
      ")";
    items.push({
      d: n * 2 + 0.5,
      s:
        '<g class="plq" transform="' +
        M +
        '">' +
        '<rect class="plq-bg" x="0" y="0" width="1.8" height=".38" rx=".012"/>' +
        '<text class="plq-t b" x=".10" y=".165" font-size=".125">' +
        dx(d, "label") +
        "</text>" +
        '<text class="plq-t" x=".10" y=".31" font-size=".085">SECTOR ' +
        String(k + 1).padStart(2, "0") +
        " · REMOTE CITY · 1:50</text>" +
        "</g>",
    });
  }

  /* capa de detalle: gente y vehículos, sólo visibles al aterrizar. Entran en
     la misma cola que todo lo demás y no encima: si van al final, un coche que
     está detrás del edificio se dibuja sobre la fachada. */
  if (sp.district) {
    /* figuras de escala: cuerpo blanco mate y cabeza, con su sombra corta
       hacia la derecha, como las de una maqueta bajo el foco */
    const figure = (x, y) => {
      const a = P(x, y, 0),
        b = P(x, y, 0.46);
      return (
        '<ellipse cx="' +
        n1(a[0] + 1.4) +
        '" cy="' +
        n1(a[1] + 0.3) +
        '" rx="2.3" ry=".95" fill="var(--ink)" opacity=".16"/>' +
        '<rect class="fig" x="' +
        n1(a[0] - 0.95) +
        '" y="' +
        n1(b[1]) +
        '" width="1.9" height="' +
        n1(a[1] - b[1]) +
        '" rx=".95"/>' +
        '<circle class="fig" cx="' +
        n1(a[0]) +
        '" cy="' +
        n1(b[1] - 1.25) +
        '" r="1.05"/>'
      );
    };
    for (let i = 0; i < 9; i++) {
      const x = -h + 0.8 + rnd() * (n - 1.6),
        y = -h + 0.8 + rnd() * (n - 1.6);
      items.push({ d: x + y, s: '<g class="detail">' + figure(x, y) + "</g>" });
    }
    /* y algunas caminan por las aceras del borde, de ida y vuelta */
    const L = n - 2.2;
    for (let i = 0; i < 3; i++) {
      const along = i < 2; /* dos por el frente, una por el lateral */
      const t = 0.3 + rnd() * 0.4,
        x = along ? -h + 1.1 + t * L * 0.5 : h - 0.8,
        y = along ? h - 0.8 : -h + 1.1 + t * L * 0.5;
      const wx = along ? IX * U * L * 0.5 : -IX * U * L * 0.5,
        wy = IY * U * L * 0.5;
      items.push({
        d: n * 1.6,
        s:
          '<g class="detail walk" style="--wx:' +
          n1(wx) +
          "px;--wy:" +
          n1(wy) +
          "px;--dur:" +
          (14 + rnd() * 9).toFixed(1) +
          "s;--del:-" +
          (rnd() * 12).toFixed(1) +
          's">' +
          figure(x, y) +
          "</g>",
      });
    }
    for (let i = 0; i < 2; i++) {
      const x = -h + 1 + rnd() * (n - 2.5),
        y = -h + 1 + rnd() * (n - 2.5);
      items.push({
        d: x + y + 0.75,
        s:
          '<g class="detail">' +
          box(x, y, 0.95, 0.55, 0, 0.3, "stone") +
          box(x + 0.2, y + 0.08, 0.5, 0.4, 0.3, 0.18, acc) +
          "</g>",
      });
    }
  }

  items.sort((a, b) => a.d - b.d);

  /* capa técnica: ejes, cota del lado y nivel de coronamiento.
     Sólo aparece al aterrizar, cuando el zoom la vuelve legible. */
  let tech = "";
  if (sp.district) {
    const ext = 2.6;

    /* ejes de replanteo, con su globo de identificación */
    const axis = (a, b, label) => {
      const A = P(a[0], a[1], 0),
        B = P(b[0], b[1], 0);
      return (
        '<line x1="' +
        n1(A[0]) +
        '" y1="' +
        n1(A[1]) +
        '" x2="' +
        n1(B[0]) +
        '" y2="' +
        n1(B[1]) +
        '" stroke="var(--ink-soft)" stroke-width=".6" stroke-dasharray="7 2 1.5 2" opacity=".7"/>' +
        '<circle cx="' +
        n1(B[0]) +
        '" cy="' +
        n1(B[1]) +
        '" r="3.4" fill="var(--sky-0)" stroke="var(--ink-soft)" stroke-width=".6"/>' +
        '<text x="' +
        n1(B[0]) +
        '" y="' +
        n1(B[1] + 1.9) +
        '" text-anchor="middle">' +
        label +
        "</text>"
      );
    };
    tech +=
      axis([-h - ext, 0], [h + ext, 0], "A") +
      axis([0, -h - ext], [0, h + ext], "1");

    /* cota del lado sobre la arista frontal */
    const c0 = P(-h, h + 1.7, 0),
      c1 = P(h, h + 1.7, 0);
    tech +=
      '<line x1="' +
      n1(c0[0]) +
      '" y1="' +
      n1(c0[1]) +
      '" x2="' +
      n1(c1[0]) +
      '" y2="' +
      n1(c1[1]) +
      '" stroke="var(--ink-soft)" stroke-width=".6"/>' +
      seg(P(-h, h + 1.2, 0), P(-h, h + 2.2, 0), "ink-soft", ".6") +
      seg(P(h, h + 1.2, 0), P(h, h + 2.2, 0), "ink-soft", ".6") +
      '<text x="' +
      n1((c0[0] + c1[0]) / 2) +
      '" y="' +
      n1((c0[1] + c1[1]) / 2 + 7) +
      '" text-anchor="middle">' +
      ftin(n) +
      "</text>";

    /* nivel de coronamiento de la torre principal */
    const t0 = P(0, -h - 0.6, topZ);
    tech +=
      '<line x1="' +
      n1(t0[0]) +
      '" y1="' +
      n1(t0[1]) +
      '" x2="' +
      n1(t0[0] + 40) +
      '" y2="' +
      n1(t0[1]) +
      '" stroke="var(--ink-soft)" stroke-width=".6" stroke-dasharray="4 3"/>' +
      '<polygon points="' +
      n1(t0[0] - 3) +
      "," +
      n1(t0[1] - 4.4) +
      " " +
      n1(t0[0] + 3) +
      "," +
      n1(t0[1] - 4.4) +
      " " +
      n1(t0[0]) +
      "," +
      n1(t0[1]) +
      '" fill="none" stroke="var(--ink-soft)" stroke-width=".6"/>' +
      '<text x="' +
      n1(t0[0] + 44) +
      '" y="' +
      n1(t0[1] + 2) +
      '">+' +
      ftin(topZ) +
      "</text>";
  }

  /* llamadas de detalle: una por servicio que tenga visor, con su
     globo, su número y la línea quebrada hasta el punto del edificio */
  let calls = "";
  /* tres anclajes: izquierda arriba, derecha arriba y derecha abajo */
  const CP = [
    { l: 1, tx: -1.2, ty: 0.6, tz: 0.42, f: 0.55, dx: 0 },
    { l: 0, tx: 1.4, ty: -1.4, tz: 0.66, f: 0.8, dx: 0 },
    { l: 0, tx: 1.3, ty: 1.6, tz: 0.02, f: -1.05, dx: 34 },
  ];
  (sp.items || [])
    .filter((it) => it[3])
    .forEach((it, i) => {
      const c = CP[i] || CP[0],
        left = !!c.l;
      const tp = P(c.tx, c.ty, topZ * c.tz);
      const bx = (left ? -1 : 1) * (h * U * IX + 62 + (c.dx || 0));
      const by = -topZ * U * IZ * c.f - 24;
      calls +=
        '<g class="call" data-lab="' +
        it[3] +
        '" tabindex="0" role="button" aria-label="Abrir ' +
        it[1] +
        '">' +
        '<polyline class="call-line" points="' +
        n1(bx) +
        "," +
        n1(by + (by > tp[1] ? -13 : 13)) +
        " " +
        n1(bx) +
        "," +
        n1(tp[1]) +
        " " +
        n1(tp[0]) +
        "," +
        n1(tp[1]) +
        '"/>' +
        '<circle class="call-dot" cx="' +
        n1(tp[0]) +
        '" cy="' +
        n1(tp[1]) +
        '" r="2.4"/>' +
        '<circle class="call-bub" cx="' +
        n1(bx) +
        '" cy="' +
        n1(by) +
        '" r="11"/>' +
        '<text class="call-num" x="' +
        n1(bx) +
        '" y="' +
        n1(by + 2.4) +
        '">' +
        it[0] +
        "</text>" +
        '<text class="call-name" x="' +
        n1(bx + (left ? -16 : 16)) +
        '" y="' +
        n1(by + 3) +
        '" text-anchor="' +
        (left ? "end" : "start") +
        '">' +
        it[1].toUpperCase() +
        "</text>" +
        "</g>";
    });

  /* las sombras van sobre la losa y recortadas a ella: la isla flota, y lo
     que cae fuera del borde no tiene dónde caer */
  const cid = "cp-" + sp.id;
  const shd =
    '<clipPath id="' +
    cid +
    '"><polygon points="' +
    pts([P(-h, -h, 0), P(h, -h, 0), P(h, h, 0), P(-h, h, 0)]) +
    '"/></clipPath>' +
    '<g class="shd" clip-path="url(#' +
    cid +
    ')">' +
    shadows.current.join("") +
    "</g>";
  shadows.current = null;

  const bw = n * U * IX,
    bh = n * U * IY;
  return {
    svg:
      '<ellipse class="glow" cx="0" cy="' +
      n1(bh * 0.2) +
      '" rx="' +
      bw.toFixed(0) +
      '" ry="' +
      (bh * 1.4).toFixed(0) +
      '" fill="var(--' +
      acc +
      '-1)" filter="url(#blur)"/>' +
      s +
      shd +
      items.map((i) => i.s).join("") +
      /* el corte y el modelo se dibujan sobre todo lo demás de la isla */
      (sp.id === "services"
        ? '<g class="proj-cut"></g><g class="proj-bim"></g>'
        : "") +
      (sp.id === "team" ? netTags(sp.people) : "") +
      '<g class="tech">' +
      tech +
      "</g>" +
      calls +
      '<polygon class="frame" points="' +
      pts([
        P(-h - 1.2, -h - 1.2, 0),
        P(h + 1.2, -h - 1.2, 0),
        P(h + 1.2, h + 1.2, 0),
        P(-h - 1.2, h + 1.2, 0),
      ]) +
      '"/>' +
      '<polygon class="ring" points="' +
      pts([
        P(-h - 2, -h - 2, 0),
        P(h + 2, -h - 2, 0),
        P(h + 2, h + 2, 0),
        P(-h - 2, h + 2, 0),
      ]) +
      '"/>' +
      '<polygon points="' +
      pts([
        P(-h, -h, topZ + 1),
        P(h, -h, topZ + 1),
        P(h, h, topZ + 1),
        P(-h, h, topZ + 1),
      ]) +
      '" fill="transparent"/>',
    topY: -(topZ * U * IZ + n * U * IY * 0.5 + 26),
    topZ: topZ,
  };
}

export { buildIsland };
