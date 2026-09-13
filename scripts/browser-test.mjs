import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium, webkit } from "playwright";

// Run against the built static site. Screenshots/reports are local QA output.
const engine = process.argv.includes("--webkit") ? "webkit" : "chrome";
const output = resolve("browser-results", engine);
await mkdir(output, { recursive: true });
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
await new Promise((resolve) => server.listen(4182, "127.0.0.1", resolve));
let browser;
const report = [];
try {
  browser = await (engine === "webkit" ? webkit : chromium).launch(
    engine === "chrome"
      ? { channel: "chrome", headless: true }
      : { headless: true },
  );
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: name === "mobile",
      hasTouch: name === "mobile",
      reducedMotion: "reduce",
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(response.status() + " " + response.url());
    });
    await page.goto("http://127.0.0.1:4182/");
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
    for (const look of ["maqueta", "light", "soft", "dark", "bw"]) {
      // Existing appearance values are read from the buttons below.
      const button = page.locator('#looks [data-look="' + look + '"]');
      if (await button.count()) await button.click();
    }
    await page.locator('#looks [data-look="light"]').click();
    await page.locator("#nav .c-purple").click();
    await page.locator('#panel.open [data-lab="autocad"]').waitFor();
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
    await page.setViewportSize({width:name==="mobile"?1440:390,height:name==="mobile"?900:844});
    await page.waitForTimeout(150);
    await page.setViewportSize({width,height});
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
    await page.locator("#panel.person .portrait").waitFor();
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
    await page.waitForTimeout(2600);
    const cameraFrames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const frames = [],
            start = performance.now();
          document.querySelector("#panel .back").click();
          function tick(now) {
            frames.push({
              ms: now - start,
              svg: document.getElementById("world").getAttribute("transform"),
              css: document.getElementById("cameraLayer").style.transform,
              hidden: [...document.querySelectorAll(".isl")].filter(
                (node) => node.style.visibility === "hidden",
              ).length,
            });
            if (now - start < 1200) requestAnimationFrame(tick);
            else resolve(frames);
          }
          requestAnimationFrame(tick);
        }),
    );
    const traveling = cameraFrames.filter(
      (frame) => frame.ms > 30 && frame.ms < 950,
    );
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
      initialJavaScript: initial,
      checks:
        "city, appearances, sheets, details, BIM, network, language, origin, territory, typology, contact draft, outward animation, responsive overflow",
      errors,
    });
    await context.close();
  }
  // A failed on-demand download leaves the current screen usable; refresh recovers.
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:4182/");
  await page.route("**/network-*.js", (route) => route.abort());
  await page.locator("#nav .c-purple").click();
  await page.locator("#mapStatus.on").waitFor();
  await page.unroute("**/network-*.js");
  await page.reload();
  await page.locator("#nav .c-purple").click();
  await page.locator('#panel.open [data-lab="autocad"]').waitFor();
  await page.close();
  await writeFile(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify({ engine, report }, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
