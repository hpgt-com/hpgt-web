// Innholdsmodell. Skjemaene validerer alt som kommer fra CMS-et – feil i et felt stopper bygget i stedet for å publisere en ødelagt side.
import { defineCollection } from "astro:content";
import { glob, file } from "astro/loaders";
import { z } from "astro/zod";

const permalink = z.string().regex(/^\/.*\/$/, "Må starte og slutte med /").optional();
// Tomme felt fra CMS-et ("") regnes som ikke utfylt
const tom = (v: unknown) => (v === "" || v === null ? undefined : v);
// Faste typer «Gruppe / Type». Gruppen (før /) brukes til filter og farge i kalenderen.
export const ARRANGEMENTSTYPER = [
  "Kurs / PP2 (nybegynner)", "Kurs / PP3 (videregående)", "Kurs / SPG (speedglider)", "Kurs / PPG (paramotor)", "Kurs / SIV (sikkerhetskurs)", "Kurs / Prøvedag", "Kurs / Annet kurs",
  "Fagdag / Nødskjerm og vingesjekk", "Fagdag / Sikkerhetsseminar", "Fagdag / Annen fagdag",
  "Møte / Årsmøte", "Møte / Klubbmøte", "Møte / Styremøte",
  "Sosialt / Julebord", "Sosialt / Afterflight", "Sosialt / Kickoff", "Sosialt / Tur",
  "Konkurranse / Cup og stevne", "Konkurranse / Foto og video", "Konkurranse / Annen konkurranse",
] as const;
/** Et innlegg blir et arrangement (vises i kalenderen) når start er fylt ut. */
const arrangement = z.object({
  start: z.preprocess(tom, z.coerce.date().optional()),
  slutt: z.preprocess(tom, z.coerce.date().optional()),
  heldag: z.preprocess(tom, z.boolean().default(false)),
  type: z.preprocess(tom, z.enum(ARRANGEMENTSTYPER, { message: "Velg en type fra listen" })),
  sted: z.preprocess(tom, z.string().optional()),
  digital: z.preprocess(tom, z.string().url("Må være en full lenke (https://…)").optional()),
  pamelding: z.preprocess(tom, z.string().optional()),
}).optional();

const innlegg = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/innlegg" }),
  schema: z.object({
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
    arrangement,
  }),
});

const sider = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/sider" }),
  schema: z.object({
    title: z.string(),
    permalink,
    ingress: z.string().optional(),
    bilde: z.string().optional(),
    mal: z.enum(["standard", "kontakt", "radioid", "redaktordemo", "kurs"]).default("standard"),
    sist_endret: z.coerce.date().optional(),
    wp_id: z.number().optional(),
  }),
});

const styret = defineCollection({
  loader: file("./src/data/styret.json", { parser: (t) => JSON.parse(t).medlemmer }),
  schema: z.object({ rolle: z.string(), navn: z.string(), telefon: z.string().optional(), epost: z.string().optional(), bilde: z.string().optional() }),
});

export const collections = { innlegg, sider, styret };
