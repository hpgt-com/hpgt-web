// Strukturerte data (schema.org, JSON-LD), så søkemotorer kan vise arrangementer med dato og sted, og klubben som
// organisasjon. Lest av Google o.l.; vises ikke på siden. JSON-LD er data, ikke skript, så CSP-en trenger ingen endring.
import { site, excerpt, imageFor } from "./site";

/** Lokal norsk tid lagret som UTC (se site.ts) → ISO-tid med riktig offset (+01:00 eller +02:00). */
export function osloTime(d: Date) {
  const ca = new Date(+d - 3600000); // omtrent riktig øyeblikk; godt nok til å finne sommer- eller vintertid
  const off = new Intl.DateTimeFormat("en", { timeZone: "Europe/Oslo", timeZoneName: "longOffset" })
    .formatToParts(ca).find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  return d.toISOString().slice(0, 19) + (off === "GMT" ? "+00:00" : off.slice(3));
}

const club = () => ({ "@type": "SportsOrganization", name: site.name, alternateName: site.shortName, url: site.url });

/** Event for et innlegg som er et arrangement. url: adressen siden har (norsk eller engelsk). null når arrangementet
 * verken har sted eller nettmøte: Google krever «location», så da sendes ingenting i stedet for data som avvises. */
export function eventLd(e: { id: string; data: any; body?: string }, url: string) {
  const a = e.data.event;
  const date = (d: Date) => (a.allDay ? d.toISOString().slice(0, 10) : osloTime(d));
  const physical = a.location ? { "@type": "Place", name: a.location, address: { "@type": "PostalAddress", addressLocality: a.location, addressCountry: "NO" } } : undefined;
  const online = a.online ? { "@type": "VirtualLocation", url: a.online } : undefined;
  if (!physical && !online) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.data.title,
    // Alltid beskrivelse og bilde (Google: «description» og «image»): ingressen eller starten av teksten, og innleggets
    // bilde, det første bildet i teksten eller klubbens delingsbilde. «offers» (pris) og «performer» står ikke i
    // innleggene, så de utelates heller enn å gjettes.
    description: e.data.lead || excerpt(e.body, 200) || e.data.title,
    startDate: date(a.start),
    ...(a.end && { endDate: date(a.end) }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: `https://schema.org/${physical && online ? "Mixed" : online ? "Online" : "Offline"}EventAttendanceMode`,
    ...((physical || online) && { location: [physical, online].filter(Boolean) }),
    image: [new URL(imageFor(e as any) ?? site.shareImage, site.url).href],
    organizer: a.organizer ? { "@type": "Organization", name: a.organizer } : club(),
    url: new URL(url, site.url).href,
  };
}

/** Klubben som organisasjon (forsiden). */
export const clubLd = () => ({
  "@context": "https://schema.org",
  ...club(),
  logo: new URL("/assets/img/hpgt-logo.png", site.url).href,
  email: site.email.chair,
  sameAs: [site.facebook, site.instagram].filter(Boolean),
  address: { "@type": "PostalAddress", addressLocality: "Harstad", addressCountry: "NO" },
});

/** JSON trygt inne i <script>: «<» kan ikke avslutte taggen. */
export const ldJson = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");
