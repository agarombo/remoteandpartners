import { flat, U, IZ, box, windows, n1, P, ftin } from "./primitives.js";
import { PB, EXT, PDOORS, PWIN, PW, PGX, PGY, PROOMS } from "./building.js";
import { SHEETS, u } from "../content.js";

const fR = (x, y, w, h, c) =>
  '<rect x="' +
  x.toFixed(3) +
  '" y="' +
  y.toFixed(3) +
  '" width="' +
  w.toFixed(3) +
  '" height="' +
  h.toFixed(3) +
  '" class="' +
  c +
  '"/>';

const fL = (x1, y1, x2, y2, c) =>
  '<line x1="' +
  x1.toFixed(3) +
  '" y1="' +
  y1.toFixed(3) +
  '" x2="' +
  x2.toFixed(3) +
  '" y2="' +
  y2.toFixed(3) +
  '" class="' +
  c +
  '"/>';

const fC = (x, y, r, c) =>
  '<circle cx="' +
  x.toFixed(3) +
  '" cy="' +
  y.toFixed(3) +
  '" r="' +
  r.toFixed(3) +
  '" class="' +
  c +
  '"/>';

function projFurniture() {
  let s = "";
  /* garaje: dos coches y la puerta seccional */
  [
    [0.2, 0.35],
    [0.98, 0.35],
  ].forEach(
    (p) =>
      (s +=
        '<rect x="' +
        p[0] +
        '" y="' +
        p[1] +
        '" width=".52" height="1.30" rx=".16" class="fl-fine"/>' +
        '<rect x="' +
        (p[0] + 0.09) +
        '" y="' +
        (p[1] + 0.3) +
        '" width=".34" height=".38" rx=".08" class="fl-fine"/>'),
  );
  /* zaguán: escalera de 14 huellas con su flecha de subida */
  for (let i = 0; i < 14; i++)
    s += fL(1.8, 0.18 + i * 0.085, 2.4, 0.18 + i * 0.085, "fl-fine");
  s +=
    fL(2.1, 1.32, 2.1, 0.24, "fl-thin") +
    fL(2.04, 0.37, 2.1, 0.24, "fl-thin") +
    fL(2.16, 0.37, 2.1, 0.24, "fl-thin");
  /* estudio: escritorio y silla */
  s += fR(2.62, 0.18, 0.95, 0.3, "fl-thin") + fC(3.1, 0.62, 0.13, "fl-fine");
  s += fR(3.6, 0.18, 0.28, 0.9, "fl-fine");
  /* cocina: mesadas en L, isla, bajo mesada y heladera */
  s +=
    fR(2.52, 1.48, 1.4, 0.28, "fl-thin") +
    fR(3.64, 1.76, 0.28, 0.86, "fl-thin") +
    fR(2.7, 2.1, 0.9, 0.34, "fl-thin"); /* isla */
  s +=
    '<rect x="2.86" y="2.18" width=".40" height=".18" rx=".05" class="fl-fine"/>'; /* bacha */
  s +=
    fR(2.95, 1.52, 0.34, 0.2, "fl-fine") +
    fC(3.02, 1.62, 0.05, "fl-fine") +
    fC(3.22, 1.62, 0.05, "fl-fine");
  s += fR(3.66, 2.16, 0.24, 0.4, "fl-fine"); /* heladera */
  /* servicio: banco con percheros */
  s += fR(0.12, 2.3, 1.1, 0.18, "fl-fine");
  for (let i = 0; i < 5; i++) s += fC(0.22 + i * 0.22, 2.26, 0.03, "fl-fine");
  s += fR(1.3, 2.28, 0.32, 0.44, "fl-fine"); /* lavarropas */
  /* toilette: inodoro y lavatorio */
  s +=
    '<rect x=".14" y="3.14" width=".18" height=".24" rx=".07" class="fl-fine"/>' +
    fC(0.58, 3.02, 0.08, "fl-fine");
  /* salón: sofá, mesa baja y comedor */
  s +=
    fR(1.06, 3.36, 0.22, 0.72, "fl-fine") +
    fR(1.28, 3.36, 0.8, 0.2, "fl-fine") +
    fR(1.42, 3.7, 0.5, 0.26, "fl-fine");
  s +=
    '<rect x="2.62" y="3.42" width=".92" height=".50" rx=".05" class="fl-fine"/>';
  [
    [2.72, 3.34],
    [3.02, 3.34],
    [3.32, 3.34],
    [2.72, 3.98],
    [3.02, 3.98],
    [3.32, 3.98],
  ].forEach((p) => (s += fR(p[0], p[1], 0.16, 0.06, "fl-fine")));
  return s;
}

