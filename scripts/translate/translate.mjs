// Engelsk versjon av utvalgte sider, oversatt automatisk så ingen trenger å skrive teksten to ganger.
//
// Kjøres før hvert bygg (npm run build) og skriver til .translated/ (ikke i git):
//   .translated/translations.json   alle oversettelser, nøkkel = fil#felt, med hash av den norske teksten
//   .translated/sider/*.md, .translated/kurs/*.md, .translated/innlegg/ÅR/*.md, .translated/forside.json, .translated/styret.json
//
// Oversettelsene fra forrige publisering hentes fra den publiserte siden (OVERSETT_FORRIGE, /en/oversettelser.json),
// så bare ny eller endret norsk tekst sendes til oversettelse. Uten ANTHROPIC_API_KEY (lokalt og i PR-sjekken)
// I GitHub Actions logger jobben inn uten lagret nøkkel (workload identity federation): GitHub utsteder et
// kortlivet OIDC-token for akkurat dette repoet og miljøet, og Anthropic veksler det inn. ID-ene i
// ANTHROPIC_ORGANIZATION_ID, ANTHROPIC_FEDERATION_RULE_ID og ANTHROPIC_SERVICE_ACCOUNT_ID er ikke hemmelige.
// Uten innlogging brukes bare de eksisterende oversettelsene. TRANSLATE_TEST=1 lager «[EN] …»-tekster for å teste oppsettet lokalt. Feiler en oversettelse, beholdes den forrige og publiseringen fortsetter.
//
// Ingen avhengigheter utenom Anthropic-SDK-en, som bare lastes når nøkkelen finnes (egen package.json i denne mappa).
//
// Formatet i translations.json (og /en/oversettelser.json) er { "<nøkkel>": { "kilde": <hash>, "en": <tekst> } }.
// Feltnavnet «kilde» beholdes, så oversettelsene som allerede er publisert, kan brukes videre.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { tilEngelsk as toEnglish } from "../../src/lib/engelske-adresser.mjs";
import { tmpdir } from "node:os";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = join(ROOT, ".translated");
const CACHE = join(OUT, "translations.json");

// Hvilke sider som får engelsk versjon. Alle publiserte innlegg (nyheter og arrangementer) oversettes også, unntatt
// kategoriene i SKIP_CATEGORIES: referater er formelle dokumenter for medlemmene og vises bare på norsk.
const SKIP_CATEGORIES = ["Møter og referater"];
const POST_FIELDS = ["title", "ingress"];
// Innleggene oversettes noen om gangen, så første publisering (alle innleggene) ikke tar for lang tid
const CONCURRENCY = 8;
const PAGES = ["kurs", "for-piloter", "tandem", "klubben", "styret", "vaer", "notam", "flystripa", "morkeflyging", "stotte", "personvern"];
const PAGE_FIELDS = ["title", "ingress"];
const COURSE_FIELDS = ["title", "menynavn", "ingress"];
// Tekstfelt i forside.json og styret.json som oversettes (sti med * for lister)
const FRONT_PAGE_FIELDS = ["stikkord", "slagord", "slagordIngress", "veier.*.verb", "veier.*.tittel", "veier.*.tekst", "kurs.tittel", "kurs.tekst", "kurs.etterKurs", "kurs.pris"];
const BOARD_FIELDS = ["medlemmer.*.rolle", "medlemmer.*.ansvar"];

// Endres instruksjonen, oversettes alt på nytt (versjonen inngår i hashen)
const VERSION = "1";
const MODEL = "claude-opus-5-5";
const SYSTEM = `You translate text for the website of Harstad Hang- og Paragliderklubb (HPGT), a paragliding, speedflying and paramotor club in Harstad, Northern Norway, from Norwegian Bokmål to English.
Return only the translated text, with no comments, quotes or explanations.
Keep all Markdown formatting, line breaks, links, URLs, image paths, e-mail addresses, phone numbers and HTML exactly as they are; translate only the human-readable text (including link texts and image alt texts).
Leave the contents of code blocks (between \`\`\` lines) exactly as they are.
Do not translate the club name, place names, people's names or the names of organisations (NLF, Norges Luftsportforbund). Keep course codes such as PP2, SPG2, PPG3 and SIV.
Write natural, friendly English for international visitors. Prices stay in Norwegian kroner (write "NOK").`;

const hash = (t) => createHash("sha256").update(VERSION + "\n" + t).digest("hex").slice(0, 16);

