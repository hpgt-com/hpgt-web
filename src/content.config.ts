// Innholdsmodell. Skjemaene validerer alt som kommer fra CMS-et – feil i et felt stopper bygget i stedet for å publisere en ødelagt side.
import { defineCollection } from "astro:content";
import { glob, file } from "astro/loaders";
import { z } from "astro/zod";

const permalink = z.string().regex(/^\/.*\/$/, "Må starte og slutte med /").optional();

const innlegg = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/innlegg" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kategorier: z.array(z.string()).default(["Nyhet"]),
    bilde: z.string().optional(),
    ingress: z.string().optional(),
    vedlegg: z.array(z.object({ tittel: z.string(), fil: z.string() })).default([]),
    permalink,
    utkast: z.boolean().default(false),
    wp_id: z.number().optional(),
  }),
});

const sider = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/sider" }),
  schema: z.object({
    title: z.string(),
    permalink,
    ingress: z.string().optional(),
    bilde: z.string().optional(),
    mal: z.enum(["standard", "kontakt", "radioid", "redaktordemo"]).default("standard"),
    sist_endret: z.coerce.date().optional(),
    wp_id: z.number().optional(),
  }),
});

const arrangementer = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/arrangementer" }),
  schema: z.object({
    title: z.string(),
    start: z.coerce.date(),
    slutt: z.coerce.date().optional(),
    heldag: z.boolean().default(false),
    sted: z.string().optional(),
    permalink,
    wp_id: z.number().optional(),
  }),
});

const styret = defineCollection({
  loader: file("./src/data/styret.json", { parser: (t) => JSON.parse(t).medlemmer }),
  schema: z.object({ rolle: z.string(), navn: z.string(), telefon: z.string().optional(), epost: z.string().optional(), bilde: z.string().optional() }),
});

export const collections = { innlegg, sider, arrangementer, styret };
