// Prefikser interne lenker og bilder i Markdown med base-stien (trengs bare når siden ikke ligger på roten).
// Lenkelister: et listepunkt som er «[Navn](https://…) – beskrivelse» får domenet vist automatisk
// etter navnet, så leseren ser hvor lenken går uten at redaktøren må skrive det.
// Overskrifter: siden har tittelen som eneste <h1>, så «# Overskrift» i teksten blir <h2>, og en overskrift uten tekst
// (en linje med bare «#») fjernes. Redaktørene i Pages CMS kan skrive begge deler.
// Bilder i teksten (beslutning 0008), uten at redaktøren må gjøre noe:
//  • Bilder i public/media/ får width, height og srcset med mindre utgaver (src/lib/image-sizes.mjs).
//  • Alle bilder som ikke allerede er en lenke, lenker til seg selv, så de kan forstørres i bildevisningen
//    (public/assets/js/gallery.js). Sponsorlogoene røres ikke.
//  • Kvadratiske og stående bilder (QR-koder, mobilbilder) vises smalere (img--narrow) enn liggende bilder, med mindre
//    de står flere sammen i ett avsnitt. Da vises de i rutenett (img-grid på avsnittet).
//  • Grafikk (plakater, logoer, QR-koder og skjermbilder, ikke foto) kjennes igjen på innholdet (isGraphic, beslutning
//    0010): liggende grafikk får høyst 560 px (img--graphic, rundt tre firedeler av tekstbredden) på PC og full bredde
//    på mobil, så en QR-kode på en plakat kan skannes fra skjermen, og kvadratisk eller
//    stående grafikk vises smalt (img--small). Gjelder ikke bildene fra WordPress i /media/archive/, så gamle innlegg
//    (med sponsorlogoer og skjermbilder) ser ut som før, og heller ikke sponsorlogoene, som aldri endres her.
//  • Endelsene «-full», «-half» og «-small» sist i filnavnet (f.eks. «plakat-full.png») overstyrer dette, for de få
//    bildene der regelen bommer: full tekstbredde, halv bredde eller smalt, uansett form og innhold.
import { domainToUnicode } from "node:url";
import { imageInfo, isGraphic, srcsetFor } from "./image-sizes.mjs";

const HEADING = /^h[1-6]$/;
const SMALL = /-small\.(png|jpe?g|webp|gif)$/i;
const HALF = /-half\.(png|jpe?g|webp|gif)$/i;
const FULL = /-full\.(png|jpe?g|webp|gif)$/i;
const MEDIA = /^\/media\//;
const LOGO = /^\/media\/(sponsors\/|competitions\/[^/]+\/sponsors\/)/;
// Bildene fra WordPress (blant dem sponsorlogoer i gamle innlegg) vises som før, uten regelen for grafikk
const ARCHIVE = /^\/media\/archive\//;
// Bredde/høyde under dette regnes som kvadratisk eller stående
const LANDSCAPE = 1.15;
// sizes forteller nettleseren hvor bredt bildet vises, så den velger riktig utgave fra srcset (må stemme med style.css)
const SIZES = { small: "300px", half: "(min-width: 420px) 380px, 100vw", graphic: "(min-width: 600px) 560px, 100vw", narrow: "400px", grid: "(min-width: 820px) 380px, 50vw", text: "(min-width: 820px) 760px, 100vw" };
const isImg = (n) => n.type === "element" && n.tagName === "img";
const imgsIn = (n) => (n.children || []).filter((c) => isImg(c) || (c.type === "element" && c.tagName === "a" && (c.children || []).some(isImg))).length;
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

export default function rehypeBase({ base = "/", info = imageInfo, graphic = isGraphic } = {}) {
  const b = base.replace(/\/$/, "");
  const fix = (v) => (b && typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? b + v : v);

  // Bildene behandles før resten, med adressene slik de står i Markdown (base-stien legges på i walk)
  const collect = (n, parent, grand, out = []) => {
    if (isImg(n) && parent) out.push({ img: n, parent, grand });
    (n.children || []).forEach((c) => collect(c, n, parent, out));
    return out;
  };
  // Lenken rundt et bilde uten alt-tekst trenger et navn for skjermlesere (axe: link-name)
  const LABEL = { nb: "Vis bildet i stort format", en: "View the image in full size" };
  const image = async ({ img, parent, grand }, lang) => {
    const src = String(img.properties?.src || "");
    if (!MEDIA.test(src) || LOGO.test(src)) return;
    const meta = await info(src);
    const cls = img.properties.className || [];
    // Flere bilder i samme avsnitt (eller i samme lenke-avsnitt) vises i rutenett
    const box = parent.tagName === "a" ? grand : parent;
    const grid = (box ? imgsIn(box) : 1) > 1;
    if (grid && box.tagName === "p" && !(box.properties.className || []).includes("img-grid")) box.properties.className = [...(box.properties.className || []), "img-grid"];
    const file = src.split(/[?#]/)[0];
    const landscape = !meta || meta.width / meta.height >= LANDSCAPE;
    let kind = "text";
    if (SMALL.test(file)) kind = "small";
    else if (HALF.test(file)) kind = "half";
    else if (FULL.test(file)) kind = "text";
    else if (grid) kind = "grid";
    else if (meta && !ARCHIVE.test(file) && (await graphic(src))) kind = landscape ? "graphic" : "small";
    else if (!landscape) kind = "narrow";
    if (kind === "small" || kind === "half" || kind === "graphic" || kind === "narrow") {
      const c = `img--${kind}`;
      if (!cls.includes(c)) img.properties.className = [...cls, c];
    }
    if (meta) {
      Object.assign(img.properties, { width: meta.width, height: meta.height });
      const srcset = srcsetFor(src, meta, fix);
      if (srcset) Object.assign(img.properties, { srcset, sizes: SIZES[kind] });
    }
    if (parent.tagName !== "a") {
      const i = parent.children.indexOf(img);
      const props = { href: src, className: ["img-zoom"] };
      if (!String(img.properties.alt || "").trim()) props.ariaLabel = LABEL[lang];
      parent.children[i] = { type: "element", tagName: "a", properties: props, children: [img] };
    }
  };
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
    (n.children || []).forEach(walk);
    // En liste der alle punktene er lenkepunkter, vises som tabell
    if (n.tagName === "ul") {
      const li = n.children.filter((c) => c.type === "element");
      if (li.length && li.every((c) => c.properties?.className?.includes("link-item"))) n.properties.className = [...(n.properties.className || []), "link-list"];
    }
  };
  return async (tree, file) => {
    // De engelske tekstene ligger i .translated/ (scripts/translate/translate.mjs)
    const lang = /[\\/]\.translated[\\/]/.test(String(file?.path || file?.history?.[0] || "")) ? "en" : "nb";
    await Promise.all(collect(tree).map((x) => image(x, lang)));
    walk(tree);
  };
}
