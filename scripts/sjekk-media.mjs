// Stopper bygget hvis public/media/ inneholder annet enn bilder og PDF.
// Alt der serveres fra hpgt.com selv, så en opplastet .html, .js eller lignende ville kjørt på sidens egen adresse
// (en falsk side under hpgt.com). Pages CMS laster opp hit, og det er ikke sikkert at den nekter andre filtyper.
import { readdir } from "node:fs/promises";
import { join, relative, extname, basename } from "node:path";

const ROT = new URL("../", import.meta.url).pathname;
const MEDIA = join(ROT, "public/media");
const TILLATT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".pdf"]);

async function* filer(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* filer(p);
    else yield p;
  }
}

const feil = [];
for await (const f of filer(MEDIA)) {
  const rel = relative(ROT, f);
  if (rel.startsWith("public/media/generated/") || basename(f) === ".gitkeep") continue;
  if (!TILLATT.has(extname(f).toLowerCase())) feil.push(rel);
}
if (feil.length) {
  console.error(`public/media/ kan bare inneholde bilder og PDF (${[...TILLATT].join(" ")}). Fjern eller bytt ut:`);
  for (const f of feil) console.error(`  ${f}`);
  process.exit(1);
}
console.log("sjekk-media: bare bilder og PDF i public/media/");
