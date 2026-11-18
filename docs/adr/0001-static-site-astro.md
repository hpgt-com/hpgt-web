# 0001: Static site with Astro instead of WordPress

- **Status:** Accepted
- **Date:** 2026-10

## Context
WordPress at ProISP needed regular updates of the core and plugins, cost web hosting, and had a database and an
online admin panel that volunteers had to keep secure.

## Decision
The site is built as finished HTML files with Astro from Markdown and JSON in Git. The content model
(`src/content.config.ts`) validates every field.

## Consequences
- No server or database to maintain or attack. All history is in Git.
- An error in the content stops the build instead of producing a broken page.
- Dynamic features (forms) must be small Cloudflare Workers of their own.

## Alternatives considered
Hugo (faster, but Go templates are harder for the next volunteer to take over), and staying on WordPress.
