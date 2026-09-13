import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { loadSite } from "./site-harness.mjs";

async function setup(t, options) {
  const site = await loadSite(options);
  t.after(() => site.close());
  await site.advance(4000);
  return site;
}

test("production entry has local assets, metadata, and all existing downloads", () => {
  const html = readFileSync("dist/index.html", "utf8");
  assert.match(html, /remoteandpartners.com/);
  assert.doesNotMatch(
    html,
    /data:font|data:image|fonts.googleapis|fonts.gstatic/,
  );
  for (const file of readdirSync("public/DXF")) {
    assert.deepEqual(
      readFileSync("dist/DXF/" + file),
      readFileSync("public/DXF/" + file),
    );
  }
  for (const [, path] of html.matchAll(
    /(?:src|href)="(\.\/assets\/[^"#]+)"/g,
  )) {
    assert.ok(readFileSync("dist/" + path).length);
  }
});

test("city keeps four destinations, appearance, language and sound controls", async (t) => {
  const s = await setup(t);
  assert.equal(s.document.querySelectorAll("#islands > .isl").length, 14);
  assert.equal(s.document.querySelectorAll("#nav button").length, 4);
  assert.equal(s.document.documentElement.lang, "en");
  for (const button of s.document.querySelectorAll("#looks button")) {
    await s.click('#looks [data-look="' + button.dataset.look + '"]');
    assert.equal(s.document.documentElement.dataset.look, button.dataset.look);
  }
  await s.click("#langBtn");
  assert.equal(s.document.documentElement.lang, "es");
  assert.match(s.find("#nav").textContent, /SERVICIOS/);
  await s.click("#sndBtn");
  assert.equal(s.find("#sndBtn").getAttribute("aria-pressed"), "false");
  await s.click("#sndBtn");
  assert.equal(s.find("#sndBtn").getAttribute("aria-pressed"), "true");
});

test("all four sheets, cached revisits, plan flip, section and automation", async (t) => {
  const s = await setup(t);
  assert.equal(s.find(".proj-bim").childElementCount, 0);
  await s.click("#nav .c-purple");
  await s.click('#panel [data-lab="autocad"]');
  await s.advance(2000);
  assert.equal(s.find("#lab").getAttribute("aria-hidden"), "false");
  assert.ok(s.find(".isl.focus").classList.contains("flat"));
  const first = s.find(".proj-cut").firstElementChild;
  const sheets = new Set();
  for (let i = 0; i < 4; i++) {
    sheets.add(s.find("#labTitle").textContent);
    assert.ok(s.find(".plan-g").childElementCount > 1);
    await s.key("ArrowRight");
  }
  assert.equal(sheets.size, 4);
  assert.equal(s.find(".proj-cut").firstElementChild, first);
  await s.click("#labFlip");
  assert.ok(!s.find(".isl.focus").classList.contains("flat"));
  await s.key("Enter", ".proj-cut .det-open");
  assert.match(s.find("#detail").textContent, /A-401/);
  await s.key("Escape");
  await s.key("Escape");
  assert.equal(s.find("#lab").getAttribute("aria-hidden"), "true");
  await s.click('#panel [data-lab="auto"]');
  assert.match(s.find("#detail").textContent, /AUT-01/);
});

test("BIM disciplines and documentation handoff retain their state", async (t) => {
  const s = await setup(t);
  await s.click("#nav .c-purple");
  await s.click('#panel [data-lab="revit"]');
  const model = s.find(".proj-bim").firstElementChild;
  assert.ok(model);
  for (const key of ["arc", "str", "mep"]) {
    await s.click('#labCtrl [data-k="' + key + '"]');
    assert.equal(
      s.find('#labCtrl [data-k="' + key + '"]').getAttribute("aria-pressed"),
      "false",
    );
    assert.ok(s.find(".proj-bim .lay-" + key).classList.contains("lay-off"));
  }
  assert.equal(s.find(".proj-bim").firstElementChild, model);
  await s.click("#labDoc");
  await s.advance(2000);
  assert.match(s.find("#labEyebrow").textContent, /AUTOCAD/);
  assert.ok(s.find(".isl.focus").classList.contains("flat"));
});

