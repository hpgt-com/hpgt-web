// Skriptene i public/assets/js/ i bruk: mobilmenyen, lyst/mørkt tema, typefilteret i kalenderen, bildevisningen,
// søket, innholdsfortegnelsen og «Kopier lenke». Hver test sjekker også at siden ikke fikk skriptfeil eller CSP-brudd.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, watchErrors, cspViolations, load, MOBILE } from "./helpers.mjs";

let env;
before(async () => { env = await setup(); });
after(() => env.close());

// Åpner en side i en ny kontekst, kjører fn(page) og sjekker at det ikke ble feil underveis
async function withPage(path, options, fn) {
  const context = await env.newContext(options);
  const page = await context.newPage();
  const errors = watchErrors(page);
  try {
    await load(page, env.origin + path);
    await fn(page, context);
    assert.deepEqual(await cspViolations(page), [], "CSP-brudd");
    assert.deepEqual(errors, [], "skriptfeil");
  } finally {
    await context.close();
  }
}

test("mobilmenyen åpnes og lukkes", () => withPage("/", MOBILE, async (page) => {
  const button = page.locator("[data-menu-button]");
  const nav = page.locator("#nav");
  await button.waitFor({ state: "visible" });
  assert.equal(await button.getAttribute("aria-expanded"), "false");
  assert.equal(await nav.isVisible(), false, "menyen er lukket fra start");
  await button.click();
  assert.equal(await button.getAttribute("aria-expanded"), "true");
  await nav.waitFor({ state: "visible" });
  assert.ok(await nav.getByRole("link").first().isVisible());
  await button.click();
  assert.equal(await button.getAttribute("aria-expanded"), "false");
  await nav.waitFor({ state: "hidden" });
}));

test("nedtrekksmenyen på PC åpnes med knappen og lukkes med Esc", () => withPage("/", {}, async (page) => {
  const toggle = page.locator(".nav__toggle").first();
  const group = page.locator("[data-dropdown]").first();
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert.equal(await group.getAttribute("data-open"), "");
  await page.keyboard.press("Escape");
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(await group.getAttribute("data-open"), null);
}));

test("temavalget bytter visning og huskes på neste side", () => withPage("/", { colorScheme: "light" }, async (page) => {
  const button = page.locator("[data-theme-button]");
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert.equal(await button.getAttribute("aria-checked"), "false");
  const light = await background();
  await button.click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(await button.getAttribute("aria-checked"), "true");
  assert.notEqual(await background(), light, "bakgrunnen skifter");
  await load(page, env.origin + "/arrangementer/");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark", "valget gjelder på neste side");
  assert.equal(await page.locator("[data-theme-button]").getAttribute("aria-checked"), "true");
  assert.notEqual(await background(), light);
  await page.locator("[data-theme-button]").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
}));

test("typefilteret på /arrangementer/ filtrerer og nullstilles", () => withPage("/arrangementer/", {}, async (page) => {
  const filter = page.locator(".type-filter");
  assert.ok(await filter.isVisible(), "filteret vises med JavaScript");
  const rows = page.locator("[data-group]");
  const visibleGroups = () => rows.evaluateAll((els) => els.filter((e) => !e.hidden).map((e) => e.dataset.group));
  const before = await visibleGroups();
  assert.ok(new Set(before).size > 1, "flere typer fra start");

  await filter.locator('button[data-filter="kurs"]').click();
  const after = await visibleGroups();
  assert.ok(after.length > 0 && after.every((g) => g === "kurs"), `bare kurs: ${after}`);
  assert.equal(await filter.locator('button[data-filter="kurs"]').getAttribute("aria-pressed"), "true");
  assert.equal(await filter.locator('button[data-filter=""]').getAttribute("aria-pressed"), "false");
  // År uten kurs skjules
  const emptyShown = await page.locator("[data-section]").evaluateAll((els) =>
    els.filter((s) => !s.hidden && s.querySelectorAll("[data-group]").length && [...s.querySelectorAll("[data-group]")].every((r) => r.hidden)).length);
  assert.equal(emptyShown, 0);

  await filter.locator('button[data-filter=""]').click();
  assert.deepEqual(await visibleGroups(), before, "Alle viser alt igjen");
  assert.equal(await page.locator("[data-section][hidden]").count(), 0);
}));

