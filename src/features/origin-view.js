import { PHOTOS, u } from "../content.js";
export function originHTML(step, count) {
  const s = step;
  let h =
    '<div class="eyebrow"><div class="mono">' +
    u("oSector")[s] +
    "</div>" +
    "<h2>" +
    u("oTitle")[s] +
    '</h2><p class="sub">' +
    u("oSub")[s] +
    "</p></div>" +
    '<p class="lead">' +
    u("oLead")[s] +
    "</p>";
  if (s === 0) h += '<div class="specs" id="oStats"></div>';
  if (s === 1) h += '<div class="specs" id="oStats"></div>';
  if (s === 2) h += '<div class="specs" id="oStats"></div>';
  /* la red no enumera capacidades: eso es trabajo de SERVICES */
  if (s === 3) {
    h +=
      '<div class="specs"><div><span class="n">03</span><span class="l">' +
      u("oPeople") +
      "</span></div>" +
      '<div><span class="n">05</span><span class="l">' +
      u("oDisc") +
      "</span></div>" +
      '<div><span class="n">03</span><span class="l">' +
      u("oPlaces") +
      "</span></div></div>";
  }
  if (s === 4) {
    h +=
      '<figure class="human"><img decoding="async" src="' +
      PHOTOS.agu +
      '" alt="Agustín Garombo Garelis">' +
      "<blockquote>" +
      u("oClaim") +
      "</blockquote>" +
      '<figcaption><span class="mono">' +
      u("oSign") +
      "</span></figcaption></figure>" +
      '<p class="lead">' +
      u("oWhy") +
      "</p>" +
      '<dl class="block wide"><div><dt>NETWORK STATUS</dt><dd>' +
      u("oActive") +
      "</dd></div>" +
      "<div><dt>NODES</dt><dd>" +
      count +
      "</dd></div></dl>" +
      '<button class="cta" id="oGo" type="button">' +
      u("oExplore") +
      "</button>";
  }
  h +=
    '<div class="steps">' +
    '<button class="lab-btn" id="oPrev" type="button"' +
    (s === 0 ? " disabled" : "") +
    ">‹</button>" +
    '<span class="mono">0' +
    (s + 1) +
    " / 05</span>" +
    '<button class="lab-btn go" id="oNext" type="button"' +
    (s === 4 ? " disabled" : "") +
    ">" +
    u("oNext") +
    "</button>" +
    '</div><button class="back" type="button">' +
    u("back") +
    "</button>";
  return h;
}
