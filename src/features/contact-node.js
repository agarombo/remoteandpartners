import { P, SP, n1, box, pts } from "../geometry/primitives.js";
import { svgElement as el } from "../core/dom.js";
export function mountNode(gNode) {
  if (gNode.hasChildNodes()) return;
  const UNODE = { a: 3.6, b: 0.6, n: 2.7 };
  (function buildUserNode() {
    const p = P(UNODE.a * SP, UNODE.b * SP, 0),
      h = UNODE.n / 2;
    const g = el("g", {
      transform: "translate(" + n1(p[0]) + "," + n1(p[1]) + ")",
    });
    let s = box(-h, -h, UNODE.n, UNODE.n, -0.4, 0.4, "stone");
    s +=
      '<polygon points="' +
      pts([P(-h, h, -0.4), P(h, h, -0.4), P(0, 0, -UNODE.n * 1.1)]) +
      '" fill="var(--stone-2)" class="f"/>' +
      '<polygon points="' +
      pts([P(h, -h, -0.4), P(h, h, -0.4), P(0, 0, -UNODE.n * 1.1)]) +
      '" fill="var(--stone-3)" class="f"/>';
    const b0 = P(0, 0, 0),
      b1 = P(0, 0, 2.6);
    s +=
      '<line class="un-beam" x1="' +
      n1(b0[0]) +
      '" y1="' +
      n1(b0[1]) +
      '" x2="' +
      n1(b1[0]) +
      '" y2="' +
      n1(b1[1]) +
      '"/>' +
      '<polygon class="un-tip" points="' +
      n1(b1[0]) +
      "," +
      n1(b1[1] - 7) +
      " " +
      n1(b1[0] + 5) +
      "," +
      n1(b1[1]) +
      " " +
      n1(b1[0]) +
      "," +
      n1(b1[1] + 7) +
      " " +
      n1(b1[0] - 5) +
      "," +
      n1(b1[1]) +
      '"/>';
    /* un anillo pequeño que titila sobre el nodo recién conectado: no se
     desplaza ni se expande, sólo respira, para no competir con el halo
     que sale del centro al cerrar la conexión */
    s +=
      '<circle class="un-halo" cx="' +
      n1(b0[0]) +
      '" cy="' +
      n1(b0[1]) +
      '" r="14"/>' +
      '<circle class="un-halo b" cx="' +
      n1(b0[0]) +
      '" cy="' +
      n1(b0[1]) +
      '" r="14"/>';
    g.innerHTML = s;
    gNode.appendChild(g);
  })();
  /* la conexión del nodo nuevo con el centro, dibujada como las demás */
  (function buildUserLink() {
    const a = P(UNODE.a * SP, UNODE.b * SP, 0),
      b = [0, 0];
    gNode.insertBefore(
      el("line", {
        class: "un-link",
        x1: n1(a[0]),
        y1: n1(a[1]),
        x2: n1(b[0]),
        y2: n1(b[1]),
      }),
      gNode.firstChild,
    );
  })();
}
