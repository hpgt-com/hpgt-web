import { getCollection, type CollectionEntry } from "astro:content";
import site from "../data/site.json";
import meny from "../data/meny.json";
import forside from "../data/forside.json";
import radioid from "../data/radioid.json";

export { site, meny, forside, radioid };
export type Innlegg = CollectionEntry<"innlegg">;
export type Arrangement = CollectionEntry<"arrangementer">;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
/** Intern lenke med base-sti; eksterne lenker returneres uendret. */
export const url = (p = "/") => (p.startsWith("/") && !p.startsWith("//") ? BASE + p : p);
export const ekstern = (p: string) => /^https?:/.test(p);

// Datoene fra WordPress er lokal tid uten tidssone; de leses som UTC og vises uendret.
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("nb-NO", { timeZone: "UTC", ...o }).format(d);
export const dato = (d: Date) => fmt(d, { day: "numeric", month: "long", year: "numeric" });
export const datoKort = (d: Date) => fmt(d, { day: "numeric", month: "short" });
export const dag = (d: Date) => fmt(d, { day: "numeric" });
export const mnd = (d: Date) => fmt(d, { month: "short" }).replace(".", "");
export const klokke = (d: Date) => fmt(d, { hour: "2-digit", minute: "2-digit" });

export const slug = (s: string) =>
  s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-");

export const utdrag = (body = "", n = 160) => {
  const t = body.replace(/\[Eksternt bilde\]\([^)]*\)/g, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>`|-]+/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).replace(/\s\S*$/, "") + " …" : t;
};
/** Forsidebilde, eller første bilde i teksten. */
export const bildeFor = (p: Innlegg) => p.data.bilde ?? p.body?.match(/!\[[^\]]*\]\(([^)\s]+)/)?.[1];

export async function hentInnlegg() {
  return (await getCollection("innlegg", (p) => !p.data.utkast)).sort((a, b) => +b.data.date - +a.data.date);
}
export async function hentArrangementer() {
  const alle = (await getCollection("arrangementer")).sort((a, b) => +a.data.start - +b.data.start);
  const naa = Date.now();
  const ferdig = (e: Arrangement) => +(e.data.slutt ?? e.data.start) < naa;
  return { kommende: alle.filter((e) => !ferdig(e)), tidligere: alle.filter(ferdig).reverse() };
}
export async function hentKategorier() {
  const map = new Map<string, Innlegg[]>();
  for (const p of await hentInnlegg()) for (const k of p.data.kategorier) map.set(k, [...(map.get(k) ?? []), p]);
  return [...map].map(([navn, poster]) => ({ navn, slug: slug(navn), poster })).sort((a, b) => b.poster.length - a.poster.length);
}
export const grupperPaaAar = (poster: Innlegg[]) => {
  const g = new Map<number, Innlegg[]>();
  for (const p of poster) g.set(p.data.date.getFullYear(), [...(g.get(p.data.date.getFullYear()) ?? []), p]);
  return [...g];
};
export const tidSted = (e: Arrangement) => [e.data.sted, !e.data.heldag && `kl. ${klokke(e.data.start)}`].filter(Boolean).join(" · ");
/** Adressen til et innlegg/side/arrangement: permalink fra WordPress, ellers filnavnet uten datoprefiks (nye saker fra CMS-et). */
export const lenke = (e: { id: string; data: { permalink?: string } }) =>
  e.data.permalink ?? `/${e.id.split("/").pop()!.replace(/^\d{4}-\d{2}-\d{2}-/, "")}/`;