async function loadPrevious() {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, "utf-8"));
  const url = process.env.OVERSETT_FORRIGE;
  if (!url) return {};
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`translate: fant ingen tidligere oversettelser (${url}: ${e.message})`);
    return {};
  }
}

const previous = await loadPrevious();
const current = {};
let client = null;

// Henter et nytt OIDC-token fra GitHub til en fil SDK-en leser. Tokenet varer bare noen minutter, så det fornyes underveis.
async function githubToken() {
  const { ACTIONS_ID_TOKEN_REQUEST_URL: u, ACTIONS_ID_TOKEN_REQUEST_TOKEN: t } = process.env;
  const res = await fetch(`${u}&audience=${encodeURIComponent("https://api.anthropic.com")}`, { headers: { Authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error(`GitHub OIDC: HTTP ${res.status}`);
  const token = (await res.json()).value;
  writeFileSync(process.env.ANTHROPIC_IDENTITY_TOKEN_FILE, token, { mode: 0o600 });
  return token;
}
// Feltene føderasjonsregelen sammenligner med (ikke hemmelige; selve tokenet logges aldri)
function showClaims(token) {
  try {
    const k = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const fields = ["iss", "aud", "sub", "ref", "event_name", "environment", "repository", "repository_id", "repository_owner", "repository_owner_id"];
    console.log(`translate: GitHub-token for ${fields.map((f) => `${f}=${k[f]}`).join(" ")}`);
  } catch {}
}
if (process.env.ANTHROPIC_FEDERATION_RULE_ID && process.env.ACTIONS_ID_TOKEN_REQUEST_URL) {
  process.env.ANTHROPIC_IDENTITY_TOKEN_FILE = join(tmpdir(), `anthropic-oidc-${process.pid}`);
  try {
    showClaims(await githubToken());
    setInterval(() => githubToken().catch((e) => console.warn(`translate: ${e.message}`)), 4 * 60 * 1000).unref();
  } catch (e) {
    console.warn(`translate: fikk ikke logget inn (${e.message}) – bruker eksisterende oversettelser`);
    delete process.env.ANTHROPIC_FEDERATION_RULE_ID;
  }
}
if (process.env.ANTHROPIC_API_KEY || (process.env.ANTHROPIC_FEDERATION_RULE_ID && process.env.ANTHROPIC_ORGANIZATION_ID)) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  client = new Anthropic();
}
let translated = 0, failed = 0, missing = 0;

/** Engelsk tekst for nøkkel, eller undefined hvis den ikke finnes ennå. */
async function translate(key, text, short) {
  if (!text || !text.trim()) return text;
  const h = hash(text);
  const old = previous[key];
  if (old?.kilde === h) return (current[key] = old).en;
  if (process.env.TRANSLATE_TEST) return (current[key] = { kilde: h, en: `[EN] ${text}` }).en;
  if (client) {
    try {
      const res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: SYSTEM,
        messages: [{ role: "user", content: `${short ? "Short text (a title, label or one sentence). " : ""}Translate to English:\n\n${text}` }],
      });
      if (res.stop_reason !== "end_turn") throw new Error(`stop_reason ${res.stop_reason}`);
      const en = res.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      if (!en) throw new Error("tomt svar");
      translated++;
      current[key] = { kilde: h, en };
      return en;
    } catch (e) {
      failed++;
      console.warn(`translate: ${key} feilet (${e.message}) – beholder forrige oversettelse`);
      // Avvist innlogging blir ikke bedre av å prøve på nytt for hver tekst
      if (e?.status === 401 || e?.status === 403 || /Token exchange failed/.test(e?.message ?? "")) {
        console.warn("translate: innloggingen ble avvist – hopper over resten. Sjekk føderasjonsregelen mot feltene over.");
        client = null;
      }
    }
  }
  if (old) return (current[key] = old).en; // utdatert, men bedre enn ingenting
  missing++;
  return undefined;
}

// Enkel frontmatter: linjer «nøkkel: verdi». Bare enkle tekstfelt oversettes; resten kopieres uendret.
function splitFrontmatter(source) {
  const m = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("mangler frontmatter");
  return { fm: m[1], body: m[2] };
}
const readField = (fm, field) => {
  const m = fm.match(new RegExp(`^${field}:\\s*(.*)$`, "m"));
  if (!m) return undefined;
  const v = m[1].trim();
  return v.startsWith('"') ? JSON.parse(v) : v.replace(/^'(.*)'$/, "$1");
};
const setField = (fm, field, value) => fm.replace(new RegExp(`^${field}:.*$`, "m"), `${field}: ${JSON.stringify(value)}`);

