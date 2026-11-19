// Sjekker at alle interne lenker og bilder i den bygde siden (dist/) peker til noe som finnes. Kjøres etter bygget i
// PR-sjekken:
//
//   npm run build && node scripts/sjekk-lenker.mjs
//
// Bare interne adresser (som starter med /). Eksterne lenker sjekkes ikke. /api/ er workeren og hoppes over.
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const ROT = new URL("../", import.meta.url).pathname;
const DIST = join(ROT, "dist");

async function* filer(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* filer(p);
    else yield p;
  }
}
const finnes = (p) => stat(p).then(() => true, () => false);

// /kurs/ → dist/kurs/index.html, /media/x.jpg → dist/media/x.jpg
async function finnesSti(sti) {
  let s;
  try { s = decodeURIComponent(sti); } catch { return false; }
  const p = join(DIST, s);
  if (s.endsWith("/")) return finnes(join(p, "index.html"));
  return (await finnes(p)) || finnes(join(p, "index.html"));
}

const brutte = new Map();
let sider = 0;
for await (const f of filer(DIST)) {
  if (!f.endsWith(".html")) continue;
  sider++;
  const html = await readFile(f, "utf-8");
  for (const [, , url] of html.matchAll(/\b(href|src)="(\/[^"#?]*)/g)) {
    if (url.startsWith("//") || url.startsWith("/api/") || url.startsWith("/cdn-cgi/")) continue;
    const ren = url.replace(/&amp;/g, "&");
    if (!(await finnesSti(ren))) {
      const fra = "/" + relative(DIST, f).replace(/index\.html$/, "");
      if (!brutte.has(ren)) brutte.set(ren, new Set());
      brutte.get(ren).add(fra);
    }
  }
}
if (brutte.size) {
  console.error(`${brutte.size} brutte interne lenker:`);
  for (const [url, fra] of brutte) console.error(`  ${url}  (fra ${[...fra].slice(0, 3).join(", ")}${fra.size > 3 ? " …" : ""})`);
  process.exit(1);
}
console.log(`sjekk-lenker: alle interne lenker virker (${sider} sider)`);
