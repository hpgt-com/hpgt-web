# hpgt.com

The website of Harstad Hang- og Paragliderklubb: a static [Astro](https://astro.build) site, edited in
[Pages CMS](https://pagescms.org), published on Cloudflare.
See **[docs/](docs/README.md)** for architecture, operations and decisions. [FORSLAG.md](FORSLAG.md) is the original
proposal from the migration (in Norwegian), kept for the record.

## For editors
Sign in to Pages CMS, or see `/klubben/bidra/` on the site. You do not need to touch anything here.

## For developers
```bash
npm install
npm run dev                  # development server
npm run build                # builds to dist/ and validates all content
npm run forhandsvisning      # builds the preview (a selection of pages, relative links) to forhandsvisning/
npm run sjekk                # after a build: internal links, and accessibility (axe) in light and dark mode
npm run ikoner               # makes favicon.ico and apple-touch-icon.png from the logo (when the logo changes)
```

| Folder | Contents |
|---|---|
| `src/content/innlegg` | News, minutes and events (Markdown). A post with the field `arrangement` is also shown in the calendar. The address is `permalink`, or the file name for new posts. |
| `src/content/sider` | Fixed pages |
| `src/data/*.json` | Home page, board, RadioID, menu and site settings |
| `src/design` | The «Fjord+» design: `style.css` and the templates Layout, Home, Article, PostList and EventList |
| `src/components` | Shared parts: calendar, cards, RadioID form, board, event fact box |
| `worker/` | The only server code: the forms (RadioID and «Meld feil»), which create GitHub issues through the GitHub App «HPGT Web Forms» |
| `docs/` | Architecture, operations and decisions (ADR) |
| `public/media` | Images and documents, see «Folder structure for images and files» below |
| `scripts/wp-import` | One-off scripts that converted the WordPress export |

The site itself is in Norwegian (with an English version under `/en/`), so folder and field names in the content are
Norwegian, as are many code comments. The documentation is in English, and Norwegian names are explained where they appear.

## Folder structure for images and files

Everything that is uploaded lives in `public/media/` (address `/media/…`), sorted by what it is used for. The folder
names are English. Pages CMS uploads to the right folder by itself (`options.path` per field in `.pages.yml`).

| Folder | Contents | Uploaded from |
|---|---|---|
| `posts/` | Images for news and events | Main image on a post |
| `pages/` | Header images for fixed pages, course pages and the home page | Header image, the home page's images |
| `board/` | Portraits of the board | Board |
| `defaults/` | Default images per category | Default images |
| `competitions/YEAR/` | Everything about one competition: `entries/` (submitted photos) and `sponsors/` (the logos as they were that year) | Competitions |
| `sponsors/NAME/` | The club's regular sponsors, one folder per sponsor. New logo versions next to the old ones, with the year in the name (`logo-2026.svg`) | Added when needed |
| `documents/` | PDFs: minutes, notices, annual reports | Attachments on posts |
| `archive/YEAR/MONTH/` | Everything from WordPress, as it was there | – (read only) |
| `generated/` | Made during the build (video thumbnails), not in Git | – |

Sponsors of a competition live with the competition (the logo as it was that year, even if the sponsor later changes
its logo). The club's regular sponsors live in `sponsors/`. The same company can be in both.

Old `/wp-content/…` addresses are redirected to `archive/` and `competitions/YEAR/entries/` (`public/_redirects`).
The design's own files (logo, scripts) are in `public/assets/`.

**What belongs where:** images used on the site and finished, public documents (signed minutes, annual reports) belong
here. The repository is public: drafts, accounts, member lists and other internal documents belong in the club's
Google Drive, not here, and are best not linked from the website (Drive links break easily and sharing quickly goes
wrong).

## English version

Courses, tandem, flying sites, the club pages, the home page, and news and events also exist in English under `/en/`. Nobody writes the
text twice: on every publish, `scripts/oversett/oversett.mjs` translates new or changed Norwegian text with Claude
(Anthropic API). The translations from the previous publish are fetched from `/en/oversettelser.json`, so unchanged
text is not translated again. All published posts are translated except meeting minutes («Møter og referater»,
`IKKE_OVERSETT` in the script), which stay in Norwegian; English lists link to them with «(in Norwegian)». Fixed texts
(menus, buttons) are in
`src/lib/i18n.ts`.

- No stored key: the job signs in with GitHub's OIDC token (workload identity federation, set up in
  platform.claude.com). The IDs are variables (not secrets) in the environment **oversetting**, limited to `main`:
  `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID` and optionally
  `ANTHROPIC_WORKSPACE_ID`. Without a sign-in the site is published as before, with the previous translations.
- Which pages are translated: `SIDER` at the top of `scripts/oversett/oversett.mjs`.
- English addresses (`/klubben/styret/` → `/en/club/board/`): `src/lib/engelske-adresser.mjs`. Old `/en/…` addresses
  are redirected.
- Testing locally without a key: `OVERSETT_TEST=1 npm run build` gives «[EN] …» texts.

## Security

See [SECURITY.md](SECURITY.md). The repository was made from `hpgt-com/repo-template`. The ruleset for `main` and the
security settings are applied by an org owner:

```bash
./settings/apply.sh repo hpgt-com/hpgt-web --checks bygg   # run from hpgt-com/repo-template
```
