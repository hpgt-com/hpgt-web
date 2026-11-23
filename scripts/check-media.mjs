// Stopper bygget hvis public/media/ inneholder annet enn bilder og PDF.
// Alt der serveres fra hpgt.com selv, så en opplastet .html, .js eller lignende ville kjørt på sidens egen adresse
// (en falsk side under hpgt.com). Pages CMS laster opp hit, og det er ikke sikkert at den nekter andre filtyper.
import { readdir } from "node:fs/promises";
import { join, relative, extname, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const MEDIA = join(ROOT, "public/media");
const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".pdf"]);

async function* files(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* files(p);
    else yield p;
  }
}

const rejected = [];
for await (const f of files(MEDIA)) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (rel.startsWith("public/media/generated/") || basename(f) === ".gitkeep") continue;
  if (!ALLOWED.has(extname(f).toLowerCase())) rejected.push(rel);
}
if (rejected.length) {
  console.error(`public/media/ kan bare inneholde bilder og PDF (${[...ALLOWED].join(" ")}). Fjern eller bytt ut:`);
  for (const f of rejected) console.error(`  ${f}`);
  process.exit(1);
}
console.log("check-media: bare bilder og PDF i public/media/");
