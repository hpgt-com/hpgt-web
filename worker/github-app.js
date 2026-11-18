// Logger inn som klubbens GitHub-app «HPGT Web Forms», så sakene fra skjemaene kommer fra appen (vises som bot) og
// ingen personlig token må fornyes. Samme fremgangsmåte som «Meld fra om endring» på flysteder.hpgt.com
// (hpgt-com/flying-sites, workers/data/src/github-app.js).
//
//   GH_APP_ID, GH_APP_INSTALLATION_ID   ikke hemmelige; variabler i GitHub-miljøet «produksjon», sendes med ved publisering
//   GITHUB_APP_PRIVATE_KEY              .pem-fila fra GitHub, som den er; Cloudflare-secret
//
// For hver innsending bes GitHub om et token som varer én time, og bare med «Issues: write» på ett repo. Selv om appen
// en dag blir installert på flere repoer eller får flere rettigheter, kan tokenet ikke gjøre mer enn dette.

const API = "https://api.github.com";
const HEADERS = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "hpgt-web-skjema" };

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const utf8 = (s) => new TextEncoder().encode(s);

// DER-lengde, og en tag med innhold.
function der(tag, innhold) {
  const n = innhold.length;
  const len = n < 128 ? [n] : n < 256 ? [0x81, n] : n < 65536 ? [0x82, n >> 8, n & 255] : [0x83, n >> 16, (n >> 8) & 255, n & 255];
  return Uint8Array.from([tag, ...len, ...innhold]);
}

// Nøkkelen slik WebCrypto vil ha den (PKCS#8). GitHub gir PKCS#1 («BEGIN RSA PRIVATE KEY»), som pakkes inn her.
// En nøkkel som allerede er PKCS#8 («BEGIN PRIVATE KEY»), brukes som den er.
export function pkcs8(pem) {
  const kropp = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const raw = Uint8Array.from(atob(kropp), (c) => c.charCodeAt(0));
  if (!/BEGIN RSA PRIVATE KEY/.test(pem)) return raw;
  const rsaOid = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  return der(0x30, [0x02, 0x01, 0x00, ...der(0x30, rsaOid), ...der(0x04, [...raw])]);
}

// JWT for appen, gyldig i 9 minutter (GitHub tillater 10), tilbakedatert ett minutt for klokkeforskjell.
export async function appJwt(appId, pem, naa = Date.now()) {
  const key = await crypto.subtle.importKey("pkcs8", pkcs8(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const t = Math.floor(naa / 1000);
  const hode = b64url(utf8(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const krav = b64url(utf8(JSON.stringify({ iat: t - 60, exp: t + 540, iss: String(appId) })));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, utf8(`${hode}.${krav}`));
  return `${hode}.${krav}.${b64url(sig)}`;
}

// Et kortlivet token for installasjonen, avgrenset til repoet `repo` («eier/navn») og «Issues: write».
export async function installasjonsToken(env, repo, naa = Date.now()) {
  if (!env.GH_APP_ID || !env.GH_APP_INSTALLATION_ID || !env.GITHUB_APP_PRIVATE_KEY) throw new Error("GitHub-appen er ikke satt opp");
  const jwt = await appJwt(env.GH_APP_ID, env.GITHUB_APP_PRIVATE_KEY, naa);
  const r = await fetch(`${env.GITHUB_API || API}/app/installations/${encodeURIComponent(env.GH_APP_INSTALLATION_ID)}/access_tokens`, {
    method: "POST",
    headers: { ...HEADERS, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ repositories: [repo.split("/")[1]], permissions: { issues: "write" } }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`GitHub (token) svarte ${r.status}`);
  return (await r.json()).token;
}

export { HEADERS };
