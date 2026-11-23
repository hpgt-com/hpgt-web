import { getCollection, type CollectionEntry } from "astro:content";
import site from "../data/site.json";
import menu from "../data/menu.json";
import frontPage from "../data/front-page.json";
import radioid from "../data/radio-id.json";

export { site, menu, frontPage, radioid };
export type Post = CollectionEntry<"posts">;
type EventFields = NonNullable<Post["data"]["event"]>;
/** Et arrangement er et innlegg med arrangementsfelt. data har innleggets felt pluss start, end, location, type osv. */
export type EventPost = Omit<Post, "data"> & { data: Post["data"] & Omit<EventFields, "start"> & { start: Date } };

/** Gruppene i kalenderen (delen før « / » i arrangementstypen), med fast rekkefølge og farge (se type-colors.css). */
export const GROUPS = [
  { name: "Kurs", slug: "kurs" }, { name: "Fagdag", slug: "fagdag" }, { name: "Møte", slug: "mote" },
  { name: "Sosialt", slug: "sosialt" }, { name: "Konkurranse", slug: "konkurranse" },
];
export const groupFor = (type = "") => GROUPS.find((g) => g.name === type.split(" / ")[0]) ?? GROUPS[3];
/** «Kurs / PP2 (nybegynner)» → «Kurs · PP2 (nybegynner)» */
export const typeLabel = (type = "") => type.replace(" / ", " · ");

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
/** Intern lenke med base-sti; eksterne lenker returneres uendret. */
export const url = (p = "/") => (p.startsWith("/") && !p.startsWith("//") ? BASE + p : p);
export const isExternal = (p: string) => /^https?:/.test(p);

// Datoene fra WordPress er lokal tid uten tidssone; de leses som UTC og vises uendret.
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("nb-NO", { timeZone: "UTC", ...o }).format(d);
export const formatDate = (d: Date) => fmt(d, { day: "numeric", month: "long", year: "numeric" });
export const formatDateShort = (d: Date) => fmt(d, { day: "numeric", month: "short" });
export const formatDay = (d: Date) => fmt(d, { day: "numeric" });
export const formatMonth = (d: Date) => fmt(d, { month: "short" }).replace(".", "");
export const formatClock = (d: Date) => fmt(d, { hour: "2-digit", minute: "2-digit" });

export const slug = (s: string) =>
  s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-");

export const excerpt = (body = "", n = 160) => {
  const t = body.replace(/\[Eksternt bilde\]\([^)]*\)/g, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>`|-]+/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).replace(/\s\S*$/, "") + " …" : t;
};
/** Forsidebilde, eller første bilde i teksten. */
export const imageFor = (p: Post) => p.data.image ?? p.body?.match(/!\[[^\]]*\]\(([^)\s]+)/)?.[1];

export async function getPosts() {
  return (await getCollection("posts", (p) => !p.data.draft)).sort((a, b) => +b.data.date - +a.data.date);
}
/** Arrangementene (kommende og tidligere). posts: en annen liste enn de norske, f.eks. de engelske (postsFor i i18n.ts). */
export async function getEvents(posts?: Post[]) {
  const all = (posts ?? (await getPosts()))
    .filter((p) => p.data.event?.start)
    .map((p) => ({ ...p, data: { ...p.data, ...p.data.event } }) as EventPost)
    .sort((a, b) => +a.data.start - +b.data.start);
  const now = Date.now();
  const isOver = (e: EventPost) => +(e.data.end ?? e.data.start) < now;
  return { upcoming: all.filter((e) => !isOver(e)), past: all.filter(isOver).reverse() };
}
/** Kurssidene i kursmenyen, i valgt rekkefølge. */
export const courseLink = (k: { id: string }) => `/kurs/${k.id}/`;
export async function getCourses(lang: "nb" | "en" = "nb") {
  return (await getCollection(lang === "en" ? "courses_en" : "courses")).sort((a, b) => a.data.menuOrder - b.data.menuOrder || a.data.title.localeCompare(b.data.title, "nb"));
}
export async function getCategories(posts?: Post[]) {
  const map = new Map<string, Post[]>();
  for (const p of posts ?? (await getPosts())) for (const k of p.data.categories) map.set(k, [...(map.get(k) ?? []), p]);
  return [...map].map(([name, posts]) => ({ name, slug: slug(name), posts })).sort((a, b) => b.posts.length - a.posts.length);
}
export const groupByYear = (posts: Post[]) => {
  const g = new Map<number, Post[]>();
  for (const p of posts) g.set(p.data.date.getFullYear(), [...(g.get(p.data.date.getFullYear()) ?? []), p]);
  return [...g];
};
export const timeAndPlace = (e: EventPost) => [e.data.location, !e.data.allDay && `kl. ${formatClock(e.data.start)}`].filter(Boolean).join(" · ");
/** Adressen til et innlegg/side/arrangement: permalink fra WordPress, ellers filnavnet uten datoprefiks (nye saker fra CMS-et). */
export const link = (e: { id: string; data: { permalink?: string } }) =>
  e.data.permalink ??
  // Konkurranser opprettet i Pages CMS (pages/konkurranser/2027.md) får /klubben/konkurranser/2027/. Mappenavnet bestemmer
  // adressen, så det følger språket i adressen.
  (e.id.startsWith("konkurranser/") ? `/klubben/${e.id}/` : `/${e.id.split("/").pop()!.replace(/^\d{4}-\d{2}-\d{2}-/, "")}/`);

/** Status for kursblokken på forsiden, regnet ut fra datoene i front-page.json ved hvert bygg. */
export function courseStatus(k: { start: string; end: string; deadline: string }, now = new Date()) {
  if (now > new Date(k.end)) return { label: "Gjennomført", open: false, done: true };
  if (now > new Date(k.deadline)) return { label: "Påmeldingen er stengt", open: false, done: false };
  return { label: "Påmelding åpen", open: true, done: false };
}

/** Siste møter og referater, med PDF-vedlegg hentet fra attachments-feltet eller fra lenker i teksten. */
export async function getDocuments(count = 5) {
  const posts = (await getPosts()).filter((p) => p.data.categories.includes("Møter og referater"));
  return posts.slice(0, count).map((p) => {
    const inText = [...(p.body ?? "").matchAll(/\]\((\/[^)\s]+\.pdf)\)/gi)].map((m) => m[1]);
    const pdf = p.data.attachments[0]?.file ?? inText[0];
    return { title: p.data.title, date: p.data.date, page: link(p), pdf };
  });
}

/** Arrangementer gruppert på år (nyeste først), til arrangementsoversikten. */
export const eventsByYear = (list: EventPost[]) => {
  const g = new Map<number, EventPost[]>();
  for (const e of list) g.set(e.data.start.getUTCFullYear(), [...(g.get(e.data.start.getUTCFullYear()) ?? []), e]);
  return [...g].sort((a, b) => b[0] - a[0]);
};
export const place = (e: EventPost) => e.data.location ?? (e.data.online ? "Digitalt" : "");
export const group = (e: EventPost) => groupFor(e.data.type).slug;
export const time = (e: EventPost) => (e.data.allDay ? "Hele dagen" : `kl. ${formatClock(e.data.start)}`);
