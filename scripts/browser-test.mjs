import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium, webkit } from "playwright";

// Run against the built static site. Screenshots/reports are local QA output.
const engine = process.argv.includes("--webkit") ? "webkit" : "chrome";
const executableIndex = process.argv.indexOf("--executable-path");
const executablePath =
  executableIndex < 0 ? undefined : process.argv[executableIndex + 1];
const output = resolve("browser-results", engine);
await mkdir(output, { recursive: true });

async function swipePanel(page, motion) {
  const target = engine === "chrome" ? "#panel h2" : ".panel-handle";
  const box = await page.locator(target).boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = engine === "chrome" ? await page.context().newCDPSession(page) : null;
  if (session) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart", touchPoints: [{ x, y }],
    });
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
  }
  try {
    for (let distance = 14; distance <= 140; distance += 14) {
      if (session) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove", touchPoints: [{ x, y: y + distance }],
        });
      } else await page.mouse.move(x, y + distance);
      await page.waitForTimeout(20);
      if (distance === 70) {
        assert.ok(await page.locator("#panel").evaluate((panel) =>
          parseFloat(panel.style.getPropertyValue("--panel-drag-y")) >= 70));
        await page.screenshot({ path: resolve(output, `mobile-panel-drag-${motion}.png`) });
      }
    }
  } finally {
    if (session) {
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
    } else await page.mouse.up();
  }
}

