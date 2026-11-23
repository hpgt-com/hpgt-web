# 0003: Cloudflare Workers for nettstedet og DNS

- **Status:** Vedtatt
- **Dato:** 2026-10

## Bakgrunn
Nettstedet trenger gratis, rask hosting med egne sikkerhetshoder, et sted for den ene serverfunksjonen
(RadioID-skjemaet) og DNS som kan styres sammen med resten.

## Beslutning
Workeren `hpgt-web` leverer de statiske filene (Workers static assets) og kjører bare `/api/*` som kode. DNS for
hpgt.com ligger hos Cloudflare (navnetjenerne settes hos Namecheap). Publiseringen gjøres fra GitHub Actions med
Wrangler, ikke med Cloudflares egen Git-integrasjon.

## Konsekvenser
- Gratis for vår bruk, og sikkerhetshodene står i `public/_headers`.
- Domener, Turnstile og videresendingsregler settes utenfor repoet og må dokumenteres i `docs/operations.md`.
- Oppsettet: egne domener (custom domains) `hpgt.com` og `www.hpgt.com` på Workeren, videresending fra `www`, og
  `prototype: false`.

## Alternativer som ble vurdert
GitHub Pages (ingen egne HTTP-hoder, ingen serverkode) og Cloudflare Workers Builds (det ville publisert ved siden av
GitHub Actions, uten oversettelse og sikkerhetssjekker).
