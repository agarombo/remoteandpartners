import { u } from "../content.js";
import { WSTATES, WTOTAL, TYPES, REGION } from "./territory-geometry.js";
export function territoryHTML(state) {
  const t = state.sel;
  let h =
    '<div class="eyebrow">' +
    '<div class="mono">' +
    u("extTerr") +
    " · US</div>" +
    "<h2>" +
    u("usTitle") +
    "</h2>" +
    '<p class="sub">' +
    (state.mode === "territory" ? u("territory") : u("typology")) +
    "</p></div>" +
    '<p class="lead"><b>' +
    u("privTitle") +
    "</b><br>" +
    u("privBody") +
    "</p>" +
    '<div class="modes">' +
    '<button type="button" data-m="territory" aria-current="' +
    (state.mode === "territory") +
    '">' +
    u("territory") +
    "</button>" +
    '<button type="button" data-m="typology" aria-current="' +
    (state.mode === "typology") +
    '">' +
    u("typology") +
    "</button>" +
    '</div><hr class="rule">';
  if (state.mode === "territory") {
    if (t && WSTATES[t]) {
      const d = WSTATES[t];
      h +=
        '<div class="mono">' +
        t +
        " · " +
        u("region") +
        " " +
        REGION[t] +
        "</div>" +
        '<div class="specs"><div><span class="n">' +
        TYPES.filter((x) => d[x[0]])[0][1] +
        '</span><span class="l">' +
        u("typology2") +
        "</span></div>" +
        '<div><span class="n">' +
        u("active") +
        '</span><span class="l">' +
        u("status") +
        "</span></div>" +
        '<div><span class="n">' +
        u("region") +
        " " +
        REGION[t] +
        '</span><span class="l">US</span></div></div>' +
        '<ul class="items">' +
        TYPES.filter((x) => d[x[0]])
          .map(
            (x) =>
              '<li><span class="k">' +
              String(d[x[0]]).padStart(2, "0") +
              '</span><span><span class="t">' +
              u("ty_" + x[0]) +
              "</span></span></li>",
          )
          .join("") +
        "</ul>" +
        '<div class="mono">' +
        u("scope") +
        "</div>" +
        '<p class="lead">BIM · REVIT · AUTOCAD<br>' +
        u("scopeBody") +
        "</p>";
    } else {
      h +=
        '<div class="specs">' +
        '<div><span class="n">' +
        String(Object.keys(WSTATES).length).padStart(2, "0") +
        '</span><span class="l">' +
        u("activeStates") +
        "</span></div>" +
        '<div><span class="n">02</span><span class="l">' +
        u("typologies") +
        "</span></div>" +
        '<div><span class="n">+' +
        WTOTAL.toLocaleString("en-US") +
        '</span><span class="l">' +
        u("operations") +
        "</span></div></div>" +
        '<p class="lead">' +
        u("pickState") +
        "</p>";
    }
  } else {
    const k = state.sel;
    if (k && TYPES.filter((x) => x[0] === k).length) {
      h +=
        '<div class="mono">' +
        u("ty_" + k) +
        " · " +
        u("sector") +
        " A-0" +
        (TYPES.findIndex((x) => x[0] === k) + 1) +
        "</div>" +
        '<p class="lead">' +
        u("tyd_" + k) +
        "</p>" +
        '<div class="mono">' +
        u("experience") +
        "</div>" +
        '<ul class="items">' +
        u("tye_" + k)
          .map(
            (l, i) =>
              '<li><span class="k">' +
              String(i + 1).padStart(2, "0") +
              '</span><span><span class="t">' +
              l +
              "</span></span></li>",
          )
          .join("") +
        "</ul>" +
        '<div class="specs"><div><span class="n">' +
        Object.keys(WSTATES).filter((s) => (WSTATES[s][k] || 0) > 0).length +
        '</span><span class="l">' +
        u("states") +
        "</span></div>" +
        '<div><span class="n">' +
        u("active") +
        '</span><span class="l">' +
        u("status") +
        "</span></div>" +
        '<div><span class="n">ARC · STR<br>MEP</span><span class="l">' +
        u("disciplines") +
        "</span></div></div>";
    } else {
      h += '<p class="lead">' + u("pickType") + "</p>";
    }
  }
  h += '<button class="back" type="button">' + u("returnCity") + "</button>";
  return h;
}