test("network portraits and keyboard navigation work in both languages", async (t) => {
  const s = await setup(t);
  await s.click("#nav .c-orange");
  await s.advance(3000);
  assert.ok(!s.find("#panel").classList.contains("person"));
  assert.equal(s.document.querySelectorAll("#panel .net [data-p]").length, 3);
  await s.click('#panel [data-p="0"]');
  assert.match(s.find("#panel").textContent, /Agustín/);
  assert.match(s.find(".portrait").src, /assets\/agu-/);
  await s.key("ArrowRight");
  assert.match(s.find("#panel").textContent, /Tomás/);
  await s.key("ArrowRight");
  assert.match(s.find(".portrait").src, /assets\/ro-/);
  await s.click("#langBtn");
  assert.equal(s.document.documentElement.lang, "es");
  await s.key("ArrowRight");
  assert.match(s.find(".portrait").src, /assets\/agu-/);
});

test("territory and typology build on demand and remain interactive on revisit", async (t) => {
  const s = await setup(t);
  assert.equal(s.find("#usmap").childElementCount, 0);
  assert.equal(s.find("#typo").childElementCount, 0);
  await s.click("#nav .c-blue");
  await s.advance(6000);
  const region = s.find('#usmap [data-s="TX"]');
  assert.equal(s.document.querySelectorAll("#usmap .st.on").length, 8);
  await s.key("Enter", '#usmap [data-s="TX"]');
  assert.match(s.find("#panel").textContent, /TX/);
  await s.click('#panel [data-m="typology"]');
  assert.equal(s.document.querySelectorAll("#typo .ty").length, 2);
  await s.key(" ", '#typo [data-t="twh"]');
  assert.match(s.find("#panel").textContent, /TOWNHOUSE/);
  await s.key("Escape");
  await s.advance(5000);
  await s.click("#nav .c-blue");
  await s.advance(6000);
  await s.click('#panel [data-m="territory"]');
  assert.equal(s.find('#usmap [data-s="TX"]'), region);
});

test("origin chapters build the city and restore it on exit", async (t) => {
  const s = await setup(t);
  await s.click("#nav .c-magenta");
  await s.advance(2500);
  for (let i = 0; i < 4; i++) {
    await s.key("ArrowRight");
    await s.advance(2000);
  }
  assert.equal(s.document.querySelectorAll("#islands .built").length, 14);
  assert.equal(s.find("#oNext").disabled, true);
  await s.key("Escape");
  assert.ok(!s.document.body.classList.contains("originmode"));
  await s.click("#nav .c-purple");
  await s.advance(2000);
  assert.match(s.find("#panel").textContent, /AutoCAD/);
});

test("contact protocol and composed email preserve user input", async (t) => {
  const s = await setup(t, { reduced: true });
  await s.click("#connect");
  await s.advance(4000);
  assert.ok(s.find("#panel").classList.contains("form"));
  s.find("#fName").value = "Test & User";
  s.find("#fCompany").value = "Architecture studio";
  s.find("#fName").dispatchEvent(
    new s.window.Event("input", { bubbles: true }),
  );
  const href = decodeURIComponent(s.find("#fSend").href);
  assert.match(href, /^mailto:agustin@remoteandpartners.com/);
  assert.match(href, /Test & User/);
  assert.match(href, /Architecture studio/);
  await s.key("Escape");
  await s.advance(3000);
  assert.equal(s.pendingFrames, 0);
});

test("motion sleeps while reading, hidden, or reduced; interaction wakes it", async (t) => {
  const s = await setup(t);
  await s.click("#nav .c-purple");
  await s.advance(5000);
  assert.equal(s.pendingFrames, 0);
  s.resetWrites();
  await s.advance(2000);
  assert.equal(s.writes, 0);
  await s.key("Escape");
  await s.advance(4000);
  assert.equal(s.pendingFrames, 1);
  s.setHidden(true);
  assert.equal(s.pendingFrames, 0);
  s.setHidden(false);
  await s.advance(100);
  assert.equal(s.pendingFrames, 1);
  s.setReduced(true);
  await s.advance(4000);
  assert.equal(s.pendingFrames, 0);
  s.resetWrites();
  await s.advance(2000);
  assert.equal(s.writes, 0);
  await s.click("#nav .c-purple");
  await s.advance(3000);
  assert.ok(s.find("#panel").classList.contains("open"));
  s.setReduced(false);
  await s.key("Escape");
  await s.advance(4000);
  assert.equal(s.pendingFrames, 1);
});

