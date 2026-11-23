// Engelske adresser for de oversatte sidene: /klubben/styret/ → /en/club/board/ osv.
// Én tabell brukes av menyene, språkknappen, søket, hreflang og videresendingene (astro.config.mjs).
// Lengste treff vinner, så /for-piloter/vaer/ går foran /for-piloter/. Sider som ikke står her, beholder adressen.
export const ENGLISH_PATHS = {
  "/kurs/": "/courses/",
  "/for-piloter/vaer/": "/for-pilots/weather/",
  "/for-piloter/morkeflyging/": "/for-pilots/night-flying/",
  "/for-piloter/": "/for-pilots/",
  "/klubben/styret/": "/club/board/",
  "/klubben/stotte/": "/club/support/",
  "/klubben/konkurranser/": "/club/competitions/",
  "/klubben/": "/club/",
  "/sok/": "/search/",
  "/nytt/kategori/": "/news/category/",
  "/nytt/": "/news/",
  "/arrangementer/": "/events/",
  "/meld-feil/": "/report-error/",
  "/personvern/": "/privacy/",
};

const swap = (path, table) => {
  const match = Object.keys(table).filter((k) => path.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return match ? table[match] + path.slice(match.length) : path;
};
const REVERSE = Object.fromEntries(Object.entries(ENGLISH_PATHS).map(([nb, en]) => [en, nb]));

/** Norsk sti → engelsk sti (uten /en foran). */
export const toEnglish = (path) => swap(path, ENGLISH_PATHS);
/** Engelsk sti (uten /en foran) → norsk sti. */
export const toNorwegian = (path) => swap(path, REVERSE);

// Engelske sider som har vært publisert på norske adresser – videresendes til de nye
export const OLD_ENGLISH_PATHS = ["/kurs/", "/kurs/paragliding-pp2/", "/for-piloter/", "/for-piloter/vaer/", "/for-piloter/notam/", "/klubben/", "/klubben/styret/", "/klubben/stotte/", "/sok/"];
