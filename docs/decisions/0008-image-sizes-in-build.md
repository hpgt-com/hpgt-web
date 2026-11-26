# 0008: Bildestørrelser lages i bygget, og bildene i teksten tilpasses automatisk

- **Status:** Vedtatt
- **Dato:** 2026-11-26

## Bakgrunn
Redaktørene laster opp ett bilde i Pages CMS, ofte et mobilbilde eller en plakat. Før denne beslutningen ble bildet bare
skalert ned til høyst 1600 px. Alle fikk samme fil, også mobilen. Bildet ble vist i sin egen bredde opptil hele
tekstbredden, så en kvadratisk QR-kode ble like bred som teksten, og bare bilder som var lenket til seg selv (de fleste fra
WordPress) kunne forstørres. Skulle et bilde vises mindre, måtte redaktøren endre bildet selv. Det gir ikke mening for
dem som skriver innlegg.

Den engelske siden er en oversatt kopi av den norske teksten, med bildeadressene i. Ble et bilde byttet eller fikk nytt
navn, pekte den engelske siden på den gamle filen til teksten ble oversatt på nytt (bare ved publisering), så den gamle
filen måtte ligge igjen.

## Beslutning
Bygget tar seg av bildene, uten at redaktøren gjør noe:

- **Flere størrelser.** Bilder i `public/media/` får `width`, `height` og `srcset` med utgaver på 480, 960 og 1280 px i
  WebP i tillegg til originalen (høyst 1600 px). Sidene peker på `/media/generated/sizes/<sti>-<bredde>.webp`, og
  `scripts/resize-images.mjs` lager akkurat de utgavene sidene bruker. Gjelder bildene i teksten
  (`src/lib/rehype-base.mjs`) og kortene, toppbildene og forsidebildet (`src/components/Img.astro`). Felles regler i
  `src/lib/image-sizes.mjs`. Originalen i repoet røres ikke.
- **Alle bilder i teksten kan forstørres.** Et bilde som ikke allerede er en lenke, lenker til seg selv og åpnes i
  bildevisningen. Har bildet ingen alt-tekst, får lenken «Vis bildet i stort format» (engelsk: «View the image in full
  size») som navn for skjermlesere.
- **Visningsbredde etter form.** Liggende bilder fyller tekstbredden. Kvadratiske og stående bilder (bredde/høyde under
  1,15) vises høyst 400 px brede. Flere bilder i ett avsnitt vises i rutenett. Sponsorlogoene behandles som før.
- **`-liten` i filnavnet** viser et bilde høyst 300 px bredt uansett form. Det er unntaket for det formen ikke fanger
  opp, som en liggende plakat med QR-kode.
- **Samme bilde på norsk og engelsk.** Bildeadressene i den engelske teksten settes fra den norske etter oversettelsen
  (`scripts/translate/media-paths.mjs`), når teksten har like mange adresser på begge språk. Et byttet bilde vises da
  med en gang på engelsk, også før teksten er oversatt på nytt (se begrensningen under).

## Konsekvenser
- Mobilen henter et bilde i riktig størrelse, og WebP er mindre enn JPEG og PNG. Siden flytter seg ikke mens bildene
  lastes, fordi `width` og `height` er satt.
- Bygget tar noen sekunder lenger, og den publiserte siden blir rundt 14 MB større (de mindre utgavene). Grensen hos
  Cloudflare er antall filer og 25 MB per fil, ikke samlet størrelse.
- Eldre innlegg ser litt annerledes ut: kvadratiske og stående bilder er smalere, og tre innlegg med flere lenkede bilder
  i ett avsnitt vises nå i rutenett som de andre.
- `sizes` i `src/lib/rehype-base.mjs` og komponentene må stemme med bredden i CSS-en. Endres layouten, må de følge med.
- Astro lagrer ferdig behandlet Markdown mellom bygg lokalt (`node_modules/.astro`). Etter endringer i
  `rehype-base.mjs` må den slettes for å se resultatet lokalt. CI bygger alltid fra bunnen.
- `check-links` sjekker også adressene i `srcset`.
- Adressene kan bare hentes fra den norske teksten når den engelske har like mange bilder. Er et bilde lagt til eller
  fjernet, peker den engelske siden på de gamle filene til teksten er oversatt på nytt ved publisering. Den gamle filen
  må da ligge igjen til det har skjedd (som `vipps-taepp-for-laget-qr.png`, som kan slettes når
  `/en/oversettelser.json` ikke lenger nevner den).

## Alternativer som ble vurdert
- **Astros egen bildebehandling (`astro:assets`).** Krever at bildene importeres eller ligger i `src/`. Bildene
  lastes opp til `public/media/` fra Pages CMS og brukes i Markdown, så det passer ikke uten å endre hvordan
  redaktørene jobber.
- **Bildetjeneste hos Cloudflare (Images eller Image Resizing).** Koster per bilde eller per forespørsel og legger
  til en tjeneste og en konto som må driftes, for et nettsted med noen hundre bilder.
- **Et felt for bildestørrelse i Pages CMS.** Bilder i tekstfeltet har ikke egne felt der, og redaktøren skal ikke
  måtte velge.
- **Lage alle størrelser av alle filer i `public/media/`.** Mange arkivbilder brukes ikke på noen side. Bare
  utgavene sidene peker på, lages.
