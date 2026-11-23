// Kalenderabonnement: alle arrangementer som iCalendar (/arrangementer/kalender.ics). Legges inn i Google-, Apple- eller
// Outlook-kalenderen som abonnement, så nye og endrede arrangementer kommer av seg selv (kalenderen henter fila jevnlig).
// Datoene i innleggene er lokal tid (Norge), lagret uten tidssone og lest som UTC (se src/lib/site.ts); her får de
// TZID=Europe/Oslo. Arrangementer eldre enn ett år tas ikke med.
import { getEvents, link, site, excerpt, type EventPost } from "../../lib/site";

const escape = (s = "") => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Linjer over 75 byte brytes (RFC 5545 3.1), uten å dele et tegn i to
function fold(line: string) {
  const out: string[] = [];
  let part = "", bytes = 0;
  for (const char of line) {
    const n = Buffer.byteLength(char);
    if (bytes + n > (out.length ? 74 : 75)) { out.push(part); part = ""; bytes = 0; }
    part += char; bytes += n;
  }
  out.push(part);
  return out.join("\r\n ");
}
const local = (d: Date) => d.toISOString().slice(0, 19).replace(/[-:]/g, "");
const day = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const nextDay = (d: Date) => day(new Date(+d + 86400000));
const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

function vevent(e: EventPost) {
  const { start, slutt: end, heldag: allDay, sted: place, digital, type } = e.data;
  const url = new URL(link(e), site.url).href;
  const description = [e.data.ingress ?? excerpt(e.body, 300), digital && `Nettmøte: ${digital}`, url].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VEVENT",
    `UID:${e.id.replace(/[^\w-]/g, "-")}@hpgt.com`,
    `DTSTAMP:${now}`,
    ...(allDay
      ? [`DTSTART;VALUE=DATE:${day(start)}`, `DTEND;VALUE=DATE:${nextDay(end ?? start)}`]
      : [`DTSTART;TZID=Europe/Oslo:${local(start)}`, `DTEND;TZID=Europe/Oslo:${local(end ?? new Date(+start + 2 * 3600000))}`]),
    `SUMMARY:${escape(e.data.title)}`,
    `DESCRIPTION:${escape(description)}`,
    ...(place || digital ? [`LOCATION:${escape(place ?? "Digitalt")}`] : []),
    `CATEGORIES:${escape(type.replace(" / ", ","))}`,
    `URL:${url}`,
    "END:VEVENT",
  ];
  return lines;
}

export async function GET() {
  const { upcoming, past } = await getEvents();
  const oneYearAgo = Date.now() - 365 * 86400000;
  const all = [...past.filter((e) => +(e.data.slutt ?? e.data.start) > oneYearAgo).reverse(), ...upcoming];
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HPGT//hpgt.com//NO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(site.kortnavn)} – arrangementer`, "X-WR-TIMEZONE:Europe/Oslo", "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    // Norsk tid: sommertid fra siste søndag i mars, vintertid fra siste søndag i oktober
    "BEGIN:VTIMEZONE", "TZID:Europe/Oslo",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE",
    ...all.flatMap(vevent),
    "END:VCALENDAR",
  ];
  return new Response(lines.map(fold).join("\r\n") + "\r\n", { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
}
