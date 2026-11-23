// Sikkerhetshodene fra public/_headers, slik scripts/serve-dist.mjs setter dem (som Cloudflare), på sider som dekker
// malene, skjemasidene, en fil under /media/ og 404-siden.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../../scripts/serve-dist.mjs";

const PAGES = ["/", "/en/", "/nybegynner-kurs-pp2-2019/", "/arrangementer/", "/media/archive/2016/02/lovnorm-for-idrettslag.pdf",
  "/media/archive/2012/10/image_1349550638535351.jpg", "/finnes-ikke/"];
const FORM_PAGES = ["/for-piloter/radioid/", "/meld-feil/", "/en/report-error/"];
const TURNSTILE = "https://challenges.cloudflare.com";

let server;
before(async () => { server = await startServer(); });
after(() => server.close());

const get = (path) => fetch(server.origin + path, { redirect: "manual" });
// Direktivene i en CSP som { navn: [verdier] }
const directives = (csp) => Object.fromEntries(csp.split(";").map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([n, ...v]) => [n, v]));
// Om en kilde står i listen til et direktiv: nøyaktig lik, aldri som en del av en lengre adresse
const allows = (sources = [], source) => sources.some((s) => s === source);

function assertCommon(path, res) {
  const h = res.headers;
  const csp = h.get("content-security-policy");
  assert.ok(csp, `${path}: mangler Content-Security-Policy`);
  assert.ok(!csp.includes(","), `${path}: CSP er slått sammen fra flere regler: ${csp}`);
  const d = directives(csp);
  assert.deepEqual(d["default-src"], ["'none'"], path);
  assert.deepEqual(d["frame-ancestors"], ["'none'"], path);
  assert.deepEqual(d["object-src"], ["'none'"], path);
  assert.deepEqual(d["report-uri"], ["https://hpgt.com/api/csp-report"], path);
  assert.deepEqual(d["report-to"], ["csp"], path);
  assert.match(h.get("strict-transport-security") ?? "", /^max-age=31536000; includeSubDomains$/, path);
  assert.equal(h.get("x-content-type-options"), "nosniff", path);
  assert.equal(h.get("cross-origin-opener-policy"), "same-origin", path);
  assert.equal(h.get("cross-origin-resource-policy"), "same-site", path);
  assert.equal(h.get("referrer-policy"), "strict-origin-when-cross-origin", path);
  assert.match(h.get("permissions-policy") ?? "", /camera=\(\)/, path);
  assert.equal(h.get("reporting-endpoints"), 'csp="https://hpgt.com/api/csp-report"', path);
  const ro = directives(h.get("content-security-policy-report-only") ?? "");
  assert.deepEqual(ro["require-trusted-types-for"], ["'script'"], `${path}: Trusted Types i Report-Only`);
  assert.deepEqual(ro["report-to"], ["csp"], path);
  return d;
}

for (const path of PAGES) {
  test(`sikkerhetshoder på ${path}`, async () => {
    const res = await get(path);
    assert.equal(res.status, path === "/finnes-ikke/" ? 404 : 200, path);
    const d = assertCommon(path, res);
    assert.ok(!allows(d["script-src"], TURNSTILE), `${path}: Turnstile skal bare tillates på skjemasidene`);
    assert.ok(!allows(d["frame-src"], TURNSTILE), path);
  });
}

for (const path of FORM_PAGES) {
  test(`skjemasiden ${path} tillater Turnstile, med de samme reglene ellers`, async () => {
    const res = await get(path);
    assert.equal(res.status, 200);
    const d = assertCommon(path, res);
    assert.ok(allows(d["script-src"], TURNSTILE), "script-src");
    assert.ok(allows(d["frame-src"], TURNSTILE), "frame-src");
    // Skjemasiden har samme CSP som resten, bortsett fra Turnstile
    const other = directives((await get("/")).headers.get("content-security-policy"));
    const strip = (v) => v.filter((x) => x !== TURNSTILE);
    for (const name of Object.keys(other)) assert.deepEqual(strip(d[name]), other[name], `${path}: ${name}`);
    assert.deepEqual(Object.keys(d).sort(), Object.keys(other).sort(), path);
  });
}

test("Turnstile bare på skjemasidene, også i <meta>-CSP-en", async () => {
  for (const path of [...FORM_PAGES, "/", "/for-piloter/"]) {
    const html = await (await get(path)).text();
    const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
    assert.ok(meta, `${path}: mangler CSP i <meta>`);
    const m = directives(meta.replaceAll("&#39;", "'"));
    const form = FORM_PAGES.includes(path);
    assert.equal(allows(m["script-src"], TURNSTILE), form, `${path}: script-src`);
    assert.equal(allows(m["frame-src"], TURNSTILE), form, `${path}: frame-src`);
  }
});

test("kalenderen /arrangementer/kalender.ics er en kalenderfil", async () => {
  const res = await get("/arrangementer/kalender.ics");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/calendar/);
  const body = await res.text();
  assert.match(body, /^BEGIN:VCALENDAR\r?\n/);
  assert.match(body, /END:VCALENDAR\s*$/);
});

test("_headers og _redirects serveres ikke", async () => {
  for (const path of ["/_headers", "/_redirects"]) assert.equal((await get(path)).status, 404, path);
});

test("Workerens svar har egne sikkerhetshoder, ikke de fra _headers", async () => {
  const res = await get("/api/radioid");
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("content-security-policy"), "default-src 'none'; frame-ancestors 'none'");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("cache-control"), "no-store");
});
