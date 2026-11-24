// Innholdsmodell. Skjemaene validerer alt som kommer fra CMS-et – feil i et felt stopper bygget i stedet for å publisere en ødelagt side.
import { defineCollection } from "astro:content";
import { glob, file } from "astro/loaders";
import { z } from "astro/zod";

const permalink = z.string().regex(/^\/.*\/$/, "Må starte og slutte med /").optional();
// Tomme felt fra CMS-et ("") regnes som ikke utfylt
const empty = (v: unknown) => (v === "" || v === null ? undefined : v);
// Faste typer «Gruppe / Type». Gruppen (før /) brukes til filter og farge i kalenderen.
// Kurs klubben har kjørt eller har instruktør til (PP2, SPG2, PPG3, SIV). Navn etter NLFs utdanningsprogrammer.
export const EVENT_TYPES = [
  "Kurs / PP2", "Kurs / SPG2", "Kurs / PPG3", "Kurs / SIV", "Kurs / Prøvedag", "Kurs / Annet kurs",
  "Fagdag / Nødskjerm og vingesjekk", "Fagdag / Sikkerhetsseminar", "Fagdag / Annen fagdag",
  "Møte / Årsmøte", "Møte / Klubbmøte", "Møte / Styremøte",
  "Sosialt / Julebord", "Sosialt / Afterflight", "Sosialt / Kickoff", "Sosialt / Tur",
  "Konkurranse / Cup og stevne", "Konkurranse / Foto og video", "Konkurranse / Annen konkurranse",
] as const;
/** Et innlegg blir et arrangement (vises i kalenderen) når start er fylt ut. */
const eventFields = z.object({
  start: z.preprocess(empty, z.coerce.date().optional()),
  end: z.preprocess(empty, z.coerce.date().optional()),
  allDay: z.preprocess(empty, z.boolean().default(false)),
  type: z.preprocess(empty, z.enum(EVENT_TYPES, { message: "Velg en type fra listen" })),
  location: z.preprocess(empty, z.string().optional()),
  online: z.preprocess(empty, z.string().url("Må være en full lenke (https://…)").optional()),
  signup: z.preprocess(empty, z.string().optional()),
  // Tomt = HPGT. Brukes når medlemmer inviteres til noe andre arrangerer (f.eks. SIV i Narvik, NorgesCup).
  organizer: z.preprocess(empty, z.string().optional()),
}).optional();

const postSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  categories: z.array(z.string()).default(["Nyhet"]),
  image: z.string().optional(),
  author: z.string().optional(),
  lead: z.string().optional(),
  attachments: z.array(z.object({ title: z.string(), file: z.string() })).default([]),
  permalink,
  draft: z.boolean().default(false),
  wp_id: z.number().optional(),
  event: eventFields,
});
const posts = defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }), schema: postSchema });

const pageSchema = z.object({
  title: z.string(),
  permalink,
  lead: z.string().optional(),
  image: z.string().optional(),
  template: z.enum(["standard", "kontakt", "radioid", "kurs", "seksjon", "bidra", "konkurranser"]).default("standard"),
  // Konkurransesider (src/content/pages/konkurranser/ÅR.md): år og vinnere vises i oversikten på /klubben/konkurranser/
  year: z.preprocess(empty, z.coerce.number().optional()),
  winnerPhoto: z.preprocess(empty, z.string().optional()),
  winnerVideo: z.preprocess(empty, z.string().optional()),
  updated: z.coerce.date().optional(),
  wp_id: z.number().optional(),
});
const pages = defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }), schema: pageSchema });

// Kurssidene (/kurs/<filnavn>/). Vises i kursmenyen øverst på alle kurssider, sortert etter «menuOrder».
const courseSchema = z.object({
  title: z.string(),
  menuTitle: z.preprocess(empty, z.string().optional()),
  lead: z.preprocess(empty, z.string().optional()),
  image: z.preprocess(empty, z.string().optional()),
  // Kommende datoer på kurssiden hentes fra arrangementer med denne typen
  courseType: z.preprocess(empty, z.enum(EVENT_TYPES).optional()),
  menuOrder: z.preprocess(empty, z.coerce.number().default(50)),
  updated: z.preprocess(empty, z.coerce.date().optional()),
});
const courses = defineCollection({ loader: glob({ pattern: "*.md", base: "./src/content/courses" }), schema: courseSchema });

// Engelske versjoner, laget automatisk av scripts/translate/translate.mjs før bygget (mappa .translated er ikke i git)
const pagesEn = defineCollection({ loader: glob({ pattern: "*.md", base: "./.translated/pages" }), schema: pageSchema });
const coursesEn = defineCollection({ loader: glob({ pattern: "*.md", base: "./.translated/courses" }), schema: courseSchema });
// Innleggene på engelsk har samme id som de norske, og permalink er den engelske adressen (/en/…)
const postsEn = defineCollection({ loader: glob({ pattern: "**/*.md", base: "./.translated/posts" }), schema: postSchema });

const board = defineCollection({
  loader: file("./src/data/board.json", { parser: (t) => JSON.parse(t).members }),
  schema: z.object({ role: z.string(), name: z.string(), phone: z.string().optional(), email: z.string().optional(), image: z.string().optional() }),
});

// Sponsorene nederst på alle sidene (Sponsors.astro). Rekkefølgen i filen er rekkefølgen på siden; id-en er plassen.
// «until» er siste dag logoen vises (tom = uten sluttdato). Logoen må ligge på siden selv (CSP: img-src 'self').
const sponsors = defineCollection({
  loader: file("./src/data/sponsors.json", { parser: (t) => Object.fromEntries(JSON.parse(t).sponsors.map((s: object, i: number) => [String(i).padStart(3, "0"), s])) }),
  schema: z.object({
    name: z.string().min(1),
    logo: z.string().regex(/^\/media\/sponsors\/[^/]+\.(svg|png|webp|jpe?g)$/i, "Logoen må ligge i public/media/sponsors/"),
    url: z.string().url().startsWith("https://"),
    until: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  }),
});

// Navnene på samlingene er de samme som mappene i src/content/ (og navnene i .pages.yml).
export const collections = { posts, pages, courses, pages_en: pagesEn, courses_en: coursesEn, posts_en: postsEn, board, sponsors };
