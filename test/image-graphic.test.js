// Grafikk eller foto (src/lib/image-sizes.mjs, beslutning 0010), målt på ekte bilder i public/media/, så grensen
// GRAPHIC_ENTROPY prøves mot det redaktørene faktisk laster opp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isGraphic } from "../src/lib/image-sizes.mjs";

test("plakat og QR-kode regnes som grafikk", async () => {
  assert.equal(await isGraphic("/media/pages/grasrotandelen.png"), true);
  assert.equal(await isGraphic("/media/posts/2026/vipps-taepp-for-laget-qr.png"), true);
});

test("foto regnes ikke som grafikk", async () => {
  assert.equal(await isGraphic("/media/posts/2026/hpgt-com-makeover.jpg"), false);
  assert.equal(await isGraphic("/media/pages/asegarden-flystripe-kart.jpg"), false);
});

test("bilder som mangler, sponsorlogoer og andre filtyper regnes ikke som grafikk", async () => {
  assert.equal(await isGraphic("/media/finnes-ikke.png"), false);
  assert.equal(await isGraphic("/media/sponsors/logo.png"), false);
  assert.equal(await isGraphic("/media/dokument.pdf"), false);
});
