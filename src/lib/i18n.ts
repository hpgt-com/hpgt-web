// Norsk og engelsk. Faste tekster (menyer, knapper, overskrifter) står her; sideinnholdet oversettes
// automatisk ved publisering (scripts/oversett/oversett.mjs) og ligger i samlingene sider_en og kurs_en.
import { getCollection } from "astro:content";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { forside as forsideNb, url, lenke, ekstern, hentInnlegg, slug, klokke, type Innlegg, type Arrangement } from "./site";
import styretNb from "../data/styret.json";
import { tilEngelsk, tilNorsk } from "./engelske-adresser.mjs";
export { tilEngelsk, tilNorsk };

export type Sprak = "nb" | "en";

export const T = {
  nb: {
    hopp: "Hopp til innhold", meny: "Meny", hovedmeny: "Hovedmeny", klubben: "Klubben", piloter: "For piloter", folg: "Følg oss",
    sporing: "Ingen sporing eller informasjonskapsler.", sporingStatistikk: "Ingen informasjonskapsler eller sporing. Anonym besøksstatistikk via Cloudflare.", hjem: "Hjem", brodsmuler: "Brødsmuler", paaSiden: "På denne siden",
    sistOppdatert: "Sist oppdatert", kurs: "Kurs", alleKurs: "Alle kurs", kursene: "Kursene våre", nesteKurs: "Neste kurs",
    kommende: "Kommende kurs og fagdager", ingenKurs: "Ingen kurs er satt opp akkurat nå. Følg med her og i Facebook-gruppa",
    forrigeVar: "forrige var", heleKalenderen: "Hele kalenderen", kontaktMeg: "Kontakt meg om:", portrett: "Portrett av", styret: "Styret",
    morkTema: "Mørkt tema", sok: "Søk", meldFeil: "Meld feil på denne siden", personvern: "Personvern", visUndersider: "vis undersider",
    utforskKurs: "Utforsk kurs", flyMedOss: "Fly med oss", kalender: "Aktivitetskalender", utILufta: "Ut i lufta", finnVei: "Finn din vei inn.",
    omKlubben: "Om klubben", heltebildeAlt: "Tandemflyging over snødekte fjell ved Harstad",
  },
  en: {
    hopp: "Skip to content", meny: "Menu", hovedmeny: "Main menu", klubben: "The club", piloter: "For pilots", folg: "Follow us",
    sporing: "No tracking or cookies.", sporingStatistikk: "No cookies or tracking. Anonymous visitor statistics via Cloudflare.", hjem: "Home", brodsmuler: "Breadcrumb", paaSiden: "On this page",
    sistOppdatert: "Last updated", kurs: "Courses", alleKurs: "All courses", kursene: "Our courses", nesteKurs: "Next course",
    kommende: "Upcoming courses and training days", ingenKurs: "No courses are scheduled right now. Keep an eye on this page and our Facebook group",
    forrigeVar: "the last one was", heleKalenderen: "Full calendar", kontaktMeg: "Contact me about:", portrett: "Portrait of", styret: "Board",
    morkTema: "Dark mode", sok: "Search", meldFeil: "Report an error on this page", personvern: "Privacy", visUndersider: "show subpages",
    utforskKurs: "Explore courses", flyMedOss: "Fly with us", kalender: "Activity calendar", utILufta: "Into the air", finnVei: "Find your way in.",
    omKlubben: "About the club", heltebildeAlt: "Tandem flight over snow-covered mountains near Harstad",
  },
} as const;

