// @ts-check
// HPGT – hpgt.com. Statisk Astro-side; innhold redigeres i Pages CMS (.pages.yml).
// THEME velger design (src/themes/<navn>), BASE/OUT brukes kun for å bygge prototypene side om side.
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { unified } from "@astrojs/markdown-remark";
import rehypeBase from "./src/lib/rehype-base.mjs";

const THEME = process.env.THEME || "fjord";
const BASE = process.env.BASE || "/";

export default defineConfig({
  site: "https://hpgt.com",
  base: BASE,
  outDir: process.env.OUT || "dist",
  trailingSlash: "always",
  redirects: { "/events/": "/arrangementer/", "/nytt/kategori/kurs/": "/nytt/kategori/kurs-og-fagdag/", "/galleri/": "/konkurranser/konkurranse-2014/" },
  build: { format: "directory", inlineStylesheets: "never" },
  markdown: { processor: unified({ rehypePlugins: [[rehypeBase, { base: BASE }]] }) },
  vite: {
    plugins: [tailwindcss()],
    // Ryddige filnavn: siden [...path] ville ellers gitt CSS-filer som heter «_..xxxx.css»
    build: { rollupOptions: { output: { assetFileNames: (a) => `_astro/${(a.names?.[0] ?? a.name ?? "").split(".")[0].replace(/[^\w-]/g, "").replace(/^_+/, "") || "side"}.[hash][extname]` } } },
    resolve: { alias: { "@theme": fileURLToPath(new URL(`./src/themes/${THEME}`, import.meta.url)) } },
  },
});