test("mobile viewport retains services, plans, territory and back navigation", async (t) => {
  const s = await setup(t, { width: 390, reduced: true });
  await s.click("#nav .c-purple");
  await s.click('#panel [data-lab="autocad"]');
  await s.advance(2500);
  assert.ok(s.find(".isl.focus").classList.contains("flat"));
  await s.key("Escape");
  await s.key("Escape");
  await s.click("#nav .c-blue");
  await s.advance(6000);
  await s.key("Escape");
  await s.advance(5000);
  assert.ok(!s.document.body.classList.contains("mapmode"));
});

test("a settled territory camera responds to viewport changes", async (t) => {
  const s = await setup(t, { reduced: true });
  await s.click("#nav .c-blue");
  await s.advance(6000);
  const before = s.find("#world").getAttribute("transform");
  assert.equal(s.pendingFrames, 0);
  s.window.innerWidth = 390;
  s.window.dispatchEvent(new s.window.Event("resize"));
  await s.advance(1000);
  assert.notEqual(s.find("#world").getAttribute("transform"), before);
});

test("decorative flight speed is independent of display refresh rate", async (t) => {
  const a = await setup(t),
    b = await setup(t);
  await a.advance(2000, 60);
  await b.advance(2000, 120);
  const x = (s) =>
    Number(
      s
        .find("#ships > g")
        .getAttribute("transform")
        .match(/translate\(([^,]+)/)[1],
    );
  // The final ambient sample can differ by one 30 Hz frame (under 1 unit).
  assert.ok(Math.abs(x(a) - x(b)) < 1);
});

test("standalone Artifact still runs with embedded fonts and portraits", async (t) => {
  const html = readFileSync("ciudad.html", "utf8");
  assert.doesNotMatch(
    html,
    /import\.meta|fonts.googleapis|fonts.gstatic|src="\/src\//,
  );
  assert.match(html, /data:font\/woff2;base64/);
  const s = await setup(t, { original: "ciudad.html", reduced: true });
  await s.click("#nav .c-orange");
  await s.advance(3000);
  assert.match(s.find(".portrait").src, /^data:image\/jpeg;base64,/);
  await s.key("Escape");
});

for (const shot of ["city", "plan", "flat", "bim", "typo", "map", "rings"]) {
  test("capture URL still completes: " + shot, async (t) => {
    const s = await setup(t, { query: "?shot=" + shot });
    await s.advance(6000);
    assert.ok(s.document.documentElement.classList.contains("shot-ready"));
    assert.equal(s.pendingFrames, 0);
  });
}

test("switching viewers cancels obsolete automatic transitions", async (t) => {
  const s = await setup(t);
  await s.click("#nav .c-purple");
  await s.click('#panel [data-lab="autocad"]');
  await s.key("Escape");
  await s.click('#panel [data-lab="revit"]');
  await s.advance(2500);
  assert.ok(s.find(".isl.focus").classList.contains("mode-bim"));
  assert.ok(!s.find(".isl.focus").classList.contains("flat"));
  await s.click("#nav .c-orange");
  await s.click("#nav .c-purple");
  await s.advance(2500);
  assert.match(s.find("#panel").textContent, /AutoCAD/);
  assert.ok(!s.find("#panel").classList.contains("person"));
});

test("the latest navigation wins during the return from territory", async (t) => {
  const s = await setup(t);
  await s.click("#nav .c-blue");
  await s.advance(6000);
  await s.click("#nav .c-orange");
  await s.advance(900);
  await s.click("#nav .c-purple");
  await s.advance(5500);
  assert.equal(s.document.body.dataset.view, "services");
  assert.ok(!s.document.body.classList.contains("mapmode"));
  assert.match(s.find("#panel").textContent, /AutoCAD/);
});

test("leaving origin and contact cancels their remaining timers", async (t) => {
  const s = await setup(t);
  await s.click("#nav .c-magenta");
  await s.advance(500);
  await s.click("#nav .c-purple");
  await s.advance(4000);
  assert.equal(s.document.querySelectorAll(".isl.built").length, 0);
  await s.click("#connect");
  await s.advance(200);
  await s.click("#nav .c-purple");
  await s.advance(4000);
  assert.equal(s.document.body.dataset.view, "services");
  assert.ok(!s.find("#panel").classList.contains("form"));
  assert.equal(s.find("#pulses").childElementCount, 0);
});

test("contact draft survives translation and chip changes update the email immediately", async (t) => {
  const s = await setup(t, { reduced: true });
  await s.click("#connect");
  await s.advance(1000);
  s.find("#fName").value = "Draft <&> name";
  s.find("#fEmail").value = "test@example.com";
  s.find("#fProject").value = "A multiline\nproject";
  s.find("#fProject").dispatchEvent(
    new s.window.Event("input", { bubbles: true }),
  );
  await s.click('#panel [data-w="BIM"]');
  assert.match(decodeURIComponent(s.find("#fSend").href), /BIM/);
  await s.click("#langBtn");
  assert.equal(s.find("#fName").value, "Draft <&> name");
  assert.equal(s.find("#fProject").value, "A multiline\nproject");
  assert.equal(
    s.find('#panel [data-w="BIM"]').getAttribute("aria-pressed"),
    "true",
  );
  await s.click('#panel [data-w="BIM"]');
  assert.doesNotMatch(decodeURIComponent(s.find("#fSend").href), /BIM/);
  await s.key("ArrowRight", "#fProject");
  assert.equal(s.document.body.dataset.view, "contact");
  await s.key("Escape");
  await s.click("#connect");
  await s.advance(1000);
  assert.equal(s.find("#fName").value, "Draft <&> name");
});

test("scene callouts open their drawings and selecting a sheet does not restart the camera", async (t) => {
  const s = await setup(t);
  await s.click("#nav .c-purple");
  await s.key("Enter", '.isl.focus [data-lab="autocad"]');
  await s.advance(4000);
  assert.equal(s.document.body.dataset.view, "lab");
  const before = s.find("#world").getAttribute("transform");
  await s.click('#labCtrl [data-i="1"]');
  await s.click('#labCtrl [data-i="0"]');
  await s.advance(2000);
  assert.equal(s.find("#world").getAttribute("transform"), before);
  assert.equal(s.pendingFrames, 0);
});

test("outward camera travel never hides or reveals individual islands mid-frame", async (t) => {
  const s = await setup(t, { width: 390 });
  await s.click("#nav .c-purple");
  await s.advance(5000);
  assert.ok(
    [...s.document.querySelectorAll(".isl")].some(
      (n) => n.style.visibility === "hidden",
    ),
  );
  await s.key("Escape");
  for (let i = 0; i < 8; i++) {
    await s.advance(100);
    assert.ok(
      [...s.document.querySelectorAll(".isl")].every(
        (n) => n.style.visibility !== "hidden",
      ),
    );
  }
});

test("an open drawing refits when crossing the mobile/desktop breakpoint", async (t) => {
  const s = await setup(t, { width: 390, reduced: true });
  await s.click("#nav .c-purple");
  await s.click('#panel [data-lab="autocad"]');
  await s.advance(2500);
  const mobile = s.find("#world").getAttribute("transform");
  s.window.innerWidth = 1440;
  s.window.dispatchEvent(new s.window.Event("resize"));
  await s.advance(1000);
  assert.match(s.find("#world").getAttribute("transform"), /scale\(3\.3000\)/);
  s.window.innerWidth = 390;
  s.window.dispatchEvent(new s.window.Event("resize"));
  await s.advance(1000);
  assert.equal(s.find("#world").getAttribute("transform"), mobile);
});
