// Norsk og engelsk. Faste tekster (menyer, knapper, overskrifter) står her; sideinnholdet oversettes
// automatisk ved publisering (scripts/translate/translate.mjs) og ligger i samlingene pages_en og courses_en.
import { getCollection } from "astro:content";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { frontPage as frontPageNb, url, link, isExternal, getPosts, slug, formatClock, type Post, type EventPost } from "./site";
import boardNb from "../data/board.json";
import { toEnglish, toNorwegian } from "./english-paths.mjs";
export { toEnglish, toNorwegian };

export type Lang = "nb" | "en";

export const T = {
  nb: {
    skip: "Hopp til innhold", menu: "Meny", mainMenu: "Hovedmeny", club: "Klubben", pilots: "For piloter", follow: "Følg oss",
    noTracking: "Ingen sporing eller informasjonskapsler.", noTrackingStats: "Ingen informasjonskapsler eller sporing. Anonym besøksstatistikk via Cloudflare og GoatCounter.", home: "Hjem", breadcrumb: "Brødsmuler", onThisPage: "På denne siden",
    lastUpdated: "Sist oppdatert", courses: "Kurs", allCourses: "Alle kurs", ourCourses: "Kursene våre", nextCourse: "Neste kurs",
    upcoming: "Kommende kurs og fagdager", noCourses: "Ingen kurs er satt opp akkurat nå. Følg med her og i Facebook-gruppa",
    previousWas: "forrige var", fullCalendar: "Hele kalenderen", contactMe: "Kontakt meg om:", portrait: "Portrett av", board: "Styret",
    darkMode: "Mørkt tema", search: "Søk", reportError: "Meld feil på denne siden", privacy: "Personvern", serviceStatus: "Driftsstatus", showSubpages: "vis undersider",
    exploreCourses: "Utforsk kurs", flyWithUs: "Fly med oss", calendar: "Aktivitetskalender", intoTheAir: "Ut i lufta", findYourWay: "Finn din vei inn.",
    aboutClub: "Om klubben", sponsors: "Støttet av", newTab: "åpnes i ny fane", heroAlt: "Tandemflyging over snødekte fjell ved Harstad",
  },
  en: {
    skip: "Skip to content", menu: "Menu", mainMenu: "Main menu", club: "The club", pilots: "For pilots", follow: "Follow us",
    noTracking: "No tracking or cookies.", noTrackingStats: "No cookies or tracking. Anonymous visitor statistics via Cloudflare and GoatCounter.", home: "Home", breadcrumb: "Breadcrumb", onThisPage: "On this page",
    lastUpdated: "Last updated", courses: "Courses", allCourses: "All courses", ourCourses: "Our courses", nextCourse: "Next course",
    upcoming: "Upcoming courses and training days", noCourses: "No courses are scheduled right now. Keep an eye on this page and our Facebook group",
    previousWas: "the last one was", fullCalendar: "Full calendar", contactMe: "Contact me about:", portrait: "Portrait of", board: "Board",
    darkMode: "Dark mode", search: "Search", reportError: "Report an error on this page", privacy: "Privacy", serviceStatus: "Service status", showSubpages: "show subpages",
    exploreCourses: "Explore courses", flyWithUs: "Fly with us", calendar: "Activity calendar", intoTheAir: "Into the air", findYourWay: "Find your way in.",
    aboutClub: "About the club", sponsors: "Supported by", newTab: "opens in a new tab", heroAlt: "Tandem flight over snow-covered mountains near Harstad",
  },
} as const;

