// Alle publiserte sider på begge språk (dist/sitemap.xml), hentet fra den bygde siden med de samme hodene og
// videresendingene som i drift (scripts/serve-dist.mjs). Fanger en mal, et innlegg eller en oversettelse som gir en
// tom eller ødelagt side, språkvalg som peker til en side som ikke finnes, og hreflang som ikke går begge veier.
// Til slutt bytter en test språk i nettleseren.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setup, watchErrors, cspViolations, load } from "./helpers.mjs";

const SITE = "https://hpgt.com";

let env;
let pages; // [{ path, status, type, html }]
before(async () => {
  env = await setup();
  const xml = await readFile(new URL("../../dist/sitemap.xml", import.meta.url), "utf8");
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  pages = await mapLimit(paths, 16, async (path) => {
    const res = await fetch(env.origin + path, { redirect: "manual" });
    return { path, status: res.status, type: res.headers.get("content-type") ?? "", html: await res.text() };
  });
});
after(() => env.close());

// Kjører fn på alle elementene, høyst limit om gangen, og gir svarene i samme rekkefølge
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; results[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

const isEnglish = (path) => path === "/en/" || path.startsWith("/en/");
const decode = (s) => s.replaceAll("&amp;", "&");
// Adressene i sidene er absolutte (https://hpgt.com/...) eller relative til roten. Gir stien.
const pathOf = (href) => new URL(decode(href), SITE).pathname;

test("sitemap.xml har sider på begge språk", () => {
  assert.ok(pages.length > 50, `bare ${pages.length} sider i sitemap.xml`);
  assert.ok(pages.some((p) => isEnglish(p.path)), "ingen engelske sider");
  assert.ok(pages.some((p) => !isEnglish(p.path)), "ingen norske sider");
});

test("alle sidene svarer 200 med HTML, riktig språk, tittel og én hovedoverskrift", () => {
  const problems = [];
  for (const { path, status, type, html } of pages) {
    if (status !== 200) { problems.push(`${path}: status ${status}`); continue; }
    if (!type.startsWith("text/html")) { problems.push(`${path}: content-type ${type}`); continue; }
    const lang = html.match(/<html[^>]*\slang="([^"]+)"/)?.[1];
    const want = isEnglish(path) ? "en" : "nb";
    if (lang !== want) problems.push(`${path}: lang="${lang}", skal være "${want}"`);
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
    if (!title) problems.push(`${path}: mangler <title>`);
    const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1 !== 1) problems.push(`${path}: ${h1} <h1>`);
  }
  assert.deepEqual(problems, []);
});

test("språkvalget peker til sider som finnes", async () => {
  const targets = new Set();
  for (const { html } of pages) {
    const nav = html.match(/<nav class="lang-switch"[\s\S]*?<\/nav>/)?.[0];
    if (!nav) continue;
    for (const m of nav.matchAll(/href="([^"]+)"/g)) targets.add(pathOf(m[1]));
  }
  assert.ok(targets.size > 2, "fant nesten ikke noe språkvalg");
  const broken = (await mapLimit([...targets], 16, async (path) => {
    const res = await fetch(env.origin + path);
    await res.body?.cancel();
    return res.ok ? null : `${path}: status ${res.status}`;
  })).filter(Boolean);
  assert.deepEqual(broken, []);
});

test("hreflang går begge veier mellom norsk og engelsk side", () => {
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const alternates = (html) => Object.fromEntries(
    [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], pathOf(m[2])]));
  const problems = [];
  let pairs = 0;
  for (const { path, html } of pages) {
    const alt = alternates(html);
    if (!alt.nb || !alt.en) continue;
    pairs++;
    const self = isEnglish(path) ? alt.en : alt.nb;
    if (self !== path) problems.push(`${path}: hreflang for egen side peker til ${self}`);
    const other = isEnglish(path) ? alt.nb : alt.en;
    const target = byPath.get(other);
    if (!target) { problems.push(`${path}: hreflang peker til ${other}, som ikke er i sitemap.xml`); continue; }
    const back = alternates(target.html)[isEnglish(path) ? "en" : "nb"];
    if (back !== path) problems.push(`${path} → ${other}, men den peker tilbake til ${back}`);
  }
  assert.ok(pairs > 10, `bare ${pairs} sider med hreflang`);
  assert.deepEqual(problems, []);
});

test("språkvalget bytter mellom norsk og engelsk versjon av samme side", async () => {
  const context = await env.newContext();
  const page = await context.newPage();
  const errors = watchErrors(page);
  try {
    await load(page, env.origin + "/hpgt-com-har-fatt-en-makeover/");
    assert.equal(await page.getAttribute("html", "lang"), "nb");
    await page.click('.lang-switch a[hreflang="en"]');
    await page.waitForLoadState("load");
    assert.equal(await page.getAttribute("html", "lang"), "en");
    assert.equal(new URL(page.url()).pathname, "/en/hpgt-com-har-fatt-en-makeover/");
    await page.click('.lang-switch a[hreflang="nb"]');
    await page.waitForLoadState("load");
    assert.equal(await page.getAttribute("html", "lang"), "nb");
    assert.equal(new URL(page.url()).pathname, "/hpgt-com-har-fatt-en-makeover/");
    assert.deepEqual(await cspViolations(page), [], "CSP-brudd");
    assert.deepEqual(errors, [], "skriptfeil");
  } finally {
    await context.close();
  }
});
