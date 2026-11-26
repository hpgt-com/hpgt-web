// Ukjente adresser og videresendinger, som Cloudflare gjør dem etter wrangler.jsonc (not_found_handling: 404-page,
// html_handling: force-trailing-slash) og public/_redirects.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, watchErrors, cspViolations } from "./helpers.mjs";

let env;
before(async () => { env = await setup(); });
after(() => env.close());

const get = (path) => fetch(env.origin + path, { redirect: "manual" });

test("ukjent adresse gir status 404 med sidens 404-side", async () => {
  for (const path of ["/finnes-ikke/", "/finnes-ikke", "/en/finnes-ikke/", "/media/finnes-ikke.jpg", "/assets/js/finnes-ikke.js"]) {
    const res = await get(path);
    assert.equal(res.status, 404, path);
    assert.match(res.headers.get("content-type"), /^text\/html/, path);
    assert.match(await res.text(), /<title>Fant ikke siden – HPGT<\/title>/, path);
  }
});

test("404-siden vises i nettleseren uten feil", async () => {
  const context = await env.newContext();
  const page = await context.newPage();
  page.expectErrorStatus = (url) => url === env.origin + "/finnes-ikke/";
  const errors = watchErrors(page);
  try {
    const res = await page.goto(env.origin + "/finnes-ikke/");
    assert.equal(res.status(), 404);
    assert.equal(await page.locator("h1").textContent(), "Fant ikke siden");
    assert.ok(await page.getByRole("link", { name: "Forsiden" }).isVisible());
    assert.deepEqual(await cspViolations(page), []);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("adresse uten skråstrek til slutt sendes videre til adressen med skråstrek", async () => {
  for (const [from, to] of [["/meld-feil", "/meld-feil/"], ["/arrangementer", "/arrangementer/"], ["/en", "/en/"],
    ["/sok?q=kurs", "/sok/?q=kurs"], ["/index.html", "/"], ["/kurs/index.html", "/kurs/"]]) {
    const res = await get(from);
    assert.equal(res.status, 307, from);
    assert.equal(res.headers.get("location"), to, from);
  }
});

test("gamle WordPress-adresser videresendes permanent (_redirects)", async () => {
  const res = await get("/wp-content/uploads/2016/02/lovnorm-for-idrettslag.pdf");
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "/media/archive/2016/02/lovnorm-for-idrettslag.pdf");
  const target = await get(res.headers.get("location"));
  assert.equal(target.status, 200);
  assert.equal(target.headers.get("content-type"), "application/pdf");
});

test("gamle adresser fra Astro-videresendingene gir 301, ikke en side med meta refresh", async () => {
  for (const [from, to] of [["/kurs-2026/", "/kurs/"], ["/event/arsmote-hang-og-paragliderklubb-2018/", "/arsmote-2018/"],
    ["/regler-2019/", "/klubben/konkurranser/2019/#regler"], ["/category/kurs/", "/nytt/kategori/kurs/"], ["/events/kategori/mote/", "/arrangementer/"]]) {
    const res = await get(from);
    assert.equal(res.status, 301, from);
    assert.equal(res.headers.get("location"), to, from);
  }
});

test("404-siden har noindex og ingen canonical", async () => {
  const res = await get("/wp-login.php");
  assert.equal(res.status, 404);
  const html = await res.text();
  assert.match(html, /<meta name="robots" content="noindex/);
  assert.doesNotMatch(html, /rel="canonical"/);
});
