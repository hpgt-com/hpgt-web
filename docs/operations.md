# Drift: kontoer, nøkler og rutiner

Driftshåndboken for hpgt.com. Den skal gjøre det mulig for en ny administrator å ta over uten å spørre den forrige.
Hvordan løsningen henger sammen står i [architecture.md](architecture.md), og hvorfor den er bygget slik i
[adr/](adr/).

**Regel:** Endrer du oppsett, kontoer eller nøkler, oppdaterer du denne fila i samme pull request (eller i en egen PR
samme dag, hvis endringen ble gjort i et dashbord).

## Hva er i Git, og hva er ikke

Git er fasiten for alt som kan ligge der. Resten er satt for hånd i et dashbord og er derfor listet her, så det ikke
blir glemt.

| I Git (endres via pull request) | Utenfor Git (satt for hånd, dokumentert under) |
|---|---|
| Innhold, design, kode | Hemmeligheter i Cloudflare og GitHub-miljøer |
| Bygg og publisering (`.github/workflows/`) | Cloudflare: custom domains, Turnstile-widget, redirect-regler, DNS |
| Cloudflare-oppsett for workeren (`wrangler.jsonc`) | GitHub-miljøene og variablene i dem |
| Sikkerhetshoder og videresendinger (`public/_headers`, `_redirects`) | GitHub-appene og hvor de er installert |
| Regelsettet for `main` (`settings/ruleset-main.json`, satt med `settings/apply.sh`) | Pages CMS: hvem som er invitert |
| Hva redaktørene ser (`.pages.yml`) | Anthropic: føderasjonsregel og tjenestekonto |

## Kontoer

| Konto | Hva | Eier / hvem har tilgang |
|---|---|---|
| GitHub-org `hpgt-com` | Repoene `hpgt-web`, `flying-sites`, `repo-template`, `.github` | Org-eiere (2FA påkrevd) |
| Cloudflare-konto «HPGT» | Workeren `hpgt-web`, DNS for hpgt.com, Turnstile, Web Analytics | Kontoens medlemmer |
| Namecheap | Registrar for hpgt.com (navnetjenere peker til Cloudflare) | Den som har registrar-tilgangen |
| Google Workspace | E-post på @hpgt.com (MX, SPF, DKIM og DMARC ligger i Cloudflare DNS) | Workspace-administrator |
| platform.claude.com (Anthropic) | Oversettelse til engelsk, betales med forhåndskjøpt kreditt | Organisasjonens administratorer |
| Pages CMS (app.pagescms.org) | Skriveverktøyet. Logger inn med GitHub (administratorer) eller e-post (redaktører) | Administratorer inviterer redaktører |

Når noen slutter i styret: fjern dem fra hver konto over, og sjekk at minst to personer fortsatt har eiertilgang til
GitHub-org og Cloudflare.

## Hemmeligheter og variabler

| Navn | Hvor | Type | Hva | Fornyes |
|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub `hpgt-web` → Environments → `produksjon` | Secret | Publiserer workeren `hpgt-web`, og bare den. Laget under Cloudflare → Workers & Pages → hpgt-web → Settings → Builds → «API token for external CI/CD» | Hvert år |
| `CLOUDFLARE_ACCOUNT_ID` | Samme miljø | Secret | Hvilken Cloudflare-konto | Aldri |
| `TURNSTILE_SITEKEY` | Samme miljø | Variabel | Offentlig nøkkel til Turnstile-widgeten «hpgt.com skjemaer». Settes inn ved publisering | Ved ny widget |
| `GH_APP_ID`, `GH_APP_INSTALLATION_ID` | Samme miljø | Variabel | GitHub-appen «HPGT Web Forms» og installasjonen på `hpgt-web` | Aldri |
| `TURNSTILE_SECRET` | Cloudflare → Workers & Pages → hpgt-web → Settings → Variables and Secrets | Secret | Workerens sjekk av Turnstile-svar | Ved mistanke om lekkasje |
| `GITHUB_APP_PRIVATE_KEY` | Samme sted | Secret | Appens private nøkkel (.pem). Workeren lager tokens for én time med den | Ved mistanke om lekkasje |
| `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID`, `ANTHROPIC_WORKSPACE_ID` | GitHub `hpgt-web` → Environments → `oversetting` | Variabler | Hvilken føderasjonsregel og tjenestekonto innloggingen gjelder. Ingen nøkkel lagres | Aldri |
| Cloudflare Web Analytics-token | `src/data/site.json` → `statistikk` | I Git (offentlig) | Anonym besøksstatistikk. Tomt = av | – |

Begge miljøene (`produksjon` og `oversetting`) er begrenset til grenen `main`.

## Rutiner

