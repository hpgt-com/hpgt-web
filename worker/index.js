// Den eneste serverkoden på hpgt.com: tar imot skjemaene (RadioID og «Meld feil») og lager en GitHub-issue, og tar imot
// CSP-rapporter (/api/csp-report, csp-report.js).
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
//
// Feltnavnene i skjemaene (handling, navn, radioid, utstyr, kommentar, side, melding, kontakt, nettside) og
// ?sprak=en er en del av skjemaenes HTML og adresser, og beholdes som de er.

import { installationToken, HEADERS } from "./github-app.js";
import { readLimitedBody } from "./body.js";
import { handleCspReport } from "./csp-report.js";

const MAX_BODY_BYTES = 12000;

// Verdiene i skjemafeltet «handling» → teksten i saken
const ACTIONS = { ny: "Legg til", endre: "Endre", fjern: "Fjern" };

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    // Alt utenom skjemaet går til de statiske filene, så ukjente adresser får 404-siden (not_found_handling).
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    // CSP-rapporter fra nettleserne (csp-report.js). Sendes uten CORS, og svaret leses ikke.
    if (pathname === "/api/csp-report") {
      const headers = { allow: "POST", "cache-control": "no-store", "x-content-type-options": "nosniff" };
      if (req.method !== "POST") return new Response(null, { status: 405, headers });
      return new Response(null, { status: await handleCspReport(req, env), headers });
    }
    const handler = FORMS[pathname];
    if (!handler) return respond(404, "Finnes ikke.");
    // Én linje i loggen per kall til et skjema: bare sti og statuskode, aldri IP, nettleser eller innhold
    const res = await formResponse(req, env, handler);
    console.log(`form path=${pathname} status=${res.status}`);
    return res;
  },
};

async function formResponse(req, env, handler) {
    // Svarene vises til den som sender, på sidens språk (?sprak=en fra den engelske siden)
    const m = MESSAGES[new URL(req.url).searchParams.get("sprak") === "en" ? "en" : "nb"];
    if (req.method !== "POST") return respond(405, m.postOnly);
    if (req.headers.get("Origin") !== env.ALLOWED_ORIGIN) return respond(403, m.badOrigin);
    // Avviser tidlig når hodet sier at kroppen er for stor. Den harde grensen gjelder når kroppen leses under.
    if (Number(req.headers.get("Content-Length") || 0) > MAX_BODY_BYTES) return respond(413, m.tooLarge);

    const ip = req.headers.get("CF-Connecting-IP") || "";
    if (env.RATE_LIMIT) {
      const { success } = await env.RATE_LIMIT.limit({ key: ip });
      if (!success) return respond(429, m.tooMany);
    }

    let f;
    try {
      const body = await readLimitedBody(req, MAX_BODY_BYTES);
      if (body === null) return respond(413, m.tooLarge);
      f = await new Response(body, { headers: { "Content-Type": req.headers.get("Content-Type") || "" } }).formData();
    } catch { return respond(400, m.unreadable); }
    if (text(f.get("nettside"), 200)) return respond(200, m.thanks); // honningkrukke: late som alt gikk bra
    return handler(f, env, ip, m);
}

// Turnstile: bare skjemaene våre på hpgt.com godtas, og hvert skjema har sin egen «action»
async function isHuman(f, env, ip, action) {
  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: text(f.get("cf-turnstile-response"), 2048), remoteip: ip }),
  }).then((r) => r.json()).catch(() => ({}));
  return check.success && check.action === action && check.hostname === env.TURNSTILE_HOSTNAME;
}

// Lager saken i det private repoet med appens kortlivede token. Gir false hvis noe feilet.
async function createIssue(env, title, body, label) {
  let token;
  try { token = await installationToken(env, env.GITHUB_REPO); } catch { console.error("form-error stage=token"); return false; }
  const gh = await fetch(`${env.GITHUB_API || "https://api.github.com"}/repos/${env.GITHUB_REPO}/issues`, {
    method: "POST",
    headers: { ...HEADERS, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, labels: [label] }),
  });
  if (!gh.ok) console.error(`form-error stage=github status=${gh.status}`);
  return gh.ok;
}

