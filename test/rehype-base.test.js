// Markdown-behandlingen (src/lib/rehype-base.mjs). Overskriftene: «#» i teksten blir <h2>, og overskrifter uten tekst fjernes,
// så hver side har tittelen som eneste <h1>.
import { test } from "node:test";
import assert from "node:assert/strict";
import rehypeBase from "../src/lib/rehype-base.mjs";

const el = (tagName, children = [], properties = {}) => ({ type: "element", tagName, properties, children });
const text = (value) => ({ type: "text", value });
const run = (children) => {
  const tree = { type: "root", children };
  rehypeBase()(tree);
  return tree.children;
};

test("h1 i teksten blir h2", () => {
  const [h] = run([el("h1", [text("Saker til årsmøtet")])]);
  assert.equal(h.tagName, "h2");
  assert.equal(h.children[0].value, "Saker til årsmøtet");
});

test("andre overskrifter beholder nivået", () => {
  assert.deepEqual(run([el("h2", [text("A")]), el("h3", [text("B")])]).map((n) => n.tagName), ["h2", "h3"]);
});

test("overskrifter uten tekst fjernes, også inne i andre elementer", () => {
  const out = run([el("h1"), el("p", [text("Tekst")]), el("div", [el("h2", [text("  ")]), el("h3", [el("em", [text("Med tekst")])])])]);
  assert.deepEqual(out.map((n) => n.tagName), ["p", "div"]);
  assert.deepEqual(out[1].children.map((n) => n.tagName), ["h3"]);
});

test("bilde med «-liten» i filnavnet blir smalt og lenker til seg selv", () => {
  const [p] = run([el("p", [el("img", [], { src: "/media/pages/grasrotandelen-liten.png", alt: "Plakat" })])]);
  const [a] = p.children;
  assert.equal(a.tagName, "a");
  assert.equal(a.properties.href, "/media/pages/grasrotandelen-liten.png");
  assert.deepEqual(a.children[0].properties.className, ["img--small"]);
});

test("et lite bilde som allerede er en lenke, pakkes ikke inn på nytt", () => {
  const [a] = run([el("a", [el("img", [], { src: "/media/x-liten.jpg" })], { href: "https://example.com/" })]);
  assert.equal(a.properties.href, "https://example.com/");
  assert.equal(a.children[0].tagName, "img");
  assert.deepEqual(a.children[0].properties.className, ["img--small"]);
});

test("andre bilder blir som før", () => {
  const [p] = run([el("p", [el("img", [], { src: "/media/pages/liten-tur.jpg" })])]);
  assert.equal(p.children[0].tagName, "img");
  assert.equal(p.children[0].properties.className, undefined);
});
