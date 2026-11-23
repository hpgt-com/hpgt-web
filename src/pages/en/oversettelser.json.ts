// Publiserer oversettelsene, så neste publisering bare trenger å oversette ny eller endret tekst (scripts/translate).
// Adressen /en/oversettelser.json beholdes: publiseringen henter den (OVERSETT_FORRIGE i .github/workflows/deploy.yml).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
export function GET() {
  const file = join(process.cwd(), ".translated", "translations.json");
  return new Response(existsSync(file) ? readFileSync(file, "utf-8") : "{}\n", { headers: { "Content-Type": "application/json" } });
}
