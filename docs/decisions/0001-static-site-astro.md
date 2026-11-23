# 0001: Statisk nettsted med Astro i stedet for WordPress

- **Status:** Vedtatt
- **Dato:** 2026-10

## Bakgrunn
WordPress trengte jevnlige oppdateringer av kjernen og utvidelsene, kostet webhotell, og hadde en database og et
administrasjonspanel på nett som frivillige måtte holde sikre.

## Beslutning
Nettstedet bygges som ferdige HTML-filer med Astro fra Markdown og JSON i Git. Innholdsmodellen
(`src/content.config.ts`) kontrollerer hvert felt.

## Konsekvenser
- Ingen server eller database å vedlikeholde eller angripe. All historikk ligger i Git.
- En feil i innholdet stopper bygget i stedet for å gi en ødelagt side.
- Dynamiske funksjoner (skjemaer) må være egne, små Cloudflare Workers.

## Alternativer som ble vurdert
Hugo (raskere, men Go-maler er vanskeligere for neste frivillige å ta over), og å bli på WordPress.
