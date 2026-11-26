// Markdown-behandlingen (src/lib/rehype-base.mjs). Overskriftene: «#» i teksten blir <h2>, og overskrifter uten tekst fjernes,
// så hver side har tittelen som eneste <h1>. Bildene (beslutning 0008): forstørring, form og srcset.
import { test } from "node:test";
import assert from "node:assert/strict";
import rehypeBase from "../src/lib/rehype-base.mjs";

const el = (tagName, children = [], properties = {}) => ({ type: "element", tagName, properties, children });
const text = (value) => ({ type: "text", value });
// Bildestørrelsene er faste i testene, så de ikke avhenger av filene i public/media/
const SIZES = { "/media/land.jpg": { width: 1600, height: 900 }, "/media/kvadrat.png": { width: 600, height: 600 },
  "/media/plakat-liten.png": { width: 1200, height: 668 }, "/media/smalt.jpg": { width: 300, height: 500 } };
const info = async (src) => SIZES[src] ?? null;
const run = async (children, opts = {}) => {
  const tree = { type: "root", children };
  await rehypeBase({ info, ...opts })(tree);
  return tree.children;
};

test("h1 i teksten blir h2", async () => {
  const [h] = await run([el("h1", [text("Saker til årsmøtet")])]);
  assert.equal(h.tagName, "h2");
  assert.equal(h.children[0].value, "Saker til årsmøtet");
});

test("andre overskrifter beholder nivået", async () => {
  assert.deepEqual((await run([el("h2", [text("A")]), el("h3", [text("B")])])).map((n) => n.tagName), ["h2", "h3"]);
});

test("overskrifter uten tekst fjernes, også inne i andre elementer", async () => {
  const out = await run([el("h1"), el("p", [text("Tekst")]), el("div", [el("h2", [text("  ")]), el("h3", [el("em", [text("Med tekst")])])])]);
  assert.deepEqual(out.map((n) => n.tagName), ["p", "div"]);
  assert.deepEqual(out[1].children.map((n) => n.tagName), ["h3"]);
});

const img = (src, props = {}) => el("img", [], { src, ...props });

test("bilde med «-liten» i filnavnet blir smalt og lenker til seg selv", async () => {
  const [p] = await run([el("p", [img("/media/plakat-liten.png", { alt: "Plakat" })])]);
  const [a] = p.children;
  assert.equal(a.tagName, "a");
  assert.equal(a.properties.href, "/media/plakat-liten.png");
  assert.deepEqual(a.children[0].properties.className, ["img--small"]);
  assert.equal(a.children[0].properties.sizes, "300px");
});

test("et bilde som allerede er en lenke, pakkes ikke inn på nytt", async () => {
  const [a] = await run([el("a", [img("/media/x-liten.jpg")], { href: "https://example.com/" })]);
  assert.equal(a.properties.href, "https://example.com/");
  assert.equal(a.children[0].tagName, "img");
  assert.deepEqual(a.children[0].properties.className, ["img--small"]);
});

test("liggende bilde: full bredde, lenker til seg selv, srcset med mindre utgaver", async () => {
  const [p] = await run([el("p", [img("/media/land.jpg")])]);
  const [a] = p.children;
  assert.equal(a.properties.href, "/media/land.jpg");
  const i = a.children[0].properties;
  assert.equal(i.className, undefined);
  assert.equal(i.width, 1600);
  assert.equal(i.height, 900);
  assert.equal(i.srcset, "/media/generated/sizes/land.jpg-480.webp 480w, /media/generated/sizes/land.jpg-960.webp 960w, /media/generated/sizes/land.jpg-1280.webp 1280w", "originalen trengs ikke når alle utgavene finnes");
  assert.equal(i.sizes, "(min-width: 820px) 760px, 100vw");
});

test("kvadratiske og stående bilder blir smale, og srcset har bare mindre utgaver", async () => {
  const [p, q] = await run([el("p", [img("/media/kvadrat.png")]), el("p", [img("/media/smalt.jpg")])]);
  const k = p.children[0].children[0].properties;
  assert.deepEqual(k.className, ["img--narrow"]);
  assert.equal(k.srcset, "/media/generated/sizes/kvadrat.png-480.webp 480w, /media/kvadrat.png 600w");
  assert.equal(k.sizes, "400px");
  const s = q.children[0].children[0].properties;
  assert.deepEqual(s.className, ["img--narrow"]);
  assert.equal(s.srcset, undefined, "for lite til mindre utgaver");
  assert.equal(s.width, 300);
});

test("flere bilder i ett avsnitt vises i rutenett, også når de allerede er lenker", async () => {
  const [p] = await run([el("p", [el("a", [img("/media/kvadrat.png")], { href: "/media/kvadrat.png" }), text(" "), img("/media/land.jpg")])]);
  assert.deepEqual(p.properties.className, ["img-grid"]);
  const imgs = p.children.filter((c) => c.tagName === "a").map((a) => a.children[0].properties);
  assert.equal(imgs.length, 2);
  for (const i of imgs) {
    assert.equal(i.className, undefined, "ikke smal i rutenett");
    assert.equal(i.sizes, "(min-width: 820px) 380px, 50vw");
  }
});

test("sponsorlogoer og bilder utenfor /media/ røres ikke", async () => {
  const [p] = await run([el("p", [img("/media/competitions/2014/sponsors/logo.png")]), el("p", [img("https://example.com/x.jpg")])]);
  assert.equal(p.children[0].tagName, "img");
  assert.equal(p.children[0].properties.srcset, undefined);
});

test("base-stien legges på lenken og alle adressene i srcset", async () => {
  const [p] = await run([el("p", [img("/media/kvadrat.png")])], { base: "/test/" });
  const a = p.children[0];
  assert.equal(a.properties.href, "/test/media/kvadrat.png");
  assert.equal(a.children[0].properties.src, "/test/media/kvadrat.png");
  assert.equal(a.children[0].properties.srcset, "/test/media/generated/sizes/kvadrat.png-480.webp 480w, /test/media/kvadrat.png 600w");
});

test("bilde som ikke kan leses, lenker til seg selv uten srcset", async () => {
  const [p] = await run([el("p", [img("/media/finnes-ikke.jpg")])]);
  assert.equal(p.children[0].tagName, "a");
  assert.equal(p.children[0].children[0].properties.srcset, undefined);
});
