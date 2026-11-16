// Søk på /sok/ (og /en/sok/). Henter søkeindeksen (/sok.json) én gang og søker i nettleseren.
// Alle ord må finnes; treff i tittelen teller mest. Resultatene bygges med DOM (textContent), ikke HTML-strenger.
(() => {
  const skjema = document.querySelector("[data-sok]");
  if (!skjema) return;
  const felt = skjema.querySelector("input");
  const ut = document.querySelector("[data-sok-resultat]");
  const status = document.querySelector("[data-sok-status]");
  const en = document.documentElement.lang === "en";
  const base = skjema.dataset.base || "";
  const T = en
    ? { laster: "Loading …", ingen: "No results for", treff: (n) => `${n} result${n === 1 ? "" : "s"}`, feil: "Search is not available right now." }
    : { laster: "Laster …", ingen: "Ingen treff på", treff: (n) => `${n} treff`, feil: "Søket er ikke tilgjengelig akkurat nå." };
  const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  let indeks = null;

  const hent = async () => {
    if (indeks) return indeks;
    status.textContent = T.laster;
    const r = await fetch(`${base}/sok.json`);
    if (!r.ok) throw new Error(r.status);
    indeks = (await r.json()).map((d) => ({ ...d, nt: norm(d.t), nx: norm(d.x) }));
    return indeks;
  };

  // Utdrag rundt første treff, med søkeordene markert
  const utdrag = (d, ord) => {
    const i = Math.max(0, ...ord.map((o) => d.nx.indexOf(o)).filter((i) => i >= 0).slice(0, 1));
    const fra = Math.max(0, i - 60);
    let s = (fra ? "… " : "") + d.x.slice(fra, fra + 220) + (fra + 220 < d.x.length ? " …" : "");
    const p = document.createElement("p");
    const rx = new RegExp(`(${ord.map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    // Marker i originalteksten der normalisert tekst matcher (enkel variant: samme lengde for vanlige bokstaver)
    let sist = 0;
    for (const m of norm(s).matchAll(rx)) {
      p.append(s.slice(sist, m.index));
      const mark = document.createElement("mark");
      mark.textContent = s.slice(m.index, m.index + m[0].length);
      p.append(mark);
      sist = m.index + m[0].length;
    }
    p.append(s.slice(sist));
    return p;
  };

  const sok = async () => {
    const q = felt.value.trim();
    const url = new URL(location.href);
    q ? url.searchParams.set("q", q) : url.searchParams.delete("q");
    history.replaceState(null, "", url);
    ut.replaceChildren();
    if (q.length < 2) { status.textContent = ""; return; }
    let alle;
    try { alle = await hent(); } catch { status.textContent = T.feil; return; }
    const ord = norm(q).split(/\s+/).filter((o) => o.length > 1);
    const treff = alle
      .filter((d) => (en ? true : d.s === "nb"))
      .map((d) => {
        if (!ord.every((o) => d.nt.includes(o) || d.nx.includes(o))) return null;
        // Treff i tittelen først, deretter nyeste; antall treff i teksten teller bare litt
        let p = 0;
        for (const o of ord) { if (d.nt.includes(o)) p += 10; if (d.nx.includes(o)) p += 1; }
        if (en && d.s === "en") p += 3; // engelske sider først på engelsk
        return { d, p };
      })
      .filter(Boolean)
      .sort((a, b) => b.p - a.p || (b.d.d || "").localeCompare(a.d.d || ""))
      .slice(0, 40);
    status.textContent = treff.length ? T.treff(treff.length) : `${T.ingen} «${q}»`;
    for (const { d } of treff) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = base + d.u;
      const tittel = document.createElement("b");
      tittel.textContent = d.t;
      const meta = document.createElement("span");
      meta.className = "sok__meta";
      meta.textContent = [d.k, d.d && new Date(d.d).toLocaleDateString(en ? "en-GB" : "nb-NO", { day: "numeric", month: "long", year: "numeric" })].filter(Boolean).join(" · ");
      a.append(meta, tittel, utdrag(d, ord));
      li.append(a);
      ut.append(li);
    }
  };

  let tid;
  felt.addEventListener("input", () => { clearTimeout(tid); tid = setTimeout(sok, 150); });
  skjema.addEventListener("submit", (e) => { e.preventDefault(); sok(); });
  const q = new URL(location.href).searchParams.get("q");
  if (q) { felt.value = q; sok(); }
  felt.focus();
})();
