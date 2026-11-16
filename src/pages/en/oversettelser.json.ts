// Publiserer oversettelsene, så neste publisering bare trenger å oversette ny eller endret tekst (scripts/oversett).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
export function GET() {
  const fil = join(process.cwd(), ".oversatt", "oversettelser.json");
  return new Response(existsSync(fil) ? readFileSync(fil, "utf-8") : "{}\n", { headers: { "Content-Type": "application/json" } });
}