### Invitere en ny redaktør
1. Logg inn på app.pagescms.org med GitHub, åpne `hpgt-web` → **Collaborators** → **Invite** med e-postadressen.
2. Redaktøren får en e-post og logger inn med den. De ser bare det `.pages.yml` viser.
3. Fjern dem samme sted når de ikke skal skrive lenger.

### Fornye Cloudflare-tokenet (hvert år)
1. Cloudflare → Workers & Pages → `hpgt-web` → Settings → Builds → **Create token**. Navn:
   `hpgt-web publish (worker hpgt-web)`, levetid 12 måneder.
2. GitHub → `hpgt-web` → Settings → Environments → `produksjon` → `CLOUDFLARE_API_TOKEN` → lim inn.
3. Actions → «Bygg og publiser» → **Run workflow**. Når den er grønn: slett det gamle tokenet under Cloudflare →
   Manage Account → Account API Tokens.
4. Legg inn ny påminnelse i styrets kalender en måned før neste utløp.

Har tokenet utløpt, blir «Bygg og publiser» rød på jobben `publiser`, og endringer fra Pages CMS kommer ikke ut før
tokenet er byttet.

### Behandle en RadioID-innmelding
1. Det kommer en sak med etiketten `radioid` (følg repoet med **Watch → Custom → Issues** for å få e-post).
2. Oppdater registeret i Pages CMS (RadioID) og lagre.
3. Lukk saken.

### Bytte nøkkelen til GitHub-appen «HPGT Web Forms»
1. hpgt-com → Settings → Developer settings → GitHub Apps → HPGT Web Forms → **Generate a private key**.
2. Lim inn .pem-innholdet som `GITHUB_APP_PRIVATE_KEY` i Cloudflare (se tabellen), og slett fila.
3. Test skjemaet, og slett den gamle nøkkelen på app-siden.

### Legge til en side i den engelske versjonen
1. Legg sidens filnavn (uten `.md`) i `SIDER` i `scripts/oversett/oversett.mjs`.
2. Har den en norsk adresse som bør ha en engelsk, legg den inn i `src/lib/engelske-adresser.mjs`.
3. Pull request. Oversettelsen skjer ved neste publisering.

### Legge til et nytt skjema
Bruk Turnstile-widgeten «hpgt.com skjemaer» med en ny `action`, legg siden i `SKJEMASIDER` i
`src/components/Head.astro` og i `public/_headers`, og sjekk `action` i workeren. Ingen ny widget eller nye nøkler.

### Rulle tilbake en publisering
- **Raskest:** Cloudflare → Workers & Pages → `hpgt-web` → **Deployments** → velg forrige versjon → **Rollback**.
- **For godt:** `git revert` av endringen i en pull request. Neste publisering legger da ut riktig versjon, og Git er
  igjen fasiten. En rollback i Cloudflare alene overskrives ved neste publisering.

### Når publiseringen feiler

| Symptom | Sannsynlig årsak | Tiltak |
|---|---|---|
| `bygg` feiler etter lagring i Pages CMS | Ugyldig felt (dato, type, bilde som mangler) | Les feilmeldingen, rett innlegget i CMS-et |
| `publiser` feiler med autentiseringsfeil | Cloudflare-tokenet er utløpt eller slettet | Forny tokenet (se over) |
| `publiser` stopper på «Sett inn skjemaenes ID-er» | En variabel i `produksjon` mangler eller har feil format | Rett variabelen og kjør på nytt |
| `oversett` gir advarsel om innlogging | Anthropic-føderasjonen, kreditten eller ID-ene | Siden publiseres likevel med forrige oversettelser. Sjekk platform.claude.com |
| RadioID-skjemaet svarer «Noe gikk galt hos oss» | Appnøkkelen, appens installasjon eller ID-ene | Sjekk at appen er installert på `hpgt-web` og at nøkkelen i Cloudflare er riktig |

## Lansering og domenet

Rekkefølgen ved lansering på hpgt.com står i pull requesten «Lansering» og i [adr/0003](adr/0003-cloudflare-workers.md):
navnetjenere til Cloudflare, custom domains `hpgt.com` og `www.hpgt.com` på workeren, redirect-regel fra `www`, og
deretter `prototype: false`.

E-post ligger hos Google og påvirkes ikke av nettsiden, men DNS-postene (MX, SPF, DKIM `google._domainkey`, DMARC) må
stå i Cloudflare DNS.

## Sikkerhetskopi

Alt innhold og all kode ligger i Git, med full historikk, og er i tillegg klonet lokalt hos administratorene. Det er
ingen database. Hemmelighetene ligger ikke i Git: oppbevar dem ikke andre steder enn der tabellen over sier, og lag
heller nye ved behov.
