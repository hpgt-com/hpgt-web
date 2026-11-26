// Bildeadressene i den engelske teksten hentes fra den norske (scripts/translate/media-paths.mjs, beslutning 0008).
import { test } from "node:test";
import assert from "node:assert/strict";
import { syncMediaPaths } from "../scripts/translate/media-paths.mjs";

test("byttet bilde får den nye adressen i den engelske teksten", () => {
  const no = "Skann koden.\n\n![QR-kode](/media/posts/2026/qr-liten.png)\n\nSe også ![kart](/media/pages/kart.jpg)";
  const en = "Scan the code.\n\n![QR code](/media/posts/2026/qr.png)\n\nSee also ![map](/media/pages/kart.jpg)";
  assert.equal(syncMediaPaths(no, en), "Scan the code.\n\n![QR code](/media/posts/2026/qr-liten.png)\n\nSee also ![map](/media/pages/kart.jpg)");
});

test("ulikt antall bilder: den engelske teksten står som den er", () => {
  const en = "![a](/media/a.jpg)";
  assert.equal(syncMediaPaths("![a](/media/a.jpg) ![b](/media/b.jpg)", en), en);
});

test("lenker til PDF-er i /media/ følger også med", () => {
  assert.equal(syncMediaPaths("[Referat](/media/documents/ny.pdf)", "[Minutes](/media/documents/gammel.pdf)"), "[Minutes](/media/documents/ny.pdf)");
});

test("tekst uten bilder og manglende oversettelse endres ikke", () => {
  assert.equal(syncMediaPaths("Hei", "Hello"), "Hello");
  assert.equal(syncMediaPaths("![a](/media/a.jpg)", undefined), undefined);
});
