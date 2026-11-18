# 0007: One private intake repository for all forms

- **Status:** Accepted
- **Date:** 2026-11-18

## Context
[0006](0006-radioid-private-intake.md) put the RadioID submissions in a private repository named for RadioID. More forms
are likely (course sign-up, contact, asking for access to Pages CMS), and they all go through the same Worker and the
same GitHub App «HPGT Web Forms».

## Decision
One private repository, `hpgt-com/form-submissions`, takes the issues from every form on hpgt.com, with one label per
form (`radioid`, and later for example `pamelding`, `tilgang`). The app is installed there only. It has no code, no
Actions and no pull requests.

## Consequences
- One place to receive and watch submissions, and the app's reach stays one repository.
- Access in GitHub is per repository, not per label: everyone with access sees every form. A form that is read by other
  people, or holds more sensitive data (for example contact details or dates of birth), gets a repository of its own.

## Alternatives considered
One repository per form (more installations and places to watch), and keeping the RadioID-only name (a rename later
means moving issues).
