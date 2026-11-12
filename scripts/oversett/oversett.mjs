// Engelsk versjon av utvalgte sider, oversatt automatisk så ingen trenger å skrive teksten to ganger.
//
// Kjøres før hvert bygg (npm run build) og skriver til .oversatt/ (ikke i git):
//   .oversatt/oversettelser.json   alle oversettelser, nøkkel = fil#felt, med hash av den norske teksten
//   .oversatt/sider/*.md, .oversatt/kurs/*.md, .oversatt/forside.json, .oversatt/styret.json
//
// Oversettelsene fra forrige publisering hentes fra den publiserte siden (OVERSETT_FORRIGE, /en/oversettelser.json),
// så bare ny eller endret norsk tekst sendes til oversettelse. Uten ANTHROPIC_API_KEY (lokalt og i PR-sjekken)
// I GitHub Actions logger jobben inn uten lagret nøkkel (workload identity federation): GitHub utsteder et
// kortlivet OIDC-token for akkurat dette repoet og miljøet, og Anthropic veksler det inn. ID-ene i
// ANTHROPIC_ORGANIZATION_ID, ANTHROPIC_FEDERATION_RULE_ID og ANTHROPIC_SERVICE_ACCOUNT_ID er ikke hemmelige.
// Uten innlogging brukes bare de eksisterende oversettelsene. OVERSETT_TEST=1 lager «[EN] …»-tekster for å teste oppsettet lokalt. Feiler en oversettelse, beholdes den forrige og publiseringen fortsetter.
//
// Ingen avhengigheter utenom Anthropic-SDK-en, som bare lastes når nøkkelen finnes (egen package.json i denne mappa).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";

const ROT = new URL("../../", import.meta.url).pathname;
const UT = join(ROT, ".oversatt");
const CACHE = join(UT, "oversettelser.json");

// Hvilke sider som får engelsk versjon. Nyheter og arrangementer forblir på norsk.
const SIDER = ["kurs", "tandem", "om-oss", "om-klubben", "flysteder", "lenker", "notam", "grasrotandelen"];
const SIDEFELT = ["title", "ingress"];
const KURSFELT = ["title", "menynavn", "ingress"];
// Tekstfelt i forside.json og styret.json som oversettes (sti med * for lister)
const FORSIDEFELT = ["stikkord", "slagord", "slagordIngress", "veier.*.verb", "veier.*.tittel", "veier.*.tekst", "kurs.tittel", "kurs.tekst", "kurs.etterKurs", "kurs.pris"];
const STYRETFELT = ["medlemmer.*.rolle", "medlemmer.*.ansvar"];

// Endres instruksjonen, oversettes alt på nytt (versjonen inngår i hashen)
const VERSJON = "1";
const MODELL = "claude-opus-5-5";
const SYSTEM = `You translate text for the website of Harstad Hang- og Paragliderklubb (HPGT), a paragliding, speedflying and paramotor club in Harstad, Northern Norway, from Norwegian Bokmål to English.
Return only the translated text, with no comments, quotes or explanations.
Keep all Markdown formatting, line breaks, links, URLs, image paths, e-mail addresses, phone numbers and HTML exactly as they are; translate only the human-readable text (including link texts and image alt texts).
Do not translate the club name, place names, people's names or the names of organisations (NLF, Norges Luftsportforbund). Keep course codes such as PP2, SPG2, PPG3 and SIV.
Write natural, friendly English for international visitors. Prices stay in Norwegian kroner (write "NOK").`;

const hash = (t) => createHash("sha256").update(VERSJON + "\n" + t).digest("hex").slice(0, 16);

async function hentForrige() {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, "utf-8"));
  const url = process.env.OVERSETT_FORRIGE;
  if (!url) return {};
  try {
    const svar = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!svar.ok) throw new Error(`HTTP ${svar.status}`);
    return await svar.json();
  } catch (e) {
    console.warn(`oversett: fant ingen tidligere oversettelser (${url}: ${e.message})`);
    return {};
  }
}

const forrige = await hentForrige();
const ny = {};
let klient = null;

// Henter et nytt OIDC-token fra GitHub til en fil SDK-en leser. Tokenet varer bare noen minutter, så det fornyes underveis.
async function githubToken() {
  const { ACTIONS_ID_TOKEN_REQUEST_URL: u, ACTIONS_ID_TOKEN_REQUEST_TOKEN: t } = process.env;
  const svar = await fetch(`${u}&audience=${encodeURIComponent("https://api.anthropic.com")}`, { headers: { Authorization: `Bearer ${t}` } });
  if (!svar.ok) throw new Error(`GitHub OIDC: HTTP ${svar.status}`);
  writeFileSync(process.env.ANTHROPIC_IDENTITY_TOKEN_FILE, (await svar.json()).value, { mode: 0o600 });
}
if (process.env.ANTHROPIC_FEDERATION_RULE_ID && process.env.ACTIONS_ID_TOKEN_REQUEST_URL) {
  process.env.ANTHROPIC_IDENTITY_TOKEN_FILE = join(tmpdir(), `anthropic-oidc-${process.pid}`);
  try {
    await githubToken();
    setInterval(() => githubToken().catch((e) => console.warn(`oversett: ${e.message}`)), 4 * 60 * 1000).unref();
  } catch (e) {
    console.warn(`oversett: fikk ikke logget inn (${e.message}) – bruker eksisterende oversettelser`);
    delete process.env.ANTHROPIC_FEDERATION_RULE_ID;
  }
}
if (process.env.ANTHROPIC_API_KEY || (process.env.ANTHROPIC_FEDERATION_RULE_ID && process.env.ANTHROPIC_ORGANIZATION_ID)) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  klient = new Anthropic();
}
let oversatt = 0, feilet = 0, mangler = 0;

