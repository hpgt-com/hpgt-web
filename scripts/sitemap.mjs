// Lager dist/sitemap.xml etter bygget: alle publiserte HTML-sider på begge språk, så søkemotorer finner alt.
// Hopper over 404-siden og videresendingssidene (de med <meta http-equiv="refresh">), som ikke er egne sider.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const ROT = new URL("../", import.meta.url).pathname;
const DIST = join(ROT, "dist");
const site = JSON.parse(await readFile(join(ROT, "src/data/site.json"), "utf-8"));

async function* html(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* html(p);
    else if (e.name === "index.html") yield p;
  }
}

const adresser = [];
for await (const f of html(DIST)) {
  const s = await readFile(f, "utf-8");
  if (/<meta[^>]+http-equiv=["']?refresh/i.test(s)) continue;
  const dir = relative(DIST, f).split(sep).slice(0, -1).join("/");
  if (dir === "404") continue;
  adresser.push(new URL(dir ? `/${dir}/` : "/", site.url).href);
}
adresser.sort();

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${adresser.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n")}
</urlset>
`;
await writeFile(join(DIST, "sitemap.xml"), xml);
console.log(`sitemap: ${adresser.length} sider i dist/sitemap.xml`);
