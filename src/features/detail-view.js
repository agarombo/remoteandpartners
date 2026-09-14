import { u } from "../content.js";
const dR = (x, y, w, h, c) =>
  '<rect x="' +
  x +
  '" y="' +
  y +
  '" width="' +
  w +
  '" height="' +
  h +
  '" class="' +
  c +
  '"/>';
const dL = (x1, y1, x2, y2, c) =>
  '<line x1="' +
  x1 +
  '" y1="' +
  y1 +
  '" x2="' +
  x2 +
  '" y2="' +
  y2 +
  '" class="' +
  (c || "d-thin") +
  '"/>';

function detailSVG() {
  /* el muro se dibuja en vertical con su espesor real exagerado, que es como
     se dibuja un detalle ampliado, y se parte con una línea de rotura: un
     muro entero a escala sería una franja de un dedo de ancho */
  const A = 150,
    W = 46; /* eje interior del entramado */
  const SH = A - 9,
    SI = A - 20,
    GY = A + W; /* tablero, revestimiento, yeso */
  let s = "";

  /* ---- alero: cordón, faldón, sofito y fascia ---- */
  s +=
    '<path class="d-cut" d="M' +
    (A - 56) +
    " 96 L" +
    (A + 150) +
    " 30 L" +
    (A + 150) +
    " 43 L" +
    (A - 56) +
    ' 109 Z"/>';
  s += '<path class="d-fine" d="M' + (A - 60) + " 88 L" + (A + 150) + ' 21"/>';
  s += dR(A - 56, 109, 206, 8, "d-cut"); /* cordón inferior */
  s += dR(A - 56, 117, 52, 7, "d-fine"); /* sofito ventilado */
  s += dR(A - 62, 96, 7, 28, "d-cut"); /* fascia 2x8 */
  s += dR(A - 6, 101, 12, 8, "d-fine"); /* bloqueo del talón */

  /* ---- muro alto ---- */
  s += dR(A, 117, W, 7, "d-cut") + dR(A, 124, W, 7, "d-cut"); /* doble solera */
  s += dR(A, 131, W, 88, "d-batt");
  for (let y = 137; y < 216; y += 8)
    s += dL(A + 3, y, A + W - 3, y - 4, "d-batt-l");
  s += dR(A, 131, W, 88, "d-stud");
  s += dR(SH, 117, 9, 102, "d-cut") + dR(SI, 117, 11, 102, "d-fine");
  s += dL(SH - 0.7, 117, SH - 0.7, 219, "d-wrap");
  s += dR(GY, 131, 7, 88, "d-fine");

  /* ---- rotura ---- */
  const brk = (y) =>
    '<path class="d-brk" d="M' +
    (SI - 14) +
    " " +
    y +
    " L" +
    (A - 4) +
    " " +
    (y - 7) +
    " L" +
    (A + W / 2) +
    " " +
    (y + 7) +
    " L" +
    (GY + 3) +
    " " +
    (y - 6) +
    " L" +
    (GY + 16) +
    " " +
    y +
    '"/>';
  s += brk(228) + brk(246);
  s += '<text class="d-note" x="' + (GY + 22) + '" y="242">BREAK</text>';

  /* ---- muro bajo, entrepiso y fundación ---- */
  s += dR(A, 255, W, 72, "d-batt");
  for (let y = 261; y < 324; y += 8)
    s += dL(A + 3, y, A + W - 3, y - 4, "d-batt-l");
  s += dR(A, 255, W, 72, "d-stud");
  s += dR(SH, 255, 9, 72, "d-cut") + dR(SI, 255, 11, 72, "d-fine");
  s += dL(SH - 0.7, 255, SH - 0.7, 327, "d-wrap");
  s += dR(GY, 255, 7, 72, "d-fine");
  s += dR(A, 327, W, 8, "d-cut"); /* solera inferior */

  s += dR(SH, 335, W + 16, 5, "d-cut"); /* subpiso 3/4" T&G */
  s += dR(SH, 340, 13, 40, "d-cut"); /* viga de borde LVL */
  s += dR(SH + 16, 340, W - 8, 40, "d-fine"); /* vigueta 2x10 detrás */
  for (let x = SH + 22; x < A + W; x += 10) s += dL(x, 343, x, 377, "d-batt-l");
  s += dR(SH, 380, W + 16, 7, "d-cut"); /* solera de apoyo */

  s += dR(SH, 387, W + 12, 66, "d-conc"); /* muro de fundación */
  for (let y = 393; y < 451; y += 8)
    s += dL(SH, y, SH + W + 12, y - 8, "d-conc-l");
  s += dR(SH - 16, 453, W + 44, 20, "d-conc"); /* zapata corrida */
  for (let y = 458; y < 471; y += 8)
    s += dL(SH - 16, y, SH + W + 28, y - 8, "d-conc-l");
  s +=
    dL(A + 16, 384, A + 16, 418, "d-bolt") +
    '<circle cx="' +
    (A + 16) +
    '" cy="384" r="3" class="d-dot"/>';
  s += '<path class="d-soil" d="M' + (SI - 52) + " 414 L" + SH + ' 414"/>';
  for (let x = SI - 52; x < SH - 2; x += 9)
    s += dL(x, 414, x + 5, 420, "d-soil");

  /* ---- notas: la guía sale corta y el texto se alinea en una columna ---- */
  const T = A + 168;
  const N = [
    [A + 60, 60, 52, "ASPHALT SHINGLES O/ 15# FELT"],
    [A + 40, 78, 76, '7/16" OSB ROOF SHEATHING'],
    [A + 30, 113, 100, 'PREFAB TRUSS @ 24" O.C.'],
    [A - 40, 120, 124, "VENTED SOFFIT · 2x8 FASCIA"],
    [A + W / 2, 121, 148, "DBL 2x6 TOP PLATE"],
    [A + W / 2, 170, 172, '2x6 STUDS @ 16" O.C.'],
    [A + W - 8, 196, 196, "R-21 BATT INSULATION"],
    [SH + 4, 196, 220, '7/16" OSB SHTG + WRB'],
    [SI + 5, 280, 278, "FIBER CEMENT SIDING"],
    [GY + 3, 290, 302, '1/2" GYPSUM BOARD'],
    [A + W / 2, 331, 326, "2x6 BOTTOM PLATE"],
    [A + 20, 337, 350, '3/4" T&G SUBFLOOR'],
    [SH + 34, 360, 374, '2x10 FLOOR JOIST @ 16" O.C.'],
    [SH + 6, 360, 398, "LVL RIM BOARD"],
    [A + 16, 400, 422, '1/2" ANCHOR BOLT @ 6\'-0" O.C.'],
    [A + 10, 432, 446, '8" CONC. FOUNDATION WALL'],
    [A + 10, 463, 470, '16"x8" CONT. CONC. FOOTING'],
    [SI - 30, 416, 494, "FINISH GRADE"],
  ];
  N.forEach((n) => {
    const [x, y, ty, t] = n;
    s +=
      dL(x, y, T - 14, ty - 3, "d-lead") +
      dL(T - 14, ty - 3, T - 4, ty - 3, "d-lead") +
      '<circle cx="' +
      x +
      '" cy="' +
      y +
      '" r="2" class="d-dot"/>' +
      '<text class="d-note" x="' +
      T +
      '" y="' +
      ty +
      '">' +
      t +
      "</text>";
  });

  /* cotas verticales */
  const dim = (y0, y1, t) =>
    dL(SI - 22, y0, SI - 22, y1, "d-dim") +
    dL(SI - 26, y0, SI - 18, y0, "d-dim") +
    dL(SI - 26, y1, SI - 18, y1, "d-dim") +
    '<text class="d-dim-t" x="' +
    (SI - 28) +
    '" y="' +
    ((y0 + y1) / 2 + 3) +
    '" text-anchor="end">' +
    t +
    "</text>";
  s += dim(124, 335, "9'-0\"") + dim(340, 387, '11-7/8"');

  return (
    '<svg viewBox="60 14 470 480" role="img" aria-label="Sección constructiva de muro exterior">' +
    s +
    "</svg>"
  );
}

