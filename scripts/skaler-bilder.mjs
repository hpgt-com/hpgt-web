// Etter bygg: skalerer ned store bilder lastet opp via CMS-et (mobilbilder på 5–10 MB) til maks 1600 px.
// Kjøres på kopien i dist/, så repoet beholder originalen og CI trenger ikke skrivetilgang.
import sharp from "sharp";
import { readdir, stat, rename } from "node:fs/promises";
import { join } from "node:path";

const dir = process.argv[2] ?? "dist/filer";
const MAX = 1600;
async function* filer(d) {
  for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* filer(p); else if (/\.(jpe?g|png|webp)$/i.test(e.name)) yield p;
  }
}
let n = 0;
for await (const f of filer(dir)) {
  const img = sharp(f, { failOn: "none" }).rotate();
  const { width = 0 } = await img.metadata();
  const { size } = await stat(f);
  if (width <= MAX && size < 600_000) continue;
  await img.resize({ width: MAX, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(f + ".tmp");
  await rename(f + ".tmp", f);
  n++;
}
console.log(`skaler-bilder: ${n} bilder skalert ned i ${dir}`);
