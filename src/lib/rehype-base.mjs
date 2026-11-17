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
  // Venstre kolonne: navn og domene. Høyre kolonne: beskrivelsen (og alt som følger etter).
  const i = innhold.children.indexOf(a);
  tekst.value = tekst.value.replace(/^\s*[–—-]\s*/, "");
  const resten = innhold.children.slice(innhold.children.indexOf(tekst));
  const el = (cls, children) => ({ type: "element", tagName: "span", properties: { className: [cls] }, children });
  innhold.children.splice(i, innhold.children.length - i, el("lenke__navn", [a, el("lenke__domene", [{ type: "text", value: d }])]), el("lenke__tekst", resten));
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
    // En liste der alle punktene er lenkepunkter, vises som tabell
    if (n.tagName === "ul") {
      const li = n.children.filter((c) => c.type === "element");
      if (li.length && li.every((c) => c.properties?.className?.includes("lenkepunkt"))) n.properties.className = [...(n.properties.className || []), "lenkeliste"];
    }
  };
  return (tree) => walk(tree);
}
