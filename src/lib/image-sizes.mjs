// Flere størrelser av bildene i public/media/ (beslutning 0008). Redaktørene laster opp ett bilde; bygget lager mindre
// utgaver i WebP, og <img> får srcset, så mobilen henter et lite bilde og en stor skjerm et stort.
//
// Delt mellom Markdown-behandlingen (src/lib/rehype-base.mjs), komponentene (src/components/Img.astro) og
// scripts/resize-images.mjs: sidene peker på /media/generated/sizes/<sti>-<bredde>.webp, og skriptet lager akkurat de
// utgavene sidene peker på, etter at Astro har bygget sidene.
import sharp from "sharp";
import { join } from "node:path";

/** Bredder som lages i tillegg til originalen (som er høyst MAX bred etter scripts/resize-images.mjs). */
export const WIDTHS = [480, 960, 1280];
export const MAX = 1600;
export const SIZES_DIR = "/media/generated/sizes/";

// Fra prosjektroten: Astro samler koden i andre mapper under bygget, så import.meta.url peker ikke hit da
const PUBLIC = join(process.cwd(), "public");
const RASTER = /\.(jpe?g|png|webp)$/i;
// Sponsorlogoene trimmes og skaleres for seg i scripts/resize-images.mjs, og det genererte lages av bygget
const SKIP = /^\/media\/(generated\/|sponsors\/|competitions\/[^/]+\/sponsors\/)/;

// Komma og mellomrom skiller oppføringene i srcset, så de må kodes i adressen
const safe = (u) => u.replace(/,/g, "%2C").replace(/ /g, "%20");
export const variantUrl = (src, w) => safe(`${SIZES_DIR}${src.slice("/media/".length)}-${w}.webp`);
/** Motsatt vei, for scripts/resize-images.mjs: «<sti>-<bredde>.webp» under SIZES_DIR → kildebildet og bredden. */
export const parseVariant = (rel) => {
  const m = rel.match(/^(.+)-(\d+)\.webp$/);
  return m ? { src: `/media/${m[1]}`, width: Number(m[2]) } : null;
};

const cache = new Map();
/** Bredde og høyde slik bildet vises (etter EXIF-rotasjon og nedskalering til MAX), eller null for andre bilder. */
export function imageInfo(src) {
  if (typeof src !== "string" || !src.startsWith("/media/") || SKIP.test(src)) return Promise.resolve(null);
  const path = src.split(/[?#]/)[0];
  if (!RASTER.test(path)) return Promise.resolve(null);
  if (!cache.has(path)) {
    cache.set(path, (async () => {
      let file;
      try { file = decodeURIComponent(path); } catch { return null; }
      try {
        const m = await sharp(PUBLIC + file, { failOn: "none" }).metadata();
        let [width, height] = (m.orientation ?? 1) >= 5 ? [m.height, m.width] : [m.width, m.height];
        if (!width || !height) return null;
        if (width > MAX) [width, height] = [MAX, Math.round((height * MAX) / width)];
        return { width, height };
      } catch {
        return null; // mangler eller kan ikke leses: vises som før, uten srcset
      }
    })());
  }
  return cache.get(path);
}

const graphics = new Map();
/** Entropien under denne regnes som grafikk (plakater, logoer, QR-koder, skjermbilder med flater og tekst). Foto ligger
 *  over 4, grafikken på siden under 2,5 (målt på en utgave på høyst 256 px med hvit bakgrunn bak gjennomsiktighet). */
export const GRAPHIC_ENTROPY = 3;
/** true når bildet er grafikk og ikke et foto, ut fra hvor mye variasjon det er i pikslene (beslutning 0010). */
export function isGraphic(src) {
  if (typeof src !== "string" || !src.startsWith("/media/") || SKIP.test(src)) return Promise.resolve(false);
  const path = src.split(/[?#]/)[0];
  if (!RASTER.test(path)) return Promise.resolve(false);
  if (!graphics.has(path)) {
    graphics.set(path, (async () => {
      try {
        const { entropy } = await sharp(PUBLIC + decodeURIComponent(path), { failOn: "none" })
          .resize(256, 256, { fit: "inside" }).flatten({ background: "#fff" }).stats();
        return entropy < GRAPHIC_ENTROPY;
      } catch {
        return false; // mangler eller kan ikke leses: behandles som et foto
      }
    })());
  }
  return graphics.get(path);
}

/** srcset for et bilde med kjent bredde, eller undefined når originalen er liten nok. fix legger til base-stien.
 *  widths: utgavene som kan trengs der bildet vises. Originalen tas bare med når den er mindre enn den største utgaven
 *  (kortene trenger ikke mer enn 960 px, og hver oppføring gjør HTML-en større). */
export function srcsetFor(src, info, fix = (u) => u, widths = WIDTHS) {
  const smaller = widths.filter((w) => w < info.width * 0.9);
  if (!smaller.length) return undefined;
  const entries = smaller.map((w) => `${fix(variantUrl(src, w))} ${w}w`);
  if (smaller.length < widths.length) entries.push(`${fix(safe(src))} ${info.width}w`);
  return entries.join(", ");
}

/** Attributtene til <img>: width, height, srcset og sizes. Tomt objekt for bilder utenfor public/media/. */
export async function responsive(src, sizes, fix = (u) => u, widths = WIDTHS) {
  const info = await imageInfo(src);
  if (!info) return {};
  const srcset = srcsetFor(src, info, fix, widths);
  return { width: info.width, height: info.height, ...(srcset ? { srcset, sizes } : {}) };
}

/** Bredder for kortene (høyst ca. 360 px brede, 720 px på skjermer med dobbel tetthet). */
export const CARD_WIDTHS = [480, 960];
