import { getCollection } from "astro:content";

/** Sponsorene som skal vises nå, i rekkefølgen fra src/data/sponsors.json. «until» er siste dag (tom = uten sluttdato). */
export async function activeSponsors() {
  const today = new Date().toISOString().slice(0, 10);
  return (await getCollection("sponsors"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => s.data)
    .filter((s) => !s.until || s.until >= today);
}
