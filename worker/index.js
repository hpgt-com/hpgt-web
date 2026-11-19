// Den eneste serverkoden på hpgt.com: tar imot skjemaene (RadioID og «Meld feil») og lager en GitHub-issue.
// Alt annet er statiske filer (wrangler.jsonc sender bare /api/* hit).
//
// Minste privilegium:
//  - Sakene lages av klubbens GitHub-app «HPGT Web Forms» (github-app.js). For hver innsending hentes et token som
//    varer én time, med KUN «Issues: write» på ETT repo (GITHUB_REPO), det private hpgt-com/form-submissions, så
//    navn, RadioID og kommentarer ikke blir offentlige. Det kan ikke lese kode, endre filer eller
//    publisere noe, og ingen personlig token må fornyes.
//  - Hemmelighetene (TURNSTILE_SECRET, GITHUB_APP_PRIVATE_KEY) ligger bare i Cloudflare, ikke i repoet eller i GitHub.
//  - Turnstile + opprinnelsessjekk + hastighetsgrense + honningkrukke stopper roboter og misbruk.
//  - RadioID: vi tar bare imot det som uansett vises i den offentlige listen (navn, RadioID, vario).
//  - Meld feil: hvilken side, hva som er feil og eventuelt hvordan vi kan svare (valgfritt). Etikett «feedback».

import { installasjonsToken, HEADERS } from "./github-app.js";

const HANDLINGER = { ny: "Legg til", endre: "Endre", fjern: "Fjern" };

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    // Alt utenom skjemaet går til de statiske filene, så ukjente adresser får 404-siden (not_found_handling).
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    const skjema = SKJEMAER[pathname];
    if (!skjema) return svar(404, "Finnes ikke.");
    // Svarene vises til den som sender, på sidens språk (?sprak=en fra den engelske siden)
    const m = M[new URL(req.url).searchParams.get("sprak") === "en" ? "en" : "nb"];
    if (req.method !== "POST") return svar(405, m.post);
    if (req.headers.get("Origin") !== env.TILLATT_OPPRINNELSE) return svar(403, m.opprinnelse);
    if (Number(req.headers.get("Content-Length") || 0) > 12000) return svar(413, m.stor);

    const ip = req.headers.get("CF-Connecting-IP") || "";
    if (env.BEGRENS) {
      const { success } = await env.BEGRENS.limit({ key: ip });
      if (!success) return svar(429, m.mange);
    }

    let f;
    try { f = await req.formData(); } catch { return svar(400, m.lese); }
    if (tekst(f.get("nettside"), 200)) return svar(200, m.takk); // honningkrukke: late som alt gikk bra
    return skjema(f, env, ip, m);
  },
};

// Turnstile: bare skjemaene våre på hpgt.com godtas, og hvert skjema har sin egen «action»
async function menneske(f, env, ip, action) {
  const sjekk = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: tekst(f.get("cf-turnstile-response"), 2048), remoteip: ip }),
  }).then((r) => r.json()).catch(() => ({}));
  return sjekk.success && sjekk.action === action && sjekk.hostname === env.TURNSTILE_HOSTNAME;
}

// Lager saken i det private repoet med appens kortlivede token. Gir false hvis noe feilet.
async function lagSak(env, title, body, label) {
  let token;
  try { token = await installasjonsToken(env, env.GITHUB_REPO); } catch { return false; }
  const gh = await fetch(`${env.GITHUB_API || "https://api.github.com"}/repos/${env.GITHUB_REPO}/issues`, {
    method: "POST",
    headers: { ...HEADERS, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, labels: [label] }),
  });
  return gh.ok;
}

