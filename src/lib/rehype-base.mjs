// Prefikser interne lenker og bilder i Markdown med base-stien (trengs bare når siden ikke ligger på roten).
// Lenkelister: et listepunkt som er «[Navn](https://…) – beskrivelse» får domenet vist automatisk
// etter navnet, så leseren ser hvor lenken går uten at redaktøren må skrive det.
// Overskrifter: siden har tittelen som eneste <h1>, så «# Overskrift» i teksten blir <h2>, og en overskrift uten tekst
// (en linje med bare «#») fjernes. Redaktørene i Pages CMS kan skrive begge deler.
// Små bilder: et bilde med «-liten» sist i filnavnet (f.eks. «grasrotandelen-liten.png») vises smalt og lenker til seg
// selv, så det kan forstørres i bildevisningen (public/assets/js/gallery.js). Brukes til QR-koder og plakater.
import { domainToUnicode } from "node:url";

const HEADING = /^h[1-6]$/;
const SMALL = /-liten\.(png|jpe?g|webp|gif)$/i;
const isSmall = (n) => n.type === "element" && n.tagName === "img" && SMALL.test(String(n.properties?.src || "").split(/[?#]/)[0]);
const textOf = (n) => (n.type === "text" ? n.value : (n.children || []).map(textOf).join(""));

const domain = (href) => {
  try {
    return domainToUnicode(new URL(href).hostname).replace(/^www\./, "");
  } catch {
    return null;
  }
};

const linkItem = (li) => {
  const container = li.children.find((c) => c.type === "element" && c.tagName === "p") ?? li;
  const children = container.children.filter((c) => !(c.type === "text" && !c.value.trim()));
  const [a, text] = children;
  if (a?.type !== "element" || a.tagName !== "a" || !/^https?:/.test(a.properties?.href || "")) return;
  if (text?.type !== "text" || !/^\s*[–—-]\s/.test(text.value)) return;
  const d = domain(a.properties.href);
  if (!d) return;
  // Venstre kolonne: navn og domene. Høyre kolonne: beskrivelsen (og alt som følger etter).
  const i = container.children.indexOf(a);
  text.value = text.value.replace(/^\s*[–—-]\s*/, "");
  const rest = container.children.slice(container.children.indexOf(text));
  const el = (cls, children) => ({ type: "element", tagName: "span", properties: { className: [cls] }, children });
  container.children.splice(i, container.children.length - i, el("link__name", [a, el("link__domain", [{ type: "text", value: d }])]), el("link__text", rest));
  li.properties.className = [...(li.properties.className || []), "link-item"];
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
      if (n.tagName === "li") linkItem(n);
      if (n.tagName === "h1") n.tagName = "h2";
    }
    if (n.children) n.children = n.children.filter((c) => !(c.type === "element" && HEADING.test(c.tagName) && !textOf(c).trim()));
    if (n.children) n.children = n.children.map((c) => {
      if (!isSmall(c)) return c;
      const cls = c.properties.className || [];
      if (!cls.includes("img--small")) c.properties.className = [...cls, "img--small"];
      return n.tagName === "a" ? c : { type: "element", tagName: "a", properties: { href: c.properties.src, className: ["img-zoom"] }, children: [c] };
    });
    (n.children || []).forEach(walk);
    // En liste der alle punktene er lenkepunkter, vises som tabell
    if (n.tagName === "ul") {
      const li = n.children.filter((c) => c.type === "element");
      if (li.length && li.every((c) => c.properties?.className?.includes("link-item"))) n.properties.className = [...(n.properties.className || []), "link-list"];
    }
  };
  return (tree) => walk(tree);
}
