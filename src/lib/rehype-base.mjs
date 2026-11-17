// Prefikser interne lenker og bilder i Markdown med base-stien (trengs bare når siden ikke ligger på roten).
// Lenkelister: et listepunkt som er «[Navn](https://…) – beskrivelse» får domenet vist automatisk
// etter navnet, så leseren ser hvor lenken går uten at redaktøren må skrive det.
import { domainToUnicode } from "node:url";

const domene = (href) => {
  try {
    return domainToUnicode(new URL(href).hostname).replace(/^www\./, "");
  } catch {
    return null;
  }
};

const lenkepunkt = (li) => {
  const innhold = li.children.find((c) => c.type === "element" && c.tagName === "p") ?? li;
  const barn = innhold.children.filter((c) => !(c.type === "text" && !c.value.trim()));
  const [a, tekst] = barn;
  if (a?.type !== "element" || a.tagName !== "a" || !/^https?:/.test(a.properties?.href || "")) return;
  if (tekst?.type !== "text" || !/^\s*[–—-]\s/.test(tekst.value)) return;
  const d = domene(a.properties.href);
  if (!d) return;
  const i = innhold.children.indexOf(a);
  innhold.children.splice(i + 1, 0, { type: "text", value: " " }, { type: "element", tagName: "span", properties: { className: ["lenke__domene"] }, children: [{ type: "text", value: d }] });
  tekst.value = tekst.value.replace(/^\s*[–—-]\s*/, "");
  innhold.children.splice(innhold.children.indexOf(tekst), 0, { type: "element", tagName: "br", properties: {}, children: [] });
  li.properties.className = [...(li.properties.className || []), "lenkepunkt"];
};

export default function rehypeBase({ base = "/" } = {}) {
  const b = base.replace(/\/$/, "");
  const fix = (v) => (b && typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? b + v : v);
  const walk = (n) => {
    if (n.type === "element") {
      if (n.properties?.href) n.properties.href = fix(n.properties.href);
      if (n.properties?.src) n.properties.src = fix(n.properties.src);
      if (n.tagName === "img") Object.assign(n.properties, { loading: "lazy", decoding: "async" });
      if (n.tagName === "a" && /^https?:/.test(n.properties.href || "")) n.properties.rel = "noopener external";
      if (n.tagName === "li") lenkepunkt(n);
    }
    (n.children || []).forEach(walk);
  };
  return (tree) => walk(tree);
}
