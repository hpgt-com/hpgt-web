# 0005: One token per task, owned by the club

- **Status:** Accepted
- **Date:** 2026-11-18

## Context
Publishing used a personal Cloudflare token with access to every Worker on the account, and the RadioID form was
planned with a personal GitHub token. Both would stop working if the person left the board, and both gave more access
than needed.

## Decision
- Cloudflare: one account token per Worker, made from the Worker itself («API token for external CI/CD»), which can
  only publish that Worker. Renewed yearly.
- The RadioID form: the GitHub App «HPGT Web Forms», owned by the org, installed only on the private repository
  `hpgt-com/radioid-requests` ([0006](0006-radioid-private-intake.md)) with
  «Issues: Read and write» only. The Worker makes a one-hour token per submission.
- Turnstile: one widget per website («hpgt.com skjemaer»), with its own `action` per form.
- Public IDs (site key, App ID, Installation ID) as variables in the environment `produksjon`. Secrets only in
  Cloudflare.

## Consequences
- A leaked token can do one thing only. Nothing depends on one person's account.
- The Cloudflare token must be renewed yearly (a reminder in the board's calendar).

## Alternatives considered
Fine-grained personal tokens (tied to a person, they expire), and one shared Cloudflare token for everything (too
broad).
