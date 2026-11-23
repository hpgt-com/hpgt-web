// Lokal server for den bygde siden (dist/) som oppfører seg som Cloudflare i drift. Brukes av ende-til-ende-testene i
// test/e2e/, og kan startes for hånd etter bygget:
//
//   npm run build && node scripts/serve-dist.mjs [port]
//
// Speiler oppsettet i wrangler.jsonc og public/_headers:
//  • /api/* går til den ekte Workeren (worker/index.js), som i drift (run_worker_first). Miljøet er en stubb: ASSETS
//    serverer dist/, ALLOWED_ORIGIN er serverens egen adresse, hastighetsgrensene slipper alt gjennom, og det finnes
//    ingen TURNSTILE_SECRET eller GitHub-app. En innsending stopper derfor ved sjekken av om avsenderen er et menneske.
//  • Workeren får ikke nå andre verter: fetch() til alt annet enn denne maskinen feiler, som når nettet er nede.
//  • _redirects leses og gir de samme videresendingene (med :splat).
//  • html_handling: "force-trailing-slash": /x sendes videre til /x/ (307) når /x/index.html eller /x.html finnes, og
//    /x/index.html og /x.html sendes videre til /x/.
//  • not_found_handling: "404-page": nærmeste 404.html oppover i mappene, med status 404.
//  • _headers leses og brukes som Cloudflare gjør: alle regler som passer adressen brukes i rekkefølge, «! Navn»
//    fjerner et hode, et hode som settes i flere regler slås sammen med komma, og * og :plassholder i stien virker.
//    Hodene settes på alle svar fra de statiske filene (også videresendinger og 404), ikke på svar fra Workeren.
//
// Filene _headers og _redirects leses fra dist/ (Astro kopierer dem dit fra public/), og serveres ikke selv.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "dist");

// Innholdstyper etter filendelse, som Cloudflare (tekst får charset=utf-8)
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".ics": "text/calendar; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
  ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm",
};
const HIDDEN = new Set(["/_headers", "/_redirects"]);

