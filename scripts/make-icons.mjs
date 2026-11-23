// Lager favicon.ico (16, 32 og 48 px) og apple-touch-icon.png (180 px, hvit bakgrunn) fra logoen.
// Kjøres for hånd når logoen endres; filene ligger i public/.
//
//   npm run icons
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const LOGO = fileURLToPath(new URL("../public/assets/img/hpgt-logo.png", import.meta.url));
const OUT = fileURLToPath(new URL("../public/", import.meta.url));

// ICO med PNG-bilder inni (støttes av alle nettlesere): 6 bytes hode, 16 bytes per bilde, så bildene.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => sharp(LOGO).resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
let pos = header.length;
images.forEach((b, i) => {
  const o = 6 + 16 * i, s = sizes[i];
  header.writeUInt8(s === 256 ? 0 : s, o); header.writeUInt8(s === 256 ? 0 : s, o + 1);
  header.writeUInt16LE(1, o + 4); header.writeUInt16LE(32, o + 6);
  header.writeUInt32LE(b.length, o + 8); header.writeUInt32LE(pos, o + 12);
  pos += b.length;
});
await writeFile(OUT + "favicon.ico", Buffer.concat([header, ...images]));
// iOS legger ikonet på hjemskjermen uten gjennomsiktighet, så det får hvit bakgrunn og litt luft rundt.
await sharp(LOGO).resize(156, 156, { fit: "contain", background: "#ffffff" }).extend({ top: 12, bottom: 12, left: 12, right: 12, background: "#ffffff" }).flatten({ background: "#ffffff" }).png().toFile(OUT + "apple-touch-icon.png");
console.log("make-icons: public/favicon.ico og public/apple-touch-icon.png");
