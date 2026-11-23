# Dokumentasjon for hpgt.com

Dokumentasjonen ligger i repoet, ved siden av koden den beskriver, og endres i samme pull request som koden.
Diagrammene er tekst (Mermaid) og vises direkte på GitHub.

| Dokument | Hva | For hvem |
|---|---|---|
| [architecture.md](architecture.md) | Hvordan nettstedet er bygd og henger sammen, med diagrammer | Alle som skal forstå eller endre det |
| [operations.md](operations.md) | Kontoer, hemmeligheter, rutiner og feilsøking | Administratorer |
| [decisions/](decisions/README.md) | Beslutninger og hvorfor de ble tatt | Alle som vurderer en større endring |
| [../SECURITY.md](../SECURITY.md) | Sikkerhetstiltak, og hvordan en sårbarhet rapporteres (på engelsk) | Alle |
| [../README.md](../README.md) | Kom i gang, mappestrukturen for bilder, den engelske versjonen | Utviklere |

Redaktører trenger ingenting av dette: de bruker Pages CMS og siden `/klubben/bidra/`.

[hpgt-com/flying-sites](https://github.com/hpgt-com/flying-sites) følger de samme reglene (se «Documentation» i README-en
der).

## Regler for dokumentasjonen

- **Norsk.** Dokumentasjon og ADR-er er på norsk. Filnavn, kode og identifikatorer er på engelsk. Selve nettstedet er
  på norsk, med en engelsk versjon. `SECURITY.md` er på engelsk.
- **Én kilde.** Står noe i koden eller i en konfigurasjonsfil, skriv hvor, ikke kopier verdien.
- **Samme PR.** Endres oppsett, en arbeidsflyt eller en konto, oppdateres dokumentasjonen i samme pull request.
  Endringer gjort i et dashbord (Cloudflare, GitHub-innstillinger) føres inn i [operations.md](operations.md) samme dag.
- **Beslutninger får en ADR.** Større valg (en ny tjeneste, ny tilgang, en ny måte å publisere på) beskrives i
  [decisions/](decisions/README.md).
- **Aldri hemmeligheter.** Repoet er offentlig. Skriv hvor en hemmelighet ligger, aldri verdien.
