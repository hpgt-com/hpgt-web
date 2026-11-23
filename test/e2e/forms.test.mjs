// Skjemaene (RadioID og «Meld feil») mot den ekte Workeren (worker/index.js) i scripts/serve-dist.mjs. Uten nett og
// uten TURNSTILE_SECRET: Turnstile lastes ikke, og Workeren når ikke Cloudflare for å sjekke svaret. En innsending
// med gyldige felt skal derfor stoppe ved sjekken av om avsenderen er et menneske, og siden skal vise det svaret.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, watchErrors, cspViolations, load } from "./helpers.mjs";

const NOT_HUMAN = {
  nb: "Kunne ikke bekrefte at du er et menneske. Last siden på nytt og prøv igjen.",
  en: "Could not confirm that you are human. Reload the page and try again.",
};

let env;
before(async () => { env = await setup(); });
after(() => env.close());

async function withPage(path, fn) {
  const context = await env.newContext();
  const page = await context.newPage();
  // Workeren svarer 403 når menneskesjekken feiler, og nettleseren skriver det i konsollen
  page.expectErrorStatus = (url) => new URL(url).pathname.startsWith("/api/");
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

for (const path of ["/for-piloter/radioid/", "/meld-feil/", "/en/report-error/"]) {
  test(`honningkrukka på ${path} er skjult for brukere og skjermlesere`, () => withPage(path, async (page) => {
    const trap = page.locator("input[name=nettside]");
    assert.equal(await trap.count(), 1);
    assert.equal(await trap.getAttribute("tabindex"), "-1", "ikke i tabulatorrekkefølgen");
    assert.equal(await trap.getAttribute("autocomplete"), "off");
    // Utenfor skjermen (ikke synlig i vinduet)
    const box = await trap.boundingBox();
    assert.ok(!box || box.x + box.width <= 0 || box.y + box.height <= 0, `feltet er utenfor skjermen: ${JSON.stringify(box)}`);
    assert.equal(await trap.evaluate((el) => el.closest("[aria-hidden=true]") !== null), true, "aria-hidden");
    assert.equal(await page.getByRole("textbox", { name: /Nettside/ }).count(), 0, "ikke i tilgjengelighetstreet");
    // Tabulatoren går ikke innom feltet
    const focused = [];
    await page.locator("form.form__fields input, form.form__fields textarea").first().focus();
    for (let i = 0; i < 12; i++) {
      focused.push(await page.evaluate(() => document.activeElement?.getAttribute("name")));
      await page.keyboard.press("Tab");
    }
    assert.ok(!focused.includes("nettside"), `fokus: ${focused}`);
    // Turnstile er stoppet av testen (ingen eksterne verter)
    assert.ok(page.context().blocked.some((u) => new URL(u).origin === "https://challenges.cloudflare.com"), "Turnstile-skriptet ble forsøkt lastet");
  }));
}

test("RadioID: gyldig innsending stopper ved menneskesjekken, og siden viser svaret", () => withPage("/for-piloter/radioid/", async (page) => {
  const form = page.locator("form.form__fields");
  await form.locator("input[name=navn]").fill("Kari Test");
  await form.locator("input[name=radioid]").fill("200b6a");
  await form.locator("input[name=utstyr]").fill("Skytraxx 5");
  const [response] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === "/api/radioid"),
    form.getByRole("button", { name: "Send inn" }).click(),
  ]);
  assert.equal(response.status(), 403);
  assert.equal(response.request().method(), "POST");
  assert.deepEqual(await response.json(), { ok: false, message: NOT_HUMAN.nb });
  const status = form.locator(".form__status");
  await status.filter({ hasText: NOT_HUMAN.nb }).waitFor();
  assert.equal(await status.getAttribute("data-ok"), "false");
  assert.equal(await form.getByRole("button", { name: "Send inn" }).isEnabled(), true, "knappen kan brukes igjen");
  assert.equal(await form.locator("input[name=navn]").inputValue(), "Kari Test", "feltene beholdes når det feilet");
}));

test("RadioID: ugyldig RadioID stoppes i nettleseren før noe sendes", () => withPage("/for-piloter/radioid/", async (page) => {
  const form = page.locator("form.form__fields");
  let sent = 0;
  page.on("request", (r) => { if (new URL(r.url()).pathname.startsWith("/api/")) sent++; });
  await form.locator("input[name=navn]").fill("Kari");
  await form.locator("input[name=radioid]").fill("XYZ");
  await form.getByRole("button", { name: "Send inn" }).click();
  assert.equal(await form.locator("input[name=radioid]").evaluate((el) => el.validity.patternMismatch), true);
  assert.equal(sent, 0);
}));

test("«Report error» (engelsk) gir svaret på engelsk", () => withPage("/en/report-error/?side=/kurs/", async (page) => {
  const form = page.locator("form.form__fields");
  assert.equal(await form.locator("[name=side]").inputValue(), "/kurs/", "siden fylles inn fra ?side=");
  await form.locator("[name=melding]").fill("The course page has a broken link.");
  const [response] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === "/api/meld-feil"),
    form.locator("button[type=submit]").click(),
  ]);
  assert.equal(response.status(), 403);
  await form.locator(".form__status").filter({ hasText: NOT_HUMAN.en }).waitFor();
}));

// Endepunktene direkte, uten nettleser
const api = (path, init = {}) => fetch(env.origin + path, { redirect: "manual", ...init });

test("feil metode gir 405 på alle endepunktene", async () => {
  for (const path of ["/api/radioid", "/api/meld-feil", "/api/csp-report"]) {
    for (const method of ["GET", "PUT", "DELETE"]) {
      const res = await api(path, { method });
      assert.equal(res.status, 405, `${method} ${path}`);
      assert.equal(res.headers.get("cache-control"), "no-store");
    }
  }
  assert.deepEqual(await (await api("/api/radioid")).json(), { ok: false, message: "Bare POST er tillatt." });
  assert.deepEqual(await (await api("/api/meld-feil?sprak=en")).json(), { ok: false, message: "Only POST is allowed." });
  assert.equal((await api("/api/csp-report")).headers.get("allow"), "POST");
});

test("innsending fra en annen opprinnelse avvises med 403", async () => {
  const res = await api("/api/radioid", { method: "POST", headers: { Origin: "https://example.com" }, body: new URLSearchParams({ handling: "ny", navn: "Kari", radioid: "200B6A" }) });
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { ok: false, message: "Ugyldig opprinnelse." });
});

test("honningkrukka: utfylt felt får «Takk!» uten at noe sjekkes", async () => {
  const res = await api("/api/radioid", { method: "POST", headers: { Origin: env.origin }, body: new URLSearchParams({ handling: "ny", navn: "Bot", radioid: "200B6A", nettside: "https://spam.example" }) });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, message: "Takk!" });
});

test("ukjent /api/-adresse gir 404 fra Workeren", async () => {
  const res = await api("/api/finnes-ikke");
  assert.equal(res.status, 404);
  assert.match(res.headers.get("content-type"), /^application\/json/);
});

test("CSP-rapport tas imot med 204", async () => {
  const report = { "csp-report": { "document-uri": "https://hpgt.com/", "effective-directive": "script-src-elem", "blocked-uri": "https://example.com/x.js", disposition: "enforce" } };
  const res = await api("/api/csp-report", { method: "POST", headers: { "Content-Type": "application/csp-report" }, body: JSON.stringify(report) });
  assert.equal(res.status, 204);
  const wrong = await api("/api/csp-report", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "x" });
  assert.equal(wrong.status, 415);
});
