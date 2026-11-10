// Den eneste serverkoden på hpgt.com: tar imot RadioID-skjemaet og lager en GitHub-issue.
// Alt annet er statiske filer (wrangler.jsonc sender bare /api/* hit).
//
// Minste privilegium:
//  - GITHUB_TOKEN er et fine-grained token med KUN «Issues: Read and write» på ETT repo (GITHUB_REPO).
//    Det kan ikke lese kode, endre filer eller publisere noe.
//  - Hemmelighetene legges inn én gang med «wrangler secret put» og finnes ikke i repoet eller i GitHub Actions.
//  - Turnstile + opprinnelsessjekk + hastighetsgrense + honningkrukke stopper roboter og misbruk.
//  - Vi tar bare imot det som uansett vises i den offentlige listen (navn, RadioID, vario).

const HANDLINGER = { ny: "Legg til", endre: "Endre", fjern: "Fjern" };

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    // Alt utenom skjemaet går til de statiske filene, så ukjente adresser får 404-siden (not_found_handling).
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (pathname !== "/api/radioid") return svar(404, "Finnes ikke.");
    if (req.method !== "POST") return svar(405, "Bare POST er tillatt.");
    if (req.headers.get("Origin") !== env.TILLATT_OPPRINNELSE) return svar(403, "Ugyldig opprinnelse.");
    if (Number(req.headers.get("Content-Length") || 0) > 4000) return svar(413, "For stor forespørsel.");

    const ip = req.headers.get("CF-Connecting-IP") || "";
    if (env.BEGRENS) {
      const { success } = await env.BEGRENS.limit({ key: ip });
      if (!success) return svar(429, "For mange innsendinger. Prøv igjen om litt.");
    }

    let f;
    try { f = await req.formData(); } catch { return svar(400, "Kunne ikke lese skjemaet."); }
    if (tekst(f.get("nettside"), 200)) return svar(200, "Takk!"); // honningkrukke: late som alt gikk bra

    const handling = tekst(f.get("handling"), 10);
    const navn = tekst(f.get("navn"), 60);
    const id = tekst(f.get("radioid"), 20).toUpperCase().replace(/^0X/, "").replace(/[\s:.-]/g, "");
    const utstyr = tekst(f.get("utstyr"), 60);
    const kommentar = tekst(f.get("kommentar"), 500);
    if (!HANDLINGER[handling] || !navn || !/^[0-9A-F]{6}$/.test(id)) return svar(400, "Sjekk navn og RadioID (6 tegn, 0–9 og A–F).");

    // Turnstile: bare skjemaet vårt på hpgt.com godtas
    const sjekk = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: tekst(f.get("cf-turnstile-response"), 2048), remoteip: ip }),
    }).then((r) => r.json()).catch(() => ({}));
    if (!sjekk.success || sjekk.action !== "radioid" || sjekk.hostname !== env.TURNSTILE_HOSTNAME) return svar(403, "Kunne ikke bekrefte at du er et menneske. Last siden på nytt og prøv igjen.");

    const rader = [["Handling", HANDLINGER[handling]], ["Navn", navn], ["RadioID", id], ["Vario / utstyr", utstyr || "–"]];
    const body = [
      "Innmelding fra skjemaet på hpgt.com/flysteder/flarm-fanet-radioid/.",
      "",
      "| Felt | Verdi |", "|---|---|",
      ...rader.map(([k, v]) => `| ${k} | ${md(v)} |`),
      ...(kommentar ? ["", "**Kommentar:**", "", "> " + md(kommentar).replace(/\n/g, "\n> ")] : []),
      "",
      "_Oppdater RadioID-registeret i CMS-et og lukk saken._",
    ].join("\n");

    const gh = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "hpgt-web-skjema",
      },
      body: JSON.stringify({ title: `RadioID: ${HANDLINGER[handling].toLowerCase()} ${navn} (${id})`, body, labels: ["radioid"] }),
    });
    if (!gh.ok) return svar(502, "Noe gikk galt hos oss. Prøv igjen senere.");
    return svar(201, "Takk! Innmeldingen er mottatt, og listen oppdateres så snart den er behandlet.");
  },
};

const tekst = (v, maks) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, maks) : "");
// Hindrer at innsendt tekst blir lenker, @-varsler, bilder eller tabellbrudd i issuen
const md = (s) => s.replace(/[\\`*_{}\[\]<>()#+!|@~]/g, "\\$&").replace(/(https?):\/\//gi, "$1:\\/\\/");
const svar = (status, melding) =>
  new Response(JSON.stringify({ ok: status < 300, melding }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
