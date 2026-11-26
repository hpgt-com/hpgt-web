// Videresendinger fra gamle adresser (WordPress og tidligere adresser på denne siden). Brukes av Astro, som lager en
// side med meta refresh for hver av dem (for forhåndsvisningen), og av scripts/redirects.mjs, som skriver dem som ekte
// 301-videresendinger i dist/_redirects, så søkemotorene flytter treffene til den nye adressen.
import { readFileSync } from "node:fs";
import { toEnglish, OLD_ENGLISH_PATHS } from "./english-paths.mjs";

// /event/<navn>/ for arrangementer som ble slått sammen med et innlegg (scripts/wp-import/merge-events.py)
const events = JSON.parse(readFileSync(new URL("../data/redirects.json", import.meta.url), "utf-8"));
// Engelske sider som har ligget på norske adresser (/en/klubben/styret/) videresendes til de engelske (/en/club/board/)
const englishRedirects = Object.fromEntries(OLD_ENGLISH_PATHS.map((g) => [`/en${g}`, `/en${toEnglish(g)}`]));
// Eldre /en/-videresendinger i lista under peker også til de nye adressene
const toEnglishTargets = (r) => Object.fromEntries(Object.entries(r).map(([from, to]) => [from, from.startsWith("/en/") ? `/en${toEnglish(to.slice(3))}` : to]));

export const redirects = toEnglishTargets({ ...englishRedirects, ...events, "/kurs-2026/": "/kurs/", "/events/": "/arrangementer/", "/nytt/kategori/kurs/": "/nytt/kategori/kurs-og-fagdag/", "/galleri/": "/klubben/konkurranser/2014/",
    // «Fly med oss» ble slått sammen med For piloter (samme innhold); RadioID ligger fortsatt under /flysteder/
    "/flysteder/": "/for-piloter/", "/konkurranse-2019/": "/klubben/konkurranser/2019/",
    // Reglene ligger nå på hver konkurranseside
    "/foto-og-video-konkurranse/": "/klubben/konkurranser/2014/#regler", "/papekning-av-reglement/": "/klubben/konkurranser/2014/#regler",
    "/den-store-foto-og-video-konkurransen-2017/": "/klubben/konkurranser/2017/#regler", "/regler-2019/": "/klubben/konkurranser/2019/#regler", "/en/flysteder/": "/en/for-piloter/",
    // Adressene følger menyen (Klubben, For piloter); de gamle fra WordPress videresendes
    "/flysteder/flarm-fanet-radioid/": "/for-piloter/radioid/", "/konkurranser/konkurranse-2014/": "/klubben/konkurranser/2014/", "/konkurranser/konkurranse-2017/": "/klubben/konkurranser/2017/", "/grasrotandelen/": "/klubben/stotte/#grasrotandelen", "/en/grasrotandelen/": "/en/klubben/stotte/", "/redaktor-demo/": "/klubben/bidra/", "/klubben/redaktor/": "/klubben/bidra/", "/konkurranser/": "/klubben/konkurranser/", "/om-klubben/": "/klubben/styret/", "/en/om-klubben/": "/en/klubben/styret/", "/om-oss/": "/klubben/", "/en/om-oss/": "/en/klubben/", "/lenker/": "/for-piloter/vaer/", "/en/lenker/": "/en/for-piloter/vaer/", "/bidra/": "/klubben/bidra/", "/notam/": "/for-piloter/notam/", "/en/notam/": "/en/for-piloter/notam/" });