function projSheet(id) {
  let s = "";
  const b0w = PB.w - EXT,
    b0d = PB.d - EXT; /* cara exterior del muro */
  if (id === "arq") return projFurniture() + projDoors() + projWindows();

  if (id === "fnd") {
    /* Fundación de vivienda con crawl space: zapata corrida perimetral,
       muro de arranque, zapatas aisladas bajo cargas puntuales, pony wall
       y las viguetas del entrepiso bajo. La losa sólo va en el garaje. */
    const nt = (x, y, t, sz) =>
      '<text class="fl-lay-t" x="' +
      x +
      '" y="' +
      y +
      '" font-size="' +
      (sz || 0.062) +
      '">' +
      t +
      "</text>";
    let f = "";

    /* zapata corrida: línea discontinua por fuera del muro de arranque */
    const FT = 0.1;
    f +=
      fR(-FT, -FT, b0w + FT * 2, FT, "fl-ftg") +
      fR(-FT, b0d, b0w + FT * 2, FT, "fl-ftg") +
      fR(-FT, 0, FT, b0d, "fl-ftg") +
      fR(b0w, 0, FT, b0d, "fl-ftg");
    /* muro de arranque */
    f +=
      fR(0, 0, b0w, 0.05, "fl-lay") +
      fR(0, b0d - 0.05, b0w, 0.05, "fl-lay") +
      fR(0, 0, 0.05, b0d, "fl-lay") +
      fR(b0w - 0.05, 0, 0.05, b0d, "fl-lay");

    /* garaje: losa sobre terreno, no crawl */
    f +=
      fR(0.05, 0.05, 1.65, 2.15, "fl-slab") +
      nt(0.42, 1.15, '4" CONC. SLAB ON GRADE', 0.07) +
      nt(0.42, 1.24, "SLOPE 2% MIN TO DOOR", 0.075) +
      nt(0.3, 0.3, "BLOCK OUT FOR GARAGE DOOR", 0.072);

    /* crawl space: viguetas 9-1/2" TJI a 24" del centro */
    const SP = 24 / 144;
    for (let x = 1.8; x < 3.9; x += SP) f += fL(x, 0.1, x, 4.1, "fl-lay-d");
    for (let x = 0.12; x < 1.68; x += SP) f += fL(x, 2.3, x, 4.1, "fl-lay-d");
    f +=
      nt(2.0, 2.62, '9-1/2" TJI 110 AT 24" O.C.', 0.075) +
      fL(2.9, 2.2, 2.9, 3.0, "fl-thin") +
      fL(2.85, 2.28, 2.9, 2.2, "fl-thin") +
      fL(2.95, 2.28, 2.9, 2.2, "fl-thin") +
      fL(2.85, 2.92, 2.9, 3.0, "fl-thin") +
      fL(2.95, 2.92, 2.9, 3.0, "fl-thin") +
      nt(3.02, 2.98, "JOIST LAYOUT", 0.072);

    /* pony wall sobre zapata interior */
    f +=
      fR(0.05, 2.22, 3.9, 0.06, "fl-lay") +
      nt(0.2, 2.18, '2x4 PONY WALL ON 14"x8" FOOTING, TYP.', 0.075);
    f += fR(1.72, 0.05, 0.06, 2.2, "fl-lay");

    /* zapatas aisladas bajo apoyos puntuales */
    [
      [1.72, 1.38],
      [2.45, 1.38],
      [1.72, 2.25],
      [2.45, 2.25],
      [3.1, 2.25],
    ].forEach(
      (p) =>
        (f +=
          fR(p[0] - 0.09, p[1] - 0.09, 0.18, 0.18, "fl-ftg2") +
          fR(p[0] - 0.035, p[1] - 0.035, 0.07, 0.07, "fl-lay-f")),
    );
    f +=
      nt(2.52, 1.32, '24"x24"x8" FTG. W/ (2) #4 E.W.', 0.072) +
      nt(3.18, 2.2, '36"x36"x8" FTG. W/ (3) #4 E.W.', 0.072);

    /* ventilaciones y acceso al crawl */
    [
      [0.6, 4.13],
      [1.9, 4.13],
      [3.1, 4.13],
      [0.6, -0.03],
      [2.6, -0.03],
    ].forEach((p) => (f += fR(p[0], p[1], 0.22, 0.05, "fl-lay-f")));
    f += nt(1.94, 4.24, "6x30 FND VENT, TYP.", 0.072);
    f +=
      fR(1.3, 3.95, 0.34, 0.18, "fl-ftg2") +
      nt(0.62, 4.06, 'BLOCK-OUT FOR 18"x24" CRAWL ACCESS', 0.072);

    /* notas generales del plano */
    f +=
      nt(0.1, 0.14, 'TOP OF CONC. TO BE 4" BELOW TOP OF STEM, TYP.', 0.072) +
      nt(2.3, 0.2, '36"x8" CONT. FTG. W/ (2) #4 CONT.', 0.075) +
      nt(
        2.3,
        0.29,
        '1/2" ANCHOR BOLT @ 6' + String.fromCharCode(39) + '-0" O.C. MAX',
        0.072,
      ) +
      nt(2.3, 0.38, '12" FROM EACH CORNER, TYP.', 0.072) +
      nt(0.1, 2.72, "GARAGE FOUNDATION IS CONTINUOUS", 0.072) +
      nt(0.1, 2.81, "THROUGH DOOR OPENINGS, TYP.", 0.072) +
      nt(2.86, 3.86, "SLOPE FOR POSITIVE DRAIN", 0.072) +
      nt(2.86, 3.95, "AWAY FROM STRUCTURE, 5% MIN", 0.072);
    /* cotas propias de la fundación */
    const fd = (x1, y1, x2, y2, t, horiz) =>
      fL(x1, y1, x2, y2, "fl-thin") +
      fL(x1, y1 - 0.03, x1, y1 + 0.03, "fl-thin") +
      fL(x2, y2 - 0.03, x2, y2 + 0.03, "fl-thin") +
      nt(
        horiz ? (x1 + x2) / 2 - 0.14 : x1 + 0.05,
        horiz ? y1 - 0.04 : (y1 + y2) / 2,
        t,
        0.075,
      );
    f +=
      fd(-0.1, -0.22, 1.7, -0.22, "20" + String.fromCharCode(39) + '-5"', 1) +
      fd(1.7, -0.22, 3.95, -0.22, "26" + String.fromCharCode(39) + '-11"', 1) +
      fd(-0.22, -0.1, -0.22, 2.22, "26" + String.fromCharCode(39) + '-8"', 0) +
      fd(-0.22, 2.22, -0.22, 4.15, "23" + String.fromCharCode(39) + '-2"', 0);
    /* llamadas a la sección */
    [
      [0.3, 2.26],
      [2.1, 4.12],
      [3.88, 1.6],
    ].forEach(
      (p, i) =>
        (f +=
          fC(p[0], p[1], 0.09, "fl-bub") +
          '<text class="fl-lay-t" x="' +
          p[0] +
          '" y="' +
          (p[1] + 0.028) +
          '" font-size=".062" text-anchor="middle">' +
          (i + 1) +
          "</text>"),
    );
    return f;
  }

  if (id === "fra") {
    /* viguetas a 16" del centro: en unidades de 12 pies, 16" son .111 */
    const SP = 16 / 144;
    for (let x = 0.2; x < 3.9; x += SP) s += fL(x, 0.1, x, 2.15, "fl-lay-d");
    for (let x = 0.2; x < 3.9; x += SP) s += fL(x, 2.85, x, 4.1, "fl-lay-d");
    /* vigas y dinteles sobre los vanos y los muros de carga */
    s +=
      fR(EXT, 2.16, 3.9, 0.06, "fl-lay") + fR(EXT, 1.37, 3.9, 0.05, "fl-lay");
    s +=
      fR(0.28, -0.02, 1.3, 0.05, "fl-lay") +
      fR(2.18, 4.12, 1.24, 0.05, "fl-lay");
    /* flechas de dirección de las viguetas */
    [
      [1.95, 0.6],
      [1.95, 3.4],
    ].forEach(
      (p) =>
        (s +=
          fL(p[0], p[1] - 0.3, p[0], p[1] + 0.3, "fl-thin") +
          fL(p[0] - 0.05, p[1] - 0.22, p[0], p[1] - 0.3, "fl-thin") +
          fL(p[0] + 0.05, p[1] - 0.22, p[0], p[1] - 0.3, "fl-thin") +
          fL(p[0] - 0.05, p[1] + 0.22, p[0], p[1] + 0.3, "fl-thin") +
          fL(p[0] + 0.05, p[1] + 0.22, p[0], p[1] + 0.3, "fl-thin")),
    );
    s +=
      '<text class="fl-lay-t" x="2.02" y="0.56" font-size=".085">2x10 @ 16" O.C.</text>' +
      '<text class="fl-lay-t" x="2.02" y="3.36" font-size=".085">2x10 @ 16" O.C.</text>' +
      '<text class="fl-lay-t" x="0.30" y="2.12" font-size=".075">FLUSH BEAM 3-1/2x11-7/8 LVL</text>';
    /* apoyos puntuales */
    [
      [1.7, 2.19],
      [2.45, 2.19],
      [1.7, 1.39],
      [2.45, 1.39],
    ].forEach(
      (p) => (s += fR(p[0] - 0.055, p[1] - 0.055, 0.11, 0.11, "fl-lay-f")),
    );
    return s;
  }

  if (id === "ele") {
    /* Convenciones de una eléctrica residencial norteamericana: cada boca
       lleva su altura de montaje, las de zonas húmedas o exteriores van
       marcadas GFI o WP/GFI, y el retorno del interruptor se dibuja como
       un arco discontinuo hasta el punto de luz que gobierna. */
    const nt = (x, y, t, sz) =>
      '<text class="fl-lay-t" x="' +
      x +
      '" y="' +
      y +
      '" font-size="' +
      (sz || 0.062) +
      '">' +
      t +
      "</text>";
    /* tomacorriente doble: dos barras y su altura */
    const rec = (x, y, h, tag, dy) => {
      let o =
        fC(x, y, 0.05, "fl-lay") +
        fL(x - 0.018, y - 0.045, x - 0.018, y + 0.045, "fl-lay") +
        fL(x + 0.018, y - 0.045, x + 0.018, y + 0.045, "fl-lay");
      if (tag) o += nt(x - 0.1, y + (dy || -0.07), tag);
      if (h) o += nt(x - 0.08, y + (dy || -0.07) + (tag ? 0.075 : 0), h);
      return o;
    };
    /* punto de luz de techo */
    const lite = (x, y) =>
      fC(x, y, 0.07, "fl-lay") +
      fL(x - 0.07, y, x + 0.07, y, "fl-lay") +
      fL(x, y - 0.07, x, y + 0.07, "fl-lay");
    /* interruptor, con su letra y el arco que lo une a lo que manda */
    const sw = (x, y, tx, ty, t) =>
      nt(x, y, t || "S", 0.075) +
      '<path class="fl-lay-d" d="M' +
      (x + 0.02) +
      " " +
      (y - 0.03) +
      " Q" +
      (x + tx) / 2 +
      " " +
      ((y + ty) / 2 - 0.22) +
      " " +
      tx +
      " " +
      ty +
      '"/>';

    let e = "";
    /* bocas contra fachada y tabiques, con su altura de montaje */
    [
      [0.3, 0.11, '+48"', "GFI"],
      [1.2, 0.11, '+48"', null],
      [2.7, 0.11, '+48"', null],
      [3.5, 0.11, '+48"', null],
      [0.3, 4.04, '+48"', "GFI"],
      [1.55, 4.04, '+48"', null],
      [3.2, 4.04, '+48"', "WP/GFI"],
      [0.11, 1.0, '+48"', null],
      [0.11, 2.55, '+48"', "GFI"],
      [0.11, 3.7, '+48"', null],
      [3.84, 0.7, '+48"', null],
      [3.84, 2.05, '+44"', "GFI"],
      [3.84, 3.4, '+48"', null],
      [1.85, 1.3, '+48"', null],
      [2.6, 1.34, '+44"', "GFI"],
      [3.2, 1.34, '+44"', "GFI"],
      [1.8, 2.95, '+48"', null],
      [2.9, 2.3, '+44"', "GFI"],
    ].forEach((p) => (e += rec(p[0], p[1], p[2], p[3])));
    /* garaje: dos bocas altas y los sensores del portón */
    e += rec(0.9, 0.14, '+79"', "WP") + rec(1.55, 2.05, '+48"', "GFI");
    e +=
      nt(0.2, 1.85, "TYPICAL GARAGE DOOR SENSORS", 0.072) +
      fC(0.28, 2.12, 0.035, "fl-lay-f") +
      fC(1.58, 2.12, 0.035, "fl-lay-f") +
      nt(0.24, 2.2, "GD", 0.072) +
      nt(1.54, 2.2, "GD", 0.072);
    /* tablero y servicio */
    e +=
      fR(1.44, 0.14, 0.2, 0.09, "fl-lay-f") +
      nt(1.1, 0.34, "200 AMP ELECTRICAL PANEL", 0.072);
    /* detectores */
    [
      [2.1, 1.1, "SD"],
      [2.85, 3.05, "SD"],
      [0.95, 2.55, "CM"],
      [1.1, 1.2, "HEAT DETECTOR"],
    ].forEach(
      (p) =>
        (e +=
          fC(p[0], p[1], 0.045, "fl-lay-f") +
          nt(p[0] + 0.07, p[1] + 0.02, p[2], 0.072)),
    );
    /* puntos de luz */
    const L = [
      [0.87, 1.05],
      [2.1, 0.7],
      [3.2, 0.7],
      [2.85, 1.95],
      [0.87, 2.5],
      [0.4, 3.2],
      [2.3, 3.45],
      [3.3, 3.1],
    ];
    L.forEach((p) => (e += lite(p[0], p[1])));
    /* interruptores y sus arcos */
    e +=
      sw(1.96, 0.42, 2.1, 0.63) +
      sw(2.52, 0.42, 3.16, 0.63) +
      sw(1.66, 2.42, 0.95, 2.46) +
      sw(1.82, 2.86, 2.28, 3.38) +
      sw(2.44, 1.52, 2.82, 1.88, "S3") +
      sw(3.46, 2.92, 3.32, 3.04, "S3");
    /* extracciones y notas */
    e +=
      nt(0.1, 3.02, "VENT EXHAUST TO EXTERIOR", 0.072) +
      nt(2.62, 2.62, "TO LIGHT ABOVE", 0.072) +
      nt(3.3, 0.98, "TO LIGHT ABOVE", 0.072);
    return e;
  }
  return s;
}

