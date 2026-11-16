// @ts-check
// HPGT – hpgt.com. Statisk Astro-side; innhold redigeres i Pages CMS (.pages.yml).
// Designet ligger i src/design. BASE/OUT brukes bare når forhåndsvisningen bygges (scripts/bygg-forhandsvisning.sh).
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import { unified } from "@astrojs/markdown-remark";
import rehypeBase from "./src/lib/rehype-base.mjs";
import { readFileSync } from "node:fs";

// /event/<navn>/ for arrangementer som ble slått sammen med et innlegg (scripts/wp-import/flett-arrangementer.py)
const omdirigeringer = JSON.parse(readFileSync(new URL("./src/data/omdirigeringer.json", import.meta.url), "utf-8"));

const BASE = process.env.BASE || "/";

export default defineConfig({
  site: "https://hpgt.com",
  base: BASE,
  outDir: process.env.OUT || "dist",
  trailingSlash: "always",
  redirects: { ...omdirigeringer, "/kurs-2026/": "/kurs/", "/events/": "/arrangementer/", "/nytt/kategori/kurs/": "/nytt/kategori/kurs-og-fagdag/", "/galleri/": "/klubben/konkurranser/2014/",
    // «Fly med oss» ble slått sammen med For piloter (samme innhold); RadioID ligger fortsatt under /flysteder/
    "/flysteder/": "/for-piloter/", "/konkurranse-2019/": "/klubben/konkurranser/2019/",
    // Reglene ligger nå på hver konkurranseside
    "/foto-og-video-konkurranse/": "/klubben/konkurranser/2014/#regler", "/papekning-av-reglement/": "/klubben/konkurranser/2014/#regler",
    "/den-store-foto-og-video-konkurransen-2017/": "/klubben/konkurranser/2017/#regler", "/regler-2019/": "/klubben/konkurranser/2019/#regler", "/en/flysteder/": "/en/for-piloter/",
    // Adressene følger menyen (Klubben, For piloter); de gamle fra WordPress videresendes
    "/flysteder/flarm-fanet-radioid/": "/for-piloter/radioid/", "/konkurranser/konkurranse-2014/": "/klubben/konkurranser/2014/", "/konkurranser/konkurranse-2017/": "/klubben/konkurranser/2017/", "/grasrotandelen/": "/klubben/stotte/", "/en/grasrotandelen/": "/en/klubben/stotte/", "/redaktor-demo/": "/klubben/bidra/", "/klubben/redaktor/": "/klubben/bidra/", "/konkurranser/": "/klubben/konkurranser/", "/om-klubben/": "/klubben/styret/", "/en/om-klubben/": "/en/klubben/styret/", "/om-oss/": "/klubben/", "/en/om-oss/": "/en/klubben/", "/lenker/": "/for-piloter/vaer/", "/en/lenker/": "/en/for-piloter/vaer/", "/bidra/": "/klubben/bidra/", "/notam/": "/for-piloter/notam/", "/en/notam/": "/en/for-piloter/notam/" },
  build: { format: "directory", inlineStylesheets: "never" },
  // Ingen syntaksfarger: Shiki legger fargene i style-attributter, som den strenge CSP-en blokkerer.
  // Kodeblokker (f.eks. NOTAM-malen) styles i stedet av .prose pre i designet.
  markdown: { syntaxHighlight: false, processor: unified({ rehypePlugins: [[rehypeBase, { base: BASE }]] }) },
  vite: {
    // Ryddige filnavn: siden [...path] ville ellers gitt CSS-filer som heter «_..xxxx.css»
    build: { rollupOptions: { output: { assetFileNames: (a) => `_astro/${(a.names?.[0] ?? a.name ?? "").split(".")[0].replace(/[^\w-]/g, "").replace(/^_+/, "") || "side"}.[hash][extname]` } } },
    resolve: { alias: { "@design": fileURLToPath(new URL("./src/design", import.meta.url)) } },
  },
});
