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
