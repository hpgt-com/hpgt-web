# Operations: accounts, secrets and routines

The operations handbook for hpgt.com. It should let a new administrator take over without asking the previous one.
How the site fits together is in [architecture.md](architecture.md), and why it is built this way in
[adr/](adr/README.md).

**Rule:** if you change setup, accounts or keys, update this file in the same pull request (or in a separate PR the same
day, if the change was made in a dashboard).

## Where do I change what?

| Setting | Where |
|---|---|
| Address, e-mail addresses, org. no., Vipps, Facebook and Instagram, the link to flysteder | `src/data/site.json` |
| Preview mode (`prototype`), the default share image (`delingsbilde`), the Web Analytics token (`statistikk`) | `src/data/site.json` |
| Menus and sections | `src/data/meny.json` |
| Content, the board, the RadioID register, default images | Pages CMS |
| The Turnstile site key, the GitHub App IDs | GitHub → `hpgt-web` → Settings → Environments → `produksjon` (variables) |
| Secrets (Turnstile secret, the app key, the Cloudflare token) | Cloudflare and `produksjon`, never in files (see [Secrets and variables](#secrets-and-variables)) |

A value lives outside the repository only when it is secret or only the publish job may use it. Everything else is in
`site.json`, changed with one pull request.

## What is in Git, and what is not

Git is the source of truth for everything that can live there. The rest is set by hand in a dashboard and is therefore
listed here, so it is not forgotten.

| In Git (changed through a pull request) | Outside Git (set by hand, documented below) |
|---|---|
| Content, design, code | Secrets in Cloudflare and in GitHub environments |
| Build and publishing (`.github/workflows/`) | Cloudflare: custom domains, the Turnstile widget, redirect rules, DNS |
| The Worker's Cloudflare setup (`wrangler.jsonc`), including that the `workers.dev` address and preview URLs are off | The GitHub environments and their variables |
| Security headers and redirects (`public/_headers`, `_redirects`) | The GitHub Apps and where they are installed |
| The ruleset for `main` (`settings/ruleset-main.json`, applied with `settings/apply.sh`), including the bypass for the Pages CMS app (ID 866529) | Pages CMS: who is invited |
| What editors see (`.pages.yml`) | Anthropic: the federation rule and the service account |

## Accounts

| Account | What | Owner / who has access |
|---|---|---|
| GitHub org `hpgt-com` | The repositories `hpgt-web`, `flying-sites`, `repo-template`, `.github` | Org owners (2FA required) |
| Cloudflare account «HPGT» | The Worker `hpgt-web`, DNS for hpgt.com, Turnstile, Web Analytics | The account's members |
| Namecheap | Registrar for hpgt.com (the name servers point to Cloudflare) | Whoever holds the registrar access |
| Google Workspace | E-mail on @hpgt.com (MX, SPF, DKIM and DMARC are in Cloudflare DNS) | Workspace administrator |
| platform.claude.com (Anthropic) | Translation to English, paid with prepaid credit | The organisation's administrators |
| Pages CMS (app.pagescms.org) | The editor. Administrators sign in with GitHub, editors with e-mail | Administrators invite editors |

When someone leaves the board: remove them from each account above, and check that at least two people still have
owner access to the GitHub org and to Cloudflare.

## Secrets and variables

| Name | Where | Type | What | Renewed |
|---|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub `hpgt-web` → Environments → `produksjon` | Secret | Publishes the Worker `hpgt-web`, and only that. Made under Cloudflare → Workers & Pages → hpgt-web → Settings → Builds → «API token for external CI/CD» | Yearly |
| `CLOUDFLARE_ACCOUNT_ID` | Same environment | Secret | Which Cloudflare account | Never |
| `TURNSTILE_SITEKEY` | Same environment | Variable | The public key of the Turnstile widget «hpgt.com skjemaer». Inserted when publishing | With a new widget |
| `GH_APP_ID`, `GH_APP_INSTALLATION_ID` | Same environment | Variable | The GitHub App «HPGT Web Forms» and its installation, which covers only the private repository `hpgt-com/form-submissions` | Never |
| `TURNSTILE_SECRET` | Cloudflare → Workers & Pages → hpgt-web → Settings → Variables and Secrets | Secret | The Worker's check of Turnstile answers | If it may have leaked |
| `GITHUB_APP_PRIVATE_KEY` | Same place | Secret | The app's private key (.pem). The Worker makes one-hour tokens with it | If it may have leaked |
| `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID`, `ANTHROPIC_WORKSPACE_ID` | GitHub `hpgt-web` → Environments → `oversetting` | Variables | Which federation rule and service account the sign-in uses. No key is stored | Never |
| Cloudflare Web Analytics token | `src/data/site.json` → `statistikk` | In Git (public) | Anonymous visitor statistics. Empty = off | – |

Both environments (`produksjon` and `oversetting`) are limited to the branch `main`.

## Routines

### Invite a new editor
1. Sign in to app.pagescms.org with GitHub, open `hpgt-web` → **Collaborators** → **Invite** with the e-mail address.
2. The editor gets an e-mail and signs in with it. They see only what `.pages.yml` shows.
3. Remove them in the same place when they should no longer write.

### Renew the Cloudflare token (yearly)
1. Cloudflare → Workers & Pages → `hpgt-web` → Settings → Builds → **Create token**. Name:
   `hpgt-web publish (worker hpgt-web)`, lifetime 12 months.
2. GitHub → `hpgt-web` → Settings → Environments → `produksjon` → `CLOUDFLARE_API_TOKEN` → paste it.
3. Actions → «Bygg og publiser» → **Run workflow**. When it is green: delete the old token under Cloudflare → Manage
   Account → Account API Tokens.
4. Add a new reminder in the board's calendar a month before the next expiry.

When the token has expired, «Bygg og publiser» goes red on the job `publiser`, and changes from Pages CMS do not go out
until the token is replaced.

### Handle a RadioID submission
1. An issue arrives in the **private** repository `hpgt-com/form-submissions` with the label `radioid` (watch it with
   **Watch → Custom → Issues** to get e-mail). Submissions hold names and comments, so they are never in a public
   repository; only the finished entry is published, in `radioid.json`.
2. Update the register in Pages CMS (RadioID) and save.
3. Close the issue.

### Replace the key of the GitHub App «HPGT Web Forms»
1. hpgt-com → Settings → Developer settings → GitHub Apps → HPGT Web Forms → **Generate a private key**.
2. Paste the .pem content as `GITHUB_APP_PRIVATE_KEY` in Cloudflare (see the table), and delete the file.
3. Test the form, and delete the old key on the app page.

### Add a page to the English version
1. Add the page's file name (without `.md`) to `SIDER` in `scripts/oversett/oversett.mjs`.
2. If its Norwegian address should have an English one, add it to `src/lib/engelske-adresser.mjs`.
3. Pull request. The translation happens on the next publish.

### Add a new form
Use the Turnstile widget «hpgt.com skjemaer» with a new `action`, give its issues their own label in
`hpgt-com/form-submissions` (or its own private repository if other people should read it, see ADR 0007), add the page to `SKJEMASIDER` in
`src/components/Head.astro` and to `public/_headers`, and check the `action` in the Worker. No new widget or keys.

### Apply the ruleset for `main`
`settings/apply.sh` is run by an org owner from `hpgt-com/repo-template`. The template's ruleset does not have the
bypass for the Pages CMS app, so use this repository's `settings/ruleset-main.json`, or add the bypass again
afterwards (Settings → Rules → Main protection → Bypass list → the Pages CMS app, «Always»). Without it, saving in
Pages CMS fails with «Changes must be made through a pull request».

### Roll back a publish
- **Fastest:** Cloudflare → Workers & Pages → `hpgt-web` → **Deployments** → choose the previous version →
  **Rollback**.
- **For good:** `git revert` of the change in a pull request. The next publish then puts out the right version, and Git
  is the source of truth again. A rollback in Cloudflare alone is overwritten by the next publish.

### When publishing fails

| Symptom | Likely cause | Fix |
|---|---|---|
| `bygg` fails after saving in Pages CMS | An invalid field (date, type, a missing image) | Read the error message, fix the post in the CMS |
| `publiser` fails with an authentication error | The Cloudflare token has expired or was deleted | Renew the token (see above) |
| `vakt` fails and an issue «Publisering stoppet: Pages CMS endret filer utenfor innholdet» is opened | A commit saved straight to `main` (from Pages CMS, without a pull request) changed files outside the content | Find out who saved and why. If it was not intended: `git revert` of the commit in a pull request, and check the editor's account. If it was: make the change again in a pull request. Publishing resumes when the files are back as at the last publish |
| `vakt` fails with «Kunne ikke slå opp …» or «Uventet svar …» | A GitHub lookup failed, so the change could not be checked in full | Run the workflow again. It never publishes on a partial check |
| `bygg` stops at `sjekk-media` | A file in `public/media/` that is not an image or a PDF | Remove it, or replace it with an image or PDF |
| `publiser` stops at «Sett inn skjemaenes ID-er» | A variable in `produksjon` is missing or has the wrong format | Fix the variable and run again |
| `oversett` warns about the sign-in | The Anthropic federation, the credit or the IDs | The site is still published with the previous translations. Check platform.claude.com |
| The RadioID form answers «Noe gikk galt hos oss» | The app key, the app's installation or the IDs | Check that the app is installed on `form-submissions` and that the key in Cloudflare is right |

## Launch and the domain

The launch order is in the pull request «Lansering» and in [adr/0003](adr/0003-cloudflare-workers.md): name servers
to Cloudflare, custom domains `hpgt.com` and `www.hpgt.com` on the Worker, a redirect rule from `www`, and then
`prototype: false`.

E-mail is at Google and is not affected by the website, but its DNS records (MX, SPF, DKIM `google._domainkey`, DMARC)
must be in Cloudflare DNS.

## Backup

All content and all code are in Git, with the full history, and are also cloned locally by the administrators. There
is no database. The secrets are not in Git: do not keep them anywhere other than where the table above says, and make
new ones when needed instead.