function projDoors() {
  return PDOORS.map((d) => {
    const x = d[0],
      y = d[1],
      w = d[2];
    return d[3]
      ? fL(x, y, x, y + w, "fl-cut") +
          '<path class="fl-fine" d="M' +
          x +
          " " +
          (y + w) +
          " A" +
          w +
          " " +
          w +
          " 0 0 1 " +
          (x + w) +
          " " +
          y +
          '"/>'
      : fL(x, y, x + w, y, "fl-cut") +
          '<path class="fl-fine" d="M' +
          (x + w) +
          " " +
          y +
          " A" +
          w +
          " " +
          w +
          " 0 0 1 " +
          x +
          " " +
          (y + w) +
          '"/>';
  }).join("");
}

function projWindows() {
  return PWIN.map((v) => {
    const x = v[0],
      y = v[1],
      l = v[2];
    return v[3]
      ? fL(x, y, x + l, y, "fl-thin") +
          fL(x, y + EXT, x + l, y + EXT, "fl-thin") +
          fL(x, y + EXT / 2, x + l, y + EXT / 2, "fl-fine")
      : fL(x, y, x, y + l, "fl-thin") +
          fL(x + EXT, y, x + EXT, y + l, "fl-thin") +
          fL(x + EXT / 2, y, x + EXT / 2, y + l, "fl-fine");
  }).join("");
}

