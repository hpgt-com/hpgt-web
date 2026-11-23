# AGENTS.md

Instruksjoner for kodeagenter og andre som jobber i repoet. Beskrivelsen av prosjektet står i [README.md](README.md).

## Prosjektet

Nettsiden hpgt.com: en statisk Astro-side som redigeres i Pages CMS og publiseres som Cloudflare Worker med statiske
filer. Den eneste serverkoden er skjemaendepunktet i `worker/`. Arkitektur, drift og beslutninger står i
[docs/](docs/README.md).

## Kommandoer

| Kommando | Når |
|---|---|
| `npm ci --ignore-scripts` | Etter kloning og etter endringer i låsefilen |
| `npm run dev` | Utviklingsserver |
| `npm run build` | Før hver pull request: bygger til `dist/` og kontrollerer innholdet |
| `npm run check` | Etter endringer i koden (`astro check`) |
| `npm test` | Etter endringer i `worker/`: enhetstestene i `test/` |
| `npm run sjekk` | Etter bygget: interne lenker og tilgjengelighet (axe) i lys og mørk visning |
| `npm run check:budget` | Etter bygget: ytelsesbudsjettet per side (`scripts/check-budget.mjs`) |

## Regler

- Følg de felles retningslinjene i https://github.com/hpgt-com/guidelines.
- Alle endringer går via pull request med grønne sjekker. Ikke push til `main`.
- Oppdater dokumentasjonen i samme pull request som endringen.
- Ingen hemmeligheter, tokens eller private opplysninger i repoet. Repoet er offentlig.
- Sikkerhetshodene og CSP står i `public/_headers`. Nye kilder for skript, bilder eller rammer legges til der, på
  sidene som trenger dem.
- Skript og stilark ligger i egne filer. Ingen innebygd kode i HTML og ingen `innerHTML`.
- Skjemaendepunktet i `worker/` følger reglene for serverløse endepunkter i websikkerhet.
- Innhold under `src/content/` og `src/data/` redigeres også i Pages CMS, som committer rett til `main`.
  Feltnavn som brukes i `.pages.yml`, endres sammen med den.
- Filer under `src/pages/` følger språket i adressen.
