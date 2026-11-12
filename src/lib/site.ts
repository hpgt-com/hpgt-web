import { getCollection, type CollectionEntry } from "astro:content";
import site from "../data/site.json";
import meny from "../data/meny.json";
import forside from "../data/forside.json";
import radioid from "../data/radioid.json";

export { site, meny, forside, radioid };
export type Innlegg = CollectionEntry<"innlegg">;
type ArrFelt = NonNullable<Innlegg["data"]["arrangement"]>;
/** Et arrangement er et innlegg med arrangementsfelt. data har innleggets felt pluss start, slutt, sted, type osv. */
export type Arrangement = Omit<Innlegg, "data"> & { data: Innlegg["data"] & Omit<ArrFelt, "start"> & { start: Date } };

/** Gruppene i kalenderen (delen før « / » i arrangementstypen), med fast rekkefølge og farge (se typefarger.css). */
export const GRUPPER = [
  { navn: "Kurs", slug: "kurs" }, { navn: "Fagdag", slug: "fagdag" }, { navn: "Møte", slug: "mote" },
  { navn: "Sosialt", slug: "sosialt" }, { navn: "Konkurranse", slug: "konkurranse" },
];
export const gruppeFor = (type = "") => GRUPPER.find((g) => g.navn === type.split(" / ")[0]) ?? GRUPPER[3];
/** «Kurs / PP2 (nybegynner)» → «Kurs · PP2 (nybegynner)» */
export const typeTekst = (type = "") => type.replace(" / ", " · ");

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
  const alle = (await hentInnlegg())
    .filter((p) => p.data.arrangement?.start)
    .map((p) => ({ ...p, data: { ...p.data, ...p.data.arrangement } }) as Arrangement)
    .sort((a, b) => +a.data.start - +b.data.start);
  const naa = Date.now();
  const ferdig = (e: Arrangement) => +(e.data.slutt ?? e.data.start) < naa;
  return { kommende: alle.filter((e) => !ferdig(e)), tidligere: alle.filter(ferdig).reverse() };
}
/** Kurssidene i kursmenyen, i valgt rekkefølge. */
export const kursLenke = (k: { id: string }) => `/kurs/${k.id}/`;
export async function hentKurs(sprak: "nb" | "en" = "nb") {
  return (await getCollection(sprak === "en" ? "kurs_en" : "kurs")).sort((a, b) => a.data.rekkefolge - b.data.rekkefolge || a.data.title.localeCompare(b.data.title, "nb"));
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

/** Status for kursblokken på forsiden, regnet ut fra datoene i forside.json ved hvert bygg. */
export function kursStatus(k: { start: string; slutt: string; frist: string }, naa = new Date()) {
  if (naa > new Date(k.slutt)) return { tekst: "Gjennomført", aapen: false, ferdig: true };
  if (naa > new Date(k.frist)) return { tekst: "Påmeldingen er stengt", aapen: false, ferdig: false };
  return { tekst: "Påmelding åpen", aapen: true, ferdig: false };
}

/** Siste møter og referater, med PDF-vedlegg hentet fra vedlegg-feltet eller fra lenker i teksten. */
export async function hentDokumenter(antall = 5) {
  const poster = (await hentInnlegg()).filter((p) => p.data.kategorier.includes("Møter og referater"));
  return poster.slice(0, antall).map((p) => {
    const iTekst = [...(p.body ?? "").matchAll(/\]\((\/[^)\s]+\.pdf)\)/gi)].map((m) => m[1]);
    const pdf = p.data.vedlegg[0]?.fil ?? iTekst[0];
    return { tittel: p.data.title, dato: p.data.date, side: lenke(p), pdf };
  });
}

/** Arrangementer gruppert på år (nyeste først), til arrangementsoversikten. */
export const arrangementerPaaAar = (liste: Arrangement[]) => {
  const g = new Map<number, Arrangement[]>();
  for (const e of liste) g.set(e.data.start.getUTCFullYear(), [...(g.get(e.data.start.getUTCFullYear()) ?? []), e]);
  return [...g].sort((a, b) => b[0] - a[0]);
};
export const sted = (e: Arrangement) => e.data.sted ?? (e.data.digital ? "Digitalt" : "");
export const gruppe = (e: Arrangement) => gruppeFor(e.data.type).slug;
export const tid = (e: Arrangement) => (e.data.heldag ? "Hele dagen" : `kl. ${klokke(e.data.start)}`);
