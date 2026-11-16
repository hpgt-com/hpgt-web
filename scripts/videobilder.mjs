// Henter miniatyrbilder for YouTube- og Vimeo-videoer som det lenkes til i innholdet, og lagrer dem på egen side
// (public/videobilder/, ikke i git). Da kontakter ikke besøkende YouTube/Vimeo før de selv trykker på en video.
// Kjøres før bygget. Feiler en henting (eller nettet mangler), vises videokortet bare uten bilde.
import sharp from "sharp";
import { readdir, readFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";

const ROT = new URL("../", import.meta.url).pathname;
const UT = join(ROT, "public/videobilder");

async function* md(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* md(p); else if (e.name.endsWith(".md")) yield p;
  }
}
const finnes = (p) => access(p).then(() => true, () => false);
const hent = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
};

const videoer = new Map();
for await (const f of md(join(ROT, "src/content"))) {
  const s = await readFile(f, "utf-8");
  for (const m of s.matchAll(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,20})/g)) videoer.set(`yt-${m[1]}`, { yt: m[1] });
  for (const m of s.matchAll(/vimeo\.com\/(\d{5,12})/g)) videoer.set(`vimeo-${m[1]}`, { vimeo: m[1] });
}

await mkdir(UT, { recursive: true });
let nye = 0, feil = 0;
for (const [navn, v] of videoer) {
  const fil = join(UT, `${navn}.jpg`);
  if (await finnes(fil)) continue;
  try {
    let bildeUrl;
    if (v.yt) bildeUrl = `https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg`;
    else bildeUrl = (await (await hent(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${v.vimeo}`)}&width=640`)).json()).thumbnail_url;
    const buf = Buffer.from(await (await hent(bildeUrl)).arrayBuffer());
    // Ny koding: bekrefter at det er et bilde og fjerner metadata
    await sharp(buf).resize({ width: 640, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toFile(fil);
    nye++;
  } catch (e) {
    feil++;
  }
}
console.log(`videobilder: ${videoer.size} videoer, ${nye} nye miniatyrbilder${feil ? `, ${feil} kunne ikke hentes` : ""}`);
