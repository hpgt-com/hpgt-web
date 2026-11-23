// Søk på /sok/ (og /en/search/). Henter søkeindeksen (/sok.json) én gang og søker i nettleseren.
// Alle ord må finnes; treff i tittelen teller mest. Resultatene bygges med DOM (textContent), ikke HTML-strenger.
(() => {
  const form = document.querySelector("[data-search]");
  if (!form) return;
  const field = form.querySelector("input");
  const out = document.querySelector("[data-search-results]");
  const status = document.querySelector("[data-search-status]");
  const en = document.documentElement.lang === "en";
  const base = form.dataset.base || "";
  const T = en
    ? { loading: "Loading …", none: "No results for", results: (n) => `${n} result${n === 1 ? "" : "s"}`, failed: "Search is not available right now." }
    : { loading: "Laster …", none: "Ingen treff på", results: (n) => `${n} treff`, failed: "Søket er ikke tilgjengelig akkurat nå." };
  const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  let index = null;

  const load = async () => {
    if (index) return index;
    status.textContent = T.loading;
    const r = await fetch(`${base}/sok.json`);
    if (!r.ok) throw new Error(r.status);
    index = (await r.json()).map((d) => ({ ...d, nt: norm(d.t), nx: norm(d.x) }));
    return index;
  };

  // Utdrag rundt første treff, med søkeordene markert
  const excerpt = (d, words) => {
    const i = Math.max(0, ...words.map((o) => d.nx.indexOf(o)).filter((i) => i >= 0).slice(0, 1));
    const from = Math.max(0, i - 60);
    let s = (from ? "… " : "") + d.x.slice(from, from + 220) + (from + 220 < d.x.length ? " …" : "");
    const p = document.createElement("p");
    const rx = new RegExp(`(${words.map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    // Marker i originalteksten der normalisert tekst matcher (enkel variant: samme lengde for vanlige bokstaver)
    let last = 0;
    for (const m of norm(s).matchAll(rx)) {
      p.append(s.slice(last, m.index));
      const mark = document.createElement("mark");
      mark.textContent = s.slice(m.index, m.index + m[0].length);
      p.append(mark);
      last = m.index + m[0].length;
    }
    p.append(s.slice(last));
    return p;
  };

  const search = async () => {
    const q = field.value.trim();
    const url = new URL(location.href);
    q ? url.searchParams.set("q", q) : url.searchParams.delete("q");
    history.replaceState(null, "", url);
    out.replaceChildren();
    if (q.length < 2) { status.textContent = ""; return; }
    let all;
    try { all = await load(); } catch { status.textContent = T.failed; return; }
    const words = norm(q).split(/\s+/).filter((o) => o.length > 1);
    const hits = all
      .filter((d) => (en ? true : d.s === "nb"))
      .map((d) => {
        if (!words.every((o) => d.nt.includes(o) || d.nx.includes(o))) return null;
        // Treff i tittelen først, deretter nyeste; antall treff i teksten teller bare litt
        let p = 0;
        for (const o of words) { if (d.nt.includes(o)) p += 10; if (d.nx.includes(o)) p += 1; }
        if (en && d.s === "en") p += 3; // engelske sider først på engelsk
        return { d, p };
      })
      .filter(Boolean)
      .sort((a, b) => b.p - a.p || (b.d.d || "").localeCompare(a.d.d || ""))
      .slice(0, 40);
    status.textContent = hits.length ? T.results(hits.length) : `${T.none} «${q}»`;
    for (const { d } of hits) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = base + d.u;
      const title = document.createElement("b");
      title.textContent = d.t;
      const meta = document.createElement("span");
      meta.className = "search__meta";
      meta.textContent = [d.k, d.d && new Date(d.d).toLocaleDateString(en ? "en-GB" : "nb-NO", { day: "numeric", month: "long", year: "numeric" })].filter(Boolean).join(" · ");
      a.append(meta, title, excerpt(d, words));
      li.append(a);
      out.append(li);
    }
  };

  let timer;
  field.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(search, 150); });
  form.addEventListener("submit", (e) => { e.preventDefault(); search(); });
  const q = new URL(location.href).searchParams.get("q");
  if (q) { field.value = q; search(); }
  field.focus();
})();
