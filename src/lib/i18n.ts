// Norsk og engelsk. Faste tekster (menyer, knapper, overskrifter) står her; sideinnholdet oversettes
// automatisk ved publisering (scripts/oversett/oversett.mjs) og ligger i samlingene sider_en og kurs_en.
import { getCollection } from "astro:content";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { forside as forsideNb, url, lenke, ekstern } from "./site";
import styretNb from "../data/styret.json";

export type Sprak = "nb" | "en";

export const T = {
  nb: {
    hopp: "Hopp til innhold", meny: "Meny", hovedmeny: "Hovedmeny", klubben: "Klubben", piloter: "For piloter", folg: "Følg oss",
    sporing: "Ingen sporing eller informasjonskapsler.", hjem: "Hjem", brodsmuler: "Brødsmuler", paaSiden: "På denne siden",
    sistOppdatert: "Sist oppdatert", kurs: "Kurs", alleKurs: "Alle kurs", kursene: "Kursene våre", nesteKurs: "Neste kurs",
    kommende: "Kommende kurs og fagdager", ingenKurs: "Ingen kurs er satt opp akkurat nå. Følg med her og i Facebook-gruppa",
    forrigeVar: "forrige var", heleKalenderen: "Hele kalenderen →", kontaktMeg: "Kontakt meg om:", portrett: "Portrett av", styret: "Styret",
    annetSprak: "English", annetSprakLang: "en", byttSprak: "Read this page in English",
    utforskKurs: "Utforsk kurs", flyMedOss: "Fly med oss", kalender: "Aktivitetskalender", utILufta: "Ut i lufta", finnVei: "Finn din vei inn.",
    omKlubben: "Om klubben", heltebildeAlt: "Tandemflyging over snødekte fjell ved Harstad",
  },
  en: {
    hopp: "Skip to content", meny: "Menu", hovedmeny: "Main menu", klubben: "The club", piloter: "For pilots", folg: "Follow us",
    sporing: "No tracking or cookies.", hjem: "Home", brodsmuler: "Breadcrumb", paaSiden: "On this page",
    sistOppdatert: "Last updated", kurs: "Courses", alleKurs: "All courses", kursene: "Our courses", nesteKurs: "Next course",
    kommende: "Upcoming courses and training days", ingenKurs: "No courses are scheduled right now. Keep an eye on this page and our Facebook group",
    forrigeVar: "the last one was", heleKalenderen: "Full calendar (in Norwegian) →", kontaktMeg: "Contact me about:", portrett: "Portrait of", styret: "Board",
    annetSprak: "Norsk", annetSprakLang: "nb", byttSprak: "Les denne siden på norsk",
    utforskKurs: "Explore courses", flyMedOss: "Fly with us", kalender: "Activity calendar", utILufta: "Into the air", finnVei: "Find your way in.",
    omKlubben: "About the club", heltebildeAlt: "Tandem flight over snow-covered mountains near Harstad",
    norskInnhold: "News and events", norskInnholdTekst: "News, meeting minutes and the event calendar are published in Norwegian. Your browser can translate them for you.",
    fraKlubben: "From the club", nyheter: "News (Norwegian) →", arrangementer: "Events (Norwegian) →",
  },
} as const;

// Menyene i meny.json oversatt etter norsk tekst. Mangler en, vises den norske.
const MENY_EN: Record<string, string> = {
  "Kurs": "Courses", "Tandem": "Tandem", "Flysteder": "Flying sites", "Arrangementer": "Events", "Nytt": "News", "Klubben": "Club",
  "Lenker og værstasjoner": "Links and weather stations", "NOTAM ved vinsjing": "NOTAM for winch towing",
  "FLARM/FANET RadioID-register": "FLARM/FANET RadioID register", "Flysteder (kart)": "Flying sites (map)",
  "Om klubben": "About the club", "Styret og roller": "Board and roles", "Møter og referater": "Meetings and minutes",
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
    return s;
  })();
  return stier;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
/** Sti uten base og uten /en, og språket den er på. */
export function sideInfo(pathname: string): { sti: string; sprak: Sprak } {
  const p = pathname.slice(BASE.length) || "/";
  return p === "/en/" || p.startsWith("/en/") ? { sti: p.slice(3) || "/", sprak: "en" } : { sti: p, sprak: "nb" };
}
/** Lenke på riktig språk: engelsk versjon hvis den finnes, ellers den norske siden. */
export const lenkeFor = (sprak: Sprak, u: string, engelske: Set<string>) =>
  ekstern(u) ? u : url(sprak === "en" && engelske.has(u) ? `/en${u}` : u);

export const datoFor = (sprak: Sprak, d: Date) =>
  new Intl.DateTimeFormat(sprak === "en" ? "en-GB" : "nb-NO", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(d);
