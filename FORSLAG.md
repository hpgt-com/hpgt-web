# Forslag: ny hpgt.com uten webhotell

**Status:** Prototype, ikke publisert. Fem designforslag på samme innhold og samme løsning.

## 1. Kort oppsummert

| | I dag (ProISP) | Forslag |
|---|---|---|
| Plattform | WordPress + MySQL + PHP, 9 utvidelser (Jetpack, The Events Calendar, NextGEN m.fl.) | Statisk side bygget med **Astro**, kildekode og innhold i **GitHub** |
| Redigering | WordPress-admin | **Pages CMS**: enkel editor i nettleseren, innlogging med e-post (ingen GitHub-konto) |
| Drift | Webhotell ca. 1 000 kr/år, oppdatering av WP og utvidelser | **Cloudflare** (gratis): hosting, DNS, skjema og tilgangskontroll. E-posten blir hos Google som i dag. |
| Angrepsflate | PHP, database, innloggingsside på nett, utvidelser | Statiske filer, pluss én liten Worker for RadioID-skjemaet. Ingen database og ingen innloggingsside på hpgt.com. |
| Kostnad | ca. 1 000 kr/år + domene | **Kun domenet**, ca. 120 kr/år for .com hos Cloudflare Registrar (til kostpris) |

## 2. Arkitektur

```
 Medlem (nettleser)                     Administrator (1–2 stk)
       │ e-postinvitasjon                        │ GitHub-konto med 2FA
       ▼                                         ▼
 ┌─────────────┐   commit via GitHub App   ┌──────────────────┐
 │  Pages CMS  │ ───────────────────────▶  │  GitHub-repo     │  innhold = Markdown/JSON
 │ (editor)    │   kun dette ene repoet    │  hpgt-web        │  bilder/PDF = filer
 └─────────────┘                           └────────┬─────────┘
                                                    │ GitHub Actions: bygg + validering
                                                    │ (kun lesetilgang til repoet)
                                                    ▼
                                           ┌──────────────────┐
                                           │ Cloudflare       │  statiske filer + sikkerhetshoder
                                           │ hpgt.com         │  DNS (MX peker fortsatt til Google)
                                           └────────┬─────────┘
                                                    │ /api/radioid: Turnstile-sjekk
                                                    ▼
                                           GitHub-issue med etikett «radioid»
                                           (token: kun Issues på dette repoet)
```

- **Astro** bygger ferdige HTML-sider. Innholdsmodellen (`src/content.config.ts`) validerer hvert felt. En feil fra CMS-et, for eksempel en ugyldig dato, stopper bygget i stedet for å publisere en ødelagt side.
- **Alle gamle adresser beholdes**: `/arsmote-2026/`, `/kurs-2026/`, `/event/...` og `/wp-content/uploads/...`. Lenker fra Facebook og Google virker etter flyttingen, og `/events` og `/galleri` blir omdirigert.
- **Samme prinsipper som flysteder.hpgt.com**: ingen tredjepartsskript, egne skrifttyper, streng CSP, ingen sporing og ingen informasjonskapsler.

### Hvorfor Astro, og ikke Hugo?
Begge passer. Astro anbefales fordi:
- Skjemavalidering av innholdet er innebygd. Det er viktig når ikke-tekniske brukere redigerer.
- Malene er vanlig HTML og JavaScript, som er lettere for neste frivillige å overta enn Hugos Go-maler.
- Det støtter alle CSS-rammeverkene i prototypene (Tailwind, Bootstrap, Pico, egen CSS).

Hugo bygger raskere og er én fil uten Node, men med ca. 180 sider bygger Astro på 3 sekunder, så hastighet avgjør ikke valget.

## 3. CMS: hvordan medlemmer kan skrive på siden

| | **Pages CMS** (anbefalt) | Sveltia CMS / Decap | Keystatic / TinaCMS |
|---|---|---|---|
| Innlogging for medlemmer | **E-post (magisk lenke), ingen GitHub-konto** | Krever GitHub-konto | GitHub-konto, eller betalt sky (Tina) |
| Brukervennlighet | Enkel og ryddig | God | God |
| Godkjenning før publisering | Nei (historikk og angre) | Decap: ja (krever GitHub-konto) | Delvis |
| Drift | Gratis tjeneste, eller selvhostet | Egen Cloudflare Worker for innlogging | Varierer |

