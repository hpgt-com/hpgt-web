// Etter bygg: skalerer ned store bilder i media/ (opplastet via CMS-et eller fra WordPress-arkivet) (mobilbilder på 5–10 MB) til maks 1600 px.
// Kjøres på kopien i dist/, så repoet beholder originalen og CI trenger ikke skrivetilgang.
// Sponsorlogoene (media/sponsors/) behandles for seg: tom kant rundt logoen skjæres bort, så alle logoene blir like store
// i stripen, og de skaleres til maks 200 px høye i samme format (PNG beholder gjennomsiktig bakgrunn). SVG røres ikke.
// Til slutt lages de mindre utgavene (WebP) som sidene peker på i srcset (src/lib/image-sizes.mjs, beslutning 0008):
// bare de som brukes, i media/generated/sizes/.
import sharp from "sharp";
import { readdir, stat, rename, readFile, mkdir } from "node:fs/promises";
import { join, relative, sep, dirname } from "node:path";
import { MAX as MAX_WIDTH, SIZES_DIR, parseVariant } from "../src/lib/image-sizes.mjs";

const dir = process.argv[2] ?? "dist/media";
const MAX = MAX_WIDTH;
const LOGO_HEIGHT = 200;
const isLogo = (f) => relative(dir, f).startsWith(`sponsors${sep}`);
async function* images(d) {
  for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* images(p); else if (/\.(jpe?g|png|webp)$/i.test(e.name)) yield p;
  }
}
let n = 0, logos = 0;
for await (const f of images(dir)) {
  if (isLogo(f)) {
    // trim() fjerner kanter i samme farge som hjørnet (hvitt eller gjennomsiktig). En ensfarget fil har ingenting å skjære bort.
    let img = sharp(f, { failOn: "none" }).rotate();
    try { await img.clone().trim({ threshold: 12 }).toBuffer(); img = img.trim({ threshold: 12 }); } catch { /* ingen kant */ }
    img = img.resize({ height: LOGO_HEIGHT, withoutEnlargement: true });
    img = /\.png$/i.test(f) ? img.png({ compressionLevel: 9 }) : /\.webp$/i.test(f) ? img.webp({ quality: 85 }) : img.jpeg({ quality: 85, mozjpeg: true });
    await img.toFile(f + ".tmp");
    await rename(f + ".tmp", f);
    logos++;
    continue;
  }
  const img = sharp(f, { failOn: "none" }).rotate();
  const { width = 0 } = await img.metadata();
  const { size } = await stat(f);
  if (width <= MAX && size < 600_000) continue;
  await img.resize({ width: MAX, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(f + ".tmp");
  await rename(f + ".tmp", f);
  n++;
}
console.log(`resize-images: ${n} bilder skalert ned og ${logos} sponsorlogoer tilpasset i ${dir}`);

// Utgavene sidene peker på (srcset), funnet i HTML-en i dist/. Lages fra bildet i dist/media (allerede høyst MAX bred).
const site = join(dir, "..");
const wanted = new Set();
async function* pages(d) {
  for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
    const p = join(d, e.name);
    if (e.isDirectory()) { if (p !== dir) yield* pages(p); } else if (e.name.endsWith(".html")) yield p;
  }
}
const marker = SIZES_DIR;
for await (const f of pages(site)) {
  const html = await readFile(f, "utf-8");
  for (const [, set] of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const entry of set.split(",")) {
      const u = entry.trim().split(/\s+/)[0];
      const i = u.indexOf(marker);
      if (i >= 0) wanted.add(u.slice(i + marker.length));
    }
  }
}
let made = 0;
for (const rel of wanted) {
  const v = parseVariant(rel);
  if (!v) continue;
  let src, out;
  try { src = join(dir, decodeURIComponent(v.src.slice("/media/".length))); out = join(dir, "generated", "sizes", decodeURIComponent(rel)); } catch { continue; }
  await mkdir(dirname(out), { recursive: true });
  await sharp(src, { failOn: "none" }).rotate().resize({ width: v.width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
  made++;
}
console.log(`resize-images: ${made} mindre utgaver (WebP) laget i ${join(dir, "generated", "sizes")}`);
