# 0010: Grafikk får riktig størrelse ut fra innholdet, ikke filnavnet

- **Status:** Vedtatt
- **Dato:** 2026-11-26

## Bakgrunn
Med [0009](0009-english-image-suffixes.md) måtte redaktøren gi filen endelsen `-half` eller `-small` før opplasting for
at en plakat eller QR-kode skulle vises mindre. Det må de vite om og huske på forhånd, og det kan ikke rettes i Pages CMS
etter opplasting uten å laste opp filen på nytt. Bildene som trengte endelsen, var alle grafikk (plakater, QR-koder),
ikke foto, og grafikk skiller seg tydelig fra foto i hvor mye pikslene varierer.

## Beslutning
- Bygget måler entropien i hvert bilde i teksten (`isGraphic` i `src/lib/image-sizes.mjs`, på en utgave på høyst 256
  px). Under 3 regnes bildet som grafikk. Målt på bildene i teksten lå grafikken (plakater, QR-koder, logoer,
  skjermbilder) på 0–2,4 og fotoene på 3,5 og over, de fleste over 6.
- Liggende grafikk vises høyst 560 px bred på PC (rundt tre firedeler av tekstbredden) og i full bredde på mobil.
  Med halv bredde (380 px) ble QR-koden på Grasrotandel-plakaten rundt 70 px, for liten til å skanne komfortabelt fra
  skjermen. Med 560 px blir den rundt 105 px. Kvadratisk eller stående grafikk vises som med `-small` (høyst 300 px).
  Foto vises som før (0008).
- Endelsene `-half` (380 px) og `-small` (300 px) virker fortsatt, og `-full` er nytt, for de få bildene der regelen bommer (f.eks. et kart
  eller en tegning som skal fylle tekstbredden). Redaktøren trenger dem normalt ikke.
- Bildene fra WordPress i `/media/archive/` og sponsorlogoene får ikke regelen, så gamle innlegg (med sponsorlogoer og
  skjermbilder) og logoene ser ut som før.
- De to filene som hadde endelse (Grasrotandel-plakaten og Vipps-QR-koden), heter nå uten den.

## Konsekvenser
- Redaktøren laster opp bildet slik det er, og det vises i en størrelse som passer innholdet.
- Bygget leser hvert bilde i teksten én gang til (noen millisekunder per bilde).
- Grensen er et skjønn. Et foto med store ensfargede flater (f.eks. mye blå himmel) eller en svært detaljert plakat kan
  havne på feil side. Da brukes `-full` eller `-half`. `test/image-graphic.test.js` prøver grensen mot ekte bilder.

## Alternativer som ble vurdert
- **Bare endelser i filnavnet (0009).** Krever at redaktøren vet om dem før opplasting.
- **Størrelse ut fra pikselbredden.** En plakat og et foto kan ha samme bredde, så bredden sier ikke hva som er
  grafikk.
- **Filtype (PNG er grafikk, JPEG er foto).** Mobilskjermbilder er PNG, og plakater lastes ofte opp som JPEG.
- **Et felt for størrelse i Pages CMS.** Bilder i tekstfeltet har ikke egne felt der (som i 0008).
