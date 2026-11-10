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
  - `TURNSTILE_SECRET` and `GITHUB_TOKEN` for the form are Cloudflare secrets (`wrangler secret put`), not GitHub
    secrets. The GitHub token is fine-grained: this repository only, «Issues: Read and write» only.
- **Content security:** strict CSP without `unsafe-inline` (`public/_headers`), no third-party scripts except
  Cloudflare Turnstile on the RadioID page, no tracking, no cookies.
