// /.well-known/security.txt (RFC 9116): hvor sikkerhetshull meldes. Expires settes ett år fram ved hver publisering,
// så filen aldri går ut på dato så lenge siden publiseres. Samme innhold som SECURITY.md.
export function GET() {
  const utloper = new Date(Date.now() + 365 * 86400000).toISOString();
  const tekst = [
    "Contact: https://github.com/hpgt-com/hpgt-web/security/advisories/new",
    "Contact: mailto:leder@hpgt.com",
    `Expires: ${utloper}`,
    "Policy: https://github.com/hpgt-com/hpgt-web/blob/main/SECURITY.md",
    "Preferred-Languages: no, en",
    "Canonical: https://hpgt.com/.well-known/security.txt",
    "",
  ].join("\n");
  return new Response(tekst, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