// Menyene i meny.json oversatt etter norsk tekst. Mangler en, vises den norske.
const MENY_EN: Record<string, string> = {
  "Kurs": "Courses", "Tandem": "Tandem", "Flysteder": "Flying sites", "Arrangementer": "Events", "Nytt": "News", "Klubben": "Club",
  "Lenker og værstasjoner": "Links and weather stations", "NOTAM ved vinsjing": "NOTAM for winch towing",
  "FLARM/FANET RadioID-register": "FLARM/FANET RadioID register", "Flysteder (kart)": "Flying sites (map)",
  "Om klubben": "About the club", "For piloter": "For pilots", "Fly med oss": "Fly with us", "Vær og lenker": "Weather and links", "Flystripa": "Airstrip", "Mørkeflyging": "Night flying",
  "Oversikt": "Overview", "Alle kurs": "All courses", "Styret og roller": "Board and roles", "Møter og referater": "Meetings and minutes",
  "Økonomisk støtte": "Financial support", "Konkurranser": "Competitions", "Skriv på siden": "Write for the site", "Prøv redaktøren": "Try the editor",
};
export const menyTekst = (sprak: Sprak, tekst: string) => (sprak === "en" ? MENY_EN[tekst] ?? tekst : tekst);

const oversatt = (fil: string) => {
  const sti = join(process.cwd(), ".oversatt", fil);
  return existsSync(sti) ? JSON.parse(readFileSync(sti, "utf-8")) : undefined;
};
/** Forsidetekstene på riktig språk (norsk hvis oversettelsen mangler). */
export const forsideFor = (sprak: Sprak): typeof forsideNb => (sprak === "en" ? oversatt("forside.json") ?? forsideNb : forsideNb);
export const styretFor = (sprak: Sprak): typeof styretNb => (sprak === "en" ? oversatt("styret.json") ?? styretNb : styretNb);