const QS = 36,
  QF = -(PB.cut * PB.lh + 0.07) * IZ * U;

const planMatrix = () =>
  "matrix(" +
  QS +
  ",0,0," +
  QS +
  "," +
  (PB.x * QS).toFixed(2) +
  "," +
  (PB.y * QS + QF).toFixed(2) +
  ")";

const isoMatrix = () => flat(PB.x, PB.y, PB.cut * PB.lh + 0.07);

function projCut(id) {
  const b = PB,
    zc = b.cut * b.lh,
    zf = zc + 0.07;
  let s = '<g class="cut-3d">';
  for (let i = 0; i < b.cut; i++) {
    const z = i * b.lh;
    s +=
      box(b.x - 0.07, b.y - 0.07, b.w + 0.14, b.d + 0.14, z, 0.07, "stone") +
      box(b.x, b.y, b.w, b.d, z + 0.07, b.lh - 0.07, "purple") +
      windows(b.x, b.y, b.w, b.d, z + 0.07, b.lh - 0.07);
  }
  s +=
    box(
      b.x - 0.07,
      b.y - 0.07,
      b.w + 0.14,
      b.d + 0.14,
      zc,
      0.07,
      "stone",
    ) /* losa del corte */ +
    PW.map((w) =>
      box(
        b.x + w[0],
        b.y + w[1],
        w[2],
        w[3],
        zf,
        0.22,
        id === "arq" ? "stone" : "slate",
      ),
    ).join("") +
    "</g>";
  /* el contenido de la planta vive en un grupo que gira de isométrica a planta */
  s +=
    '<g class="plan-g" transform="' +
    isoMatrix() +
    '">' +
    '<rect class="plan-sheet" x="-.4" y="-.4" width="' +
    (b.w + 0.8) +
    '" height="' +
    (b.d + 0.8) +
    '"/>' +
    '<g class="plan-poche">' +
    PW.map((w) =>
      fR(w[0], w[1], w[2], w[3], id === "arq" ? "fl-poche" : "fl-poche-lite"),
    ).join("") +
    "</g>" +
    projSheet(id) +
    "</g>";
  return s;
}