/** Engelsk tekst for nøkkel, eller undefined hvis den ikke finnes ennå. */
async function oversett(nokkel, tekst, kort) {
  if (!tekst || !tekst.trim()) return tekst;
  const h = hash(tekst);
  const gammel = forrige[nokkel];
  if (gammel?.kilde === h) return (ny[nokkel] = gammel).en;
  if (process.env.OVERSETT_TEST) return (ny[nokkel] = { kilde: h, en: `[EN] ${tekst}` }).en;
  if (klient) {
    try {
      const svar = await klient.beta.messages.create({
        model: MODELL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: SYSTEM,
        messages: [{ role: "user", content: `${kort ? "Short text (a title, label or one sentence). " : ""}Translate to English:\n\n${tekst}` }],
      });
      if (svar.stop_reason !== "end_turn") throw new Error(`stop_reason ${svar.stop_reason}`);
      const en = svar.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      if (!en) throw new Error("tomt svar");
      oversatt++;
      ny[nokkel] = { kilde: h, en };
      return en;
    } catch (e) {
      feilet++;
      console.warn(`oversett: ${nokkel} feilet (${e.message}) – beholder forrige oversettelse`);
    }
  }
  if (gammel) return (ny[nokkel] = gammel).en; // utdatert, men bedre enn ingenting
  mangler++;
  return undefined;
}

// Enkel frontmatter: linjer «nøkkel: verdi». Bare enkle tekstfelt oversettes; resten kopieres uendret.
function delOpp(kilde) {
  const m = kilde.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("mangler frontmatter");
  return { fm: m[1], body: m[2] };
}
const lesFelt = (fm, felt) => {
  const m = fm.match(new RegExp(`^${felt}:\\s*(.*)$`, "m"));
  if (!m) return undefined;
  const v = m[1].trim();
  return v.startsWith('"') ? JSON.parse(v) : v.replace(/^'(.*)'$/, "$1");
};
const settFelt = (fm, felt, verdi) => fm.replace(new RegExp(`^${felt}:.*$`, "m"), `${felt}: ${JSON.stringify(verdi)}`);

async function markdown(mappe, fil, felt) {
  const navn = basename(fil, ".md");
  let { fm, body } = delOpp(readFileSync(fil, "utf-8"));
  for (const f of felt) {
    const v = lesFelt(fm, f);
    if (v === undefined || v === "") continue;
    const en = await oversett(`${mappe}/${navn}#${f}`, v, true);
    if (en === undefined) return; // uten oversatt tittel/ingress lages ingen engelsk side
    fm = settFelt(fm, f, en);
  }
  const enBody = await oversett(`${mappe}/${navn}#body`, body, false);
  if (enBody === undefined) return;
  mkdirSync(join(UT, mappe), { recursive: true });
  writeFileSync(join(UT, mappe, `${navn}.md`), `---\n${fm}\n---\n${enBody}\n`);
}

// Oversetter feltene i et JSON-objekt; mangler en oversettelse, står den norske teksten.
async function json(fil, felt) {
  const data = JSON.parse(readFileSync(join(ROT, fil), "utf-8"));
  const navn = basename(fil, ".json");
  for (const sti of felt) {
    const deler = sti.split(".");
    const gaa = async (obj, i, prefiks) => {
      if (obj == null) return;
      const d = deler[i];
      if (d === "*") { for (let j = 0; j < obj.length; j++) await gaa(obj[j], i + 1, `${prefiks}.${j}`); return; }
      if (i === deler.length - 1) {
        if (typeof obj[d] === "string") obj[d] = (await oversett(`${navn}#${prefiks}.${d}`.replace("#.", "#"), obj[d], true)) ?? obj[d];
        return;
      }
      await gaa(obj[d], i + 1, `${prefiks}.${d}`);
    };
    await gaa(data, 0, "");
  }
  writeFileSync(join(UT, `${navn}.json`), JSON.stringify(data, null, 2) + "\n");
}

mkdirSync(join(UT, "sider"), { recursive: true });
mkdirSync(join(UT, "kurs"), { recursive: true });
for (const s of SIDER) await markdown("sider", join(ROT, "src/content/sider", `${s}.md`), SIDEFELT);
const kursmappe = join(ROT, "src/content/kurs");
for (const k of readdirSync(kursmappe).filter((f) => f.endsWith(".md"))) await markdown("kurs", join(kursmappe, k), KURSFELT);
await json("src/data/forside.json", FORSIDEFELT);
await json("src/data/styret.json", STYRETFELT);

// Bare oversettelser som fortsatt er i bruk tas med videre
writeFileSync(CACHE, JSON.stringify(Object.fromEntries(Object.entries(ny).sort()), null, 1) + "\n");
console.log(`oversett: ${Object.keys(ny).length} tekster på engelsk (${oversatt} nye/endrede${feilet ? `, ${feilet} feilet` : ""}${mangler ? `, ${mangler} mangler oversettelse` : ""})`);
