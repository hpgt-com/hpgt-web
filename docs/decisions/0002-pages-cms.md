# 0002: Pages CMS for redaktørene

- **Status:** Vedtatt
- **Dato:** 2026-10

## Bakgrunn
Medlemmer uten GitHub-konto må kunne skrive nyheter og referater uten at en administrator gjør det for dem.

## Beslutning
Pages CMS (app.pagescms.org). Administratorer inviterer redaktører med e-post. Appen er bare installert på `hpgt-web`,
og `.pages.yml` bestemmer hvilke felt og filer redaktørene ser. Teknisk oppsett (`site.json`, menyer, kode) er utelatt
med vilje.

## Konsekvenser
- E-postbrukere kan bare endre innhold og media, ikke konfigurasjon eller kode.
- Lagring går rett til `main`, så appen har et unntak i regelsettet for `main`. Feil fanges av kontrollen i bygget, og
  alt kan angres i Git.
- På grunn av unntaket kan en kapret redaktørkonto eller et innbrudd hos Pages CMS endre kode. Publiseringsflyten
  stopper derfor hvis en commit uten pull request endrer noe utenfor innholdet (jobben `vakt`), og opplastinger er
  begrenset til bilder og PDF-er.
- Felt som ikke står i `.pages.yml`, fjernes når noen lagrer. Tekniske felt må stå der som `hidden`.

## Alternativer som ble vurdert
Sveltia/Decap og Keystatic/TinaCMS krever GitHub-konto eller en betalt skytjeneste.
