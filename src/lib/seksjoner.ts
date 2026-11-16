// Seksjonene i toppmenyen som har undersider: Kurs (fra kurssamlingen), For piloter og Klubben (fra meny.json).
// Hver seksjon får en knapperad øverst på alle sidene sine (SeksjonsMeny) og kort på oversiktssiden (SeksjonOversikt).
import { getCollection } from "astro:content";
import { meny, hentKurs, kursLenke, lenke, ekstern } from "./site";
import type { Sprak } from "./i18n";

export type SeksjonsLenke = { tekst: string; url: string; ekstern?: boolean; ingress?: string; ingress_en?: string; bilde?: string };
export type Seksjon = { tekst: string; url: string; forste: string; sider: SeksjonsLenke[] };

const inni = (sti: string, u: string) => !ekstern(u) && (sti === u || (u !== "/" && sti.startsWith(u)));

/** Seksjonen siden hører til, med titler og ingresser på riktig språk. */
export async function seksjonFor(sti: string, sprak: Sprak): Promise<Seksjon | undefined> {
  if (inni(sti, "/kurs/")) {
    const kurs = await hentKurs(sprak);
    return {
      tekst: "Kurs", url: "/kurs/", forste: "Alle kurs",
      sider: kurs.map((k) => ({ tekst: k.data.menynavn ?? k.data.title, url: kursLenke(k), ingress: k.data.ingress, bilde: k.data.bilde })),
    };
  }
  const s = meny.seksjoner.find((s) => sti === s.url || s.sider.some((l) => inni(sti, l.url)));
  if (!s) return undefined;
  // Ingress og bilde til kortene hentes fra sidene selv (engelsk versjon når den finnes)
  const [nb, en] = await Promise.all([getCollection("sider"), sprak === "en" ? getCollection("sider_en") : []]);
  const side = (u: string) => en.find((e) => lenke(e) === u) ?? nb.find((e) => lenke(e) === u);
  return { ...s, sider: s.sider.map((l: SeksjonsLenke) => ({ ...l, ingress: side(l.url)?.data.ingress ?? (sprak === "en" ? l.ingress_en : l.ingress), bilde: side(l.url)?.data.bilde })) };
}

/** Den mest presise lenken i seksjonen som siden er (eller ligger under). */
export function aktivLenke(s: Seksjon, sti: string) {
  return [s.url, ...s.sider.map((l) => l.url)].filter((u) => inni(sti, u)).sort((a, b) => b.length - a.length)[0];
}
