// Ingen CSP-brudd (håndhevet eller bare rapportert) og ingen skriptfeil på sider som dekker malene, i lys og mørk
// visning, på PC og mobil. Sidene får de samme hodene som i drift (scripts/serve-dist.mjs).
//
// Alle brudd telles. Eksterne adresser som CSP-en tillater (Turnstile, statistikk), blokkeres av testen etter at
// CSP-en har godtatt dem, og gir derfor ikke brudd. Et brudd betyr at CSP-en i drift også stopper noe.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, watchErrors, cspViolations, load, DESKTOP, MOBILE } from "./helpers.mjs";

const PAGES = ["/", "/en/", "/kurs/", "/kurs/paragliding-pp2/", "/tandem/", "/nytt/", "/arrangementer/", "/for-piloter/",
  "/for-piloter/vaer/", "/for-piloter/radioid/", "/klubben/styret/", "/klubben/konkurranser/2019/", "/sok/?q=paragliding",
  "/nybegynner-kurs-pp2-2019/", "/1138/", "/meld-feil/", "/personvern/", "/en/news/", "/en/events/", "/en/report-error/",
  "/en/search/?q=paragliding", "/finnes-ikke/"];
const VARIANTS = [
  { name: "PC, lys", options: { ...DESKTOP, colorScheme: "light" } },
  { name: "PC, mørk", options: { ...DESKTOP, colorScheme: "dark" } },
  { name: "mobil, lys", options: { ...MOBILE, colorScheme: "light" } },
  { name: "mobil, mørk", options: { ...MOBILE, colorScheme: "dark" } },
];

let env;
before(async () => { env = await setup(); });
after(() => env.close());

for (const variant of VARIANTS) {
  test(`ingen CSP-brudd eller skriptfeil (${variant.name})`, async () => {
    const context = await env.newContext(variant.options);
    const page = await context.newPage();
    const problems = [];
    try {
      for (const path of PAGES) {
        const notFound = path === "/finnes-ikke/";
        page.expectErrorStatus = (url) => notFound && url === env.origin + path;
        const errors = watchErrors(page);
        const res = await load(page, env.origin + path);
        assert.equal(res.status(), notFound ? 404 : 200, path);
        for (const v of await cspViolations(page)) problems.push(`${path}: CSP ${v.disposition} ${v.directive} ${v.blocked} (${v.source}:${v.line}) ${v.sample}`);
        for (const e of errors) problems.push(`${path}: ${e}`);
        page.removeAllListeners("pageerror");
        page.removeAllListeners("console");
      }
    } finally {
      await context.close();
    }
    assert.deepEqual(problems, []);
  });
}