test("bildevisningen åpner et bilde, blar videre og lukkes", () => withPage("/nybegynner-kurs-pp2-2019/", {}, async (page) => {
  const links = page.locator(".prose a[href$='.jpg']:has(img), .prose a[href$='.jpeg']:has(img), .prose a[href$='.png']:has(img), .prose a[href$='.webp']:has(img)");
  const hrefs = await links.evaluateAll((els) => els.map((a) => a.href));
  assert.ok(hrefs.length >= 2, "innlegget har flere lenkede bilder");
  const dialog = page.locator("dialog.gallery");
  const image = dialog.locator(".gallery__stage img");

  await links.first().click();
  await dialog.waitFor({ state: "visible" });
  assert.equal(await dialog.evaluate((d) => d.open), true);
  assert.equal(await image.getAttribute("src"), hrefs[0]);
  assert.equal(await dialog.locator(".gallery__counter").textContent(), `1 av ${hrefs.length}`);
  await image.evaluate((img) => img.decode());

  await dialog.locator(".gallery__arrow--next").click();
  assert.equal(await image.getAttribute("src"), hrefs[1]);
  assert.equal(await dialog.locator(".gallery__counter").textContent(), `2 av ${hrefs.length}`);
  await page.keyboard.press("ArrowLeft");
  assert.equal(await image.getAttribute("src"), hrefs[0]);
  await dialog.locator(".gallery__arrow--prev").click();
  assert.equal(await image.getAttribute("src"), hrefs.at(-1), "Forrige fra det første går til det siste");

  await dialog.locator(".gallery__close").click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await dialog.evaluate((d) => d.open), false);
  // «close» kommer som en egen hendelse etter at dialogen er lukket, så det ventes på at innholdet fjernes
  await dialog.locator(".gallery__stage > *").waitFor({ state: "detached" });
  assert.equal(new URL(page.url()).pathname, "/nybegynner-kurs-pp2-2019/", "lenken åpnet ikke bildefilen");
}));

test("søket på /sok/ finner et kjent innlegg", () => withPage("/sok/", {}, async (page) => {
  await page.locator("[data-search] input").fill("camilla instruktør");
  const hit = page.locator('[data-search-results] a[href="/camilla-er-forste-kvinnelige-pg-instruktor-i-klubben/"]');
  await hit.waitFor();
  assert.match(await hit.textContent(), /Camilla er første kvinnelige PG instruktør/);
  assert.match(await page.locator("[data-search-status]").textContent(), /^\d+ treff$/);
  assert.match(page.url(), /\?q=camilla\+instrukt/, "søket står i adressen");
  await page.locator("[data-search] input").fill("zzqxqzz");
  await page.locator("[data-search-status]", { hasText: "Ingen treff" }).waitFor();
  assert.equal(await page.locator("[data-search-results] li").count(), 0);
}));

test("søket på engelsk (/en/search/) finner den engelske versjonen", () => withPage("/en/search/?q=camilla", {}, async (page) => {
  await page.locator('[data-search-results] a[href="/en/camilla-er-forste-kvinnelige-pg-instruktor-i-klubben/"]').waitFor();
  assert.match(await page.locator("[data-search-status]").textContent(), /results?$/);
}));

test("innholdsfortegnelsen markerer overskriften man er ved", () => withPage("/for-piloter/vaer/", {}, async (page) => {
  const toc = page.locator("[data-toc]");
  assert.ok(await toc.isVisible());
  const links = toc.locator("a");
  assert.ok((await links.count()) >= 2, "minst to overskrifter");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("[data-toc] a[aria-current]").first().waitFor();
  assert.equal(await links.first().getAttribute("aria-current"), "true", "øverst: den første");
  const last = links.last();
  await last.click();
  await page.waitForFunction(() => [...document.querySelectorAll("[data-toc] a")].at(-1).getAttribute("aria-current") === "true");
  assert.equal(await toc.locator("a[aria-current]").count(), 1);
  assert.equal(decodeURIComponent(new URL(page.url()).hash), decodeURIComponent(new URL(await last.evaluate((a) => a.href)).hash));
}));

test("«Kopier lenke» kopierer adressen til innlegget", () => withPage("/1138/", {}, async (page, context) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: env.origin });
  const button = page.locator("[data-copy]");
  assert.ok(await button.isVisible(), "knappen vises når utklippstavlen finnes");
  assert.equal(await page.locator("[data-copy-fallback]").isVisible(), false);
  await button.click();
  const status = button.locator("xpath=..").locator("[role=status]");
  await status.filter({ hasText: "Lenken er kopiert" }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "https://hpgt.com/1138/");
}));

test("adresse uten skråstrek til slutt sendes videre i nettleseren", () => withPage("/arrangementer", {}, async (page) => {
  assert.equal(new URL(page.url()).pathname, "/arrangementer/");
  assert.ok(await page.locator(".type-filter").isVisible());
}));
