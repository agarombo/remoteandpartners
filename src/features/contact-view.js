import { LANG, MAIL, BOOKING, u } from "../content.js";
export const WANTS = ["REVIT", "AUTOCAD", "BIM", "DOCUMENTATION", "OTHER"];
export function contactHTML(wants, href) {
  return (
    '<div class="eyebrow">' +
    '<div class="mono">' +
    u("sector") +
    " 06 · " +
    u("extNode") +
    "</div>" +
    "<h2>" +
    u("newConn") +
    "</h2>" +
    '<p class="sub">' +
    u("tellUs") +
    "</p>" +
    "</div>" +
    '<div class="fields">' +
    '<label><span class="mono">' +
    u("fName") +
    '</span><input id="fName" type="text" autocomplete="name"></label>' +
    '<label><span class="mono">' +
    u("fCompany") +
    '</span><input id="fCompany" type="text" autocomplete="organization"></label>' +
    '<label><span class="mono">' +
    u("fEmail") +
    '</span><input id="fEmail" type="email" autocomplete="email"></label>' +
    "</div>" +
    '<div class="mono">' +
    u("fNeed") +
    "</div>" +
    '<div class="chips">' +
    WANTS.map(
      (w) =>
        '<button type="button" class="chip" data-w="' +
        w +
        '" aria-pressed="' +
        (wants.indexOf(w) >= 0) +
        '">' +
        w +
        "</button>",
    ).join("") +
    "</div>" +
    '<label class="area"><span class="mono">' +
    u("fProject") +
    '</span><textarea id="fProject" rows="4"></textarea></label>' +
    '<a class="cta" id="fSend" href="' +
    href +
    '" target="_blank" rel="noopener">' +
    u("establish") +
    "</a>" +
    '<a class="callmini mono" target="_blank" rel="noopener" href="' +
    (BOOKING ||
      "mailto:" +
        MAIL +
        "?subject=" +
        encodeURIComponent(
          LANG === "en" ? "30 min call" : "Llamada de 30 min",
        )) +
    '">' +
    u("call30") +
    "</a>" +
    '<button class="back" type="button">' +
    u("backCity") +
    "</button>"
  );
}
export function sentHTML(id) {
  return (
    '<div class="eyebrow">' +
    '<div class="mono">' +
    u("sector") +
    " 06 · " +
    u("extNode") +
    "</div>" +
    "<h2>" +
    u("established") +
    "</h2>" +
    "</div>" +
    '<dl class="block wide">' +
    "<div><dt>NODE ID</dt><dd>" +
    id +
    "</dd></div>" +
    "<div><dt>STATUS</dt><dd>" +
    u("received") +
    "</dd></div>" +
    "</dl>" +
    '<p class="lead">' +
    u("inTouch") +
    "</p>" +
    '<button class="back" type="button">' +
    u("backCity") +
    "</button>"
  );
}
