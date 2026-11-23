// Ytelsesbudsjett for den bygde siden, i Chromium (Playwright). Kjøres etter bygget i PR-sjekken:
//
//   npm run build && npm run check:budget
//
// Serverer dist/ på en lokal port og laster et utvalg sider som dekker malene, på en telefonskjerm, med alle andre
// verter blokkert (statistikk, videoer, Turnstile), så tallene er sidens egne og like hver gang. For hver side måles
// bytes per type (HTML, CSS, JS, skrift, bilder, data), antall forespørsler, antall DOM-noder og layoutskift (CLS).
// Hver verdi måles mot BUDGET, som ligger litt over det siden bruker i dag. En endring som gjør en side mye tyngre,
// stopper da PR-sjekken. Et budsjett heves med vilje, i samme PR som endringen som trenger det, med begrunnelse.
// Bytes er ukomprimert (den lokale serveren komprimerer ikke).
//
// BASE_URL: mål en publisert side i stedet for dist/ (for eksempel https://hpgt.com), uten å stoppe på budsjettet.
// CHROMIUM_PATH: en Chromium/Chrome som allerede er installert (på GitHubs runnere Chrome).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const PAGES = ["/", "/en/", "/kurs/", "/nytt/", "/arrangementer/", "/for-piloter/radioid/", "/hpgt-com-har-fatt-en-makeover/"];
// Per side: bytes per type (KB, ukomprimert), forespørsler, DOM-noder og CLS, omtrent 20–25 % over det sidene bruker.
// Forsiden og kurssidene har store toppbilder, og /nytt/ lister alle innlegg. En type som mangler, sjekkes ikke.
const COMMON = { css: 50, js: 35, font: 75, data: 10, cls: 0.05 };
const BUDGET = {
  "/": { ...COMMON, html: 35, image: 950, requests: 24, nodes: 650 },
  "/en/": { ...COMMON, html: 35, image: 950, requests: 24, nodes: 650 },
  "/kurs/": { ...COMMON, html: 16, image: 1050, requests: 26, nodes: 250 },
  "/nytt/": { ...COMMON, html: 130, image: 110, requests: 22, nodes: 2500 },
  "/arrangementer/": { ...COMMON, html: 35, image: 110, requests: 22, nodes: 650 },
  "/for-piloter/radioid/": { ...COMMON, html: 20, image: 110, requests: 22, nodes: 400 },
  "/hpgt-com-har-fatt-en-makeover/": { ...COMMON, html: 16, image: 260, requests: 22, nodes: 260 },
};
const KINDS = { document: "html", stylesheet: "css", script: "js", font: "font", image: "image", fetch: "data", xhr: "data", manifest: "data", other: "data" };
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".avif": "image/avif", ".woff2": "font/woff2", ".xml": "application/xml", ".ico": "image/x-icon" };

const live = process.env.BASE_URL;
let server, origin;
if (live) {
  origin = new URL(live).origin;
} else {
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  server = createServer(async (req, res) => {
    let p = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
    try { if ((await stat(p)).isDirectory()) p = join(p, "index.html"); } catch { p = join(dist, "404.html"); }
    try {
      res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
      res.end(await readFile(p));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failures = 0;
const rows = [];
try {
  for (const url of PAGES) {
    const context = await browser.newContext({ ...devices["Pixel 7"] });
    await context.route("**/*", (route) => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort()));
    await context.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    });
    const page = await context.newPage();
    const bytes = { html: 0, css: 0, js: 0, font: 0, image: 0, data: 0 };
    let requests = 0;
    const pending = [];
    page.on("requestfinished", (req) => {
      requests++;
      // Chrome kaller favicon-forespørselen «other», så den sorteres etter filendelsen
      const kind = req.resourceType() === "other" && /\.(ico|png|svg)$/i.test(new URL(req.url()).pathname) ? "image" : KINDS[req.resourceType()] ?? "data";
      pending.push(req.response().then((res) => res?.body()).then((body) => { bytes[kind] += body?.length ?? 0; }).catch(() => {}));
    });
    await page.goto(origin + url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await Promise.all(pending);
    const nodes = await page.evaluate(() => document.getElementsByTagName("*").length);
    const cls = await page.evaluate(() => Math.round(window.__cls * 1000) / 1000);
    const measured = { ...Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, Math.round(v / 1024)])), requests, nodes, cls };
    const over = Object.entries(BUDGET[url] ?? {}).filter(([k, limit]) => measured[k] > limit).map(([k, limit]) => `${k} ${measured[k]} > ${limit}`);
    if (over.length) failures++;
    rows.push({ url, ...measured, over: over.join(", ") });
    await context.close();
  }
} finally {
  await browser.close();
  server?.close();
}

console.table(rows);
if (failures && !live) {
  console.error(`${failures} side(r) over budsjettet. Gjør siden lettere, eller hev budsjettet i scripts/check-budget.mjs med begrunnelse.`);
  process.exit(1);
}
