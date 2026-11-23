// Seksjonene i toppmenyen som har undersider: Kurs (fra kurssamlingen), For piloter og Klubben (fra meny.json).
// Hver seksjon får en knapperad øverst på alle sidene sine (SectionMenu) og kort på oversiktssiden (SectionOverview).
// Feltnavnene (tekst, url, forste, sider, ekstern, ingress, bilde) er de samme som i meny.json, som redigeres i Pages CMS.
import { getCollection } from "astro:content";
import { menu, getCourses, courseLink, link, isExternal } from "./site";
import { linkFor, toEnglish, type Lang } from "./i18n";
import { url } from "./site";

export type SectionLink = { tekst: string; url: string; ekstern?: boolean; ingress?: string; ingress_en?: string; bilde?: string };
export type Section = { tekst: string; url: string; forste: string; sider: SectionLink[] };

const isInside = (path: string, u: string) => !isExternal(u) && (path === u || (u !== "/" && path.startsWith(u)));

/** Seksjonen siden hører til, med titler og ingresser på riktig språk. */
export async function sectionFor(path: string, lang: Lang): Promise<Section | undefined> {
  if (isInside(path, "/kurs/")) {
    const courses = await getCourses(lang);
    return {
      tekst: "Kurs", url: "/kurs/", forste: "Alle kurs",
      sider: courses.map((k) => ({ tekst: k.data.menynavn ?? k.data.title, url: courseLink(k), ingress: k.data.ingress, bilde: k.data.bilde })),
    };
  }
  const s = menu.seksjoner.find((s) => path === s.url || s.sider.some((l) => isInside(path, l.url)));
  if (!s) return undefined;
  // Ingress og bilde til kortene hentes fra sidene selv (engelsk versjon når den finnes)
  const [nb, en] = await Promise.all([getCollection("sider"), lang === "en" ? getCollection("sider_en") : []]);
  const page = (u: string) => en.find((e) => link(e) === u) ?? nb.find((e) => link(e) === u);
  return { ...s, sider: s.sider.map((l: SectionLink) => ({ ...l, ingress: page(l.url)?.data.ingress ?? (lang === "en" ? l.ingress_en : l.ingress), bilde: page(l.url)?.data.bilde })) };
}

/** Alle seksjonene, med toppmenyens adresse som nøkkel (for nedtrekksmenyene i toppen). */
export async function allSections(lang: Lang) {
  const list = await Promise.all(["/kurs/", ...menu.seksjoner.map((s) => s.url)].map((u) => sectionFor(u, lang)));
  return new Map(list.filter((s): s is Section => !!s).map((s) => [s.url, s]));
}

/** Lenke til en side i seksjonen på riktig språk. Kurssidene finnes alltid på engelsk; andre bare når de er oversatt. */
export const sectionHref = (s: Section, u: string, lang: Lang, english: Set<string>) =>
  s.url === "/kurs/" && lang === "en" && !isExternal(u) ? url(`/en${toEnglish(u)}`) : linkFor(lang, u, english);

/** Den mest presise lenken i seksjonen som siden er (eller ligger under). */
export function activeLink(s: Section, path: string) {
  return [s.url, ...s.sider.map((l) => l.url)].filter((u) => isInside(path, u)).sort((a, b) => b.length - a.length)[0];
}
