# hpgt.com

Nettstedet til Harstad Hang- og Paragliderklubb: en statisk [Astro](https://astro.build)-side som redigeres i
[Pages CMS](https://pagescms.org) og publiseres på Cloudflare.
Arkitektur, drift og beslutninger står i **[docs/](docs/README.md)**.

## For redaktører
Logg inn i Pages CMS, eller se `/klubben/bidra/` på nettstedet. Ingenting her trenger å endres.

## For utviklere
```bash
npm install
npm run dev                  # utviklingsserver
npm run build                # bygger til dist/ og validerer alt innhold
npm run preview:build        # bygger forhåndsvisningen (et utvalg sider, relative lenker) til preview/
npm run check:site           # etter bygging: interne lenker, og tilgjengelighet (axe) i lys og mørk modus
npm run check:budget         # etter bygging: ytelsesbudsjett per side
npm run test:e2e             # etter bygging: ende-til-ende-tester i Chromium med hodene fra produksjon
node scripts/serve-dist.mjs  # etter bygging: serverer dist/ lokalt som Cloudflare (hoder, videresendinger, 404, /api/*)
npm run icons                # lager favicon.ico og apple-touch-icon.png fra logoen (når logoen endres)
```

| Mappe | Innhold |
|---|---|
| `src/content/posts` | Nyheter, referater og arrangementer (Markdown). Et innlegg med feltet `event` vises også i kalenderen. Adressen er `permalink`, eller filnavnet for nye innlegg. |
| `src/content/pages` | Faste sider, og konkurransesidene i `pages/konkurranser/` (mappenavnet gir adressen `/klubben/konkurranser/ÅR/`) |
| `src/content/courses` | Kurssidene (`/kurs/<filnavn>/`) |
| `src/data/*.json` | Forsiden, styret, RadioID, menyen og innstillingene for nettstedet |
| `src/design` | Designet «Fjord+»: `style.css` og malene Layout, Home, Article, PostList og EventList |
| `src/components` | Felles deler: kalender, kort, RadioID-skjemaet, styret, faktaboksen for arrangementer |
| `worker/` | Den eneste serverkoden: skjemaene (RadioID og «Meld feil»), som lager GitHub-saker gjennom GitHub-appen «HPGT Web Forms» |
| `docs/` | Arkitektur, drift og beslutninger (ADR) |
| `public/media` | Bilder og dokumenter, se «Mappestruktur for bilder og filer» under |
| `scripts/wp-import` | Engangsskript som konverterte WordPress-eksporten |

Nettstedet er på norsk, med en engelsk versjon under `/en/`. Mappe-, fil- og feltnavnene i innholdet er engelske
(`posts`, `title`, `lead`, `event` …), som annen kode. Det redaktørene ser i Pages CMS, er norsk: hver samling og hvert
felt har en norsk `label` i `.pages.yml`. Verdiene (tekster, kategorier, typer, adresser) og filnavnene til innleggene og
sidene er norske, fordi de vises for leserne eller bestemmer adressene. Kodekommentarer og dokumentasjonen er på norsk.

## Mappestruktur for bilder og filer

Alt som lastes opp, ligger i `public/media/` (adressen `/media/…`), sortert etter hva det brukes til. Mappenavnene er
engelske. Pages CMS laster opp til riktig mappe av seg selv (`options.path` per felt i `.pages.yml`).

| Mappe | Innhold | Lastes opp fra |
|---|---|---|
| `posts/` | Bilder til nyheter og arrangementer | Hovedbildet på et innlegg |
| `pages/` | Toppbilder til faste sider, kurssider og forsiden | Toppbilde, bildene på forsiden |
| `board/` | Portretter av styret | Styret |
| `defaults/` | Standardbilder per kategori | Standardbilder |
| `competitions/YEAR/` | Alt om én konkurranse: `entries/` (innsendte bilder) og `sponsors/` (logoene slik de var det året) | Konkurranser |
| `sponsors/NAME/` | Klubbens faste sponsorer, én mappe per sponsor. Nye logoversjoner ligger ved siden av de gamle, med året i navnet (`logo-2026.svg`) | Legges til ved behov |
| `documents/` | PDF-er: referater, innkallinger, årsberetninger | Vedlegg på innlegg |
| `archive/YEAR/MONTH/` | Alt fra WordPress, slik det lå der | – (bare lesing) |
| `generated/` | Lages under bygget (miniatyrbilder for video), ikke i Git | – |

Sponsorene til en konkurranse ligger sammen med konkurransen (logoen slik den var det året, selv om sponsoren senere
bytter logo). Klubbens faste sponsorer ligger i `sponsors/`. Samme firma kan ligge begge steder.

Gamle `/wp-content/…`-adresser sendes videre til `archive/` og `competitions/YEAR/entries/` (`public/_redirects`).
Designets egne filer (logo, skript) ligger i `public/assets/`.

**Bildene tilpasses automatisk** ([beslutning 0008](docs/decisions/0008-image-sizes-in-build.md)). Redaktøren laster
opp ett bilde, og bygget gjør resten: mindre utgaver i WebP (`srcset`), og i teksten kan alle bilder forstørres ved
klikk. Liggende bilder fyller tekstbredden, kvadratiske og stående bilder (QR-koder, mobilbilder) vises høyst 400 px
brede, og flere bilder i ett avsnitt vises i rutenett. Grafikk (plakater, QR-koder, skjermbilder) kjennes igjen på
innholdet og vises mindre: liggende grafikk høyst 560 px på PC og full bredde på mobil, kvadratisk
og stående grafikk høyst 300 px ([beslutning 0010](docs/decisions/0010-graphics-sized-automatically.md)). Bommer regelen,
kan endelsen `-full`, `-half` (380 px) eller `-small` (300 px) på filnavnet (f.eks. `kart-full.png`) overstyre den. Reglene står i
`src/lib/image-sizes.mjs` og `src/lib/rehype-base.mjs`.

**Hva som hører hjemme hvor:** bilder som brukes på nettstedet, og ferdige, offentlige dokumenter (signerte referater,
årsberetninger) hører hjemme her. Repoet er offentlig: utkast, regnskap, medlemslister og andre interne dokumenter
hører hjemme i klubbens Google Drive, ikke her, og lenkes helst ikke fra nettstedet (Drive-lenker brytes lett, og
delingen går fort galt).

## Engelsk versjon

Kurs, tandem, flysteder, klubbsidene, forsiden og nyheter og arrangementer finnes også på engelsk under `/en/`. Ingen
skriver teksten to ganger: ved hver publisering oversetter `scripts/translate/translate.mjs` ny eller endret norsk tekst
med Claude (Anthropic API). Oversettelsene fra forrige publisering hentes fra `/en/oversettelser.json`, så uendret
tekst oversettes ikke på nytt. Alle publiserte innlegg oversettes unntatt møtereferater («Møter og referater»,
`SKIP_CATEGORIES` i skriptet), som blir stående på norsk. Engelske lister lenker til dem med «(in Norwegian)». Faste
tekster (menyer, knapper) ligger i `src/lib/i18n.ts`.

- Ingen lagret nøkkel: jobben logger inn med GitHubs OIDC-token (workload identity federation, satt opp i
  platform.claude.com). ID-ene er variabler (ikke hemmeligheter) i miljøet **translation**, som er begrenset til
  `main`: `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID` og eventuelt
  `ANTHROPIC_WORKSPACE_ID`. Uten innlogging publiseres nettstedet likevel, med de forrige oversettelsene.
- Hvilke sider som oversettes: `PAGES` øverst i `scripts/translate/translate.mjs`.
- Engelske adresser (`/klubben/styret/` → `/en/club/board/`): `src/lib/english-paths.mjs`. Gamle `/en/…`-adresser
  sendes videre.
- Test lokalt uten nøkkel: `TRANSLATE_TEST=1 npm run build` gir «[EN] …»-tekster.
- Bildene: norsk og engelsk side bruker samme filer. Bildeadressene i den engelske teksten hentes fra den norske
  (`scripts/translate/media-paths.mjs`), så et byttet bilde vises på engelsk med en gang.

## Sikkerhet

Se [SECURITY.md](SECURITY.md). Repoet bygger på `hpgt-com/repo-template`. Regelsettet for `main` og
sikkerhetsinnstillingene står i `github.json` i `hpgt-com/operations` og settes med `scripts/apply-settings.mjs` der.