function projDocs(PT, b, id) {
  let s = "";
  const T = (x, y, t, c, anc) =>
    '<text class="' +
    (c || "ob-txt") +
    '" x="' +
    n1(PT(b.x + x, b.y + y)[0]) +
    '" y="' +
    n1(PT(b.x + x, b.y + y)[1]) +
    '"' +
    (anc ? ' style="text-anchor:' + anc + '"' : "") +
    ">" +
    t +
    "</text>";
  const LN = (x1, y1, x2, y2, c) => {
    const a = PT(b.x + x1, b.y + y1),
      d = PT(b.x + x2, b.y + y2);
    return (
      '<line class="' +
      (c || "ob-dim") +
      '" x1="' +
      n1(a[0]) +
      '" y1="' +
      n1(a[1]) +
      '" x2="' +
      n1(d[0]) +
      '" y2="' +
      n1(d[1]) +
      '"/>'
    );
  };
  const CI = (x, y, r, c) => {
    const a = PT(b.x + x, b.y + y);
    return (
      '<circle class="' +
      (c || "ob-bub") +
      '" cx="' +
      n1(a[0]) +
      '" cy="' +
      n1(a[1]) +
      '" r="' +
      r +
      '"/>'
    );
  };

  /* ---- norte ---- */
  const nx = b.w + 0.55,
    ny = -0.75;
  s +=
    CI(nx, ny, 3.4, "ob-bub") +
    LN(nx, ny + 0.22, nx, ny - 0.22, "ob-dim") +
    LN(nx - 0.07, ny - 0.08, nx, ny - 0.22, "ob-dim") +
    LN(nx + 0.07, ny - 0.08, nx, ny - 0.22, "ob-dim") +
    T(nx, ny - 0.3, "N", "ob-txt", "middle");

  /* ---- marcador de sección: apunta al detalle que existe de verdad ---- */
  const sx = -0.42;
  s +=
    LN(sx, 0.9, sx, 2.6, "ob-cutline") +
    CI(sx, 0.72, 3.4, "ob-bub") +
    T(sx, 0.755, "1", "ob-txt", "middle") +
    LN(sx, 0.62, sx + 0.16, 0.62, "ob-dim") +
    LN(sx + 0.1, 0.58, sx + 0.16, 0.62, "ob-dim") +
    LN(sx + 0.1, 0.66, sx + 0.16, 0.62, "ob-dim") +
    '<g class="det-open" role="button" tabindex="0" aria-label="A-401">' +
    CI(sx, 2.78, 3.4, "ob-bub") +
    T(sx, 2.815, "A-401", "ob-mark", "middle") +
    CI(sx, 2.78, 5.4, "ob-hit") +
    "</g>";

  /* ---- etiquetas de carpintería ---- */
  const tag = (x, y, t, sq) =>
    sq
      ? '<rect class="ob-bub" x="' +
        n1(PT(b.x + x, b.y + y)[0] - 3) +
        '" y="' +
        n1(PT(b.x + x, b.y + y)[1] - 2.8) +
        '" width="6" height="5.6" rx=".8"/>' +
        T(x, y + 0.026, t, "ob-txt", "middle")
      : CI(x, y, 2.9, "ob-bub") + T(x, y + 0.026, t, "ob-txt", "middle");
  if (id === "arq") {
    PDOORS.forEach((d, i) => {
      const x = d[3] ? d[0] + d[2] / 2 : d[0] + (d[0] > b.w / 2 ? -0.17 : 0.17);
      const y = d[3] ? d[1] + (d[1] > b.d / 2 ? -0.17 : 0.17) : d[1] + d[2] / 2;
      s += tag(x, y, "D" + (i + 1), true);
    });
    PWIN.forEach((w, i) => {
      const x = w[3] ? w[0] + w[2] / 2 : w[0] + (w[0] > b.w / 2 ? -0.2 : 0.2);
      const y = w[3] ? w[1] + (w[1] > b.d / 2 ? -0.2 : 0.2) : w[1] + w[2] / 2;
      s += tag(x, y, "W" + (i + 1), false);
    });
  }

  /* ---- nota de escalera ---- */
  if (id === "arq")
    s += T(2.1, 1.52, '14 R @ 7 3/4"  ·  13 T @ 11"', "ob-mark", "middle");

  /* ---- cajetín ---- */
  const bx = b.w - 1.34,
    by = b.d + 1.72,
    bw = 1.34,
    bh = 0.98;
  const box2 = (x, y, w, h) => {
    const a = PT(b.x + x, b.y + y),
      c = PT(b.x + x + w, b.y + y),
      d = PT(b.x + x + w, b.y + y + h),
      e = PT(b.x + x, b.y + y + h);
    return (
      '<polygon class="ob-tb" points="' +
      n1(a[0]) +
      "," +
      n1(a[1]) +
      " " +
      n1(c[0]) +
      "," +
      n1(c[1]) +
      " " +
      n1(d[0]) +
      "," +
      n1(d[1]) +
      " " +
      n1(e[0]) +
      "," +
      n1(e[1]) +
      '"/>'
    );
  };
  s += box2(bx, by, bw, bh);
  [0.34, 0.66].forEach((o) => (s += LN(bx, by + o, bx + bw, by + o, "ob-tbl")));
  const sh = SHEETS.find((x) => x.id === id) || SHEETS[0];
  /* las filas van alineadas a la izquierda: la clase de texto que se reutiliza
     viene centrada, así que hay que pedir el anclaje de forma explícita */
  s +=
    T(bx + 0.06, by + 0.13, "REMOTE &amp; PARTNERS", "ob-mark", "start") +
    T(bx + 0.06, by + 0.26, u("demoProj"), "ob-txt", "start") +
    T(bx + 0.06, by + 0.47, u("sheetTitle"), "ob-mark", "start") +
    T(
      bx + 0.06,
      by + 0.6,
      u("sheets")[SHEETS.indexOf(sh)][1].toUpperCase(),
      "ob-txt",
      "start",
    ) +
    T(bx + 0.06, by + 0.81, '1/4" = 1\'-0"', "ob-mark", "start") +
    T(bx + bw - 0.06, by + 0.84, sh.code, "ob-code", "end");
  return s;
}

