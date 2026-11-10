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
  redirects: { ...omdirigeringer, "/kurs-2026/": "/kurs/", "/events/": "/arrangementer/", "/nytt/kategori/kurs/": "/nytt/kategori/kurs-og-fagdag/", "/galleri/": "/konkurranser/konkurranse-2014/" },
  build: { format: "directory", inlineStylesheets: "never" },
  markdown: { processor: unified({ rehypePlugins: [[rehypeBase, { base: BASE }]] }) },
  vite: {
    // Ryddige filnavn: siden [...path] ville ellers gitt CSS-filer som heter «_..xxxx.css»
    build: { rollupOptions: { output: { assetFileNames: (a) => `_astro/${(a.names?.[0] ?? a.name ?? "").split(".")[0].replace(/[^\w-]/g, "").replace(/^_+/, "") || "side"}.[hash][extname]` } } },
    resolve: { alias: { "@design": fileURLToPath(new URL("./src/design", import.meta.url)) } },
  },
});
