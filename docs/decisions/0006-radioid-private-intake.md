# 0006: RadioID-innmeldinger i et privat repo

- **Status:** Vedtatt. Repoet ble omdøpt i [0007](0007-one-intake-repository-for-forms.md): `hpgt-com/form-submissions`
- **Dato:** 2026-11-18

## Bakgrunn
RadioID-skjemaet lagde sakene sine i `hpgt-web`, som er offentlig. En innmelding inneholder navn, RadioID, utstyr og en
valgfri kommentar, og et ønske om å bli fjernet ville selv publisere en ny kobling mellom navnet og RadioID-en. Å lukke
en sak skjuler den ikke. Funnet i en sikkerhetsgjennomgang.

## Beslutning
Workeren lager sakene i det private repoet `hpgt-com/radioid-requests` (omdøpt til `hpgt-com/form-submissions` i
[0007](0007-one-intake-repository-for-forms.md); resten av denne ADR-en bruker navnet slik det ble besluttet).
GitHub-appen «HPGT Web Forms» er bare installert der. Bare den ferdige oppføringen (navn, RadioID, vario) publiseres, i
`src/data/radioid.json` (nå `radio-id.json`). Skjemaet sier hvem som leser innmeldingen og kommentaren, og at den ikke er offentlig.

## Konsekvenser
- Ingenting en pilot skriver i skjemaet, er offentlig. Ønsker om fjerning etterlater ikke offentlige spor.
- De som vedlikeholder registeret, må ha tilgang til det private repoet og følge sakene der.
- Tokenet til appen kan fortsatt bare lage saker, nå i et repo uten kode.

## Alternativer som ble vurdert
E-post til den som vedlikeholder registeret (ingen historikk, forsvinner lett i innboksen), og å beholde sakene
offentlige (personopplysninger i et offentlig repo).
