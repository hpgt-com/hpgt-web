# hpgt.com

Nettsiden til Harstad Hang- og Paragliderklubb: statisk [Astro](https://astro.build)-side, redigert i [Pages CMS](https://pagescms.org), publisert på Cloudflare.
Les **[FORSLAG.md](FORSLAG.md)** for arkitektur, sikkerhet og migreringsplan.

## For redaktører
Logg inn på Pages CMS, eller se `/bidra/` på siden. Du trenger ikke røre noe her.

## For utviklere
```bash
npm install
npm run dev                  # utviklingsserver
npm run build                # bygger til dist/ og validerer alt innhold
npm run forhandsvisning      # bygger forhåndsvisningen (utvalg sider, relative lenker) til forhandsvisning/
```

| Mappe | Innhold |
|---|---|
| `src/content/innlegg` | Nyheter, referater og arrangementer (Markdown). Et innlegg med feltet `arrangement` vises også i kalenderen. Adressen er `permalink`, eller filnavnet for nye saker. |
| `src/content/sider` | Faste sider |
| `src/data/*.json` | Forside, styret, RadioID, meny og nettstedsinnstillinger |
| `src/design` | Designet «Fjord+»: `style.css` og malene Layout, Home, Article, PostList og EventList |
| `src/components` | Felles deler: kalender, kort, RadioID-skjema, styret, faktaboks for arrangementer |
| `worker/index.js` | Den eneste serverkoden: RadioID-skjemaet, som lager en GitHub-issue |
| `public/wp-content/uploads` | Bilder og PDF-er fra WordPress (samme adresser som før) |
| `public/filer` | Nye opplastinger fra CMS-et |
| `scripts/wp-import` | Engangsskript som konverterte WordPress-eksporten |

## Engelsk versjon

Kurs, tandem, flysteder, klubbsidene og forsiden finnes også på engelsk under `/en/`. Ingen skriver teksten to ganger:
ved hver publisering oversetter `scripts/oversett/oversett.mjs` ny eller endret norsk tekst med Claude (Anthropic API).
Oversettelsene fra forrige publisering hentes fra `/en/oversettelser.json`, så uendret tekst oversettes ikke på nytt.
Nyheter og arrangementer er bare på norsk. Faste tekster (menyer, knapper) står i `src/lib/i18n.ts`.

- Ingen lagret nøkkel: jobben logger inn med GitHubs OIDC-token (workload identity federation, satt opp i
  platform.claude.com). ID-ene ligger som variabler (ikke hemmeligheter) i miljøet **oversetting**, begrenset til `main`:
  `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID` og ev. `ANTHROPIC_WORKSPACE_ID`.
  Uten innlogging publiseres siden som før, med de forrige oversettelsene.
- Hvilke sider som oversettes: `SIDER` øverst i `scripts/oversett/oversett.mjs`.
- Teste lokalt uten nøkkel: `OVERSETT_TEST=1 npm run build` gir «[EN] …»-tekster.

## Sikkerhet

Se [SECURITY.md](SECURITY.md). Repoet er laget fra `hpgt-com/repo-template`. Regelsettet for `main` og sikkerhetsinnstillingene settes av en org-eier:

```bash
./settings/apply.sh repo hpgt-com/hpgt-web --checks bygg   # kjøres fra hpgt-com/repo-template
```

