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

test("city keeps four destinations with only language and sound controls", async (t) => {
  const s = await setup(t);
  assert.equal(s.document.querySelectorAll("#islands > .isl").length, 14);
  assert.equal(s.document.querySelectorAll("#nav button").length, 4);
  assert.equal(s.document.documentElement.lang, "en");
  assert.equal(s.document.documentElement.dataset.look, "light");
  assert.deepEqual(
    [...s.document.querySelectorAll(".tools button")].map((button) => button.id),
    ["langBtn", "sndBtn"],
  );
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

test("mobile panel handle follows back navigation and preserves contact drafts", async (t) => {
  const s = await setup(t, { width: 390, reduced: true });
  await s.click("#nav .c-purple");
  assert.equal(s.find(".panel-handle").getAttribute("aria-label"), "Close panel");
  await s.click(".panel-handle");
  assert.equal(s.document.body.dataset.view, "city");
  assert.equal(s.find("#panel").getAttribute("aria-hidden"), "true");
  await s.click("#nav .c-orange");
  s.find("#panel").scrollTop = 140;
  await s.click('#panel [data-p="0"]');
  assert.equal(s.find("#panel").scrollTop, 0);
  await s.click(".panel-handle");
  assert.equal(s.document.body.dataset.view, "network");
  assert.ok(!s.find("#panel").classList.contains("person"));
  await s.click(".panel-handle");
  await s.click("#connect");
  await s.advance(4000);
  s.find("#fName").value = "Saved after dismissal";
  await s.click("#langBtn");
  assert.equal(s.find(".panel-handle").getAttribute("aria-label"), "Cerrar panel");
  await s.click(".panel-handle");
  await s.click("#connect");
  await s.advance(4000);
  assert.equal(s.find("#fName").value, "Saved after dismissal");
});

test("mobile panel swipes respect scrolling, short gestures, inputs and cancellation", async (t) => {
  const s = await setup(t, { width: 390, reduced: true });
  await s.click("#nav .c-purple");
  const panel = s.find("#panel");
  Object.defineProperty(panel, "offsetHeight", { value: 480 });
  function touch(type, x, y, selector = "#panel h2") {
    const event = new s.window.Event(type, { bubbles: true, cancelable: true });
    event.touches = type === "touchend" ? [] : [{ clientX: x, clientY: y }];
    s.find(selector).dispatchEvent(event);
    return event;
  }
  touch("touchstart", 100, 500);
  touch("touchmove", 100, 520);
  assert.equal(panel.style.getPropertyValue("--panel-drag-y"), "20px");
  touch("touchend", 100, 520);
  assert.ok(panel.classList.contains("open"));
  assert.equal(panel.style.getPropertyValue("--panel-drag-y"), "");

  panel.scrollTop = 40;
  touch("touchstart", 100, 500);
  assert.equal(touch("touchmove", 100, 640).defaultPrevented, false);
  touch("touchend", 100, 640);
  assert.ok(panel.classList.contains("open"));
  panel.scrollTop = 0;
  touch("touchstart", 100, 500, ".panel-handle");
  touch("touchmove", 200, 520, ".panel-handle");
  touch("touchend", 200, 520, ".panel-handle");
  s.find(".panel-handle").dispatchEvent(new s.window.MouseEvent("click", {
    bubbles: true, cancelable: true, detail: 1,
  }));
  assert.ok(panel.classList.contains("open"));

  touch("touchstart", 100, 500);
  touch("touchmove", 100, 640);
  touch("touchcancel", 100, 640);
  assert.ok(!panel.classList.contains("dragging"));
  assert.ok(panel.classList.contains("open"));
  touch("touchstart", 100, 500);
  touch("touchmove", 100, 640);
  await s.click("#nav .c-orange");
  assert.equal(panel.style.getPropertyValue("--panel-drag-y"), "");

  touch("touchstart", 100, 500);
  assert.equal(touch("touchmove", 100, 640).defaultPrevented, true);
  const release = new s.window.Event("lostpointercapture", { bubbles: true });
  release.pointerId = 7;
  s.find("#panel h2").dispatchEvent(release);
  touch("touchend", 100, 640);
  await s.advance(1);
  assert.equal(s.document.body.dataset.view, "city");

  await s.click("#connect");
  await s.advance(4000);
  touch("touchstart", 100, 500, "#fName");
  assert.equal(touch("touchmove", 100, 640, "#fName").defaultPrevented, false);
  touch("touchend", 100, 640, "#fName");
  assert.ok(panel.classList.contains("open"));
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
  await s.click('#panel [data-p="0"]');
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

test("territory returns directly to the city without overshooting its scale", async (t) => {
  const s = await setup(t, { width: 390 });
  const scale = () =>
    +s.find("#world").getAttribute("transform").match(/scale\(([^)]+)/)[1] *
    +(s.find("#cameraLayer").style.transform.match(/scale\(([^)]+)/)?.[1] || 1);
  const home = scale();
  await s.click("#nav .c-blue");
  await s.advance(6000);
  const from = scale();
  await s.click("#panel .back");
  assert.equal(s.document.body.dataset.view, "city");
  let previous = from;
  const direction = Math.sign(home - from);
  for (let i = 0; i < 45; i++) {
    await s.advance(100);
    const current = scale();
    assert.ok(current >= Math.min(home, from) - 0.001);
    assert.ok(current <= Math.max(home, from) + 0.001);
    assert.ok((current - previous) * direction >= -0.001);
    if (!s.document.documentElement.classList.contains("still"))
      assert.ok(s.document.body.classList.contains("mapmode"));
    previous = current;
  }
  assert.ok(Math.abs(scale() - home) < 0.001);
  assert.ok(!s.document.body.classList.contains("mapmode"));
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
