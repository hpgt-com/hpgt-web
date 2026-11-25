// Overskriftene i Markdown (src/lib/rehype-base.mjs): «#» i teksten blir <h2>, og overskrifter uten tekst fjernes,
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