function projNotes(sheet, mapper) {
  const b = PB,
    zf = b.cut * b.lh + 0.07;
  const PT = mapper || ((x, y) => P(x, y, zf));
  let s = projDocs(PT, b, (SHEETS[sheet] || SHEETS[0]).id);
  PGX.forEach((x, i) => {
    const a = PT(b.x + x, b.y - 1.15),
      c = PT(b.x + x, b.y + b.d);
    s +=
      '<line class="ob-axis" x1="' +
      n1(a[0]) +
      '" y1="' +
      n1(a[1]) +
      '" x2="' +
      n1(c[0]) +
      '" y2="' +
      n1(c[1]) +
      '"/>' +
      '<circle class="ob-bub" cx="' +
      n1(a[0]) +
      '" cy="' +
      n1(a[1]) +
      '" r="3.2"/>' +
      '<text class="ob-txt" x="' +
      n1(a[0]) +
      '" y="' +
      n1(a[1] + 1.15) +
      '">' +
      "ABC".charAt(i) +
      "</text>";
  });
  PGY.forEach((y, i) => {
    const a = PT(b.x - 1.15, b.y + y),
      c = PT(b.x + b.w, b.y + y);
    s +=
      '<line class="ob-axis" x1="' +
      n1(a[0]) +
      '" y1="' +
      n1(a[1]) +
      '" x2="' +
      n1(c[0]) +
      '" y2="' +
      n1(c[1]) +
      '"/>' +
      '<circle class="ob-bub" cx="' +
      n1(a[0]) +
      '" cy="' +
      n1(a[1]) +
      '" r="3.2"/>' +
      '<text class="ob-txt" x="' +
      n1(a[0]) +
      '" y="' +
      n1(a[1] + 1.15) +
      '">' +
      (i + 1) +
      "</text>";
  });
  const met = ftin;
  /* ---------- cadenas de cota ----------
     Una lámina de obra lleva tres cadenas apiladas por lado y las cuatro
     caras acotadas: la de huecos, la de ejes y la total. Con una sola,
     el dibujo parece un esquema. */
  const chain = (from, to, off, side, txt) => {
    /* side 0 sur · 1 este · 2 norte · 3 oeste */
    const at = (v, o) =>
      side === 0
        ? PT(b.x + v, b.y + b.d + o)
        : side === 1
          ? PT(b.x + b.w + o, b.y + v)
          : side === 2
            ? PT(b.x + v, b.y - o)
            : PT(b.x - o, b.y + v);
    const horiz = side === 0 || side === 2;
    const a = at(from, off),
      c = at(to, off),
      t = at((from + to) / 2, off);
    if (Math.abs(to - from) < 0.06) return "";
    return (
      '<line class="ob-dim" x1="' +
      n1(a[0]) +
      '" y1="' +
      n1(a[1]) +
      '" x2="' +
      n1(c[0]) +
      '" y2="' +
      n1(c[1]) +
      '"/>' +
      '<line class="ob-dim" x1="' +
      n1(a[0] - 1.4) +
      '" y1="' +
      n1(a[1] - 1.4) +
      '" x2="' +
      n1(a[0] + 1.4) +
      '" y2="' +
      n1(a[1] + 1.4) +
      '"/>' +
      '<line class="ob-dim" x1="' +
      n1(c[0] - 1.4) +
      '" y1="' +
      n1(c[1] - 1.4) +
      '" x2="' +
      n1(c[0] + 1.4) +
      '" y2="' +
      n1(c[1] + 1.4) +
      '"/>' +
      '<text class="ob-txt" x="' +
      n1(t[0]) +
      '" y="' +
      n1(t[1] + (horiz ? (side === 0 ? 5 : -2.4) : -2.2)) +
      '">' +
      txt +
      "</text>"
    );
  };
  /* los quiebres de cada fachada salen de sus propios huecos */
  const faceBreaks = (horiz, at2) => {
    const p = [0];
    PWIN.concat(PDOORS).forEach((o) => {
      if ((o[3] === 1) !== horiz) return;
      const c = horiz ? o[1] : o[0];
      if (Math.abs(c - at2) > 0.14) return;
      const s0 = horiz ? o[0] : o[1];
      p.push(+s0.toFixed(3), +(s0 + o[2]).toFixed(3));
    });
    p.push(horiz ? b.w : b.d);
    return p
      .sort((x, y) => x - y)
      .filter((v, i, a) => i === 0 || v - a[i - 1] > 0.05);
  };
  const stack = (side, grid, span, horiz, at2) => {
    const br = faceBreaks(horiz, at2);
    for (let i = 0; i < br.length - 1; i++)
      s += chain(br[i], br[i + 1], 0.46, side, met(br[i + 1] - br[i]));
    for (let i = 0; i < grid.length - 1; i++)
      s += chain(grid[i], grid[i + 1], 1.02, side, met(grid[i + 1] - grid[i]));
    s += chain(0, span, 1.58, side, met(span));
  };
  stack(0, PGX, b.w, true, b.d); /* sur */
  stack(2, PGX, b.w, true, 0); /* norte */
  stack(1, PGY, b.d, false, b.w); /* este */
  stack(3, PGY, b.d, false, 0); /* oeste */
  /* rótulo de cada local: en las láminas de estructura estorba */
  const shId = (SHEETS[sheet] || SHEETS[0]).id;
  if (shId === "arq" || shId === "ele")
    PROOMS.forEach((r, i) => {
      const p = PT(b.x + r[1], b.y + r[2]);
      s +=
        '<text class="ob-room" x="' +
        n1(p[0]) +
        '" y="' +
        n1(p[1]) +
        '">' +
        u("rooms")[i] +
        "</text>" +
        (r[3]
          ? '<text class="ob-area" x="' +
            n1(p[0]) +
            '" y="' +
            n1(p[1] + 3.4) +
            '">' +
            r[3] +
            "</text>"
          : "");
    });
  const lv = PT(b.x + b.w + 0.35, b.y + b.d + 2.1);
  s +=
    '<text class="ob-txt" x="' +
    n1(lv[0]) +
    '" y="' +
    n1(lv[1]) +
    '" text-anchor="start">' +
    u("level") +
    " 0" +
    PB.cut +
    " · +" +
    ftin(PB.cut * PB.lh) +
    "</text>";
  return s;
}