/** Norske stier (uten base) som har en engelsk versjon. */
let stier: Promise<Set<string>> | undefined;
export function engelskeStier() {
  stier ??= (async () => {
    const [sider, kurs] = await Promise.all([getCollection("sider_en"), getCollection("kurs_en")]);
    const s = new Set<string>([...sider.map((e) => lenke(e)), ...kurs.map((k) => `/kurs/${k.id}/`)]);
    if (oversatt("forside.json")) s.add("/");
    // Oversatte innlegg (norsk adresse), og Nytt, kategoriene og Arrangementer, som finnes på engelsk når innleggene gjør det
    const en = await engelskeInnlegg();
    if (en.size) {
      const nb = await hentInnlegg();
      for (const p of nb) if (en.has(p.id)) s.add(lenke(p));
      s.add("/nytt/"); s.add("/arrangementer/");
      for (const k of new Set(nb.filter((p) => en.has(p.id)).flatMap((p) => p.data.kategorier))) s.add(`/nytt/kategori/${slug(k)}/`);
    }
    s.add("/meld-feil/"); // egen engelsk side (src/pages/en/report-error.astro)
    return s;
  })();
  return stier;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
/** Sti uten base og uten /en, og språket den er på. */
export function sideInfo(pathname: string): { sti: string; sprak: Sprak } {
  const p = pathname.slice(BASE.length) || "/";
  // sti er alltid den norske adressen, også på engelske sider (/en/club/board/ → /klubben/styret/)
  return p === "/en/" || p.startsWith("/en/") ? { sti: tilNorsk(p.slice(3) || "/"), sprak: "en" } : { sti: p, sprak: "nb" };
}
/** Lenke på riktig språk: engelsk versjon hvis den finnes, ellers den norske siden. */
export const lenkeFor = (sprak: Sprak, u: string, engelske: Set<string>) =>
  ekstern(u) ? u : url(sprak === "en" && engelske.has(u) ? `/en${tilEngelsk(u)}` : u);

export const datoFor = (sprak: Sprak, d: Date) =>
  new Intl.DateTimeFormat(sprak === "en" ? "en-GB" : "nb-NO", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(d);


// ── Nyheter og arrangementer på engelsk ────────────────────────────────────────────────────────────────────────────
// Innleggene oversettes automatisk (scripts/oversett), unntatt referater. Et innlegg uten oversettelse vises på engelske
// sider med norsk tittel og «(in Norwegian)», og lenker til den norske siden.
let enInnlegg: Promise<Map<string, Innlegg>> | undefined;
const engelskeInnlegg = () => (enInnlegg ??= getCollection("innlegg_en").then((l) => new Map(l.map((e) => [e.id, e as unknown as Innlegg]))));

/** Publiserte innlegg på språket, nyeste først. Engelsk: oversettelsen der den finnes, ellers det norske innlegget (merket). */
export async function innleggFor(sprak: Sprak): Promise<(Innlegg & { norsk?: boolean })[]> {
  const nb = await hentInnlegg();
  if (sprak === "nb") return nb;
  const en = await engelskeInnlegg();
  return nb.map((p) => en.get(p.id) ?? { ...p, norsk: true, data: { ...p.data, title: `${p.data.title} (in Norwegian)` } });
}
/** Bare de oversatte innleggene (engelsk Nytt), eller alle på norsk. */
export const oversatteInnlegg = async (sprak: Sprak) => (await innleggFor(sprak)).filter((p) => !p.norsk);
/** Det engelske innlegget med samme id, hvis det finnes. */
export const engelskInnlegg = async (id: string) => (await engelskeInnlegg()).get(id);

const KATEGORI_EN: Record<string, string> = {
  "Nyhet": "News", "Møter og referater": "Meetings and minutes", "Kurs og fagdag": "Courses and training days",
  "Sosialt og turer": "Social and trips", "Konkurranser": "Competitions",
};
/** Kategorinavn på språket. Adressen og fargen bruker fortsatt den norske (slug). */
export const katNavn = (sprak: Sprak, k: string) => (sprak === "en" ? KATEGORI_EN[k] ?? k : k);

const GRUPPE_EN: Record<string, string> = { Kurs: "Course", Fagdag: "Training day", "Møte": "Meeting", Sosialt: "Social", Konkurranse: "Competition" };
const TYPE_EN: Record<string, string> = {
  "Prøvedag": "Try-out day", "Annet kurs": "Other course", "Nødskjerm og vingesjekk": "Reserve and wing check",
  Sikkerhetsseminar: "Safety seminar", "Annen fagdag": "Other training day", "Årsmøte": "Annual meeting", Klubbmøte: "Club meeting",
  Styremøte: "Board meeting", Julebord: "Christmas party", Afterflight: "Afterflight", Kickoff: "Kickoff", Tur: "Trip",
  "Cup og stevne": "Cup and meet", "Foto og video": "Photo and video", "Annen konkurranse": "Other competition",
};
/** Gruppenavn i kalenderen («Kurs» → «Course»). */
export const gruppeNavn = (sprak: Sprak, navn: string) => (sprak === "en" ? GRUPPE_EN[navn] ?? navn : navn);
/** «Kurs / PP2» → «Kurs · PP2» eller «Course · PP2». */
export const typeTekstFor = (sprak: Sprak, type = "") => {
  const [g, t] = type.split(" / ");
  return sprak === "en" ? [GRUPPE_EN[g] ?? g, t && (TYPE_EN[t] ?? t)].filter(Boolean).join(" · ") : type.replace(" / ", " · ");
};

/** Dato- og tidstekster på språket. */
export const fmtFor = (sprak: Sprak) => {
  const loc = sprak === "en" ? "en-GB" : "nb-NO";
  const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc, { timeZone: "UTC", ...o }).format(d);
  return {
    dato: (d: Date) => f(d, { day: "numeric", month: "long", year: "numeric" }),
    datoKort: (d: Date) => f(d, { day: "numeric", month: "short" }),
    klokke: (d: Date) => (sprak === "en" ? f(d, { hour: "2-digit", minute: "2-digit", hour12: false }) : klokke(d)),
    tid: (e: Arrangement) => (e.data.heldag ? (sprak === "en" ? "All day" : "Hele dagen") : `${sprak === "en" ? "" : "kl. "}${f(e.data.start, { hour: "2-digit", minute: "2-digit", hour12: false })}`),
    sted: (e: Arrangement) => e.data.sted ?? (e.data.digital ? (sprak === "en" ? "Online" : "Digitalt") : ""),
  };
};
/** Intern adresse på språket: /nytt/ → /en/news/ på engelsk. */
export const sti = (sprak: Sprak, u: string) => url(sprak === "en" ? `/en${tilEngelsk(u)}` : u);
