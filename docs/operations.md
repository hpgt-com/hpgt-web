# Drift: kontoer, hemmeligheter og rutiner

Driftshåndboken for hpgt.com. Den skal gjøre det mulig for en ny administrator å ta over uten å spørre den forrige.
Hvordan nettstedet henger sammen, står i [architecture.md](architecture.md), og hvorfor det er bygd slik, i
[decisions/](decisions/README.md).

**Regel:** endres oppsett, kontoer eller nøkler, oppdateres denne filen i samme pull request (eller i en egen pull
request samme dag, hvis endringen ble gjort i et dashbord).

## Hvor endres hva?

| Innstilling | Hvor |
|---|---|
| Adresse, e-postadresser, org.nr., Vipps, Facebook og Instagram, lenken til flysteder, statussiden (`statusPage`) | `src/data/site.json` |
| Forhåndsvisningsmodus (`prototype`), standardbildet for deling (`shareImage`), tokenet for Web Analytics (`webAnalytics`), adressen til GoatCounter (`goatcounter`) | `src/data/site.json` |
| Menyer og seksjoner | `src/data/menu.json` |
| Innhold, styret, RadioID-registeret, standardbilder | Pages CMS |
| Nettstedsnøkkelen for Turnstile, ID-ene til GitHub-appen | GitHub → `hpgt-web` → Settings → Environments → `production` (variabler) |
| Hemmeligheter (Turnstile-hemmeligheten, appnøkkelen, Cloudflare-tokenet) | Cloudflare og `production`, aldri i filer (se [Hemmeligheter og variabler](#hemmeligheter-og-variabler)) |
| DNS, videresendingen fra `www`, DNSSEC og soneinnstillingene for hpgt.com | `infra/hpgt.com/terraform.tfvars` i det private repoet [hpgt-com/operations](https://github.com/hpgt-com/operations) (se `infra/README.md` der) |

En verdi ligger utenfor repoet bare når den er hemmelig eller bare publiseringsjobben skal bruke den. Alt annet står i
`site.json` og endres med én pull request.

## Hva ligger i Git, og hva gjør ikke

Git er fasiten for alt som kan ligge der. Resten settes for hånd i et dashbord og står derfor her, så det ikke blir
glemt.

| I Git (endres med pull request) | Utenfor Git (settes for hånd, beskrevet under) |
|---|---|
| Innhold, design, kode | Hemmeligheter i Cloudflare og i GitHub-miljøene |
| Bygg og publisering (`.github/workflows/`) | Cloudflare: egne domener (custom domains) på Workeren og Turnstile-widgeten |
| Cloudflare-oppsettet for Workeren (`wrangler.jsonc`), også at `workers.dev`-adressen og forhåndsvisningsadressene er slått av | GitHub-miljøene og variablene deres |
| Sikkerhetshoder og videresendinger (`public/_headers`, `_redirects`) | GitHub-appene og hvor de er installert |
| Regelsettet for `main`, også unntaket for Pages CMS-appen, i `github.json` i `hpgt-com/operations` (settes med `scripts/apply-settings.mjs` der) | Pages CMS: hvem som er invitert |
| Hva redaktørene ser (`.pages.yml`) | Anthropic: federation-regelen og tjenestekontoen |
| DNS, videresendingen fra `www`, DNSSEC og soneinnstillingene (OpenTofu i `infra/` i hpgt-com/operations) | |

## Kontoer

| Konto | Hva | Eier / hvem har tilgang |
|---|---|---|
| GitHub-organisasjonen `hpgt-com` | Repoene `hpgt-web`, `flying-sites`, `status`, `guidelines`, `repo-template`, `.github` og de private `form-submissions` og `operations`. Plan: GitHub Team, gratis gjennom GitHub for Nonprofits (GitHub Support-sak 4796969) | Eierne av organisasjonen (2FA påkrevd) |
| Cloudflare-kontoen «HPGT» | Workeren `hpgt-web`, DNS for hpgt.com, Turnstile, Web Analytics | Medlemmene av kontoen |
| Namecheap | Registrar for hpgt.com (navnetjenerne peker til Cloudflare) | Den som har tilgangen hos registraren |
| Google Workspace | E-post på @hpgt.com (MX, SPF, DKIM og DMARC ligger i Cloudflare DNS) | Administratoren av Workspace |
| platform.claude.com (Anthropic) | Oversettelse til engelsk, betalt med forhåndskjøpt kreditt | Administratorene av organisasjonen |
| GoatCounter | Besøksstatistikk og klikkhendelser for hpgt.com (`hpgt-web`) og flysteder (`hpgt-flysteder`), én konto med to nettsteder | Brukerne av kontoen (Settings → Users) |
| Pages CMS (app.pagescms.org) | Editoren. Administratorer logger inn med GitHub, redaktører med e-post | Administratorer inviterer redaktører |

Når noen går ut av styret: fjern dem fra hver konto over, og sjekk at minst to personer fortsatt har eiertilgang til
GitHub-organisasjonen og til Cloudflare.

**GitHub Team (nonprofit):** hvert medlem av organisasjonen bruker en lisens. Rabatten (100 %) skal dekke hver av dem.
Etter at et medlem er lagt til: sjekk at Settings → Billing and licensing i `hpgt-com` viser $0. Gjør den ikke det,
eller ber GitHub om at nonprofit-statusen fornyes, svar på supportsaken over eller søk på nytt på
github.com/solutions/industry/nonprofits. Uten planen virker de offentlige repoene som før. Bare regelsettene og
godkjennerne i miljøene i de private repoene (`form-submissions` og `operations`) slutter å gjelde.

## Hemmeligheter og variabler

| Navn | Hvor | Type | Hva | Fornyes |
|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub `hpgt-web` → Environments → `production` | Hemmelighet | Publiserer Workeren `hpgt-web`, og bare den. Lages under Cloudflare → Workers & Pages → hpgt-web → Settings → Builds → «API token for external CI/CD» | Årlig |
| `CLOUDFLARE_ACCOUNT_ID` | Samme miljø | Hemmelighet | Hvilken Cloudflare-konto | Aldri |
| `TURNSTILE_SITEKEY` | Samme miljø | Variabel | Den offentlige nøkkelen til Turnstile-widgeten «hpgt.com skjemaer». Settes inn ved publisering | Med en ny widget |
| `GH_APP_ID`, `GH_APP_INSTALLATION_ID` | Samme miljø | Variabel | GitHub-appen «HPGT Web Forms» og installasjonen dens, som bare gjelder det private repoet `hpgt-com/form-submissions` | Aldri |
| `TURNSTILE_SECRET` | Cloudflare → Workers & Pages → hpgt-web → Settings → Variables and Secrets | Hemmelighet | Workerens kontroll av Turnstile-svar | Hvis den kan ha lekket |
| `GITHUB_APP_PRIVATE_KEY` | Samme sted | Hemmelighet | Den private nøkkelen til appen (.pem). Workeren lager tokens for én time med den | Hvis den kan ha lekket |
| `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID`, `ANTHROPIC_WORKSPACE_ID` | GitHub `hpgt-web` → Environments → `translation` | Variabler | Hvilken federation-regel og tjenestekonto innloggingen bruker. Ingen nøkkel er lagret | Aldri |
| Tokenet for Cloudflare Web Analytics | `src/data/site.json` → `webAnalytics` | I Git (offentlig) | Anonym besøksstatistikk. Tom = av | – |
| Adressen til GoatCounter | `src/data/site.json` → `goatcounter` | I Git (offentlig) | Anonym besøksstatistikk og klikkhendelser (`hpgt-web.goatcounter.com`, samme GoatCounter-konto som flysteder). Tom = av | – |

Begge miljøene (`production` og `translation`) er begrenset til grenen `main`.

**Utløpsdatoene** for alle tokens og nøkler i klubben (og domenet) ligger i det private repoet
[hpgt-com/operations](https://github.com/hpgt-com/operations) (`expiry.json`), ikke her: en ukentlig sjekk der oppretter
en sak før noe utløper. Oppdater datoen der hver gang et token eller en nøkkel fornyes eller byttes.

## Rutiner

### Invitere en ny redaktør
1. Logg inn på app.pagescms.org med GitHub, åpne `hpgt-web` → **Collaborators** → **Invite** med e-postadressen.
2. Redaktøren får en e-post og logger inn med den. Redaktøren ser bare det `.pages.yml` viser.
3. Fjern redaktøren samme sted når vedkommende ikke lenger skal skrive.

### Forhåndsvise et innlegg før det publiseres, og dele det
1. Kryss av for **Utkast (forhåndsvisning)** på innlegget i Pages CMS og lagre. Etter 2–3 minutter kan det leses på
   `hpgt.com/utkast/<address>/` (for eksempel `hpgt.com/utkast/mitt-innlegg/`). Utkast vises ikke på forsiden, under
   Nytt, i søket eller i nettstedskartet, og de har `noindex`. Adressen er ikke hemmelig: alle med lenken kan lese det.
2. Når det er klart: fjern krysset og lagre. Innlegget publiseres da på sin vanlige adresse, og utkastadressen
   forsvinner.
3. Publiserte innlegg har en **Kopier lenke**-knapp nederst. Den kopierer adressen til innlegget, som limes inn i et
   nytt innlegg i klubbens Facebook-gruppe (Facebook henter bildet og tittelen). Facebook lar ikke apper publisere i
   grupper, og delingsvinduet kan ofte ikke dele til en gruppe, så dette gjøres for hånd.

### Fornye Cloudflare-tokenet (årlig)
1. Cloudflare → Workers & Pages → `hpgt-web` → Settings → Builds → **Create token**. Navn:
   `hpgt-web publish (worker hpgt-web)`, levetid 12 måneder.
2. GitHub → `hpgt-web` → Settings → Environments → `production` → `CLOUDFLARE_API_TOKEN` → lim inn.
3. Actions → «Bygg og publiser» → **Run workflow**. Når den er grønn: slett det gamle tokenet under Cloudflare → Manage
   Account → Account API Tokens.
4. Sett den nye utløpsdatoen i `expiry.json` i det private repoet `hpgt-com/operations` (pull request). Den ukentlige
   sjekken «Utløper snart» der oppretter en sak 45 dager før neste utløp.

Når tokenet har gått ut, blir «Bygg og publiser» rød på jobben `publish`, og endringer fra Pages CMS går ikke ut før
tokenet er byttet.

### Behandle en RadioID-innmelding
1. En sak kommer i det **private** repoet `hpgt-com/form-submissions` med etiketten `radioid` (følg det med
   **Watch → Custom → Issues** for å få e-post). Innmeldingene inneholder navn og kommentarer og ligger derfor aldri i et
   offentlig repo. Bare den ferdige oppføringen publiseres, i `radio-id.json`.
2. Oppdater registeret i Pages CMS (RadioID) og lagre.
3. Lukk saken.

### Legge inn en sponsor
1. Pages CMS → «Sponsorer» → legg til firmanavn, logo (helst SVG, ellers PNG med gjennomsiktig bakgrunn), lenke og
   eventuelt «Vises fra og med» og «Vises til og med». Lagre. Siden publiseres med en gang.
2. Stripen «Støttet av» vises nederst på alle sidene så lenge minst én sponsor er aktiv. Bygget trimmer og skalerer
   logoene.
3. Datoene gjelder i norsk tid. «Bygg og publiser» kjører hver natt (00:15 vintertid, 01:15 sommertid), men publiserer
   bare når en sponsor starter eller går ut den dagen (jobben `dates`, `scripts/sponsor-dates.mjs`). Andre netter
   stopper den etter noen sekunder.
4. GitHub slår av planlagte kjøringer i et offentlig repo når det ikke har vært aktivitet på 60 dager, og sier fra på
   e-post. Slå den på igjen under Actions → «Bygg og publiser» → **Enable workflow**, eller kjør den for hånd på
   datoen.

### Behandle en feilmelding («Meld feil»)
1. Hver side har lenken «Meld feil på denne siden» nederst (engelsk: «Report an error on this page»). Den åpner
   `/meld-feil/` (`/en/report-error/`) med adressen til siden fylt inn. Meldingen blir en sak i det **private** repoet
   `hpgt-com/form-submissions` med etiketten `feedback`. Navn og e-post er valgfritt og oppgis bare av dem som vil ha
   svar.
2. Rett feilen i Pages CMS (eller med en pull request), svar hvis avsenderen har lagt igjen kontaktinformasjon, og lukk
   saken.

### Hva overvåker hva

Fire uavhengige sjekker. Følg repoene som er nevnt under (Watch → Custom → Issues) for å få e-postene.

| Sjekk | Kjører hvor, hvor ofte | Sjekker | Varsler med |
|---|---|---|---|
| **Upptime** ([status.hpgt.com](https://status.hpgt.com), `hpgt-com/status`) | GitHub Actions, hvert 5. minutt. Uavhengig av Cloudflare | hpgt.com, skjemaene (`/api/radioid` svarer 405), flysteder.hpgt.com, datatjenesten (`status.json` sier `"ok":true`) | En sak i `hpgt-com/status`, som lukkes når alt virker igjen. Den offentlige statussiden viser oppetid og hendelser |
| **Helsesjekk** (`.github/workflows/health.yml`) | GitHub Actions, hver time | Sidene svarer, sikkerhetshodene (også ved feil i Workeren), den ekte Turnstile-nøkkelen, videresendingen fra `www`, sertifikatet ≥ 14 dager | En sak med etiketten `bug` her, som lukkes når alt er i orden |
| **Varsler fra Cloudflare** | Cloudflare | DDoS-angrep, misbruksrapporter, blokkeringer, sertifikatet (Universal SSL), ukentlig Web Analytics | E-post (se «Overvåke skjemaene» under) |
| **Utløpsdatoer** («Utløper snart» i det private `hpgt-com/operations`) | GitHub Actions, mandager | Tokens, nøkler og domenet, 45 dager i forveien (90 for domenet) | En sak i `hpgt-com/operations` |

flying-sites har også egne sjekker (helsesjekk av datatjenesten hver time, nattlig sikkerhetskopi, UptimeRobot); se
`docs/operations.md` der. Planlagte arbeidsflyter stopper etter 60 dager uten commit i repoet (GitHub sender e-post
først; de slås på igjen under Actions). Upptime committer med noen minutters mellomrom, så dens egen plan stopper
aldri.

**Oppsettet for Upptime:** sjekkene står i `.upptimerc.yml` i `hpgt-com/status` (endres med pull request). Den kjører
med GitHub-appen «HPGT Status» (bare installert på det repoet, Contents og Issues; nøkkelen ligger i miljøet `status`),
ikke et personlig token, og appen står på unntakslisten i regelsettet for det repoet fordi den committer resultatene
til `main`. Siden er GitHub Pages fra grenen `gh-pages`, på `status.hpgt.com` (Cloudflare DNS: `status` CNAME
`hpgt-com.github.io`, DNS only). Lenken «Driftsstatus» i bunnteksten er `site.json` → `statusPage`.

### Overvåke skjemaene (logger og varsler)
- **Logger:** Cloudflare → Workers & Pages → `hpgt-web` → **Observability**. Workeren skriver bare egne linjer, uten
  IP-adresse, nettleser eller innhold: `form path=/api/radioid status=201` for hvert skjemakall, `form-error stage=…` når
  GitHub-appen eller GitHub feiler, og `csp-report directive=… disposition=… blocked=… path=…` for hver CSP-rapport.
  Cloudflares egen logg per kall er slått av (`invocation_logs: false` i `wrangler.jsonc`), fordi den tar med
  IP-adressen. Linjene lagres i inntil 7 dager (Observability Free). Kontoen har ikke Workers Paid, så loggingen koster
  aldri noe: ved den daglige gratisgrensen (0,5 GB) stopper den til neste dag.
- **CSP-rapporter:** nettleserne sender brudd på CSP-en og på Trusted Types (rapportmodus) til `/api/csp-report`
  (`worker/csp-report.js`). Søk etter `csp-report` i loggen. Trusted Types kan håndheves når rapportene over noen uker
  ikke viser brudd fra sidens egne skript.
- Hva det skal ses etter: mange `403` (Turnstile feilet eller feil opprinnelse) eller `429` (takstbegrensning) betyr at
  noen hamrer på skjemaene; `502` betyr at GitHub-appen eller nøkkelen dens ikke virker (se «Når publiseringen feiler»
  under).
- **Varsler:** Cloudflare → Manage Account → **Notifications**, på e-post. De ligger utenfor koden og står derfor her.
  De gjelder hele sonen hpgt.com, også flysteder.hpgt.com og data.hpgt.com, som er Workere i samme sone.

  | Varsel | Hva det betyr | Hva som gjøres |
  |---|---|---|
  | `hpgt.com zone – HTTP DDoS Attack Alert` | Cloudflare har stoppet et angrep | Vanligvis ingenting. Se under Security → Events hvis nettstedet var tregt |
  | `hpgt.com zone – Cloudflare abuse report alert` | Noen har rapportert domenet til Cloudflare | Les rapporten, svar ved behov |
  | `hpgt.com zone – Alerts for New Blocks` | Cloudflare Trust & Safety har blokkert innhold; nettstedet kan være utilgjengelig | Sjekk dashbordet, be om ny vurdering hvis det er feil |
  | `hpgt.com zone – Universal SSL Alert` | Sertifikatet kunne ikke valideres eller fornyes | Sjekk SSL/TLS → Edge Certificates og DNS-postene |
  | `hpgt.com zone – Web Analytics Metrics Update` | Jevnlige besøkstall | Ingenting, det er informasjon |
  | `Default budget alert (auto-created)` | Forbruk på et betalt produkt | Ingenting så lenge kontoen er på gratisplanen |

  Cloudflare varsler ikke når Cloudflare-API-tokenet går ut. Det gjør «Utløper snart» i hpgt-com/operations (se
  [Fornye Cloudflare-tokenet](#fornye-cloudflare-tokenet-årlig)).
- **Helsesjekk:** `.github/workflows/health.yml` sjekker hpgt.com utenfra hver time: sidene, sikkerhetshodene, den ekte
  Turnstile-nøkkelen, Workeren (`/api/` svarer 405 på GET), videresendingen fra `www` og at sertifikatet har minst
  14 dager igjen. Når noe er galt, oppretter den en sak med etiketten `bug` (følg repoet for å få e-post) og lukker den
  når alt er i orden igjen. GitHub slår av planen etter 60 dager uten commit; det kommer en e-post om det, og den slås
  på igjen under Actions → «Helsesjekk».

### Bytte nøkkelen til GitHub-appen «HPGT Web Forms»
1. hpgt-com → Settings → Developer settings → GitHub Apps → HPGT Web Forms → **Generate a private key**.
2. Lim inn innholdet i .pem-filen som `GITHUB_APP_PRIVATE_KEY` i Cloudflare (se tabellen), og slett filen.
3. Test skjemaet, og slett den gamle nøkkelen på siden til appen.

### Legge til en side i den engelske versjonen
1. Legg filnavnet til siden (uten `.md`) til i `PAGES` i `scripts/translate/translate.mjs`.
2. Skal den norske adressen ha en engelsk, legg den til i `src/lib/english-paths.mjs`.
3. Pull request. Oversettelsen skjer ved neste publisering.

### Legge til et nytt skjema
Bruk Turnstile-widgeten «hpgt.com skjemaer» med en ny `action`, gi sakene en egen etikett i `hpgt-com/form-submissions`
(eller et eget privat repo hvis andre skal lese dem, se ADR 0007), legg siden til i `FORM_PAGES` i
`src/components/Head.astro` og i `public/_headers`, og sjekk `action` i Workeren. Ingen ny widget eller nye nøkler.

### Sette regelsettet for `main`
Regelsettet, også unntaket for Pages CMS-appen, står i `github.json` i `hpgt-com/operations`, og settes med
`node scripts/apply-settings.mjs --apply` der (se README-en i operations). Uten unntaket feiler lagring i Pages CMS med
«Changes must be made through a pull request».

### Rulle tilbake en publisering
- **Raskest:** Cloudflare → Workers & Pages → `hpgt-web` → **Deployments** → velg forrige versjon → **Rollback**.
- **Varig:** `git revert` av endringen i en pull request. Neste publisering legger da ut riktig versjon, og Git er
  fasiten igjen. En tilbakerulling bare i Cloudflare overskrives av neste publisering.

### Når publiseringen feiler

| Symptom | Sannsynlig årsak | Løsning |
|---|---|---|
| `build` feiler etter lagring i Pages CMS | Et ugyldig felt (dato, type, et bilde som mangler) | Les feilmeldingen, rett innlegget i CMS-et |
| `publish` feiler med en autentiseringsfeil | Cloudflare-tokenet har gått ut eller er slettet | Forny tokenet (se over) |
| `guard` feiler, og saken «Publisering stoppet: Pages CMS endret filer utenfor innholdet» opprettes | En commit lagret rett på `main` (fra Pages CMS, uten pull request) endret filer utenfor innholdet | Finn ut hvem som lagret og hvorfor. Var det ikke meningen: `git revert` av committen i en pull request, og sjekk kontoen til redaktøren. Var det meningen: gjør endringen på nytt i en pull request. Publiseringen fortsetter når filene er som ved siste publisering |
| `guard` feiler med «Kunne ikke slå opp …», «Uventet svar …» eller «git … feilet» | Et oppslag i GitHub eller en Git-kommando feilet, så endringen kunne ikke kontrolleres helt | Kjør arbeidsflyten på nytt. Den publiserer aldri etter en ufullstendig kontroll |
| `guard` feiler med «Fant ikke forrige publisering …» | Den sist publiserte committen finnes ikke (historikken er skrevet om), eller ingen publisering har lyktes, så det er ingenting å sammenligne med | Se gjennom committene på `main` siden siste publisering, og kjør så «Bygg og publiser» for hånd (Actions → Run workflow). En manuell kjøring kontrollerer bare siste commit, og loggen viser hvem som kjørte den |
| `build` stopper på `check-media` | En fil i `public/media/` som ikke er et bilde eller en PDF | Fjern den, eller erstatt den med et bilde eller en PDF |
| `publish` stopper på «Sett inn skjemaenes ID-er» | En variabel i `production` mangler eller har feil format | Rett variabelen og kjør på nytt |
| `translate` advarer om innloggingen | Anthropic-federation, kreditten eller ID-ene | Nettstedet publiseres likevel, med de forrige oversettelsene. Sjekk platform.claude.com |
| Et skjema (RadioID eller «Meld feil») svarer «Noe gikk galt hos oss» | Appnøkkelen, installasjonen av appen eller ID-ene | Sjekk at appen er installert på `form-submissions` og at nøkkelen i Cloudflare er riktig |

## Domenet

Navnetjenerne for hpgt.com hos Namecheap peker til Cloudflare. `hpgt.com` og `www.hpgt.com` er egne domener (custom
domains) på Workeren, `www` sendes videre (301) til `hpgt.com`, og `prototype` er `false` i `site.json` (se
[decisions/0003](decisions/0003-cloudflare-workers.md)). DNS-postene, videresendingen og DNSSEC er kode i
`infra/hpgt.com/terraform.tfvars` i hpgt-com/operations og endres med pull request der, ikke i dashbordet.

E-posten ligger hos Google og påvirkes ikke av nettstedet, men DNS-postene for den (MX, SPF, DKIM `google._domainkey`,
DMARC) ligger i Cloudflare DNS. DMARC-rapportene går til Cloudflare (Email → DMARC Management).

**DNSSEC** er på: Cloudflare signerer sonen (`dnssec = true`), og DS-posten (koblingen fra `.com` til nøkkelen hos
Cloudflare) ligger hos registraren, Namecheap → Domain List → hpgt.com → Advanced DNS → DNSSEC. Ingenting å gjøre i det
daglige. **Før navnetjenerne noen gang flyttes bort fra Cloudflare:** fjern DS-posten hos Namecheap først, vent et
døgn, slå så av DNSSEC (`dnssec = false` i `infra/hpgt.com/terraform.tfvars`, pull request i hpgt-com/operations) og
flytt. I motsatt rekkefølge slutter hpgt.com, også e-posten, å virke for alle som har en resolver som sjekker
signaturene, til det er rettet opp.

## Sikkerhetskopi

Alt innhold og all kode ligger i Git, med hele historikken, og er også klonet lokalt hos administratorene. Det finnes
ingen database. Hemmelighetene ligger ikke i Git: de skal ikke ligge andre steder enn der tabellen over sier, og ved
behov lages nye i stedet.
