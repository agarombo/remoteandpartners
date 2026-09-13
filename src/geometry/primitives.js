const U = 22,
  IX = 0.866,
  IY = 0.5,
  IZ = 0.82,
  SP = 6.2;

const FT = 12;

const FA = IX * U,
  FB = IY * U;

const flat = (ox, oy, z) =>
  "matrix(" +
  FA.toFixed(3) +
  "," +
  FB.toFixed(3) +
  "," +
  (-FA).toFixed(3) +
  "," +
  FB.toFixed(3) +
  "," +
  ((ox - oy) * FA).toFixed(2) +
  "," +
  ((ox + oy) * FB - z * IZ * U).toFixed(2) +
  ")";

function ftin(un) {
  const t = Math.round(un * FT * 12); /* a pulgadas enteras */
  const f = Math.floor(t / 12);
  return f + "'-" + (t - f * 12) + '"';
}

const P = (x, y, z) => [(x - y) * U * IX, (x + y) * U * IY - z * U * IZ];

const pts = (a) =>
  a.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

const n1 = (v) => v.toFixed(1);

function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shadows = { current: null };

const SHK = [0.62, -0.38];

function box(x, y, sx, sy, z, h, c, tex) {
  const t = [
    P(x, y, z + h),
    P(x + sx, y, z + h),
    P(x + sx, y + sy, z + h),
    P(x, y + sy, z + h),
  ];
  const l = [
    P(x, y + sy, z + h),
    P(x + sx, y + sy, z + h),
    P(x + sx, y + sy, z),
    P(x, y + sy, z),
  ];
  const r = [
    P(x + sx, y, z + h),
    P(x + sx, y + sy, z + h),
    P(x + sx, y + sy, z),
    P(x + sx, y, z),
  ];
  if (shadows.current && h >= 0.3 && sx * sy >= 0.03) {
    /* casco de la huella proyectada desde la base y desde la coronación */
    const F = (k) => [
      P(x + SHK[0] * k, y + SHK[1] * k, 0),
      P(x + sx + SHK[0] * k, y + SHK[1] * k, 0),
      P(x + sx + SHK[0] * k, y + sy + SHK[1] * k, 0),
      P(x + SHK[0] * k, y + sy + SHK[1] * k, 0),
    ];
    const a = F(z),
      b = F(z + h);
    shadows.current.push(
      '<polygon points="' + pts([a[3], a[0], b[0], b[1], b[2], a[2]]) + '"/>',
    );
    /* lo que apoya en el suelo oscurece el suelo a su alrededor */
    if (z <= 0.15)
      shadows.current.push(
        '<polygon class="ao" points="' +
          pts([
            P(x - 0.08, y - 0.08, 0),
            P(x + sx + 0.08, y - 0.08, 0),
            P(x + sx + 0.08, y + sy + 0.08, 0),
            P(x - 0.08, y + sy + 0.08, 0),
          ]) +
          '"/>',
      );
  }
  /* cada cara lleva su degradado de luz: la cubierta se aclara hacia el foco,
     los paramentos se oscurecen hacia el suelo. Es lo que hace que una caja
     deje de ser un diagrama y pase a ser un volumen con material. */
  let s =
    '<polygon class="f" points="' +
    pts(t) +
    '" fill="url(#gt-' +
    c +
    ')"/>' +
    '<polygon class="f" points="' +
    pts(l) +
    '" fill="url(#gl-' +
    c +
    ')"/>' +
    '<polygon class="f" points="' +
    pts(r) +
    '" fill="url(#gr-' +
    c +
    ')"/>';
  if (tex)
    s +=
      '<polygon class="tex" points="' +
      pts(l) +
      '" fill="url(#slat)"/>' +
      '<polygon class="tex" points="' +
      pts(r) +
      '" fill="url(#slat)"/>';
  /* la luz roza las aristas de la coronación y la esquina que mira al frente */
  if (h >= 0.3)
    s +=
      '<polyline class="hl" points="' +
      pts([t[3], t[2], t[1]]) +
      " " +
      pts([t[2], l[2]]) +
      '"/>';
  return s;
}

function seg(a, b, stroke, w, op) {
  return (
    '<line x1="' +
    n1(a[0]) +
    '" y1="' +
    n1(a[1]) +
    '" x2="' +
    n1(b[0]) +
    '" y2="' +
    n1(b[1]) +
    '" stroke="var(--' +
    stroke +
    ')" stroke-width="' +
    w +
    '"' +
    (op ? ' opacity="' + op + '"' : "") +
    "/>"
  );
}

function windows(x, y, sx, sy, z, h) {
  let s = "";
  const Y = y + sy,
    X = x + sx,
    z0 = z + h * 0.24,
    z1 = z + h * 0.8;
  const nx = Math.max(1, Math.round(sx / 0.5)),
    ny = Math.max(1, Math.round(sy / 0.5));
  const px = (sx - 0.2) / nx,
    py = (sy - 0.2) / ny;
  for (let i = 0; i < nx; i++) {
    const wx = x + 0.1 + i * px,
      ww = px * 0.72;
    s +=
      '<polygon points="' +
      pts([P(wx, Y, z1), P(wx + ww, Y, z1), P(wx + ww, Y, z0), P(wx, Y, z0)]) +
      '" fill="url(#glassL)"/>';
  }
  for (let i = 0; i < ny; i++) {
    const wy = y + 0.1 + i * py,
      wh = py * 0.72;
    s +=
      '<polygon points="' +
      pts([P(X, wy, z1), P(X, wy + wh, z1), P(X, wy + wh, z0), P(X, wy, z0)]) +
      '" fill="url(#glassR)"/>';
  }
  return s;
}

export {
  flat,
  FA,
  FB,
  U,
  SP,
  FT,
  ftin,
  P,
  pts,
  n1,
  rng,
  box,
  windows,
  seg,
  shadows,
  SHK,
  IX,
  IZ,
  IY,
};
