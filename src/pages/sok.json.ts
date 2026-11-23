// Søkeindeks for /sok/ og /en/search/: innlegg, faste sider og kurssider på begge språk, som ren tekst.
// Søket skjer i nettleseren (public/assets/js/search.js) – ingenting sendes til andre tjenester.
// Adressen /sok.json og de korte feltnavnene (s, u, t, k, d, x) leses av search.js.
import { getCollection } from "astro:content";
import { link, courseLink } from "../lib/site";
import { toEnglish } from "../lib/english-paths.mjs";

// Markdown til ren tekst: fjern bilder, behold lenketekst, fjern formatering og HTML
const plainText = (md = "") =>
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
  const [posts, pages, courses, pagesEn, coursesEn, postsEn] = await Promise.all([
    getCollection("innlegg", (p) => !p.data.utkast),
    getCollection("sider"),
    getCollection("kurs"),
    getCollection("sider_en"),
    getCollection("kurs_en"),
    getCollection("innlegg_en"),
  ]);
  const published = new Set(posts.map((p) => p.id));
  const docs = [
    ...posts.map((p) => ({ s: "nb", u: link(p), t: p.data.title, k: p.data.kategorier[0], d: p.data.date.toISOString().slice(0, 10), x: plainText(`${p.data.ingress ?? ""} ${p.body}`) })),
    ...pages.map((p) => ({ s: "nb", u: link(p), t: p.data.title, k: "Side", x: plainText(`${p.data.ingress ?? ""} ${p.body}`) })),
    ...courses.map((p) => ({ s: "nb", u: courseLink(p), t: p.data.title, k: "Kurs", x: plainText(`${p.data.ingress ?? ""} ${p.body}`) })),
    ...pagesEn.map((p) => ({ s: "en", u: `/en${toEnglish(link(p))}`, t: p.data.title, k: "Page", x: plainText(`${p.data.ingress ?? ""} ${p.body}`) })),
    ...postsEn.filter((p) => published.has(p.id)).map((p) => ({ s: "en", u: link(p), t: p.data.title, k: "News", d: p.data.date.toISOString().slice(0, 10), x: plainText(`${p.data.ingress ?? ""} ${p.body}`) })),
    ...coursesEn.map((p) => ({ s: "en", u: `/en${toEnglish(courseLink(p))}`, t: p.data.title, k: "Course", x: plainText(`${p.data.ingress ?? ""} ${p.body}`) })),
  ];
  return new Response(JSON.stringify(docs), { headers: { "Content-Type": "application/json" } });
}
