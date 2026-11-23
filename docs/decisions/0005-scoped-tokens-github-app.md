# 0005: Ett token per oppgave, eid av klubben

- **Status:** Vedtatt
- **Dato:** 2026-11-18

## Bakgrunn
Publiseringen brukte et personlig Cloudflare-token med tilgang til alle Workere i kontoen, og RadioID-skjemaet var
planlagt med et personlig GitHub-token. Begge ville sluttet å virke hvis personen gikk ut av styret, og begge ga mer
tilgang enn nødvendig.

## Beslutning
- Cloudflare: ett kontotoken per Worker, laget fra selve Workeren («API token for external CI/CD»), som bare kan
  publisere den Workeren. Fornyes årlig.
- RadioID-skjemaet: GitHub-appen «HPGT Web Forms», eid av organisasjonen, bare installert på det private repoet
  `hpgt-com/form-submissions` ([0006](0006-radioid-private-intake.md), [0007](0007-one-intake-repository-for-forms.md))
  med bare «Issues: Read and write». Workeren lager et token for én time per innsending.
- Turnstile: én widget per nettsted («hpgt.com skjemaer»), med egen `action` per skjema.
- Offentlige ID-er (nettstedsnøkkel, App ID, Installation ID) som variabler i miljøet `production`. Hemmeligheter bare
  i Cloudflare.

## Konsekvenser
- Et token som lekker, kan bare gjøre én ting. Ingenting avhenger av én persons konto.
- Cloudflare-tokenet må fornyes årlig (en påminnelse i styrets kalender).

## Alternativer som ble vurdert
Finkornede personlige tokens (knyttet til en person, de utløper), og ett felles Cloudflare-token for alt (for vid
tilgang).
