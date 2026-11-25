# Sikkerhet

## Rapportere et sikkerhetsproblem

Ikke opprett en offentlig issue. Bruk **Report a vulnerability** under fanen **Security** i dette repoet, så bare
vedlikeholderne ser rapporten. Beskriv hva du fant, hvordan det kan gjenskapes, og hva det påvirker. Vi svarer så
fort vi kan, men dette er et frivillig klubbprosjekt. De samme kontaktene står i
https://hpgt.com/.well-known/security.txt.

Rapporten kan skrives på norsk eller engelsk.

## Dette er på plass

- Alle endringer på `main` går via pull request (regelsettet «Main protection»). Force push og sletting av `main` er
  blokkert.
- Påkrevde sjekker: `dependency-review` (ingen avhengigheter med kjente sårbarheter), `workflow-security` (zizmor) og
  `build` (hele siden bygger, og alle innholdsfilene er gyldige), pluss kodeskanning med CodeQL (high eller høyere
  stopper merge).
- Actions er låst til commit-SHA og oppdateres månedlig av Dependabot, med en ventetid på 7 dager (30 for hovedversjoner
  der økosystemet støtter det). Patch- og minor-oppdateringer av Actions og npm-pakker (også Wrangler) merges automatisk
  når alle påkrevde sjekker er grønne (`dependabot-automerge.yml`). npm merges med et token fra GitHub-appen «HPGT Web
  Dependabot», så merge starter publiseringen. Nøkkelen ligger i miljøet `automerge`, som bare tillater `main`.
  Major-oppdateringer merges for hånd.
- Arbeidsflyter har bare lesetilgang som standard, og jobber ber om mer bare når de trenger det.
  `persist-credentials: false` på hver checkout.
- Hemmeligheter ligger i GitHub-miljøer som bare tillater `main`, aldri i koden. `.gitignore` blokkerer `.env` og
  nøkkelfiler.
- Secret scanning med push protection, Dependabot-varsler og sikkerhetsoppdateringer er slått på.

## Dette repoet

- **Hva som publiseres:** hpgt.com, en statisk Astro-side, på Cloudflare Workers (statiske filer). Den eneste
  serverkoden er `worker/index.js`, som gjør skjemaene (RadioID og «Meld feil») om til GitHub-issues i et privat repo.
- **Hvem som redigerer:** klubbmedlemmer via Pages CMS. GitHub-appen til Pages CMS er bare installert på dette repoet,
  og samarbeidspartnere med e-post kan redigere innhold og medier, ikke kode, arbeidsflyter eller innstillinger
  (`.pages.yml`).
- **Nøkler:**
  - `CLOUDFLARE_API_TOKEN` og `CLOUDFLARE_ACCOUNT_ID` i miljøet `production` (bare main). Tokenet er et kontotoken
    laget fra Workeren (Workers & Pages → hpgt-web → Settings → Builds → «API token for external CI/CD») og kan bare
    publisere Workeren `hpgt-web`: ingen andre Workere, ikke DNS, domener eller andre kontoinnstillinger. Det tilhører
    klubbens konto, ikke en person, og fornyes hvert år. Bare jobben `publish` bruker det, og den jobben kjører ingen
    kode fra repoet.
  - `TURNSTILE_SECRET` og `GITHUB_APP_PRIVATE_KEY` for skjemaet er Cloudflare-secrets, ikke GitHub-secrets. Issuene
    lages av klubbens GitHub-app «HPGT Web Forms» i det private repoet `hpgt-com/form-submissions` (appen er bare
    installert der, med bare «Issues: Read and write»). For hver innsending ber Workeren om et token som varer én
    time, begrenset til det repoet og Issues: write (`worker/github-app.js`), så det finnes ikke noe personlig eller
    langvarig token.
  - `TURNSTILE_SITEKEY`, `GH_APP_ID` og `GH_APP_INSTALLATION_ID` er ikke hemmelige. De er variabler i `production`,
    som sjekkes og settes inn av jobben `publish`. Andre bygg bruker testnøkkelen til Cloudflare Turnstile.
- **Redaktører:** appen Pages CMS kan lagre rett til `main` (unntak i regelsettet). Den første jobben i
  publiseringen (`guard`) stopper publiseringen og oppretter en issue hvis en commit som ikke kom fra en merget pull
  request, endrer noe annet enn innholdet (`src/content/`, `public/media/` og JSON-filene til CMS-et). Bygget
  (`scripts/check-media.mjs`) stopper hvis `public/media/` inneholder noe annet enn bilder og PDF-er, så en
  opplasting ikke kan legge en HTML-side eller et skript på hpgt.com.
- **Publisering:** Wrangler er låst til en fast versjon i jobben `publish`, fordi den jobben har Cloudflare-tokenet.
- **Innholdssikkerhet:** streng CSP med `default-src 'none'` og uten `unsafe-inline` (`public/_headers`, og den samme
  policyen som meta-tag i `src/components/Head.astro`), `Cross-Origin-Opener-Policy: same-origin` og
  `Cross-Origin-Resource-Policy: same-site`. Trusted Types håndheves (`require-trusted-types-for 'script'`): sidens
  skript setter aldri HTML eller skriptadresser fra strenger. Brudd rapporteres til
  `/api/csp-report`, som bare logger direktivet, verten som ble blokkert, og stien, aldri IP-adressen eller
  nettleserinfo. Ingen skript fra tredjeparter, bortsett fra Cloudflare Turnstile på skjemasidene og Cloudflare Web
  Analytics. Ingen sporing og ingen informasjonskapsler.
