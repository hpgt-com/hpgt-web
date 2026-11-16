// Søkeindeks for /sok/ og /en/search/: alle innlegg, faste sider og kurssider på begge språk, som ren tekst.
// Søket skjer i nettleseren (public/assets/js/sok.js) – ingenting sendes til andre tjenester.
import { getCollection } from "astro:content";
import { lenke, kursLenke } from "../lib/site";
import { tilEngelsk } from "../lib/engelske-adresser.mjs";

// Markdown til ren tekst: fjern bilder, behold lenketekst, fjern formatering og HTML
const tekst = (md = "") =>
  md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`|~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);

export async function GET() {
  const [innlegg, sider, kurs, siderEn, kursEn] = await Promise.all([
    getCollection("innlegg", (p) => !p.data.utkast),
    getCollection("sider"),
    getCollection("kurs"),
    getCollection("sider_en"),
    getCollection("kurs_en"),
  ]);
  const dok = [
    ...innlegg.map((p) => ({ s: "nb", u: lenke(p), t: p.data.title, k: p.data.kategorier[0], d: p.data.date.toISOString().slice(0, 10), x: tekst(`${p.data.ingress ?? ""} ${p.body}`) })),
    ...sider.map((p) => ({ s: "nb", u: lenke(p), t: p.data.title, k: "Side", x: tekst(`${p.data.ingress ?? ""} ${p.body}`) })),
    ...kurs.map((p) => ({ s: "nb", u: kursLenke(p), t: p.data.title, k: "Kurs", x: tekst(`${p.data.ingress ?? ""} ${p.body}`) })),
    ...siderEn.map((p) => ({ s: "en", u: `/en${tilEngelsk(lenke(p))}`, t: p.data.title, k: "Page", x: tekst(`${p.data.ingress ?? ""} ${p.body}`) })),
    ...kursEn.map((p) => ({ s: "en", u: `/en${tilEngelsk(kursLenke(p))}`, t: p.data.title, k: "Course", x: tekst(`${p.data.ingress ?? ""} ${p.body}`) })),
  ];
  return new Response(JSON.stringify(dok), { headers: { "Content-Type": "application/json" } });
}