// Menyene i menu.json oversatt etter norsk tekst. Mangler en, vises den norske.
const MENU_EN: Record<string, string> = {
  "Kurs": "Courses", "Tandem": "Tandem", "Flysteder": "Flying sites", "Arrangementer": "Events", "Nytt": "News", "Klubben": "Club",
  "Lenker og værstasjoner": "Links and weather stations", "NOTAM ved vinsjing": "NOTAM for winch towing",
  "FLARM/FANET RadioID-register": "FLARM/FANET RadioID register", "Flysteder (kart)": "Flying sites (map)",
  "Om klubben": "About the club", "For piloter": "For pilots", "Fly med oss": "Fly with us", "Vær og lenker": "Weather and links", "Flystripa": "Airstrip", "Mørkeflyging": "Night flying",
  "Oversikt": "Overview", "Alle kurs": "All courses", "Styret og roller": "Board and roles", "Møter og referater": "Meetings and minutes",
  "Økonomisk støtte": "Financial support", "Konkurranser": "Competitions", "Skriv på siden": "Write for the site", "Prøv redaktøren": "Try the editor",
};
export const menuLabel = (lang: Lang, label: string) => (lang === "en" ? MENU_EN[label] ?? label : label);

const readTranslated = (file: string) => {
  const path = join(process.cwd(), ".translated", file);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : undefined;
};
/** Forsidetekstene på riktig språk (norsk hvis oversettelsen mangler). */
export const frontPageFor = (lang: Lang): typeof frontPageNb => (lang === "en" ? readTranslated("front-page.json") ?? frontPageNb : frontPageNb);
export const boardFor = (lang: Lang): typeof boardNb => (lang === "en" ? readTranslated("board.json") ?? boardNb : boardNb);

