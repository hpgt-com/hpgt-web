# 0001: Statisk side med Astro i stedet for WordPress

- **Status:** Vedtatt
- **Dato:** 2026-10

## Bakgrunn
WordPress hos ProISP krevde jevnlige oppdateringer av kjerne og utvidelser, kostet webhotell, og hadde en database og
et innloggingspanel på nett som måtte holdes sikre av frivillige.

## Beslutning
Siden bygges som ferdige HTML-filer med Astro fra Markdown og JSON i Git. Innholdsmodellen (`src/content.config.ts`)
validerer hvert felt.

## Konsekvenser
- Ingen server eller database å vedlikeholde eller angripe. All historikk i Git.
- En feil i innholdet stopper bygget i stedet for å gi en ødelagt side.
- Dynamiske ting (skjemaer) må lages som egne, små Cloudflare-workere.

## Alternativer vi vurderte
Hugo (raskere, men Go-maler er tyngre å overta for neste frivillige), og å bli på WordPress.
