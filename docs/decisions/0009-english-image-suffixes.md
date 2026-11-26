# 0009: Engelske endelser for bildestørrelser, og halv bredde

- **Status:** Vedtatt (endelsene trengs normalt ikke etter [0010](0010-graphics-sized-automatically.md))
- **Dato:** 2026-11-26

## Bakgrunn
[0008](0008-image-sizes-in-build.md) innførte endelsen `-liten` på filnavnet for bilder som skal vises smalt uansett
form. Grasrotandelen-plakaten viste at det trengs et mellomtrinn: med `-liten` (300 px) ble QR-koden på plakaten for
liten, og i full tekstbredde (760 px) for stor på PC. Navnene i repoet (mapper, datafiler, feltnavn) er engelske
(AGENTS.md), og endelsen er en del av den samme strukturen, ikke tekst leserne ser.

## Beslutning
- Endelsene på filnavnet er engelske: `-small` erstatter `-liten` (høyst 300 px uansett form), og `-half` er nytt
  (høyst 380 px, halv tekstbredde, på PC; full bredde på mobil, som er smalere enn 380 px).
- `-liten` støttes ikke lenger. De to filene som brukte den, har fått nytt navn.
- Redaktørene ser forklaringen på norsk i beskrivelsen av tekstfeltet i Pages CMS (`.pages.yml`).

## Konsekvenser
- Én navneregel for alt i strukturen: engelsk.
- Redaktørene må bruke engelske endelser i filnavnet. Beskrivelsen i Pages CMS viser dem med eksempel.
- Ellers gjelder 0008 uendret.

## Alternativer som ble vurdert
- **Norske endelser (`-liten`, `-halv`).** Lettere å huske for redaktørene, men bryter regelen om engelske navn.
- **Begge språk.** To navn for det samme gir mer å forklare og vedlikeholde.
- **Endre `-liten` til 380 px i stedet for et nytt trinn.** QR-koden i Vipps-bildet trenger ikke mer, og en plakat
  trenger halv bredde. To trinn dekker begge.
