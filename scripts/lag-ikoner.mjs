// Lager favicon.ico (16, 32 og 48 px) og apple-touch-icon.png (180 px, hvit bakgrunn) fra logoen.
// Kjøres for hånd når logoen endres; filene ligger i public/.
//
//   node scripts/lag-ikoner.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const LOGO = new URL("../public/assets/img/hpgt-logo.png", import.meta.url).pathname;
const UT = new URL("../public/", import.meta.url).pathname;

// ICO med PNG-bilder inni (støttes av alle nettlesere): 6 bytes hode, 16 bytes per bilde, så bildene.
const storrelser = [16, 32, 48];
const bilder = await Promise.all(storrelser.map((s) => sharp(LOGO).resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()));
const hode = Buffer.alloc(6 + 16 * bilder.length);
hode.writeUInt16LE(0, 0); hode.writeUInt16LE(1, 2); hode.writeUInt16LE(bilder.length, 4);
let pos = hode.length;
bilder.forEach((b, i) => {
  const o = 6 + 16 * i, s = storrelser[i];
  hode.writeUInt8(s === 256 ? 0 : s, o); hode.writeUInt8(s === 256 ? 0 : s, o + 1);
  hode.writeUInt16LE(1, o + 4); hode.writeUInt16LE(32, o + 6);
  hode.writeUInt32LE(b.length, o + 8); hode.writeUInt32LE(pos, o + 12);
  pos += b.length;
});
await writeFile(UT + "favicon.ico", Buffer.concat([hode, ...bilder]));
// iOS legger ikonet på hjemskjermen uten gjennomsiktighet, så det får hvit bakgrunn og litt luft rundt.
await sharp(LOGO).resize(156, 156, { fit: "contain", background: "#ffffff" }).extend({ top: 12, bottom: 12, left: 12, right: 12, background: "#ffffff" }).flatten({ background: "#ffffff" }).png().toFile(UT + "apple-touch-icon.png");
console.log("lag-ikoner: public/favicon.ico og public/apple-touch-icon.png");
