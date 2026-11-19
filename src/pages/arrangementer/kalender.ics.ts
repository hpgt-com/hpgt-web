// Kalenderabonnement: alle arrangementer som iCalendar (/arrangementer/kalender.ics). Legges inn i Google-, Apple- eller
// Outlook-kalenderen som abonnement, så nye og endrede arrangementer kommer av seg selv (kalenderen henter fila jevnlig).
// Datoene i innleggene er lokal tid (Norge), lagret uten tidssone og lest som UTC (se src/lib/site.ts); her får de
// TZID=Europe/Oslo. Arrangementer eldre enn ett år tas ikke med.
import { hentArrangementer, lenke, site, utdrag, type Arrangement } from "../../lib/site";

const tekst = (s = "") => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Linjer over 75 byte brytes (RFC 5545 3.1), uten å dele et tegn i to
function brett(linje: string) {
  const ut: string[] = [];
  let del = "", bytes = 0;
  for (const tegn of linje) {
    const n = Buffer.byteLength(tegn);
    if (bytes + n > (ut.length ? 74 : 75)) { ut.push(del); del = ""; bytes = 0; }
    del += tegn; bytes += n;
  }
  ut.push(del);
  return ut.join("\r\n ");
}
const lokal = (d: Date) => d.toISOString().slice(0, 19).replace(/[-:]/g, "");
const dag = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const nesteDag = (d: Date) => dag(new Date(+d + 86400000));
const naa = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

function hendelse(e: Arrangement) {
  const { start, slutt, heldag, sted, digital, type } = e.data;
  const url = new URL(lenke(e), site.url).href;
  const beskrivelse = [e.data.ingress ?? utdrag(e.body, 300), digital && `Nettmøte: ${digital}`, url].filter(Boolean).join("\n\n");
  const linjer = [
    "BEGIN:VEVENT",
    `UID:${e.id.replace(/[^\w-]/g, "-")}@hpgt.com`,
    `DTSTAMP:${naa}`,
    ...(heldag
      ? [`DTSTART;VALUE=DATE:${dag(start)}`, `DTEND;VALUE=DATE:${nesteDag(slutt ?? start)}`]
      : [`DTSTART;TZID=Europe/Oslo:${lokal(start)}`, `DTEND;TZID=Europe/Oslo:${lokal(slutt ?? new Date(+start + 2 * 3600000))}`]),
    `SUMMARY:${tekst(e.data.title)}`,
    `DESCRIPTION:${tekst(beskrivelse)}`,
    ...(sted || digital ? [`LOCATION:${tekst(sted ?? "Digitalt")}`] : []),
    `CATEGORIES:${tekst(type.replace(" / ", ","))}`,
    `URL:${url}`,
    "END:VEVENT",
  ];
  return linjer;
}

export async function GET() {
  const { kommende, tidligere } = await hentArrangementer();
  const ettAar = Date.now() - 365 * 86400000;
  const alle = [...tidligere.filter((e) => +(e.data.slutt ?? e.data.start) > ettAar).reverse(), ...kommende];
  const linjer = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HPGT//hpgt.com//NO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${tekst(site.kortnavn)} – arrangementer`, "X-WR-TIMEZONE:Europe/Oslo", "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    // Norsk tid: sommertid fra siste søndag i mars, vintertid fra siste søndag i oktober
    "BEGIN:VTIMEZONE", "TZID:Europe/Oslo",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
    ...alle.flatMap(hendelse),
    "END:VCALENDAR",
  ];
  return new Response(linjer.map(brett).join("\r\n") + "\r\n", { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
}
