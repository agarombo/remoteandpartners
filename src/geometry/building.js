const PB = { x: -2.0, y: -2.1, w: 4.0, d: 4.2, lv: 2, lh: 0.75, cut: 1 };

const EXT = 0.05,
  INT = 0.03;

const PW = [
  /* fachada norte: portón de garaje, entrada y dos ventanas del estudio */
  [0, 0, 0.3, EXT],
  [1.55, 0, 0.35, EXT],
  [2.25, 0, 0.45, EXT],
  [3.2, 0, 0.2, EXT],
  [3.9, 0, 0.1, EXT],
  /* fachada sur: ventana de servicio y puerta corrediza del salón */
  [0, 4.15, 0.3, EXT],
  [0.7, 4.15, 1.5, EXT],
  [3.4, 4.15, 0.6, EXT],
  /* laterales */
  [0, EXT, EXT, 0.75],
  [0, 1.3, EXT, 1.9],
  [0, 3.7, EXT, 0.45],
  [3.95, EXT, EXT, 0.35],
  [3.95, 0.9, EXT, 0.8],
  [3.95, 2.2, EXT, 1.0],
  [3.95, 3.8, EXT, 0.35],
  /* separación del garaje: muro cortafuegos y fondo */
  [1.7, EXT, INT, 2.15],
  [EXT, 2.2, 1.65, INT],
  /* zaguán, estudio y cocina */
  [2.45, EXT, INT, 1.35],
  [2.48, 1.4, 1.47, INT],
  /* servicio */
  [EXT, 2.8, 1.65, INT],
  [0.75, 2.85, INT, 0.68],
  [EXT, 3.5, 0.72, INT],
].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));

const PDOORS = [
  [1.9, 0, 0.35, 1],
  [1.7, 2.4, 0.3, 0],
  [0.9, 2.8, 0.3, 1],
  [0.75, 3.05, 0.28, 0],
  [2.45, 0.5, 0.3, 0],
];

const PWIN = [
  [2.7, 0, 0.5, 1],
  [3.4, 0, 0.5, 1],
  [0.3, 4.15, 0.4, 1],
  [2.2, 4.15, 1.2, 1],
  [0, 0.8, 0.5, 0],
  [0, 3.2, 0.5, 0],
  [3.95, 0.4, 0.5, 0],
  [3.95, 1.7, 0.5, 0],
  [3.95, 3.2, 0.6, 0],
];

const PGX = [EXT, 1.7, 2.45, 3.95],
  PGY = [EXT, 1.4, 2.8, 4.15];

const PROOMS = [
  ["GARAGE", 0.87, 1.05, "511 SF"],
  ["FOYER", 2.1, 0.7, "136 SF"],
  ["STUDY", 3.2, 0.7, "282 SF"],
  ["KITCHEN", 2.85, 2.05, "412 SF"],
  ["MUDROOM", 0.87, 2.5, "131 SF"],
  ["POWDER", 0.4, 3.18, "65 SF"],
  ["GREAT ROOM", 2.3, 3.35, "612 SF"],
];

const NB = {
  x: -2.4,
  y: -2,
  lh: 1.5,
  vw: 1.5,
  vd: 1.1,
  cs: 0.16,
  vols: [
    {
      x: 0,
      y: 0,
      w: 2.3,
      d: 2.5,
      lv: 5,
      pi: 2,
      vx: 0.5,
    } /* cuerpo alto, al fondo */,
    /* el cuerpo de Tomás se abre por la cara derecha: es la que mira al
       frente en esta axonometría, y así el escritorio se ve de lleno */
    { x: 2.3, y: 0.7, w: 1.7, d: 2.3, lv: 3, pi: 1, vx: 0.1, side: "x" },
    {
      x: 1.1,
      y: 2.5,
      w: 1.9,
      d: 1.6,
      lv: 2,
      pi: 0,
      vx: 0.25,
    } /* cuerpo bajo, al frente */,
  ],
};

const nbVoidLv = (v) => v.lv - 1;

export { PB, NB, nbVoidLv, EXT, PDOORS, PWIN, PW, PGX, PGY, PROOMS };
