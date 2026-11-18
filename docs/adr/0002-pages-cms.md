# 0002: Pages CMS for the editors

- **Status:** Accepted
- **Date:** 2026-10

## Context
Members without a GitHub account must be able to write news and minutes, without an administrator doing it for them.

## Decision
Pages CMS (app.pagescms.org). Administrators invite editors by e-mail. The app is installed on `hpgt-web` only, and
`.pages.yml` decides which fields and files editors see. Technical setup (`site.json`, menus, code) is left out on
purpose.

## Consequences
- E-mail users can change content and media only, not configuration or code.
- Saving goes straight to `main`, so the app has a bypass in the ruleset for `main`. Mistakes are caught by the build
  validation, and everything can be undone in Git.
- Fields not listed in `.pages.yml` are removed when someone saves. Technical fields must be listed there as `hidden`.

## Alternatives considered
Sveltia/Decap and Keystatic/TinaCMS need a GitHub account or a paid cloud.
