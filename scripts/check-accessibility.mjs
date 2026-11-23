// Tilgjengelighetssjekk av den bygde siden med axe-core i Chromium (Playwright), som på flysteder.hpgt.com.
// Kjøres etter bygget i PR-sjekken:
//
//   npm run build && node scripts/check-accessibility.mjs
//
// Serverer dist/ på en lokal port og sjekker et utvalg sider som dekker malene, i lys og mørk modus. Bare funn med
// alvorlighet «serious» eller «critical» stopper sjekken; resten listes. Forespørsler til andre verter blokkeres, så
// sjekken trenger ikke nett. CHROMIUM_PATH: en Chromium/Chrome som allerede er installert (på GitHubs runnere Chrome).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const PAGES = ["/", "/en/", "/kurs/", "/kurs/paragliding-pp2/", "/tandem/", "/nytt/", "/arrangementer/", "/for-piloter/",
  "/for-piloter/vaer/", "/for-piloter/radioid/", "/klubben/styret/", "/klubben/konkurranser/2019/", "/sok/", "/404/", "/hpgt-com-har-fatt-en-makeover/", "/meld-feil/", "/personvern/", "/en/news/", "/en/events/", "/en/hpgt-com-har-fatt-en-makeover/"];
const BLOCKING = new Set(["serious", "critical"]);
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".xml": "application/xml" };
const axeSource = await readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const server = createServer(async (req, res) => {
  let p = join(DIST, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { if ((await stat(p)).isDirectory()) p = join(p, "index.html"); } catch { p = join(DIST, "404.html"); }
  try {
    res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failures = 0;
try {
  for (const colorScheme of ["light", "dark"]) {
    // bypassCSP: sidene tillater bare egne skript, og axe settes inn utenfra.
    const ctx = await browser.newContext({ colorScheme, bypassCSP: true, viewport: { width: 1280, height: 900 } });
    await ctx.route("**/*", (r) => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
    const page = await ctx.newPage();
    for (const url of PAGES) {
      await page.goto(origin + url, { waitUntil: "load" });
      await page.evaluate(axeSource);
      const { violations } = await page.evaluate(() => window.axe.run(document, { resultTypes: ["violations"] }));
      for (const v of violations) {
        const blocking = BLOCKING.has(v.impact);
        if (blocking) failures++;
        console[blocking ? "error" : "log"](`${blocking ? "FEIL" : "info"} ${url} (${colorScheme}) ${v.impact} ${v.id}: ${v.help} (${v.nodes.length} element)`);
        if (blocking) for (const n of v.nodes.slice(0, 5)) console.error(`    ${n.target.join(" ")}`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (failures) {
  console.error(`\n${failures} funn med alvorlighet serious eller critical.`);
  process.exit(1);
}
console.log(`check-accessibility: ingen alvorlige funn på ${PAGES.length} sider (lys og mørk modus)`);