async function radioId(f, env, ip, m) {

    const action = text(f.get("handling"), 10);
    const name = text(f.get("navn"), 60);
    const id = text(f.get("radioid"), 20).toUpperCase().replace(/^0X/, "").replace(/[\s:.-]/g, "");
    const equipment = text(f.get("utstyr"), 60);
    const comment = text(f.get("kommentar"), 500);
    if (!ACTIONS[action] || !name || !/^[0-9A-F]{6}$/.test(id)) return respond(400, "Sjekk navn og RadioID (6 tegn, 0–9 og A–F).");
    if (!(await isHuman(f, env, ip, "radioid"))) return respond(403, m.notHuman);

    const rows = [["Handling", ACTIONS[action]], ["Navn", name], ["RadioID", id], ["Vario / utstyr", equipment || "–"]];
    const body = [
      "Innmelding fra skjemaet på hpgt.com/for-piloter/radioid/.",
      "",
      "| Felt | Verdi |", "|---|---|",
      ...rows.map(([k, v]) => `| ${k} | ${md(v)} |`),
      ...(comment ? ["", "**Kommentar:**", "", "> " + md(comment).replace(/\n/g, "\n> ")] : []),
      "",
      "_Oppdater RadioID-registeret i CMS-et og lukk saken._",
    ].join("\n");

    if (!(await createIssue(env, `RadioID: ${ACTIONS[action].toLowerCase()} ${name} (${id})`, body, "radioid"))) return respond(502, m.failed);
    return respond(201, "Takk! Innmeldingen er mottatt, og listen oppdateres så snart den er behandlet.");
}

// «Meld feil»: hvilken side (en sti på hpgt.com), hva som er feil, og valgfritt navn/e-post for svar
async function reportError(f, env, ip, m) {
  const s = text(f.get("side"), 200);
  const page = /^\/[A-Za-z0-9\/._~%-]*$/.test(s) ? s : "";
  const message = text(f.get("melding"), 2000);
  const contact = text(f.get("kontakt"), 100);
  if (message.length < 5) return respond(400, m.messageMissing);
  if (!(await isHuman(f, env, ip, "meldfeil"))) return respond(403, m.notHuman);

  const summary = message.replace(/\s+/g, " ").slice(0, 60);
  const body = [
    `Meldt via skjemaet på hpgt.com${m === MESSAGES.en ? "/en/report-error/" : "/meld-feil/"}.`,
    "",
    // Stien er sjekket over (bare tegn som er gyldige i en adresse), så den kan stå som lenke
    `**Side:** ${page ? `https://hpgt.com${page}` : "– (ikke oppgitt)"}`,
    `**Kontakt:** ${contact ? md(contact) : "– (ønsker ikke svar)"}`,
    "",
    "**Melding:**",
    "",
    "> " + md(message).replace(/\n/g, "\n> "),
    "",
    "_Rett opp i Pages CMS (eller med en pull request), svar eventuelt den som meldte, og lukk saken._",
  ].join("\n");
  if (!(await createIssue(env, `Feil/mangel${page ? ` på ${page}` : ""}: ${summary}${message.length > 60 ? " …" : ""}`, body, "feedback"))) return respond(502, m.failed);
  return respond(201, m.thanksReport);
}

// Adressene er en del av skjemaenes HTML (action), og beholdes
const FORMS = { "/api/radioid": radioId, "/api/meld-feil": reportError };
const MESSAGES = {
  nb: { postOnly: "Bare POST er tillatt.", badOrigin: "Ugyldig opprinnelse.", tooLarge: "For stor forespørsel.", tooMany: "For mange innsendinger. Prøv igjen om litt.",
    unreadable: "Kunne ikke lese skjemaet.", thanks: "Takk!", notHuman: "Kunne ikke bekrefte at du er et menneske. Last siden på nytt og prøv igjen.",
    failed: "Noe gikk galt hos oss. Prøv igjen senere.", messageMissing: "Skriv litt om hva som er feil eller mangler.",
    thanksReport: "Takk! Meldingen er mottatt og blir sett på." },
  en: { postOnly: "Only POST is allowed.", badOrigin: "Invalid origin.", tooLarge: "Request too large.", tooMany: "Too many submissions. Please try again shortly.",
    unreadable: "Could not read the form.", thanks: "Thank you!", notHuman: "Could not confirm that you are human. Reload the page and try again.",
    failed: "Something went wrong on our side. Please try again later.", messageMissing: "Please write a little about what is wrong or missing.",
    thanksReport: "Thank you! Your message has been received and will be looked at." },
};

const text = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max) : "");
// Hindrer at innsendt tekst blir lenker, @-varsler, bilder eller tabellbrudd i issuen
const md = (s) => s.replace(/[\\`*_{}\[\]<>()#+!|@~]/g, "\\$&").replace(/(https?):\/\//gi, "$1:\\/\\/");
const respond = (status, message) =>
  new Response(JSON.stringify({ ok: status < 300, message }), {
    status,
    // _headers gjelder bare de statiske filene, så workerens svar får sikkerhetshodene her (funnet av OWASP ZAP)
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer", "Cross-Origin-Resource-Policy": "same-origin" },
  });
