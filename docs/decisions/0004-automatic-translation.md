# 0004: Automatic translation to English without a stored key

- **Status:** Accepted
- **Date:** 2026-11

## Context
The site should be available in English for visiting pilots, but nobody should write the texts twice.

## Decision
The job `oversett` in «Bygg og publiser» translates new or changed text with Claude (Anthropic API). It signs in with
GitHub's OIDC token (workload identity federation) in the environment `oversetting`, so no API key is stored.
Unchanged text is reused from the previous publish.

## Consequences
- No key that can leak or must be renewed. The federation rule applies only to `main` in this repository.
- A small cost per publish, only for changed text. The credit must be topped up in platform.claude.com.
- If the translation fails, the site is published with the previous translations.

## Alternatives considered
Manual translation (it does not get done), and an API key as a secret (it must be renewed and can leak).