async function radioid(f, env, ip, m) {

    const handling = tekst(f.get("handling"), 10);
    const navn = tekst(f.get("navn"), 60);
    const id = tekst(f.get("radioid"), 20).toUpperCase().replace(/^0X/, "").replace(/[\s:.-]/g, "");
    const utstyr = tekst(f.get("utstyr"), 60);
    const kommentar = tekst(f.get("kommentar"), 500);
    if (!HANDLINGER[handling] || !navn || !/^[0-9A-F]{6}$/.test(id)) return svar(400, "Sjekk navn og RadioID (6 tegn, 0–9 og A–F).");
    if (!(await menneske(f, env, ip, "radioid"))) return svar(403, m.menneske);

    const rader = [["Handling", HANDLINGER[handling]], ["Navn", navn], ["RadioID", id], ["Vario / utstyr", utstyr || "–"]];
    const body = [
      "Innmelding fra skjemaet på hpgt.com/for-piloter/radioid/.",
      "",
      "| Felt | Verdi |", "|---|---|",
      ...rader.map(([k, v]) => `| ${k} | ${md(v)} |`),
      ...(kommentar ? ["", "**Kommentar:**", "", "> " + md(kommentar).replace(/\n/g, "\n> ")] : []),
      "",
      "_Oppdater RadioID-registeret i CMS-et og lukk saken._",
    ].join("\n");

    if (!(await lagSak(env, `RadioID: ${HANDLINGER[handling].toLowerCase()} ${navn} (${id})`, body, "radioid"))) return svar(502, m.feil);
    return svar(201, "Takk! Innmeldingen er mottatt, og listen oppdateres så snart den er behandlet.");
}

// «Meld feil»: hvilken side (en sti på hpgt.com), hva som er feil, og valgfritt navn/e-post for svar
async function meldFeil(f, env, ip, m) {
  const s = tekst(f.get("side"), 200);
  const side = /^\/[A-Za-z0-9\/._~%-]*$/.test(s) ? s : "";
  const melding = tekst(f.get("melding"), 2000);
  const kontakt = tekst(f.get("kontakt"), 100);
  if (melding.length < 5) return svar(400, m.melding);
  if (!(await menneske(f, env, ip, "meldfeil"))) return svar(403, m.menneske);

  const kort = melding.replace(/\s+/g, " ").slice(0, 60);
  const body = [
    `Meldt via skjemaet på hpgt.com${m === M.en ? "/en/report-error/" : "/meld-feil/"}.`,
    "",
    // Stien er sjekket over (bare tegn som er gyldige i en adresse), så den kan stå som lenke
    `**Side:** ${side ? `https://hpgt.com${side}` : "– (ikke oppgitt)"}`,
    `**Kontakt:** ${kontakt ? md(kontakt) : "– (ønsker ikke svar)"}`,
    "",
    "**Melding:**",
    "",
    "> " + md(melding).replace(/\n/g, "\n> "),
    "",
    "_Rett opp i Pages CMS (eller med en pull request), svar eventuelt den som meldte, og lukk saken._",
  ].join("\n");
  if (!(await lagSak(env, `Feil/mangel${side ? ` på ${side}` : ""}: ${kort}${melding.length > 60 ? " …" : ""}`, body, "feedback"))) return svar(502, m.feil);
  return svar(201, m.takkFeil);
}

const SKJEMAER = { "/api/radioid": radioid, "/api/meld-feil": meldFeil };
const M = {
  nb: { post: "Bare POST er tillatt.", opprinnelse: "Ugyldig opprinnelse.", stor: "For stor forespørsel.", mange: "For mange innsendinger. Prøv igjen om litt.",
    lese: "Kunne ikke lese skjemaet.", takk: "Takk!", menneske: "Kunne ikke bekrefte at du er et menneske. Last siden på nytt og prøv igjen.",
    feil: "Noe gikk galt hos oss. Prøv igjen senere.", melding: "Skriv litt om hva som er feil eller mangler.",
    takkFeil: "Takk! Meldingen er mottatt og blir sett på." },
  en: { post: "Only POST is allowed.", opprinnelse: "Invalid origin.", stor: "Request too large.", mange: "Too many submissions. Please try again shortly.",
    lese: "Could not read the form.", takk: "Thank you!", menneske: "Could not confirm that you are human. Reload the page and try again.",
    feil: "Something went wrong on our side. Please try again later.", melding: "Please write a little about what is wrong or missing.",
    takkFeil: "Thank you! Your message has been received and will be looked at." },
};

const tekst = (v, maks) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, maks) : "");
// Hindrer at innsendt tekst blir lenker, @-varsler, bilder eller tabellbrudd i issuen
const md = (s) => s.replace(/[\\`*_{}\[\]<>()#+!|@~]/g, "\\$&").replace(/(https?):\/\//gi, "$1:\\/\\/");
const svar = (status, melding) =>
  new Response(JSON.stringify({ ok: status < 300, melding }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