**Anbefaling: Pages CMS.** Kravet var at medlemmer kan få bruker selv uten at du må gjøre jobben. Det er bare Pages CMS som lar folk logge inn med e-post uten GitHub-konto. Ifølge [dokumentasjonen](https://pagescms.org/docs/configuration/collaborators/) kan e-postbrukere bare redigere innhold og media. De kan ikke endre konfigurasjonen eller administrere andre brukere.

**Selvbetjent registrering, men med godkjenning.** Helt åpen registrering på en offentlig klubbside gir spam og hærverk. Flyten blir:
1. Medlemmet fyller ut «Be om tilgang» på `/bidra/`. I prototypen er det en e-postlenke. I ferdig løsning blir det et skjema med Cloudflare Turnstile via en Worker, som «Meld fra» på flysteder.hpgt.com.
2. Styret får beskjed og klikker «Inviter» i Pages CMS. Det tar ett minutt.
3. Medlemmet får e-post, logger inn og kan skrive med en gang.

### RadioID-skjemaet
Pilotene melder inn, endrer eller fjerner sin RadioID med et skjema nederst på `/flysteder/flarm-fanet-radioid/`. I stedet for en e-post havner det som en **GitHub-issue** med etiketten `radioid`. Den som vedlikeholder listen, oppdaterer registeret i CMS-et og lukker saken. Da har man historikk, og ingenting blir borte i en innboks.

- Skjemaet går til `worker/index.js`, den eneste serverkoden på siden. Wrangler sender bare `/api/*` dit, og alt annet er statiske filer.
- **Cloudflare Turnstile** (usynlig «er du et menneske?»-sjekk, ingen sporing) sjekkes på serveren, sammen med `action` og vertsnavn. I tillegg sjekkes opprinnelse, og det er en grense på 3 innsendinger per minutt per IP og en honningkrukke mot roboter.
- **GitHub-tokenet** er fine-grained med *kun* «Issues: Read and write» på `hpgt-web`. Det kan ikke lese kode eller endre filer. Det og Turnstile-hemmeligheten legges inn med `wrangler secret put` og finnes verken i repoet eller i GitHub Actions.
- Skjemaet spør bare om det som uansett vises i listen: navn, RadioID og vario. Det spør ikke om e-post eller telefon. Innsendt tekst gjøres ufarlig, så den ikke kan bli lenker eller @-varsler i saken.
- Bare RadioID-siden får laste Turnstile. Alle andre sider beholder CSP uten tredjepart (`public/_headers` og `Head.astro`).
- *Mulig senere:* en GitHub Action som lager endringen i `radioid.json` automatisk fra saken, så den bare må godkjennes.

### Kontakt: roller i stedet for adresser
`/om-klubben/` er nå **«Styret og roller»**. Hver rolle har en linje «Kontakt meg om», som redigeres i CMS-et, og siden har en tabell over hvem du kontakter om hva. Bunnteksten og NOTAM-siden lenker hit i stedet for å vise e-postadresser. Hver rolle har et eget anker, for eksempel `/om-klubben/#faglig-leder`.
- `leder@hpgt.com`: generelle spørsmål, medlemskap, økonomi og tilgang til nettsiden.
- `faglig.leder@hpgt.com`: det faglige, som sikkerhet, NOTAM og vinsjing, flysteder, luftrom og hendelser.
- `kurs@hpgt.com`: står bare på kurssiden og i eldre innlegg.

## 4. Sikkerhet: zero trust og minste privilegium

| Lag | Tiltak |
|---|---|
| Nettsiden | Statiske filer. Strenge HTTP-hoder (`public/_headers`): CSP uten `unsafe-inline`, HSTS, `frame-ancestors 'none'` og `nosniff`. Ingen skript fra andre, bortsett fra Turnstile på RadioID-siden. |
| Redigering | Pages CMS sin GitHub App installeres **bare på `hpgt-web`-repoet**, ikke på hele kontoen. E-postbrukere ser bare det `.pages.yml` viser. `site.json`, menyer, kode og arbeidsflyter er utelatt med vilje. |
| Kodeendringer | Bare administratorer har tilgang til repoet. 2FA er påkrevd. Grenbeskyttelse på `main`: ingen force-push eller sletting. |
| Skjema (Worker) | Bare `/api/radioid`. Turnstile, opprinnelsessjekk, hastighetsgrense og lengdegrenser. GitHub-tokenet har bare «Issues» på ett repo. Hemmeligheter ligger i Cloudflare, ikke i Git eller Actions. Ingen logging av innsendt innhold. |
| Bygg og publisering | GitHub Actions har `contents: read`. Cloudflare-tokenet har bare «Workers Scripts: Edit» og ligger i miljøet `produksjon`, som bare `main` kan bruke. Actions festes til commit-SHA. Dependabot holder avhengigheter oppdatert. |
| Forhåndsvisning før lansering | Kjøres på `ny.hpgt.com` bak **Cloudflare Access**: e-post-OTP, bare styret, gratis opptil 50 brukere. Siden har `noindex` til den lanseres. |
| Personvern | Ingen sporing. Telefonnumre og navn vises bare der det står i dag. RadioID-registeret er frivillig. |
| Gjenoppretting | Hele siden, med all historikk, ligger i Git. Hvis noe går galt, går vi tilbake én commit. Ingen database å ta backup av. |

**Valgfritt, sterkere oppsett (fase 2):** Selvhost Pages CMS på `cms.hpgt.com` bak Cloudflare Access. Da kreves både Access-OTP og CMS-innlogging, og ingen tredjepart har skrivetilgang til repoet. Ulempen er en ekstra komponent å drifte (Node og Postgres).

## 5. Migrering: hva er hentet, og hva gjenstår

Hentet automatisk via WordPress-API-et (`scripts/` og konverteringsskriptet):

| Innhold | Antall | Status |
|---|---|---|
| Innlegg (2012–2026) | 138 | Markdown med dato, én kategori og hovedbilde. Fem kategorier: Nyhet, Møter og referater, Kurs og fagdag, Sosialt og turer, Konkurranser. |
| Sider | 13 | Alle med. Kontakt, Om oss, Fly med oss og RadioID er skrevet om til redigerbare data. |
| Arrangementer (The Events Calendar) | 18 | Nå en del av innleggene: et innlegg med feltet «Arrangement» (dato, sted eller nettmøte, type, påmelding) vises også i kalenderen. 11 er slått sammen med innlegget om samme arrangement (/event/… sender videre), 7 er blitt egne innlegg. |
| Bilder og PDF-er | 222 | Lokalt, nedskalert til maks 1600 px (36 MB) |
| Innebygde videoer (Vimeo/YouTube) | 19 | Gjort om til lenker, så ingen sporing fra tredjepart |
| Bilder fra andre nettsteder | 8 | Gjort om til lenker. De fleste er døde. |

**Gjenstår før lansering:**
- [ ] **E-post ligger hos Google**, ikke hos ProISP, så den påvirkes ikke av at webhotellet sies opp. Når DNS flyttes til Cloudflare, må **MX, SPF (TXT), DKIM (`google._domainkey`) og eventuell DMARC** kopieres nøyaktig. Cloudflare importerer de fleste automatisk, men sjekk listen før navnetjenerne byttes.
- [ ] RadioID-skjemaet: opprett Turnstile-widget for `hpgt.com`, etiketten `radioid` i repoet og et fine-grained token. Legg inn begge hemmelighetene med `wrangler secret put`, og bytt test-nøkkelen i `site.json` (`turnstile`) med den ekte.
- [ ] Flytt domenet fra ProISP til Cloudflare Registrar god tid før februar. Overføring tar 5–7 dager, og domenet må låses opp og ha autorisasjonskode.
- [ ] Forsiden i WordPress ble ikke hentet; den var utilgjengelig fra skriptet. Innholdet på den nye forsiden er bygd fra menyene, sidene og de siste innleggene, så sammenlign med dagens forside.
- [ ] Gå gjennom 3–4 eldre innlegg med spesielle oppsett: konkurransesidene for 2014, 2017 og 2019, og et gammelt avstemningsskjema.
- [ ] Velg design (1–5), og slett de andre temaene.
- [ ] Opprett repoet `hpgt-web` (privat eller offentlig), Cloudflare-prosjektet og Pages CMS. Inviter styret.
- [ ] Ta full eksport fra WordPress (Verktøy → Eksporter) og database-backup fra ProISP som arkiv før oppsigelse.

## 6. Plan

| Uke | Oppgave |
|---|---|
| 1 | Styret velger design. Repo, Cloudflare og forhåndsvisning bak Access settes opp. |
| 2 | Domeneoverføring, og eksport av DNS-oppføringene for Google-e-posten. Pages CMS settes opp, og 2–3 testbrukere prøver å skrive. |
| 3 | Siste innholdssjekk. DNS for hpgt.com flyttes til Cloudflare-siden, og `noindex` fjernes. |
| 4+ | Webhotellet hos ProISP sies opp når alt er bekreftet. E-posten hos Google berøres ikke. |

## 7. De fem prototypene

| # | Navn | Rammeverk | Passer hvis … |
|---|---|---|---|
| 1 | Fjord | Egen CSS, ingen avhengigheter | Dere vil ha et eget, fotodrevet uttrykk i slekt med flysteder |
| 2 | Klubbhuset | Pico CSS | Dere vil ha minst mulig å vedlikeholde |
| 3 | Magasin | Tailwind CSS | Nyheter og referater er det viktigste |
| 4 | Klassisk | Bootstrap 5 | Dere vil ha et kjent og trygt klubbsideoppsett |
| 5 | Nordlys | Tailwind + daisyUI | Mest bruk på mobil, og dere ønsker app-følelse |

Kjør lokalt: `npm install && npm run prototyper`, og server så `prototyper/`. Ett enkelt design: `THEME=magasin npm run dev`.
