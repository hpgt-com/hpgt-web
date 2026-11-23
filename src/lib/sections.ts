// Seksjonene i toppmenyen som har undersider: Kurs (fra kurssamlingen), For piloter og Klubben (fra menu.json).
// Hver seksjon får en knapperad øverst på alle sidene sine (SectionMenu) og kort på oversiktssiden (SectionOverview).
// Feltnavnene (text, url, first, pages, external, lead, image) er de samme som i menu.json.
import { getCollection } from "astro:content";
import { menu, getCourses, courseLink, link, isExternal } from "./site";
import { linkFor, toEnglish, type Lang } from "./i18n";
import { url } from "./site";

export type SectionLink = { text: string; url: string; external?: boolean; lead?: string; leadEn?: string; image?: string };
export type Section = { text: string; url: string; first: string; pages: SectionLink[] };

const isInside = (path: string, u: string) => !isExternal(u) && (path === u || (u !== "/" && path.startsWith(u)));

/** Seksjonen siden hører til, med titler og ingresser på riktig språk. */
export async function sectionFor(path: string, lang: Lang): Promise<Section | undefined> {
  if (isInside(path, "/kurs/")) {
    const courses = await getCourses(lang);
    return {
      text: "Kurs", url: "/kurs/", first: "Alle kurs",
      pages: courses.map((k) => ({ text: k.data.menuTitle ?? k.data.title, url: courseLink(k), lead: k.data.lead, image: k.data.image })),
    };
  }
  const s = menu.sections.find((s) => path === s.url || s.pages.some((l) => isInside(path, l.url)));
  if (!s) return undefined;
  // Ingress og bilde til kortene hentes fra sidene selv (engelsk versjon når den finnes)
  const [nb, en] = await Promise.all([getCollection("pages"), lang === "en" ? getCollection("pages_en") : []]);
  const page = (u: string) => en.find((e) => link(e) === u) ?? nb.find((e) => link(e) === u);
  return { ...s, pages: s.pages.map((l: SectionLink) => ({ ...l, lead: page(l.url)?.data.lead ?? (lang === "en" ? l.leadEn : l.lead), image: page(l.url)?.data.image })) };
}

/** Alle seksjonene, med toppmenyens adresse som nøkkel (for nedtrekksmenyene i toppen). */
export async function allSections(lang: Lang) {
  const list = await Promise.all(["/kurs/", ...menu.sections.map((s) => s.url)].map((u) => sectionFor(u, lang)));
  return new Map(list.filter((s): s is Section => !!s).map((s) => [s.url, s]));
}

/** Lenke til en side i seksjonen på riktig språk. Kurssidene finnes alltid på engelsk; andre bare når de er oversatt. */
export const sectionHref = (s: Section, u: string, lang: Lang, english: Set<string>) =>
  s.url === "/kurs/" && lang === "en" && !isExternal(u) ? url(`/en${toEnglish(u)}`) : linkFor(lang, u, english);

/** Den mest presise lenken i seksjonen som siden er (eller ligger under). */
export function activeLink(s: Section, path: string) {
  return [s.url, ...s.pages.map((l) => l.url)].filter((u) => isInside(path, u)).sort((a, b) => b.length - a.length)[0];
}
