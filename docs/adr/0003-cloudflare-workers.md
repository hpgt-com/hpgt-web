# 0003: Cloudflare Workers for the website and DNS

- **Status:** Accepted
- **Date:** 2026-10

## Context
The site needs free, fast hosting with its own security headers, a place for its one server function (the RadioID
form), and DNS that can be managed together with the rest.

## Decision
The Worker `hpgt-web` serves the static files (Workers static assets) and runs only `/api/*` as code. DNS for hpgt.com
moves to Cloudflare (the name servers at Namecheap). Publishing is done from GitHub Actions with Wrangler, not with
Cloudflare's own Git integration.

## Consequences
- Free for our use, and the security headers are in `public/_headers`.
- Domains, Turnstile and redirect rules are set in the Cloudflare dashboard and must be documented in
  `docs/operations.md`.
- At launch: custom domains `hpgt.com` and `www.hpgt.com` on the Worker, a redirect from `www`, then
  `prototype: false`.

## Alternatives considered
GitHub Pages (no custom HTTP headers, no server code) and Cloudflare Workers Builds (it would publish alongside GitHub
Actions, without translation and security checks).
