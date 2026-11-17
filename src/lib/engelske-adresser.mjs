// Engelske adresser for de oversatte sidene: /klubben/styret/ → /en/club/board/ osv.
// Én tabell brukes av menyene, språkknappen, søket, hreflang og videresendingene (astro.config.mjs).
// Lengste treff vinner, så /for-piloter/vaer/ går foran /for-piloter/. Sider som ikke står her, beholder adressen.
export const ENGELSKE_ADRESSER = {
  "/kurs/": "/courses/",
  "/for-piloter/vaer/": "/for-pilots/weather/",
  "/for-piloter/morkeflyging/": "/for-pilots/night-flying/",
  "/for-piloter/": "/for-pilots/",
  "/klubben/styret/": "/club/board/",
  "/klubben/stotte/": "/club/support/",
  "/klubben/konkurranser/": "/club/competitions/",
  "/klubben/": "/club/",
  "/sok/": "/search/",
};

const bytt = (sti, tabell) => {
  const treff = Object.keys(tabell).filter((k) => sti.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return treff ? tabell[treff] + sti.slice(treff.length) : sti;
};
const BAKLENGS = Object.fromEntries(Object.entries(ENGELSKE_ADRESSER).map(([nb, en]) => [en, nb]));

/** Norsk sti → engelsk sti (uten /en foran). */
export const tilEngelsk = (sti) => bytt(sti, ENGELSKE_ADRESSER);
/** Engelsk sti (uten /en foran) → norsk sti. */
export const tilNorsk = (sti) => bytt(sti, BAKLENGS);

// Engelske sider som har vært publisert på norske adresser – videresendes til de nye
export const GAMLE_ENGELSKE = ["/kurs/", "/kurs/paragliding-pp2/", "/for-piloter/", "/for-piloter/vaer/", "/for-piloter/notam/", "/klubben/", "/klubben/styret/", "/klubben/stotte/", "/sok/"];
