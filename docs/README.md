# Documentation for hpgt.com

The documentation lives in the repository, next to the code it describes, and is changed in the same pull request as
the code. The diagrams are text (Mermaid) and render directly on GitHub.

| Document | What | For whom |
|---|---|---|
| [architecture.md](architecture.md) | How the site is built and fits together, with diagrams | Anyone who needs to understand or change it |
| [operations.md](operations.md) | Accounts, secrets, routines and troubleshooting | Administrators |
| [decisions/](decisions/README.md) | Decisions and why they were made | Anyone considering a significant change |
| [../SECURITY.md](../SECURITY.md) | Security measures, and how to report a vulnerability | Everyone |
| [../README.md](../README.md) | Getting started, folder structure for images, the English version | Developers |

Editors need none of this: they use Pages CMS and the page `/klubben/bidra/`.

[hpgt-com/flying-sites](https://github.com/hpgt-com/flying-sites) follows the same rules (see «Documentation» in its README).

## Rules for the documentation

- **English.** Documentation and ADRs are in English in all the club's repositories. The website itself
  and the help for editors are in Norwegian.
- **One source of truth.** If something is in the code or a configuration file, say where, do not copy the value.
- **Same PR.** If you change setup, a workflow or an account, update the documentation in the same pull request.
  Changes made in a dashboard (Cloudflare, GitHub settings) go into [operations.md](operations.md) the same day.
- **Decisions get an ADR.** Larger choices (a new service, new access, a new way of publishing) are described in
  [decisions/](decisions/README.md).
- **Never secrets.** The repository is public. Write where a secret lives, never its value.
