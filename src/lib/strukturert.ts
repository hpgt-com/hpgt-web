// Strukturerte data (schema.org, JSON-LD), så søkemotorer kan vise arrangementer med dato og sted, og klubben som
// organisasjon. Lest av Google o.l.; vises ikke på siden. JSON-LD er data, ikke skript, så CSP-en trenger ingen endring.
import { site, utdrag, bildeFor } from "./site";

/** Lokal norsk tid lagret som UTC (se site.ts) → ISO-tid med riktig offset (+01:00 eller +02:00). */
export function osloTid(d: Date) {
  const ca = new Date(+d - 3600000); // omtrent riktig øyeblikk; godt nok til å finne sommer- eller vintertid
  const off = new Intl.DateTimeFormat("en", { timeZone: "Europe/Oslo", timeZoneName: "longOffset" })
    .formatToParts(ca).find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  return d.toISOString().slice(0, 19) + (off === "GMT" ? "+00:00" : off.slice(3));
}

const klubben = () => ({ "@type": "SportsOrganization", name: site.navn, alternateName: site.kortnavn, url: site.url });

/** Event for et innlegg som er et arrangement. url: adressen siden har (norsk eller engelsk). */
export function arrangementLd(e: { id: string; data: any; body?: string }, url: string) {
  const a = e.data.arrangement;
  const dato = (d: Date) => (a.heldag ? d.toISOString().slice(0, 10) : osloTid(d));
  const fysisk = a.sted ? { "@type": "Place", name: a.sted, address: { "@type": "PostalAddress", addressLocality: a.sted, addressCountry: "NO" } } : undefined;
  const nett = a.digital ? { "@type": "VirtualLocation", url: a.digital } : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.data.title,
    // Alltid beskrivelse og bilde (Google: «description» og «image»): ingressen eller starten av teksten, og innleggets
    // bilde, det første bildet i teksten eller klubbens delingsbilde. «offers» (pris) og «performer» står ikke i
    // innleggene, så de utelates heller enn å gjettes.
    description: e.data.ingress || utdrag(e.body, 200) || e.data.title,
    startDate: dato(a.start),
    ...(a.slutt && { endDate: dato(a.slutt) }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: `https://schema.org/${fysisk && nett ? "Mixed" : nett ? "Online" : "Offline"}EventAttendanceMode`,
    ...((fysisk || nett) && { location: [fysisk, nett].filter(Boolean) }),
    image: [new URL(bildeFor(e as any) ?? site.delingsbilde, site.url).href],
    organizer: a.arrangor ? { "@type": "Organization", name: a.arrangor } : klubben(),
    url: new URL(url, site.url).href,
  };
}

/** Klubben som organisasjon (forsiden). */
export const klubbLd = () => ({
  "@context": "https://schema.org",
  ...klubben(),
  logo: new URL("/assets/img/hpgt-logo.png", site.url).href,
  email: site.epost.leder,
  sameAs: [site.facebook, site.instagram].filter(Boolean),
  address: { "@type": "PostalAddress", addressLocality: "Harstad", addressCountry: "NO" },
});

/** JSON trygt inne i <script>: «<» kan ikke avslutte taggen. */
export const ldJson = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");