/** Norske stier (uten base) som har en engelsk versjon. */
let paths: Promise<Set<string>> | undefined;
export function englishPaths() {
  paths ??= (async () => {
    const [pages, courses] = await Promise.all([getCollection("pages_en"), getCollection("courses_en")]);
    const s = new Set<string>([...pages.map((e) => link(e)), ...courses.map((k) => `/kurs/${k.id}/`)]);
    if (readTranslated("front-page.json")) s.add("/");
    // Oversatte innlegg (norsk adresse), og Nytt, kategoriene og Arrangementer, som finnes på engelsk når innleggene gjør det
    const en = await englishPostMap();
    if (en.size) {
      const nb = await getPosts();
      for (const p of nb) if (en.has(p.id)) s.add(link(p));
      s.add("/nytt/"); s.add("/arrangementer/");
      for (const k of new Set(nb.filter((p) => en.has(p.id)).flatMap((p) => p.data.categories))) s.add(`/nytt/kategori/${slug(k)}/`);
    }
    s.add("/meld-feil/"); // egen engelsk side (src/pages/en/report-error.astro)
    return s;
  })();
  return paths;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
/** Sti uten base og uten /en, og språket den er på. */
export function pageInfo(pathname: string): { path: string; lang: Lang } {
  const p = pathname.slice(BASE.length) || "/";
  // path er alltid den norske adressen, også på engelske sider (/en/club/board/ → /klubben/styret/)
  return p === "/en/" || p.startsWith("/en/") ? { path: toNorwegian(p.slice(3) || "/"), lang: "en" } : { path: p, lang: "nb" };
}
/** Lenke på riktig språk: engelsk versjon hvis den finnes, ellers den norske siden. */
export const linkFor = (lang: Lang, u: string, english: Set<string>) =>
  isExternal(u) ? u : url(lang === "en" && english.has(u) ? `/en${toEnglish(u)}` : u);

export const dateFor = (lang: Lang, d: Date) =>
  new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "nb-NO", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(d);


// ── Nyheter og arrangementer på engelsk ────────────────────────────────────────────────────────────────────────────
// Innleggene oversettes automatisk (scripts/translate), unntatt referater. Et innlegg uten oversettelse vises på engelske
// sider med norsk tittel og «(in Norwegian)», og lenker til den norske siden.
let enPosts: Promise<Map<string, Post>> | undefined;
const englishPostMap = () => (enPosts ??= getCollection("posts_en").then((l) => new Map(l.map((e) => [e.id, e as unknown as Post]))));

/** Publiserte innlegg på språket, nyeste først. Engelsk: oversettelsen der den finnes, ellers det norske innlegget (merket). */
export async function postsFor(lang: Lang): Promise<(Post & { untranslated?: boolean })[]> {
  const nb = await getPosts();
  if (lang === "nb") return nb;
  const en = await englishPostMap();
  return nb.map((p) => en.get(p.id) ?? { ...p, untranslated: true, data: { ...p.data, title: `${p.data.title} (in Norwegian)` } });
}
/** Bare de oversatte innleggene (engelsk Nytt), eller alle på norsk. */
export const translatedPosts = async (lang: Lang) => (await postsFor(lang)).filter((p) => !p.untranslated);
/** Det engelske innlegget med samme id, hvis det finnes. */
export const englishPost = async (id: string) => (await englishPostMap()).get(id);

const CATEGORY_EN: Record<string, string> = {
  "Nyhet": "News", "Møter og referater": "Meetings and minutes", "Kurs og fagdag": "Courses and training days",
  "Sosialt og turer": "Social and trips", "Konkurranser": "Competitions",
};
/** Kategorinavn på språket. Adressen og fargen bruker fortsatt den norske (slug). */
export const categoryName = (lang: Lang, k: string) => (lang === "en" ? CATEGORY_EN[k] ?? k : k);

const GROUP_EN: Record<string, string> = { Kurs: "Course", Fagdag: "Training day", "Møte": "Meeting", Sosialt: "Social", Konkurranse: "Competition" };
const TYPE_EN: Record<string, string> = {
  "Prøvedag": "Try-out day", "Annet kurs": "Other course", "Nødskjerm og vingesjekk": "Reserve and wing check",
  Sikkerhetsseminar: "Safety seminar", "Annen fagdag": "Other training day", "Årsmøte": "Annual meeting", Klubbmøte: "Club meeting",
  Styremøte: "Board meeting", Julebord: "Christmas party", Afterflight: "Afterflight", Kickoff: "Kickoff", Tur: "Trip",
  "Cup og stevne": "Cup and meet", "Foto og video": "Photo and video", "Annen konkurranse": "Other competition",
};
/** Gruppenavn i kalenderen («Kurs» → «Course»). */
export const groupName = (lang: Lang, name: string) => (lang === "en" ? GROUP_EN[name] ?? name : name);
/** «Kurs / PP2» → «Kurs · PP2» eller «Course · PP2». */
export const typeLabelFor = (lang: Lang, type = "") => {
  const [g, t] = type.split(" / ");
  return lang === "en" ? [GROUP_EN[g] ?? g, t && (TYPE_EN[t] ?? t)].filter(Boolean).join(" · ") : type.replace(" / ", " · ");
};

/** Dato- og tidstekster på språket. */
export const formatsFor = (lang: Lang) => {
  const loc = lang === "en" ? "en-GB" : "nb-NO";
  const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc, { timeZone: "UTC", ...o }).format(d);
  return {
    date: (d: Date) => f(d, { day: "numeric", month: "long", year: "numeric" }),
    dateShort: (d: Date) => f(d, { day: "numeric", month: "short" }),
    clock: (d: Date) => (lang === "en" ? f(d, { hour: "2-digit", minute: "2-digit", hour12: false }) : formatClock(d)),
    time: (e: EventPost) => (e.data.allDay ? (lang === "en" ? "All day" : "Hele dagen") : `${lang === "en" ? "" : "kl. "}${f(e.data.start, { hour: "2-digit", minute: "2-digit", hour12: false })}`),
    place: (e: EventPost) => e.data.location ?? (e.data.online ? (lang === "en" ? "Online" : "Digitalt") : ""),
  };
};
/** Intern adresse på språket: /nytt/ → /en/news/ på engelsk. */
export const localPath = (lang: Lang, u: string) => url(lang === "en" ? `/en${toEnglish(u)}` : u);
