# 0003: Cloudflare Workers for nettsiden og DNS

- **Status:** Vedtatt
- **Dato:** 2026-10

## Bakgrunn
Siden trenger gratis, rask hosting med egne sikkerhetshoder, et sted for den ene serverfunksjonen (RadioID-skjemaet), og
DNS som kan styres sammen med resten.

## Beslutning
Workeren `hpgt-web` serverer de statiske filene (Workers static assets) og kjører bare `/api/*` som kode. DNS for
hpgt.com flyttes til Cloudflare (navnetjenerne hos Namecheap). Publisering skjer fra GitHub Actions med Wrangler, ikke
med Cloudflares egen Git-integrasjon.

## Konsekvenser
- Gratis for vårt bruk, og sikkerhetshodene står i `public/_headers`.
- Domener, Turnstile og redirect-regler settes i Cloudflare-dashbordet og må dokumenteres i `docs/operations.md`.
- Ved lansering: custom domains `hpgt.com` og `www.hpgt.com` på workeren, redirect fra `www`, så `prototype: false`.

## Alternativer vi vurderte
GitHub Pages (ingen egne HTTP-hoder, ingen serverkode) og Cloudflare Workers Builds (ville publisert ved siden av
GitHub Actions, uten oversettelse og sikkerhetssjekker).