const root = resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
};
const server = createServer(async (req, res) => {
  try {
    const path = resolve(
      root,
      "." +
        decodeURIComponent(
          new URL(req.url, "http://localhost").pathname,
        ).replace(/\/$/, "/index.html"),
    );
    if (!path.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    const body = await readFile(path);
    res
      .writeHead(200, {
        "Content-Type": types[extname(path)] || "application/octet-stream",
      })
      .end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const siteURL = `http://127.0.0.1:${server.address().port}/`;
let browser;
const report = [];
try {
  browser = await (engine === "webkit" ? webkit : chromium).launch(
    engine === "chrome"
      ? { channel: "chrome", headless: true }
      : { headless: true, executablePath },
  );
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: name === "mobile",
      hasTouch: name === "mobile",
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(response.status() + " " + response.url());
    });
    await page.goto(siteURL);
    await page.locator("#nav button").first().waitFor();
    const initial = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((r) => r.name.endsWith(".js"))
        .map((r) => ({
          url: r.name.split("/").pop(),
          bytes: r.decodedBodySize,
        })),
    );
    assert.equal(
      initial.length,
      1,
      "Only the city entry should load initially",
    );
    await page.screenshot({ path: resolve(output, name + "-city.png") });
    assert.equal(await page.locator(".brand .mark").isVisible(), true);
    if (name === "mobile") {
      for (const motion of ["reduce", "no-preference"]) {
        await page.emulateMedia({ reducedMotion: motion });
        await page.locator("#nav .c-purple").click();
        await page.locator(".panel-handle").tap();
        await page.waitForFunction(() =>
          document.body.dataset.view === "city" &&
          document.getElementById("panel").getAttribute("aria-hidden") === "true");
        await page.locator("#nav .c-purple").click();
        await page.locator(".panel-handle").hover();
        await swipePanel(page, motion);
        await page.waitForFunction(() =>
          document.body.dataset.view === "city" &&
          document.getElementById("panel").getAttribute("aria-hidden") === "true");
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
    assert.equal(await page.locator("html").getAttribute("data-look"), "light");
    assert.deepEqual(
      await page.locator(".tools button").evaluateAll((buttons) => buttons.map((button) => button.id)),
      ["langBtn", "sndBtn"],
    );
    await page.locator("#sndBtn").click();
    assert.equal(await page.locator("#sndBtn").getAttribute("aria-pressed"), "false");
    await page.locator("#sndBtn").click();
    assert.equal(await page.locator("#sndBtn").getAttribute("aria-pressed"), "true");
    await page.locator("#nav .c-purple").click();
    await page.locator('#panel.open [data-lab="autocad"]').waitFor();
    if (name === "desktop")
      assert.equal(await page.locator(".panel-handle").isVisible(), false);
    await page.screenshot({ path: resolve(output, name + "-services.png") });
    await page.locator('#panel [data-lab="autocad"]').click();
    await page.locator(".isl.focus.flat").waitFor();
    await page.waitForTimeout(150);
    const sheetTitles = new Set();
    for (let i = 0; i < 4; i++) {
      sheetTitles.add(await page.locator("#labTitle").textContent());
      await page.locator("#labNext").click();
    }
    assert.equal(sheetTitles.size, 4);
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(output, name + "-plan.png") });
    const plan = await page.locator(".isl.focus .plan-g").boundingBox();
    const lab = await page.locator("#lab").boundingBox();
    if (name === "mobile") {
      assert.ok(
        plan.x >= -2 && plan.x + plan.width <= width + 2,
        "Mobile drawing fits horizontally",
      );
      assert.ok(
        plan.y >= 70 && plan.y + plan.height <= lab.y + 2,
        "Mobile drawing fits above its controls",
      );
    }
    await page.setViewportSize({
      width: name === "mobile" ? 1440 : 390,
      height: name === "mobile" ? 900 : 844,
    });
    await page.waitForTimeout(150);
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    await page.locator("#labDet").click();
    await page.locator("#detail.on #detClose").waitFor();
    await page.screenshot({ path: resolve(output, name + "-detail.png") });
    await page.keyboard.press("Escape");
    await page.locator("#labClose").click();
    await page.locator('#panel [data-lab="revit"]').click();
    for (const key of ["arc", "str", "mep"]) {
      await page.locator('#labCtrl [data-k="' + key + '"]').click();
      assert.equal(
        await page
          .locator('#labCtrl [data-k="' + key + '"]')
          .getAttribute("aria-pressed"),
        "false",
      );
    }
    await page.locator('#labCtrl [data-k="arc"]').click();
    await page.screenshot({ path: resolve(output, name + "-bim.png") });
    await page.locator("#labClose").click();
    await page.locator('#panel [data-lab="auto"]').click();
    await page.locator("#detail.on").waitFor();
    assert.match(await page.locator("#detail").textContent(), /AUT-01/);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.locator("#nav .c-orange").click();
    await page.locator('#panel:not(.person) .net [data-p="0"]').waitFor();
    await page.waitForTimeout(1500);
    assert.equal(
      await page.locator("#panel.person").count(),
      0,
      "The network overview stays open until a person is selected",
    );
    await page.locator('#panel .net [data-p="0"]').click();
    await page.locator("#panel.person .portrait").waitFor();
    if (name === "mobile") {
      const portrait = await page.locator(".portrait").boundingBox();
      assert.ok(portrait.width <= 120 && portrait.height <= 160);
      const handle = await page.locator(".panel-handle").boundingBox();
      assert.ok(portrait.y >= handle.y + handle.height, "The portrait starts below the grip");
      await page.screenshot({ path: resolve(output, "mobile-profile.png") });
    }
    await page.keyboard.press("ArrowRight");
    assert.match(await page.locator("#panel").textContent(), /Tomás/);
    await page.locator("#langBtn").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    await page.keyboard.press("ArrowRight");
    await page.screenshot({ path: resolve(output, name + "-network.png") });
    await page.locator("#langBtn").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await page.locator("#nav .c-magenta").click();
    await page.locator("#oNext").waitFor();
    for (let i = 0; i < 4; i++) await page.locator("#oNext").click();
    await page.locator("#oGo").waitFor();
    if (name === "mobile") {
      const portrait = await page.locator(".human img").boundingBox();
      assert.ok(portrait.width <= 160 && portrait.height <= 90);
    }
    await page.screenshot({ path: resolve(output, name + "-origin.png") });
    await page.keyboard.press("Escape");
    await page.locator("#nav .c-blue").click();
    await page
      .locator('#panel.open [data-m="typology"]')
      .waitFor({ timeout: 15000 });
    await page.locator('#usmap [data-s="TX"]').click();
    assert.match(await page.locator("#panel").textContent(), /TX/);
    await page.screenshot({ path: resolve(output, name + "-territory.png") });
    await page.locator('#panel [data-m="typology"]').click();
    await page.locator('#typo [data-t="twh"]').click();
    assert.match(await page.locator("#panel").textContent(), /TOWNHOUSE/);
    await page.screenshot({ path: resolve(output, name + "-typology.png") });
    await page.locator("#connect").click();
    await page.locator("#fName").waitFor({ timeout: 15000 });
    await page.locator("#fName").fill("Browser QA & draft");
    await page.locator("#fEmail").fill("qa@example.com");
    await page.locator("#fProject").fill("Test only; no email is sent.");
    await page.locator('[data-w="BIM"]').click();
    assert.match(
      decodeURIComponent(await page.locator("#fSend").getAttribute("href")),
      /BIM/,
    );
    await page.locator("#langBtn").focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page.locator("#fName").inputValue(),
      "Browser QA & draft",
    );
    await page.screenshot({ path: resolve(output, name + "-contact.png") });
    await page.keyboard.press("Escape");
    // Exercise the reported outward transition with motion enabled.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("#nav .c-purple").click();
    await page.waitForFunction(
      () =>
        document.body.dataset.view === "services" &&
        document.documentElement.classList.contains("still") &&
        !document.getElementById("cameraLayer").dataset.raster,
    );
    const cameraFrames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const frames = [],
            start = performance.now();
          document.querySelector("#panel .back").click();
          function tick(now) {
            frames.push({
              ms: now - start,
              moving: !document.documentElement.classList.contains("still"),
              raster: document.getElementById("cameraLayer").dataset.raster || null,
              svg: document.getElementById("world").getAttribute("transform"),
              css: (
                document.querySelector(".raster-layer") ||
                document.getElementById("cameraLayer")
              ).style.transform,
              cached: !!document.querySelector(".camera-raster"),
              pixels: [...document.querySelectorAll(".camera-raster")].reduce(
                (sum, canvas) => sum + canvas.width * canvas.height,
                0,
              ),
              hidden: [...document.querySelectorAll(".isl")].filter(
                (node) => node.style.visibility === "hidden",
              ).length,
            });
            const last = frames.at(-1);
            if (now - start < 10000 && (last.moving || last.raster))
              requestAnimationFrame(tick);
            else resolve(frames);
          }
          requestAnimationFrame(tick);
        }),
    );
    const traveling = cameraFrames.filter(
      (frame) => frame.ms > 30 && frame.moving && frame.raster !== "preparing",
    );
    assert.ok(!cameraFrames.at(-1).moving && !cameraFrames.at(-1).raster,
      "The outward journey settles and restores the live SVG");
    await writeFile(resolve(output, `${name}-outward-frames.json`), JSON.stringify(cameraFrames));
    assert.ok(traveling.length > 5);
    assert.equal(
      new Set(traveling.map((frame) => frame.svg)).size,
      1,
      "The SVG camera stays unchanged during outward travel",
    );
    assert.ok(
      traveling.every(
        (frame) => frame.hidden === 0 && frame.css.startsWith("translate3d"),
      ),
    );
    if (engine === "webkit") {
      assert.ok(
        traveling.every(
          (frame) => frame.cached && frame.pixels <= 8 * 1024 * 1024 + 8192,
        ),
        "WebKit moves bounded overview/detail bitmaps throughout outward travel",
      );
      await page.waitForFunction(
        () =>
          document.documentElement.classList.contains("still") &&
          !document.querySelector(".raster-layer") &&
          document.getElementById("stage").style.opacity !== "0",
      );
      await page.evaluate(() => {
        window.hoverCacheJobs = 0;
        window.hoverObserver = new MutationObserver((records) => {
          window.hoverCacheJobs += records.filter(
            (record) => record.attributeName === "data-raster",
          ).length;
        });
        window.hoverObserver.observe(document.getElementById("cameraLayer"), {
          attributes: true,
        });
      });
      for (const id of ["services", "work", "team", "about"]) {
        await page.locator(`#nav [data-island="${id}"]`).hover();
        await page.waitForTimeout(80);
      }
      await page.mouse.move(width / 2, 20);
      await page.waitForTimeout(300);
      assert.equal(
        await page.evaluate(() => {
          window.hoverObserver.disconnect();
          return window.hoverCacheJobs;
        }),
        0,
        "Hover highlights must not rebuild the Safari scene cache",
      );
      await page.locator('#nav [data-island="work"]').click();
      await page.waitForFunction(
        () =>
          document.querySelector('.raster-layer[data-scene="territory"]') &&
          document.getElementById("cameraLayer").dataset.raster === "ready",
      );
      const workFrames = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const frames = [];
            function tick() {
              const layer = document.querySelector(".raster-layer");
              const details = [...document.querySelectorAll(".camera-raster")];
              frames.push({
                scale:
                  layer &&
                  new DOMMatrix(layer.style.transform).a *
                    +layer.dataset.pixelScale,
                cityOpacity: getComputedStyle(
                  document.getElementById("islands"),
                ).opacity,
                detailPixelsPerCSSPixel:
                  details.length > 1
                    ? details[1].width /
                      details[1].getBoundingClientRect().width
                    : 0,
                still: document.documentElement.classList.contains("still"),
              });
              if (!frames.at(-1).still) requestAnimationFrame(tick);
              else resolve(frames);
            }
            requestAnimationFrame(tick);
          }),
      );
      const workTravel = workFrames.filter((frame) => frame.scale !== null);
      assert.ok(workTravel.length > 5);
      assert.ok(
        workTravel.every((frame) => frame.cityOpacity === "1"),
        "The city stays visible as the direct camera journey carries it off screen",
      );
      assert.ok(
        workTravel.every(
          (frame, i) => !i || frame.scale >= workTravel[i - 1].scale - 0.001,
        ),
        "Work approaches the map directly without first zooming away",
      );
      assert.ok(
        workTravel.some((frame) => frame.detailPixelsPerCSSPixel >= 1),
        "The map has a destination-resolution detail crop during travel",
      );
      await page.screenshot({
        path: resolve(output, name + "-work-direct.png"),
      });
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () =>
          document.body.dataset.view === "city" &&
          document.documentElement.classList.contains("still") &&
          !document.getElementById("cameraLayer").dataset.raster,
      );
      // Cancel an in-flight cache/zoom with a second destination, then resize it.
      await page.locator("#nav .c-purple").click();
      await page.keyboard.press("Escape");
      await page.locator("#nav .c-orange").click();
      await page.waitForFunction(
        () =>
          document.body.dataset.view === "network" &&
          document.documentElement.classList.contains("still"),
      );
      await page.setViewportSize({
        width: name === "mobile" ? 1440 : 390,
        height: name === "mobile" ? 900 : 844,
      });
      await page.waitForFunction(
        () =>
          document.documentElement.classList.contains("still") &&
          !document.querySelector(".raster-layer"),
      );
      await page.setViewportSize({ width, height });
    }
    // The map returns in one journey, without shrinking past the city and
    // zooming in again. Sample preparation as well as the actual movement.
    await page.keyboard.press("Escape");
    await page.locator('#nav [data-island="work"]').click();
    await page.locator('#panel [data-m="territory"]').click();
    await page.waitForFunction(() =>
      document.body.dataset.view === "territory" &&
      document.documentElement.classList.contains("still") &&
      !document.getElementById("cameraLayer").dataset.raster);
    const returnJourney = page.evaluate(() => new Promise((resolve) => {
      const frames = [], start = performance.now();
      function sample() {
        const camera = document.getElementById("cameraLayer");
        const raster = document.querySelector(".raster-layer");
        const world = document.getElementById("world");
        const base = +world.getAttribute("transform").match(/scale\(([^)]+)/)[1];
        const relative = new DOMMatrix((raster || camera).style.transform).a;
        return {
          ms: performance.now() - start,
          scale: relative * base * (raster ? +raster.dataset.pixelScale * base : 1),
          moving: !document.documentElement.classList.contains("still"),
          raster: camera.dataset.raster || null,
          map: document.body.classList.contains("mapmode"),
          mapOpacity: +getComputedStyle(document.getElementById("usmap")).opacity,
        };
      }
      frames.push(sample());
      document.querySelector("#panel .back").click();
      function tick() {
        const frame = sample();
        frames.push(frame);
        window.mapReturnFrame = frame;
        if (frame.ms < 10000 && (frame.moving || frame.raster)) requestAnimationFrame(tick);
        else resolve(frames);
      }
      requestAnimationFrame(tick);
    }));
    await page.waitForFunction(() => window.mapReturnFrame?.moving &&
      window.mapReturnFrame.raster !== "preparing");
    await page.waitForTimeout(550);
    await page.screenshot({ path: resolve(output, `${name}-map-return-moving.png`) });
    const returnFrames = await returnJourney;
    const firstScale = returnFrames[0].scale, last = returnFrames.at(-1);
    const direction = Math.sign(last.scale - firstScale);
    assert.ok(!last.moving && !last.raster && !last.map);
    assert.ok(returnFrames.filter((frame) => frame.moving && frame.raster !== "preparing").length > 5);
    for (let i = 1; i < returnFrames.length; i++) {
      const frame = returnFrames[i];
      assert.ok(frame.scale >= Math.min(firstScale, last.scale) - 0.001);
      assert.ok(frame.scale <= Math.max(firstScale, last.scale) + 0.001);
      assert.ok((frame.scale - returnFrames[i - 1].scale) * direction >= -0.001,
        "The return never reverses zoom direction");
      if (frame.moving) assert.ok(frame.map && frame.mapOpacity === 1,
        "The map remains visible until the return has landed");
    }
    await writeFile(resolve(output, `${name}-map-return-frames.json`), JSON.stringify(returnFrames));
    await page.screenshot({ path: resolve(output, `${name}-map-return-city.png`) });
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Responsive reflow and keyboard access at narrow/wide sizes.
    for (const viewport of [
      { width: 320, height: 740 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "No horizontal document overflow",
      );
    }
    assert.deepEqual(errors, []);
    report.push({
      name,
      browserVersion: browser.version(),
      viewport: { width, height },
      deviceScaleFactor: 2,
      panelGesture: name === "mobile"
        ? engine === "chrome" ? "native touch swipe and tap" : "pointer drag and touch tap"
        : "desktop handle hidden",
      initialJavaScript: initial,
      checks:
        "city, language and sound toolbar, sheets, details, BIM, network, origin, territory, typology, contact draft, outward animation, direct map return, mobile panel dismissal, responsive overflow",
      errors,
    });
    await context.close();
  }
  // A failed on-demand download leaves the current screen usable; refresh recovers.
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto(siteURL);
  await page.route("**/network-*.js", (route) => route.abort());
  await page.locator("#nav .c-purple").click();
  await page.locator("#mapStatus.on").waitFor();
  await page.unroute("**/network-*.js");
  await page.reload();
  await page.locator("#nav .c-purple").click();
  await page.locator('#panel.open [data-lab="autocad"]').waitFor();
  await page.close();
  if (engine === "webkit") {
    const fallback = await browser.newPage();
    await fallback.route("**/raster-*.js", (route) => route.abort());
    await fallback.goto(siteURL);
    await fallback.locator("#nav .c-purple").click();
    await fallback.locator('#panel.open [data-lab="autocad"]').waitFor();
    await fallback.waitForFunction(() =>
      document.documentElement.classList.contains("still"),
    );
    assert.equal(await fallback.locator(".camera-raster").count(), 0);
    assert.notEqual(
      await fallback.locator("#stage").evaluate((node) => node.style.opacity),
      "0",
      "A failed optional cache download leaves the live SVG visible",
    );
    await fallback.close();
  }
  await writeFile(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify({ engine, report }, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
