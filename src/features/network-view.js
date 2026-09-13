import { PHOTOS, DISTRICTS, u, dx, px2 } from "../content.js";
function netDiagram(d) {
  const nodes = d.people.map((p, i) => ({ p: p, i: i }));
  const cx = 130,
    cy = 62,
    R = 78;
  let s = '<svg class="net-map" viewBox="0 0 260 124" aria-hidden="true">';
  const pos = [
    [cx, cy],
    [cx - R, cy - 30],
    [cx - R + 22, cy + 34],
    [cx + R, cy - 30],
    [cx + R - 22, cy + 34],
  ];
  nodes.forEach((_, i) => {
    const q = i === 0 ? pos[0] : pos[i];
    s +=
      '<line class="net-link" x1="' +
      cx +
      '" y1="' +
      cy +
      '" x2="' +
      q[0] +
      '" y2="' +
      q[1] +
      '"/>';
  });
  s +=
    '<line class="net-link net-open" x1="' +
    cx +
    '" y1="' +
    cy +
    '" x2="' +
    pos[3][0] +
    '" y2="' +
    pos[3][1] +
    '"/>';
  nodes.forEach((n, i) => {
    const q = pos[i];
    s +=
      '<circle class="net-node" cx="' +
      q[0] +
      '" cy="' +
      q[1] +
      '" r="' +
      (n.p.core ? 9 : 6) +
      '" style="--c:var(--' +
      n.p.hue +
      '-3)"/>';
  });
  s +=
    '<circle class="net-node net-ghost" cx="' +
    pos[3][0] +
    '" cy="' +
    pos[3][1] +
    '" r="6"/>' +
    '<text class="net-cap" x="' +
    pos[3][0] +
    '" y="' +
    (pos[3][1] - 13) +
    '">FUTUROS PARTNERS</text>' +
    "</svg>";
  return s;
}
function netList(d) {
  return (
    '<ul class="net">' +
    d.people
      .map(
        (p, i) =>
          '<li role="button" tabindex="0" data-p="' +
          i +
          '" style="--c:var(--' +
          p.hue +
          '-3)">' +
          '<span class="ava"><img decoding="async" src="' +
          PHOTOS[p.ph] +
          '" alt="' +
          p.name +
          '"></span>' +
          '<span class="who">' +
          '<span class="area mono">' +
          px2(d, i, "area") +
          "</span>" +
          '<span class="t">' +
          p.name +
          "</span>" +
          (px2(d, i, "role").toUpperCase() === px2(d, i, "area").toUpperCase()
            ? ""
            : '<span class="role">' + px2(d, i, "role") + "</span>") +
          '<span class="d">' +
          px2(d, i, "bio") +
          "</span>" +
          "</span></li>",
      )
      .join("") +
    "</ul>"
  );
}
export function personHTML(i) {
  const d = DISTRICTS.find((x) => x.id === "team"),
    p = d.people[i];
  return (
    '<div class="pgrid">' +
    '<img class="portrait" decoding="async" src="' +
    PHOTOS[p.ph] +
    '" alt="' +
    p.name +
    '">' +
    '<div class="pcol">' +
    '<div class="eyebrow">' +
    '<div class="mono">' +
    u("node") +
    " 0" +
    (i + 1) +
    " · " +
    px2(d, i, "area") +
    "</div>" +
    "<h2>" +
    p.name +
    "</h2>" +
    (px2(d, i, "role").toUpperCase() === px2(d, i, "area").toUpperCase()
      ? ""
      : '<p class="sub">' + px2(d, i, "role") + "</p>") +
    "</div>" +
    '<dl class="block wide rec">' +
    "<div><dt>" +
    u("location") +
    "</dt><dd>" +
    (p.city || "—") +
    "</dd></div>" +
    "<div><dt>" +
    u("status") +
    '</dt><dd class="live">' +
    u("active") +
    "</dd></div>" +
    "</dl>" +
    '<p class="lead">' +
    px2(d, i, "bio") +
    "</p>" +
    '<hr class="rule">' +
    '<div class="mono">' +
    u("others") +
    "</div>" +
    '<ul class="net mini">' +
    d.people
      .map((q, j) =>
        j === i
          ? ""
          : '<li role="button" tabindex="0" data-p="' +
            j +
            '" style="--c:var(--' +
            q.hue +
            '-3)"><span class="ava">' +
            '<img decoding="async" src="' +
            PHOTOS[q.ph] +
            '" alt="' +
            q.name +
            '"></span><span class="who">' +
            '<span class="t">' +
            q.name +
            '</span><span class="role">' +
            px2(d, j, "role") +
            "</span></span></li>",
      )
      .join("") +
    "</ul>" +
    "</div>" +
    "</div>" +
    '<button class="back" type="button">' +
    u("backNet") +
    "</button>"
  );
}
export function districtHTML(o) {
  const d = DISTRICTS.find((x) => x.id === o.id);
  return (
    '<div class="eyebrow">' +
    '<div class="mono">' +
    u("sector") +
    " " +
    String(o.i + 1).padStart(2, "0") +
    " · " +
    o.a.toFixed(1) +
    " / " +
    o.b.toFixed(1) +
    " · " +
    u("alt") +
    " " +
    o.alt.toLocaleString("en-US") +
    " FT</div>" +
    "<h2>" +
    dx(d, "label") +
    "</h2>" +
    '<p class="sub">' +
    ((x) => x.charAt(0) + x.slice(1).toLowerCase())(dx(d, "sub")) +
    "</p>" +
    "</div>" +
    '<p class="lead">' +
    dx(d, "lead") +
    "</p>" +
    '<hr class="rule">' +
    '<div class="mono">' +
    dx(d, "listTitle") +
    "</div>" +
    (d.network ? netDiagram(d) + netList(d) : "") +
    '<ul class="items">' +
    (dx(d, "items") || [])
      .map(
        (it) =>
          '<li><span class="k">' +
          it[0] +
          '</span><span><span class="t">' +
          it[1] +
          '</span><span class="d">' +
          it[2] +
          "</span>" +
          (it[3]
            ? '<button class="lab-btn go" type="button" data-lab="' +
              it[3] +
              '">' +
              (it[3] === "autocad"
                ? u("openSheet")
                : it[3] === "auto"
                  ? u("openNote")
                  : u("openModel")) +
              " ›</button>"
            : "") +
          "</span></li>",
      )
      .join("") +
    "</ul>" +
    '<hr class="rule">' +
    '<div class="specs">' +
    dx(d, "specs")
      .map(
        (s) =>
          '<div><span class="n">' +
          s[0] +
          '</span><span class="l">' +
          s[1] +
          "</span></div>",
      )
      .join("") +
    "</div>" +
    '<button class="back" type="button">' +
    u("back") +
    "</button>"
  );
}
