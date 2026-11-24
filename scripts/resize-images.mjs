// Etter bygg: skalerer ned store bilder i media/ (opplastet via CMS-et eller fra WordPress-arkivet) (mobilbilder på 5–10 MB) til maks 1600 px.
// Kjøres på kopien i dist/, så repoet beholder originalen og CI trenger ikke skrivetilgang.
// Sponsorlogoene (media/sponsors/) behandles for seg: tom kant rundt logoen skjæres bort, så alle logoene blir like store
// i stripen, og de skaleres til maks 200 px høye i samme format (PNG beholder gjennomsiktig bakgrunn). SVG røres ikke.
import sharp from "sharp";
import { readdir, stat, rename } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const dir = process.argv[2] ?? "dist/media";
const MAX = 1600;
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
