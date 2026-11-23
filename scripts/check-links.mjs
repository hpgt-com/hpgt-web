// Sjekker at alle interne lenker og bilder i den bygde siden (dist/) peker til noe som finnes. Kjøres etter bygget i
// PR-sjekken:
//
//   npm run build && node scripts/check-links.mjs
//
// Bare interne adresser (som starter med /). Eksterne lenker sjekkes ikke. /api/ er workeren og hoppes over.
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "dist");

async function* files(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* files(p);
    else yield p;
  }
}
const exists = (p) => stat(p).then(() => true, () => false);

// /kurs/ → dist/kurs/index.html, /media/x.jpg → dist/media/x.jpg
async function pathExists(path) {
  let s;
  try { s = decodeURIComponent(path); } catch { return false; }
  const p = join(DIST, s);
  if (s.endsWith("/")) return exists(join(p, "index.html"));
  return (await exists(p)) || exists(join(p, "index.html"));
}

const broken = new Map();
let pages = 0;
for await (const f of files(DIST)) {
  if (!f.endsWith(".html")) continue;
  pages++;
  const html = await readFile(f, "utf-8");
  for (const [, , url] of html.matchAll(/\b(href|src)="(\/[^"#?]*)/g)) {
    if (url.startsWith("//") || url.startsWith("/api/") || url.startsWith("/cdn-cgi/")) continue;
    const clean = url.replace(/&amp;/g, "&");
    if (!(await pathExists(clean))) {
      const from = "/" + relative(DIST, f).replace(/index\.html$/, "");
      if (!broken.has(clean)) broken.set(clean, new Set());
      broken.get(clean).add(from);
    }
  }
}
if (broken.size) {
  console.error(`${broken.size} brutte interne lenker:`);
  for (const [url, from] of broken) console.error(`  ${url}  (fra ${[...from].slice(0, 3).join(", ")}${from.size > 3 ? " …" : ""})`);
  process.exit(1);
}
console.log(`check-links: alle interne lenker virker (${pages} sider)`);
