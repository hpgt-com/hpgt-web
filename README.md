# hpgt.com

Nettsiden til Harstad Hang- og Paragliderklubb: statisk [Astro](https://astro.build)-side, redigert i [Pages CMS](https://pagescms.org), publisert på Cloudflare.
Les **[FORSLAG.md](FORSLAG.md)** for arkitektur, sikkerhet og migreringsplan.

## For redaktører
Logg inn på Pages CMS, eller se `/bidra/` på siden. Du trenger ikke røre noe her.

## For utviklere
```bash
npm install
npm run dev                  # utviklingsserver (design: THEME=fjord|pico|magasin|klassisk|nordlys)
npm run build                # bygger til dist/ og validerer alt innhold
npm run prototyper           # bygger alle fem design side om side i prototyper/
```

| Mappe | Innhold |
|---|---|
| `src/content/innlegg` | Nyheter og referater (Markdown) – adressen er `permalink`, eller filnavnet for nye saker |
| `src/content/sider` | Faste sider |
| `src/content/arrangementer` | Arrangementer |
| `src/data/*.json` | Forside, styret, RadioID, meny og nettstedsinnstillinger |
| `src/themes/<navn>` | De fem designforslagene (Layout, Home, Article, PostList, EventList) |
| `public/wp-content/uploads` | Bilder og PDF-er fra WordPress (samme adresser som før) |
| `public/filer` | Nye opplastinger fra CMS-et |
| `scripts/wp-import` | Engangsskript som konverterte WordPress-eksporten |
