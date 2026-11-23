// CSP-rapporter til Workeren (worker/csp-report.js, POST /api/csp-report): metodene, begge rapportformatene,
// størrelsesgrensen, rate limiting og at loggen ikke inneholder personopplysninger.
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleCspReport, summarize, MAX_BODY } from "../worker/csp-report.js";
import worker from "../worker/index.js";

const URL_ = "https://hpgt.com/api/csp-report";
const IP = "203.0.113.7";
const UA = "Mozilla/5.0 TestBrowser/1.0";
const legacy = { "csp-report": {
  "document-uri": "https://hpgt.com/for-piloter/radioid/?navn=Ola#x",
  referrer: "https://www.example.org/side?bruker=ola",
  "violated-directive": "script-src-elem", "effective-directive": "script-src-elem",
  disposition: "enforce", "blocked-uri": "https://evil.example.com/x.js?token=abc", "script-sample": "",
} };
const reporting = [{ type: "csp-violation", url: "https://hpgt.com/meld-feil/?side=a", user_agent: UA, body: {
  documentURL: "https://hpgt.com/meld-feil/?side=a", effectiveDirective: "require-trusted-types-for", disposition: "report",
  blockedURL: "trusted-types-sink", sample: "Element innerHTML|<img src=x onerror=alert(1)> Ola Nordmann",
} }];

function req(body, type, extra = {}) {
  return new Request(URL_, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": type, "cf-connecting-ip": IP, "user-agent": UA, ...extra } });
}

test("legacy-rapport logges uten spørrestreng, IP eller full adresse", async () => {
  const lines = [];
  assert.equal(await handleCspReport(req(legacy, "application/csp-report"), {}, (l) => lines.push(l)), 204);
  assert.deepEqual(lines, ["csp-report directive=script-src-elem disposition=enforce blocked=https://evil.example.com path=/for-piloter/radioid/"]);
  const all = lines.join("\n");
  for (const secret of [IP, UA, "navn=Ola", "token=abc", "bruker=ola", "x.js"]) assert.ok(!all.includes(secret), secret);
});

test("Reporting API med Trusted Types logger bare navnet på sinken", async () => {
  const lines = [];
  assert.equal(await handleCspReport(req(reporting, "application/reports+json"), {}, (l) => lines.push(l)), 204);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /sink="Element innerHTML"/);
  assert.ok(!lines[0].includes("Ola Nordmann") && !lines[0].includes("onerror") && !lines[0].includes("side=a"));
});

test("rapporter fra andre sider forkastes", () => {
  assert.equal(summarize({ "document-uri": "https://evil.example.com/", "violated-directive": "img-src" }), null);
  assert.equal(summarize({ "document-uri": "https://flysteder.hpgt.com/", "violated-directive": "img-src" }), null);
});

test("feil innholdstype gir 415, ugyldig JSON 400", async () => {
  assert.equal(await handleCspReport(req("x", "text/plain"), {}, () => {}), 415);
  assert.equal(await handleCspReport(req("{", "application/csp-report"), {}, () => {}), 400);
});

test("for stor kropp uten Content-Length gir 413", async () => {
  const big = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("x".repeat(MAX_BODY + 1))); c.close(); } });
  const r = new Request(URL_, { method: "POST", body: big, duplex: "half", headers: { "content-type": "application/csp-report" } });
  assert.equal(r.headers.get("content-length"), null);
  assert.equal(await handleCspReport(r, {}, () => {}), 413);
});

test("rate limiting teller under en hash, ikke adressen", async () => {
  const keys = [];
  const env = { CSP_LIMIT: { limit: async ({ key }) => { keys.push(key); return { success: false }; } } };
  assert.equal(await handleCspReport(req(legacy, "application/csp-report"), env, () => {}), 429);
  assert.equal(keys.length, 1);
  assert.ok(!keys[0].includes(IP) && /^[0-9a-f]+$/.test(keys[0]));
});

test("Workeren: bare POST, og svaret er 204 uten innhold", async () => {
  const env = { ASSETS: { fetch: () => new Response("asset") } };
  const get = await worker.fetch(new Request(URL_), env);
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("allow"), "POST");
  const post = await worker.fetch(req(legacy, "application/csp-report"), env);
  assert.equal(post.status, 204);
  assert.equal(await post.text(), "");
});