export function detailHTML(kind) {
  const auto = kind === "auto";
  return (
    '<div class="d-head"><div class="mono">' +
    u("docRef") +
    " · " +
    (auto ? "AUT-01" : "A-401") +
    "</div>" +
    "<b>" +
    (auto ? u("autTitle") : u("detTitle")) +
    "</b></div>" +
    (auto
      ? '<div class="d-body"><p class="lead">' +
        u("autLead") +
        "</p>" +
        '<ul class="items">' +
        u("autList")
          .map(
            (l, i) =>
              '<li><span class="k">' +
              String(i + 1).padStart(2, "0") +
              '</span><span><span class="t">' +
              l[0] +
              '</span><span class="d">' +
              l[1] +
              "</span></span></li>",
          )
          .join("") +
        "</ul></div>"
      : '<div class="d-draw">' + detailSVG() + "</div>") +
    '<dl class="block wide d-foot">' +
    "<div><dt>" +
    (auto ? u("scope") : u("scale")) +
    "</dt><dd>" +
    (auto ? "AUTOCAD · LISP" : '1 1/2" = 1' + String.fromCharCode(39) + '-0"') +
    "</dd></div>" +
    "<div><dt>" +
    u("status") +
    '</dt><dd class="live">' +
    (auto ? u("active") : u("coordinated")) +
    "</dd></div>" +
    "</dl>" +
    '<button class="lab-btn" id="detClose" type="button">' +
    u("labBack") +
    "</button>"
  );
}
