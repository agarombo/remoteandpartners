import { u, PORTFOLIO, pf } from "../content.js";
import {
  WSTATES,
  WTOTAL,
  TYPES,
  PJ,
  PJ_TYPES,
  REGION,
} from "./territory-geometry.js";

const esc = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pad = (n) => String(n).padStart(2, "0");

/* Proyectos de Tomás Linares, anteriores al estudio: sólo texto, sin
   interacción. Van siempre con su rótulo y su aclaración, para que no se lean
   como trabajo de Remote & Partners ni como parte de los 2.500 del equipo. */
function projectsBlock(list) {
  return (
    '<div class="mono">' +
    u("pjTitle") +
    "</div>" +
    '<p class="lead">' +
    u("pjBody") +
    "</p>" +
    '<ul class="items">' +
    list
      .map(
        (p, i) =>
          '<li><span class="k">' +
          pad(i + 1) +
          '</span><span><span class="t">' +
          esc(pf(p, "ty")) +
          '</span><span class="d">' +
          esc(p.loc) +
          "</span></span></li>",
      )
      .join("") +
    "</ul>"
  );
}

const spec = (n, label) =>
  '<div><span class="n">' + n + '</span><span class="l">' + label + "</span></div>";

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
        '<div class="specs">' +
        spec(TYPES.filter((x) => d[x[0]])[0][1], u("typology2")) +
        spec(u("active"), u("status")) +
        spec(u("region") + " " + REGION[t], "US") +
        "</div>" +
        '<ul class="items">' +
        TYPES.filter((x) => d[x[0]])
          .map(
            (x) =>
              '<li><span class="k">' +
              pad(d[x[0]]) +
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
    } else if (t && PJ[t]) {
      /* estado con proyectos de Tomás: sin "alcance", que describe lo del equipo */
      const list = PJ[t].map((i) => PORTFOLIO[i]);
      h +=
        '<div class="mono">' +
        t +
        " · " +
        u("region") +
        " " +
        REGION[t] +
        "</div>" +
        '<div class="specs">' +
        spec(pad(list.length), u("pjCount")) +
        spec(u("region") + " " + REGION[t], "US") +
        "</div>" +
        projectsBlock(list);
    } else {
      h +=
        '<div class="specs">' +
        spec(pad(Object.keys(REGION).length), u("activeStates")) +
        spec(pad(TYPES.length), u("typologies")) +
        spec("+" + WTOTAL.toLocaleString("en-US"), u("operations")) +
        "</div>" +
        '<p class="lead">' +
        u("pickState") +
        "</p>" +
        '<p class="lead">' +
        u("pjLegend") +
        "</p>" +
        projectsBlock(PORTFOLIO);
    }
  } else {
    const k = state.sel;
    if (k && TYPES.filter((x) => x[0] === k).length) {
      const head =
        '<div class="mono">' +
        u("ty_" + k) +
        " · " +
        u("sector") +
        " A-0" +
        (TYPES.findIndex((x) => x[0] === k) + 1) +
        "</div>";
      if (PJ_TYPES.has(k)) {
        /* tipología del portafolio de Tomás: sus proyectos, no los del equipo */
        const list = PORTFOLIO.filter((p) => p.tc.includes(k));
        const states = new Set(list.map((p) => p.st).filter(Boolean)).size;
        h +=
          head +
          '<div class="specs">' +
          spec(pad(list.length), u("pjCount")) +
          spec(pad(states), u("states")) +
          "</div>" +
          projectsBlock(list);
      } else {
        h +=
          head +
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
                pad(i + 1) +
                '</span><span><span class="t">' +
                l +
                "</span></span></li>",
            )
            .join("") +
          "</ul>" +
          '<div class="specs">' +
          spec(
            Object.keys(WSTATES).filter((s) => (WSTATES[s][k] || 0) > 0).length,
            u("states"),
          ) +
          spec(u("active"), u("status")) +
          spec("ARC · STR<br>MEP", u("disciplines")) +
          "</div>";
      }
    } else {
      h += '<p class="lead">' + u("pickType") + "</p>";
    }
  }
  h += '<button class="back" type="button">' + u("returnCity") + "</button>";
  return h;
}
