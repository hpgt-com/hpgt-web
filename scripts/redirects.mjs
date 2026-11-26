// Skriver videresendingene fra src/lib/redirects.mjs som ekte 301-videresendinger øverst i dist/_redirects, etter at
// Astro har bygget sidene. Astro lager bare en side med meta refresh, noindex og canonical for hver av dem, som Google
// rapporterer som «Ekskludert med en noindex-tag» i stedet for å flytte treffene til den nye adressen. Med 301 fra
// Cloudflare flyttes de. Sidene fra Astro blir liggende, for forhåndsvisningen (BASE), som ikke bruker _redirects.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { redirects } from "../src/lib/redirects.mjs";

const out = process.env.OUT || "dist";
if (process.env.BASE && process.env.BASE !== "/") {
  console.log("redirects: forhåndsvisning (BASE), _redirects endres ikke");
  process.exit(0);
}
const file = join(out, "_redirects");
const existing = readFileSync(file, "utf8");
const lines = Object.entries(redirects).map(([from, to]) => {
  if (/\s/.test(from) || /\s/.test(to)) throw new Error(`Mellomrom i videresendingen ${from} → ${to}`);
  return `${from} ${to} 301`;
});
// De faste adressene først: Cloudflare bruker den første regelen som passer, og reglene med * står i public/_redirects
writeFileSync(file, `# Fra src/lib/redirects.mjs (scripts/redirects.mjs)\n${lines.join("\n")}\n\n${existing}`);
console.log(`redirects: ${lines.length} videresendinger lagt i ${file}`);
