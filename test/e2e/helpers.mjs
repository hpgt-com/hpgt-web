// Felles oppsett for ende-til-ende-testene: den bygde siden fra scripts/serve-dist.mjs (samme hoder, videresendinger og
// Worker som i drift) og Chromium fra Playwright. Alle andre verter blokkeres, både i nettleseren (route.abort og
// navneoppslag som alltid feiler) og for Workeren (serve-dist.mjs), så testene trenger ikke nett.
// CHROMIUM_PATH: en Chromium/Chrome som allerede er installert (på GitHubs runnere Chrome), som i de andre sjekkene.
import { chromium, devices } from "playwright";
import { startServer } from "../../scripts/serve-dist.mjs";

export const DESKTOP = { viewport: { width: 1280, height: 900 } };
export const MOBILE = { ...devices["Pixel 7"] };

// Starter serveren og nettleseren. Gir { origin, browser, newContext, close }.
export async function setup() {
  const server = await startServer();
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    // Ingen vertsnavn kan slås opp, så heller ikke forespørsler som ikke går via route (f.eks. CSP-rapportene til
    // https://hpgt.com/api/csp-report) når nettet.
    args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"],
  });
  const { origin } = server;

  // Ny nettleserkontekst der alt utenfor siden blokkeres. blocked: adressene som ble stoppet.
  const newContext = async (options = {}) => {
    const context = await browser.newContext({ ...DESKTOP, ...options });
    context.blocked = [];
    await context.route("**/*", (route) => {
      const url = route.request().url();
      if (new URL(url).origin === origin) return route.continue();
      context.blocked.push(url);
      return route.abort("blockedbyclient");
    });
    // CSP-brudd, også Trusted Types, både håndhevet (Content-Security-Policy, også <meta>) og bare rapportert
    await context.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        window.__cspViolations.push({ directive: e.effectiveDirective, blocked: e.blockedURI, disposition: e.disposition,
          source: e.sourceFile, line: e.lineNumber, sample: e.sample });
      }, true);
    });
    return context;
  };

  const close = async () => {
    await browser.close();
    await server.close();
  };
  return { origin, browser, newContext, close };
}

// Samler feil på en side: unntak i skriptene (pageerror) og feil i konsollen. Lastefeil for eksterne adresser som
// testen selv blokkerte, er forventet og telles ikke. Gir en liste som fylles mens siden brukes.
export function watchErrors(page) {
  const blocked = page.context().blocked ?? [];
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const at = msg.location().url;
    if (blocked.includes(at)) return; // lastefeil for en ekstern adresse testen blokkerte
    // Svar med feilstatus som testen venter (404-siden selv, Workerens 403): page.expectErrorStatus(url)
    if (/the server responded with a status of [45]\d\d/.test(msg.text()) && page.expectErrorStatus?.(at)) return;
    errors.push(`console: ${msg.text()} (${at})`);
  });
  return errors;
}

// CSP-bruddene siden har hatt så langt
export const cspViolations = (page) => page.evaluate(() => window.__cspViolations);

// Laster en side og alle bildene på den, også de med loading=lazy (de settes til eager, så hvert bilde lastes og
// sjekkes mot CSP-en), og venter til alle er ferdige.
export async function load(page, url) {
  const response = await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => { for (const img of document.querySelectorAll("img[loading=lazy]")) img.loading = "eager"; });
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
  return response;
}
