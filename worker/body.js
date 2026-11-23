// Leser kroppen i en forespørsel med en hard grense på antall byte. Grensen gjelder det som faktisk leses, så den
// virker også når Content-Length mangler (chunked) eller er feil. Returnerer null når grensen er nådd.
export async function readLimitedBody(req, maxBytes) {
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
