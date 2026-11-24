// Datoene for sponsorene (src/data/sponsors.json). Brukes av stripen (src/components/Sponsors.astro) og av nattsjekken
// i .github/workflows/deploy.yml. Ingen avhengigheter, så nattsjekken trenger ikke installere noe.
//
//   node scripts/sponsor-dates.mjs [dato]
// skriver «true» hvis sponsorene som vises, er andre i dag enn i går (en sponsor har startet eller gått ut), ellers
// «false». Datoen (ÅÅÅÅ-MM-DD) er for testing; uten den brukes dagens dato.
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/** Dagens dato (ÅÅÅÅ-MM-DD) i norsk tid, så en sponsor starter og slutter ved midnatt her, ikke i UTC. */
export const osloDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo" }).format(d);

/** Vises sponsoren denne dagen? «from» og «until» er første og siste dag (tom = ingen grense). */
export const isActive = (s, day) => (!s.from || s.from <= day) && (!s.until || s.until >= day);

const dayBefore = (day) => new Date(Date.parse(`${day}T12:00:00Z`) - 864e5).toISOString().slice(0, 10);

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const today = process.argv[2] ?? osloDate();
  const yesterday = dayBefore(today);
  const { sponsors = [] } = JSON.parse(await readFile(new URL("../src/data/sponsors.json", import.meta.url), "utf8"));
  const changed = sponsors.filter((s) => isActive(s, today) !== isActive(s, yesterday));
  for (const s of changed) console.error(`${s.name}: ${isActive(s, today) ? "starter" : "slutter"} ${today}`);
  console.log(changed.length > 0 ? "true" : "false");
}