// En sti fra _headers eller _redirects som regulært uttrykk: * er hva som helst (splat), :navn er ett ledd
function patternToRegExp(pattern) {
  let src = "";
  for (const part of pattern.split(/(\*|:[A-Za-z]\w*)/)) {
    if (part === "*") src += "(?<splat>.*)";
    else if (/^:[A-Za-z]\w*$/.test(part)) src += `(?<${part.slice(1)}>[^/]+)`;
    else src += part.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${src}$`);
}

// _headers: en sti på egen linje, deretter innrykkede linjer «Navn: verdi» eller «! Navn». # er kommentar.
export function parseHeaders(text) {
  const rules = [];
  let rule = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      rule = { pattern: line, re: patternToRegExp(line), set: [], unset: [] };
      rules.push(rule);
    } else if (!rule) {
      throw new Error(`_headers: hode uten sti: ${line}`);
    } else if (line.startsWith("!")) {
      rule.unset.push(line.slice(1).trim().toLowerCase());
    } else {
      const at = line.indexOf(":");
      if (at < 1) throw new Error(`_headers: ugyldig linje: ${line}`);
      rule.set.push([line.slice(0, at).trim(), line.slice(at + 1).trim()]);
    }
  }
  return rules;
}

// Som Cloudflare: for hver regel som passer, i rekkefølge, fjernes først «! Navn», så settes hodene. Første gang et
// hode settes, erstatter det et hode svaret allerede har; senere regler legger til (slås sammen med komma).
export function applyHeaders(rules, pathname, headers) {
  const seen = new Set();
  for (const rule of rules) {
    if (!rule.re.test(pathname)) continue;
    for (const name of rule.unset) headers.delete(name);
    for (const [name, value] of rule.set) {
      if (seen.has(name.toLowerCase())) headers.append(name, value);
      else { headers.set(name, value); seen.add(name.toLowerCase()); }
    }
  }
  return headers;
}

// _redirects: «fra til [status]» per linje. :splat og :plassholdere settes inn i målet.
export function parseRedirects(text) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => {
    const [from, to, status = "302"] = l.split(/\s+/);
    return { re: patternToRegExp(from), to, status: Number(status) };
  });
}

async function isFile(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}

// Filen for en sti i dist/, eller null. Stier utenfor dist/ avvises.
function distPath(pathname) {
  const p = normalize(join(DIST, pathname));
  return p === DIST || p.startsWith(DIST + sep) ? p : null;
}

async function fileResponse(path, status = 200) {
  const headers = new Headers({
    "content-type": TYPES[extname(path).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "public, max-age=0, must-revalidate",
  });
  return new Response(await readFile(path), { status, headers });
}

const redirect = (location, status = 307) => new Response(null, { status, headers: { location } });

// Det Cloudflare gjør med en forespørsel til de statiske filene, før _headers
async function assetResponse(request, redirects) {
  const url = new URL(request.url);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { pathname = null; }
  if (pathname === null) return new Response("Bad Request", { status: 400 });

  for (const r of redirects) {
    const m = r.re.exec(url.pathname);
    if (!m) continue;
    const to = r.to.replace(/:(\w+)/g, (all, name) => m.groups?.[name] ?? all);
    return redirect(to + (to.includes("?") ? "" : url.search), r.status);
  }

  const file = (p) => (HIDDEN.has(p) ? null : distPath(p));
  const exists = async (p) => { const f = file(p); return f && (await isFile(f)) ? f : null; };
  const to = (p) => redirect(encodeURI(p) + url.search);

  if (pathname.endsWith("/index.html")) {
    if (await exists(pathname)) return to(pathname.slice(0, -"index.html".length));
  } else if (pathname.endsWith(".html")) {
    if (await exists(pathname)) return to(pathname.slice(0, -".html".length) + "/");
  } else if (pathname.endsWith("/")) {
    const f = (await exists(pathname + "index.html")) || (pathname.length > 1 && (await exists(pathname.slice(0, -1) + ".html")));
    if (f) return fileResponse(f);
  } else {
    const f = await exists(pathname);
    if (f) return fileResponse(f);
    if ((await exists(pathname + "/index.html")) || (await exists(pathname + ".html"))) return to(pathname + "/");
  }

  // 404-page: nærmeste 404.html oppover fra mappen til adressen
  const parts = pathname.split("/").slice(1, -1);
  for (let n = parts.length; n >= 0; n--) {
    const f = await exists(`/${parts.slice(0, n).map((x) => x + "/").join("")}404.html`);
    if (f) return fileResponse(f, 404);
  }
  return new Response("Not Found", { status: 404 });
}

// Worker-kode får bare kontakte denne maskinen. Alt annet feiler, som uten nett.
function blockExternalFetch() {
  const real = globalThis.fetch;
  if (real.blocksExternal) return;
  const local = new Set(["127.0.0.1", "localhost", "[::1]"]);
  const guarded = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (!local.has(url.hostname)) throw new TypeError(`serve-dist: ${url.host} er blokkert (ingen eksterne tjenester)`);
    return real(input, init);
  };
  guarded.blocksExternal = true;
  globalThis.fetch = guarded;
}

// Starter serveren. port 0 gir en ledig port. Gir { origin, close() }.
export async function startServer({ port = 0, host = "127.0.0.1", quiet = true } = {}) {
  const read = (name) => readFile(join(DIST, name), "utf8").catch(() => "");
  const headerRules = parseHeaders(await read("_headers"));
  const redirects = parseRedirects(await read("_redirects"));
  if (!headerRules.length) throw new Error("serve-dist: fant ikke dist/_headers. Kjør npm run build først.");
  blockExternalFetch();
  const worker = (await import(pathToFileURL(join(ROOT, "worker", "index.js")).href)).default;

  const assets = async (request) => {
    const res = await assetResponse(request, redirects);
    const headers = applyHeaders(headerRules, new URL(request.url).pathname, new Headers(res.headers));
    return new Response(request.method === "HEAD" ? null : res.body, { status: res.status, headers });
  };
  const allowAll = { limit: async () => ({ success: true }) };
  let env;

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, env.ALLOWED_ORIGIN);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
      headers.set("cf-connecting-ip", req.socket.remoteAddress ?? "");
      const hasBody = !["GET", "HEAD"].includes(req.method);
      const request = new Request(url, { method: req.method, headers, body: hasBody ? Readable.toWeb(req) : null, duplex: "half" });
      const response = url.pathname.startsWith("/api/") ? await worker.fetch(request, env) : await assets(request);
      const out = {};
      for (const [k, v] of response.headers) out[k] = k in out ? `${out[k]}, ${v}` : v;
      res.writeHead(response.status, out);
      if (response.body && req.method !== "HEAD") Readable.fromWeb(response.body).pipe(res);
      else res.end();
      if (!quiet) console.log(`${req.method} ${req.url} ${response.status}`);
    } catch (err) {
      console.error(`serve-dist: ${req.method} ${req.url}: ${err.stack ?? err}`);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); });
  const origin = `http://${host}:${server.address().port}`;
  // Som vars i wrangler.jsonc, men med denne serverens adresse og uten hemmeligheter
  env = {
    ASSETS: { fetch: (input, init) => assets(new Request(input, init)) },
    ALLOWED_ORIGIN: origin,
    TURNSTILE_HOSTNAME: host,
    GITHUB_REPO: "hpgt-com/form-submissions",
    RATE_LIMIT: allowAll,
    CSP_LIMIT: allowAll,
  };
  return { origin, close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { origin } = await startServer({ port: Number(process.argv[2] ?? 8788), quiet: false });
  console.log(`serve-dist: ${origin}`);
}