async function markdown(folder, file, fields, { name = basename(file, ".md"), adjustFm = (fm) => fm } = {}) {
  let { fm, body } = splitFrontmatter(readFileSync(file, "utf-8"));
  for (const f of fields) {
    const v = readField(fm, f);
    if (v === undefined || v === "") continue;
    const en = await translate(`${folder}/${name}#${f}`, v, true);
    if (en === undefined) return; // uten oversatt tittel/ingress lages ingen engelsk side
    fm = setField(fm, f, en);
  }
  const enBody = await translate(`${folder}/${name}#body`, body, false);
  if (enBody === undefined) return;
  const out = join(OUT, folder, `${name}.md`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `---\n${adjustFm(fm)}\n---\n${enBody}\n`);
}

// Oversetter feltene i et JSON-objekt; mangler en oversettelse, står den norske teksten.
async function json(file, fields) {
  const data = JSON.parse(readFileSync(join(ROOT, file), "utf-8"));
  const name = basename(file, ".json");
  for (const path of fields) {
    const parts = path.split(".");
    const walk = async (obj, i, prefix) => {
      if (obj == null) return;
      const p = parts[i];
      if (p === "*") { for (let j = 0; j < obj.length; j++) await walk(obj[j], i + 1, `${prefix}.${j}`); return; }
      if (i === parts.length - 1) {
        if (typeof obj[p] === "string") obj[p] = (await translate(`${name}#${prefix}.${p}`.replace("#.", "#"), obj[p], true)) ?? obj[p];
        return;
      }
      await walk(obj[p], i + 1, `${prefix}.${p}`);
    };
    await walk(data, 0, "");
  }
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(data, null, 2) + "\n");
}

mkdirSync(join(OUT, "sider"), { recursive: true });
mkdirSync(join(OUT, "kurs"), { recursive: true });
for (const s of PAGES) await markdown("sider", join(ROOT, "src/content/sider", `${s}.md`), PAGE_FIELDS);
const courseDir = join(ROOT, "src/content/kurs");
for (const k of readdirSync(courseDir).filter((f) => f.endsWith(".md"))) await markdown("kurs", join(courseDir, k), COURSE_FIELDS);
await json("src/data/forside.json", FRONT_PAGE_FIELDS);

// Innleggene: .translated/innlegg/ÅR/navn.md, med samme id som det norske innlegget. Adressen (permalink) settes til den
// engelske (/en/…), så lenkene i listene går rett dit. Samme regel for adressen som link() i src/lib/site.ts.
const postDir = join(ROOT, "src/content/innlegg");
const allPosts = [];
const findMarkdown = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) findMarkdown(p); else if (e.name.endsWith(".md")) allPosts.push(p); } };
findMarkdown(postDir);
const toTranslate = allPosts.filter((file) => {
  const { fm } = splitFrontmatter(readFileSync(file, "utf-8"));
  if (/^utkast:\s*true\s*$/m.test(fm)) return false;
  const cat = fm.match(/^kategorier:\s*(\[.*\])\s*$/m);
  const categories = cat ? JSON.parse(cat[1]) : ["Nyhet"];
  return !categories.some((k) => SKIP_CATEGORIES.includes(k));
});
const queue = [...toTranslate];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let file; (file = queue.shift()); ) {
    const name = relative(postDir, file).split(sep).join("/").replace(/\.md$/, "");
    const norwegian = readField(splitFrontmatter(readFileSync(file, "utf-8")).fm, "permalink") ?? `/${basename(name).replace(/^\d{4}-\d{2}-\d{2}-/, "")}/`;
    const permalink = `/en${toEnglish(norwegian)}`;
    await markdown("innlegg", file, POST_FIELDS, {
      name,
      adjustFm: (fm) => (/^permalink:/m.test(fm) ? setField(fm, "permalink", permalink) : `${fm}\npermalink: ${JSON.stringify(permalink)}`),
    });
  }
}));
await json("src/data/styret.json", BOARD_FIELDS);

// Bare oversettelser som fortsatt er i bruk tas med videre
writeFileSync(CACHE, JSON.stringify(Object.fromEntries(Object.entries(current).sort()), null, 1) + "\n");
console.log(`translate: ${Object.keys(current).length} tekster på engelsk (${translated} nye/endrede${failed ? `, ${failed} feilet` : ""}${missing ? `, ${missing} mangler oversettelse` : ""})`);
