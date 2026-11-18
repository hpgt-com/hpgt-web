# 0006: RadioID submissions in a private repository

- **Status:** Accepted
- **Date:** 2026-11-18

## Context
The RadioID form created its issues in `hpgt-web`, which is public. A submission holds a name, a RadioID, equipment
and an optional comment, and a request to be removed would itself publish a new link between the name and the RadioID.
Closing an issue does not hide it. Found in the security review of 18.11.2026.

## Decision
The Worker creates the issues in the private repository `hpgt-com/radioid-requests`. The GitHub App «HPGT Web Forms» is
installed there only. Only the finished entry (name, RadioID, vario) is published, in `src/data/radioid.json`. The
form says who reads the submission and the comment, and that it is not public.

## Consequences
- Nothing a pilot writes in the form is public. Removal requests do not leave a public trace.
- The maintainers must have access to the private repository and watch its issues.
- The app's token can still only create issues, now in a repository with no code.

## Alternatives considered
E-mail to the maintainer (no history, easily lost in an inbox), and keeping the issues public (personal data in a
public repository).
