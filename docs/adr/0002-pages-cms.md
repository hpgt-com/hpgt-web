# 0002: Pages CMS for redaktørene

- **Status:** Vedtatt
- **Dato:** 2026-10

## Bakgrunn
Medlemmer uten GitHub-konto må kunne skrive nyheter og referater, uten at en administrator må gjøre jobben for dem.

## Beslutning
Pages CMS (app.pagescms.org). Administratorer inviterer redaktører med e-post. Appen er installert bare på `hpgt-web`,
og `.pages.yml` bestemmer hvilke felt og filer redaktørene ser. Teknisk oppsett (`site.json`, menyer, kode) er med vilje
utelatt.

## Konsekvenser
- E-postbrukere kan bare endre innhold og media, ikke konfigurasjon eller kode.
- Lagring går rett til `main`. Appen har derfor unntak i regelsettet for `main`. Feil fanges av byggevalideringen, og
  alt kan angres i Git.
- Felt som ikke står i `.pages.yml`, slettes når noen lagrer. Tekniske felt må stå der som `hidden`.

## Alternativer vi vurderte
Sveltia/Decap og Keystatic/TinaCMS krever GitHub-konto eller betalt sky.
