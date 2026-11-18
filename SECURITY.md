# Security

## Reporting a security issue

Do not open a public issue. Use **Report a vulnerability** under this repository's **Security** tab, so only the
maintainers see the report. Describe what you found, how to reproduce it and what it affects. We reply as soon as we
can, but this is a volunteer club project.

## What is in place

- All changes to `main` go through a pull request (branch ruleset «Main protection»). Force push and deletion of `main`
  are blocked.
- Required checks: `dependency-review` (no dependencies with known vulnerabilities), `workflow-security` (zizmor) and
  `bygg` (the whole site builds and every content file is valid), plus CodeQL code scanning (high or higher blocks the merge).
- Actions are pinned to commit SHAs and updated monthly by Dependabot, with a 7-day cooldown.
- Workflows get read-only access by default; jobs ask for more only when they need it. `persist-credentials: false`
  on every checkout.
- Secrets live in GitHub environments limited to `main`, never in the code. `.gitignore` blocks `.env` and key files.
- Secret scanning with push protection, Dependabot alerts and security updates are on.

## This repository

- **What is published:** hpgt.com, a static Astro site, on Cloudflare Workers (static assets). The only server code is
  `worker/index.js`, which turns the RadioID form into a GitHub issue.
- **Who edits:** club members through Pages CMS. The Pages CMS GitHub App is installed on this repository only, and
  email collaborators can edit content and media, not code, workflows or settings (`.pages.yml`).
- **Keys:**
  - `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment `produksjon` (main only). The token has
    «Workers Scripts: Edit» on the club's account and nothing else. Only the `publiser` job uses it, and that job runs
    no code from the repository.
  - `TURNSTILE_SECRET` and `GITHUB_APP_PRIVATE_KEY` for the form are Cloudflare secrets, not GitHub secrets. The
    issues are made by the club's GitHub App «HPGT Web Forms» in the private repository `hpgt-com/form-submissions`
    (the app is installed there only, «Issues: Read and
    write» only). For each submission the Worker asks for a one-hour token limited to this repository and Issues: write
    (`worker/github-app.js`), so there is no personal or long-lived token.
  - `TURNSTILE_SITEKEY`, `GH_APP_ID` and `GH_APP_INSTALLATION_ID` are not secret. They are variables in `produksjon`,
    checked and inserted by the `publiser` job; other builds use Cloudflare's Turnstile test key.
- **Editors:** the Pages CMS app may save straight to `main` (bypass in the ruleset). The first job in the publish
  workflow (`vakt`) stops the publish and opens an issue if a commit that did not come through a merged pull request
  changes anything other than the content (`src/content/`, `public/media/` and the CMS's JSON files). The build
  (`scripts/sjekk-media.mjs`) stops if `public/media/` holds anything other than images and PDFs, so an upload cannot
  put an HTML page or a script on hpgt.com.
- **Publishing:** Wrangler is pinned to a fixed version in the `publiser` job, since that job holds the Cloudflare
  token.
- **Content security:** strict CSP without `unsafe-inline` (`public/_headers`), no third-party scripts except
  Cloudflare Turnstile on the RadioID page, no tracking, no cookies.
