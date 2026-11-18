# 0005: Ett token per oppgave, eid av klubben

- **Status:** Vedtatt
- **Dato:** 2026-11-18

## Bakgrunn
Publiseringen brukte et personlig Cloudflare-token med tilgang til alle workers på kontoen, og RadioID-skjemaet var
tenkt med et personlig GitHub-token. Begge sluttet å virke om personen forlot styret, og ga mer tilgang enn nødvendig.

## Beslutning
- Cloudflare: ett kontotoken per worker, laget fra workeren selv («API token for external CI/CD»), som bare kan
  publisere den workeren. Fornyes hvert år.
- RadioID-skjemaet: GitHub-appen «HPGT Web Forms», eid av org-en, installert bare på `hpgt-web` med bare
  «Issues: Read and write». Workeren lager et token for én time per innsending.
- Turnstile: én widget per nettsted («hpgt.com skjemaer»), med egen `action` per skjema.
- Offentlige ID-er (site key, App ID, Installation ID) som variabler i miljøet `produksjon`. Hemmeligheter bare i
  Cloudflare.

## Konsekvenser
- Lekker et token, kan det bare gjøre én ting. Ingenting avhenger av én persons konto.
- Cloudflare-tokenet må fornyes hvert år (påminnelse i styrets kalender).

## Alternativer vi vurderte
Fine-grained personlige tokens (knyttet til en person, utløper), og ett felles Cloudflare-token for alt (for bredt).
