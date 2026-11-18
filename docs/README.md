# Dokumentasjon for hpgt.com

Dokumentasjonen ligger i repoet, ved siden av koden den beskriver, og endres i samme pull request som koden.
Diagrammene er tekst (Mermaid) og vises direkte på GitHub.

| Dokument | Hva | For hvem |
|---|---|---|
| [architecture.md](architecture.md) | Hvordan siden er bygget og henger sammen, med skisser | Alle som skal forstå eller endre løsningen |
| [operations.md](operations.md) | Kontoer, hemmeligheter, rutiner og feilsøking | Administratorer |
| [adr/](adr/) | Beslutninger og hvorfor de ble tatt | Alle som vurderer å endre noe vesentlig |
| [../SECURITY.md](../SECURITY.md) | Sikkerhetstiltak, og hvordan sårbarheter meldes | Alle |
| [../README.md](../README.md) | Kom i gang, mappestruktur for bilder, engelsk versjon | Utviklere |

Redaktører trenger ikke noe av dette: de bruker Pages CMS og siden `/klubben/bidra/`.

## Regler for dokumentasjonen

- **Én fasit.** Står noe i koden eller i en konfigurasjonsfil, beskriv hvor, ikke kopier verdien.
- **Samme PR.** Endrer du oppsett, arbeidsflyt eller kontoer, oppdater dokumentasjonen i samme pull request.
  Endringer gjort i et dashbord (Cloudflare, GitHub-innstillinger) føres inn i [operations.md](operations.md) samme dag.
- **Beslutninger får en ADR.** Større valg (ny tjeneste, ny tilgang, ny måte å publisere på) beskrives i [adr/](adr/).
- **Aldri hemmeligheter.** Repoet er offentlig. Skriv hvor en hemmelighet ligger, aldri verdien.
