# Forslag: ny hpgt.com uten webhotell

**Status:** Prototype, ikke publisert. Fem designforslag på samme innhold og samme løsning.

## 1. Kort oppsummert

| | I dag (ProISP) | Forslag |
|---|---|---|
| Plattform | WordPress + MySQL + PHP, 9 utvidelser (Jetpack, The Events Calendar, NextGEN m.fl.) | Statisk side bygget med **Astro**, kildekode og innhold i **GitHub** |
| Redigering | WordPress-admin | **Pages CMS**: enkel editor i nettleseren, innlogging med e-post (ingen GitHub-konto) |
| Drift | Webhotell ca. 1 000 kr/år, oppdatering av WP og utvidelser | **Cloudflare** (gratis): hosting, DNS, e-postvideresending og tilgangskontroll |
| Angrepsflate | PHP, database, innloggingsside på nett, utvidelser | Bare statiske filer: ingen database, ingen server-kode og ingen innloggingsside på hpgt.com |
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
                                           │ hpgt.com         │  DNS, e-postvideresending
                                           └──────────────────┘
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

## 4. Sikkerhet: zero trust og minste privilegium

| Lag | Tiltak |
|---|---|
| Nettsiden | Bare statiske filer. Strenge HTTP-hoder (`public/_headers`): CSP uten `unsafe-inline`, HSTS, `frame-ancestors 'none'` og `nosniff`. Ingen skjemaer eller skript fra andre. |
| Redigering | Pages CMS sin GitHub App installeres **bare på `hpgt-web`-repoet**, ikke på hele kontoen. E-postbrukere ser bare det `.pages.yml` viser. `site.json`, menyer, kode og arbeidsflyter er utelatt med vilje. |
| Kodeendringer | Bare administratorer har tilgang til repoet. 2FA er påkrevd. Grenbeskyttelse på `main`: ingen force-push eller sletting. |
| Bygg og publisering | GitHub Actions har `contents: read`. Cloudflare-tokenet har bare «Workers Scripts: Edit» og ligger i miljøet `produksjon`, som bare `main` kan bruke. Actions festes til commit-SHA. Dependabot holder avhengigheter oppdatert. |
| Forhåndsvisning før lansering | Kjøres på `ny.hpgt.com` bak **Cloudflare Access**: e-post-OTP, bare styret, gratis opptil 50 brukere. Siden har `noindex` til den lanseres. |
| Personvern | Ingen sporing. Telefonnumre og navn vises bare der det står i dag. RadioID-registeret er frivillig. |
| Gjenoppretting | Hele siden, med all historikk, ligger i Git. Hvis noe går galt, går vi tilbake én commit. Ingen database å ta backup av. |

**Valgfritt, sterkere oppsett (fase 2):** Selvhost Pages CMS på `cms.hpgt.com` bak Cloudflare Access. Da kreves både Access-OTP og CMS-innlogging, og ingen tredjepart har skrivetilgang til repoet. Ulempen er en ekstra komponent å drifte (Node og Postgres).

## 5. Migrering: hva er hentet, og hva gjenstår

Hentet automatisk via WordPress-API-et (`scripts/` og konverteringsskriptet):

| Innhold | Antall | Status |
|---|---|---|
| Innlegg (2012–2026) | 138 | Markdown med dato, kategori og hovedbilde. Referater er samlet i «Møter og referater». |
| Sider | 13 | Alle med. Kontakt, Om oss, Fly med oss og RadioID er skrevet om til redigerbare data. |
| Arrangementer (The Events Calendar) | 17 | Eget arrangementsformat |
| Bilder og PDF-er | 222 | Lokalt, nedskalert til maks 1600 px (36 MB) |
| Innebygde videoer (Vimeo/YouTube) | 19 | Gjort om til lenker, så ingen sporing fra tredjepart |
| Bilder fra andre nettsteder | 8 | Gjort om til lenker. De fleste er døde. |

**Gjenstår før lansering:**
- [ ] **E-POST: viktigst!** `post@`, `leder@` og `faglig.leder@hpgt.com` ligger trolig hos ProISP. Sjekk MX-postene og hvordan e-posten brukes. Løsning: Cloudflare Email Routing (gratis) videresender til private adresser. Hvis noen *sender* fra @hpgt.com, trengs SMTP-oppsett eller gratis Zoho Mail. Det må være på plass **før** webhotellet sies opp.
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
| 2 | Sjekk av e-post og domeneoverføring. Pages CMS settes opp, og 2–3 testbrukere prøver å skrive. |
| 3 | Siste innholdssjekk. DNS for hpgt.com flyttes til Cloudflare-siden, og `noindex` fjernes. |
| 4+ | Webhotellet hos ProISP sies opp når e-post og alt annet er bekreftet. |

## 7. De fem prototypene

| # | Navn | Rammeverk | Passer hvis … |
|---|---|---|---|
| 1 | Fjord | Egen CSS, ingen avhengigheter | Dere vil ha et eget, fotodrevet uttrykk i slekt med flysteder |
| 2 | Klubbhuset | Pico CSS | Dere vil ha minst mulig å vedlikeholde |
| 3 | Magasin | Tailwind CSS | Nyheter og referater er det viktigste |
| 4 | Klassisk | Bootstrap 5 | Dere vil ha et kjent og trygt klubbsideoppsett |
| 5 | Nordlys | Tailwind + daisyUI | Mest bruk på mobil, og dere ønsker app-følelse |

Kjør lokalt: `npm install && npm run prototyper`, og server så `prototyper/`. Ett enkelt design: `THEME=magasin npm run dev`.