function projBim() {
  const b = PB;
  let s = "";
  for (let i = 0; i < b.lv; i++) {
    const z = i * b.lh;
    const str = [],
      mep = [],
      arc = [];
    str.push({
      d: -9,
      s: box(b.x - 0.07, b.y - 0.07, b.w + 0.14, b.d + 0.14, z, 0.07, "blue"),
    });
    PGX.forEach((x) =>
      PGY.forEach((y) =>
        str.push({
          d: x + y,
          s: box(
            b.x + x - 0.09,
            b.y + y - 0.09,
            0.18,
            0.18,
            z + 0.07,
            b.lh - 0.24,
            "blue",
          ),
        }),
      ),
    );
    PGY.forEach((y) =>
      str.push({
        d: y + 0.4,
        s: box(b.x, b.y + y - 0.06, b.w, 0.12, z + b.lh - 0.17, 0.17, "blue"),
      }),
    );
    PGX.forEach((x) =>
      str.push({
        d: x + 0.4,
        s: box(b.x + x - 0.06, b.y, 0.12, b.d, z + b.lh - 0.17, 0.17, "blue"),
      }),
    );

    mep.push({
      d: 1.2,
      s: box(
        b.x + 0.3,
        b.y + 0.95,
        b.w - 0.6,
        0.3,
        z + b.lh - 0.5,
        0.2,
        "magenta",
      ),
    });
    mep.push({
      d: 2.6,
      s: box(b.x + 1.9, b.y + 1.25, 0.2, 1.4, z + b.lh - 0.48, 0.16, "magenta"),
    });
    mep.push({
      d: 3.4,
      s: box(
        b.x + 0.3,
        b.y + 2.9,
        b.w - 0.6,
        0.12,
        z + b.lh - 0.34,
        0.1,
        "purple",
      ),
    });
    mep.push({
      d: 1.6,
      s: box(b.x + 0.55, b.y + 0.3, 0.16, 0.16, z, b.lh, "magenta"),
    });

    arc.push({
      d: 0,
      s:
        box(b.x, b.y, b.w, b.d, z + 0.07, b.lh - 0.07, "purple") +
        windows(b.x, b.y, b.w, b.d, z + 0.07, b.lh - 0.07),
    });
    arc.push({
      d: 1.3,
      s: box(b.x + 1.3, b.y + 0.09, 0.05, 3.22, z + 0.07, b.lh - 0.3, "stone"),
    });

    const wrap = (cls, arr) =>
      '<g class="lay ' +
      cls +
      '">' +
      arr
        .sort((a, b) => a.d - b.d)
        .map((o) => o.s)
        .join("") +
      "</g>";
    s +=
      '<g class="lv">' +
      wrap("lay-str", str) +
      wrap("lay-mep", mep) +
      wrap("lay-arc", arc) +
      "</g>";
  }
  const zt = b.lv * b.lh;
  s +=
    '<g class="lv"><g class="lay lay-str">' +
    box(b.x - 0.07, b.y - 0.07, b.w + 0.14, b.d + 0.14, zt, 0.1, "blue") +
    "</g>" +
    '<g class="lay lay-mep">' +
    box(b.x + b.w - 1.5, b.y + b.d - 1.2, 1, 0.75, zt + 0.1, 0.3, "magenta") +
    "</g>" +
    '<g class="lay lay-arc">' +
    box(b.x + 0.35, b.y + 0.3, 0.75, 0.75, zt + 0.1, 0.42, "purple") +
    "</g></g>";
  return s;
}

export { projBim, projCut, projNotes, QS, QF, planMatrix, isoMatrix };
