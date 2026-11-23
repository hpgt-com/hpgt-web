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
  slutt: z.preprocess(empty, z.coerce.date().optional()),
  heldag: z.preprocess(empty, z.boolean().default(false)),
  type: z.preprocess(empty, z.enum(EVENT_TYPES, { message: "Velg en type fra listen" })),
  sted: z.preprocess(empty, z.string().optional()),
  digital: z.preprocess(empty, z.string().url("Må være en full lenke (https://…)").optional()),
  pamelding: z.preprocess(empty, z.string().optional()),
  // Tomt = HPGT. Brukes når medlemmer inviteres til noe andre arrangerer (f.eks. SIV i Narvik, NorgesCup).
  arrangor: z.preprocess(empty, z.string().optional()),
}).optional();

const postSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  kategorier: z.array(z.string()).default(["Nyhet"]),
  bilde: z.string().optional(),
  forfatter: z.string().optional(),
  ingress: z.string().optional(),
  vedlegg: z.array(z.object({ tittel: z.string(), fil: z.string() })).default([]),
  permalink,
  utkast: z.boolean().default(false),
  wp_id: z.number().optional(),
    arrangement: eventFields,
});
const posts = defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/innlegg" }), schema: postSchema });

const pageSchema = z.object({
  title: z.string(),
  permalink,
  ingress: z.string().optional(),
  bilde: z.string().optional(),
  mal: z.enum(["standard", "kontakt", "radioid", "kurs", "seksjon", "bidra", "konkurranser"]).default("standard"),
  // Konkurransesider (src/content/sider/konkurranser/ÅR.md): år og vinnere vises i oversikten på /klubben/konkurranser/
  aar: z.preprocess(empty, z.coerce.number().optional()),
  vinner_foto: z.preprocess(empty, z.string().optional()),
  vinner_video: z.preprocess(empty, z.string().optional()),
  sist_endret: z.coerce.date().optional(),
  wp_id: z.number().optional(),
});
const pages = defineCollection({ loader: glob({ pattern: "**/*.md", base: "./src/content/sider" }), schema: pageSchema });

// Kurssidene (/kurs/<filnavn>/). Vises i kursmenyen øverst på alle kurssider, sortert etter «rekkefolge».
const courseSchema = z.object({
  title: z.string(),
  menynavn: z.preprocess(empty, z.string().optional()),
  ingress: z.preprocess(empty, z.string().optional()),
  bilde: z.preprocess(empty, z.string().optional()),
  // Kommende datoer på kurssiden hentes fra arrangementer med denne typen
  kurstype: z.preprocess(empty, z.enum(EVENT_TYPES).optional()),
  rekkefolge: z.preprocess(empty, z.coerce.number().default(50)),
  sist_endret: z.preprocess(empty, z.coerce.date().optional()),
});
const courses = defineCollection({ loader: glob({ pattern: "*.md", base: "./src/content/kurs" }), schema: courseSchema });

// Engelske versjoner, laget automatisk av scripts/translate/translate.mjs før bygget (mappa .translated er ikke i git)
const pagesEn = defineCollection({ loader: glob({ pattern: "*.md", base: "./.translated/sider" }), schema: pageSchema });
const coursesEn = defineCollection({ loader: glob({ pattern: "*.md", base: "./.translated/kurs" }), schema: courseSchema });
// Innleggene på engelsk har samme id som de norske, og permalink er den engelske adressen (/en/…)
const postsEn = defineCollection({ loader: glob({ pattern: "**/*.md", base: "./.translated/innlegg" }), schema: postSchema });

const board = defineCollection({
  loader: file("./src/data/styret.json", { parser: (t) => JSON.parse(t).medlemmer }),
  schema: z.object({ rolle: z.string(), navn: z.string(), telefon: z.string().optional(), epost: z.string().optional(), bilde: z.string().optional() }),
});

// Navnene på samlingene er de samme som mappene i src/content/ (og i .pages.yml), og beholdes.
export const collections = { innlegg: posts, sider: pages, kurs: courses, sider_en: pagesEn, kurs_en: coursesEn, innlegg_en: postsEn, styret: board };
