// Henter miniatyrbilder for YouTube- og Vimeo-videoer som det lenkes til i innholdet, og lagrer dem på egen side
// (public/media/generated/video-thumbnails/, ikke i git). Da kontakter ikke besøkende YouTube/Vimeo før de selv trykker på en video.
// Kjøres før bygget. Feiler en henting (eller nettet mangler), vises videokortet bare uten bilde.
import sharp from "sharp";
import { readdir, readFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUT = join(ROOT, "public/media/generated/video-thumbnails");

async function* markdownFiles(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* markdownFiles(p); else if (e.name.endsWith(".md")) yield p;
  }
}
const exists = (p) => access(p).then(() => true, () => false);
const get = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
};

const videos = new Map();
for await (const f of markdownFiles(join(ROOT, "src/content"))) {
  const s = await readFile(f, "utf-8");
  for (const m of s.matchAll(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,20})/g)) videos.set(`yt-${m[1]}`, { yt: m[1] });
  for (const m of s.matchAll(/vimeo\.com\/(\d{5,12})/g)) videos.set(`vimeo-${m[1]}`, { vimeo: m[1] });
}

await mkdir(OUT, { recursive: true });
let added = 0, failed = 0;
for (const [name, v] of videos) {
  const file = join(OUT, `${name}.jpg`);
  if (await exists(file)) continue;
  try {
    let imageUrl;
    if (v.yt) imageUrl = `https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg`;
    else imageUrl = (await (await get(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${v.vimeo}`)}&width=640`)).json()).thumbnail_url;
    const buf = Buffer.from(await (await get(imageUrl)).arrayBuffer());
    // Ny koding: bekrefter at det er et bilde og fjerner metadata
    await sharp(buf).resize({ width: 640, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toFile(file);
    added++;
  } catch (e) {
    failed++;
  }
}
console.log(`video-thumbnails: ${videos.size} videoer, ${added} nye miniatyrbilder${failed ? `, ${failed} kunne ikke hentes` : ""}`);
