# 0007: Ett privat mottaksrepo for alle skjemaer

- **Status:** Vedtatt
- **Dato:** 2026-11-18

## Bakgrunn
[0006](0006-radioid-private-intake.md) la RadioID-innmeldingene i et privat repo med navn etter RadioID. Flere skjemaer
er sannsynlige (kurspåmelding, kontakt, å be om tilgang til Pages CMS), og alle går gjennom den samme Workeren og den
samme GitHub-appen «HPGT Web Forms».

## Beslutning
Ett privat repo, `hpgt-com/form-submissions`, tar imot sakene fra alle skjemaene på hpgt.com, med én etikett per skjema
(`radioid`, og senere for eksempel `pamelding`, `tilgang`). Appen er bare installert der. Repoet har ingen kode, ingen
Actions og ingen pull requests.

## Konsekvenser
- Ett sted å ta imot og følge innmeldinger, og appen når fortsatt bare ett repo.
- Tilgang i GitHub gis per repo, ikke per etikett: alle med tilgang ser alle skjemaene. Et skjema som leses av andre,
  eller som inneholder mer følsomme opplysninger (for eksempel kontaktinformasjon eller fødselsdatoer), får et eget
  repo.

## Alternativer som ble vurdert
Ett repo per skjema (flere installasjoner og steder å følge med), og å beholde navnet som bare gjaldt RadioID (en
senere omdøping betyr å flytte saker).
