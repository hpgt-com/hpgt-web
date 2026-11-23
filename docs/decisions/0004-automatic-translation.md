# 0004: Automatisk oversettelse til engelsk uten lagret nøkkel

- **Status:** Vedtatt
- **Dato:** 2026-11

## Bakgrunn
Nettstedet skal finnes på engelsk for besøkende piloter, men ingen skal skrive tekstene to ganger.

## Beslutning
Jobben `translate` i «Bygg og publiser» oversetter ny eller endret tekst med Claude (Anthropic API). Den logger inn med
GitHubs OIDC-token (workload identity federation) i miljøet `oversetting`, så ingen API-nøkkel er lagret. Uendret
tekst gjenbrukes fra forrige publisering.

## Konsekvenser
- Ingen nøkkel som kan lekke eller må fornyes. Federation-regelen gjelder bare `main` i dette repoet.
- En liten kostnad per publisering, bare for endret tekst. Kreditten må fylles på i platform.claude.com.
- Feiler oversettelsen, publiseres nettstedet med de forrige oversettelsene.

## Alternativer som ble vurdert
Manuell oversettelse (den blir ikke gjort), og en API-nøkkel som hemmelighet (den må fornyes og kan lekke).
