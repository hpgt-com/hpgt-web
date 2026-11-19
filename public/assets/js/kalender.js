// Aktivitetskalender: tegner månedsrutenettet og viser månedens aktiviteter. Leser data-start/data-end fra lista.
// Pil som i src/components/Pil.astro (skrifttypen mangler piltegnene)
const pil = (d) => {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "pil"); svg.setAttribute("viewBox", "0 0 16 16"); svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  for (const [k, v] of Object.entries({ d, fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" })) p.setAttribute(k, v);
  svg.append(p);
  return svg;
};
(() => {
  const root = document.querySelector("[data-kal]");
  if (!root) return;
  const q = (s) => root.querySelector(s);
  const items = [...root.querySelectorAll("[data-kal-item]")].map((li) => ({
    li, s: new Date(li.dataset.start + "T00:00:00"), e: new Date(li.dataset.end + "T23:59:59"),
  }));
  // Språket følger siden (<html lang>): engelsk på /en/
  const en = document.documentElement.lang === "en";
  const mnd = en
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
  const T = en
    ? { i: "Activities in", dag: "Activity on this day", neste: "Next", forrige: "Previous", akt: "activity" }
    : { i: "Aktiviteter i", dag: "Aktivitet denne dagen", neste: "Neste", forrige: "Forrige", akt: "aktivitet" };
  const iDag = new Date(); iDag.setHours(0, 0, 0, 0);
  let vis = new Date(iDag.getFullYear(), iDag.getMonth(), 1);
  const overlapper = (it, a, b) => it.s <= b && it.e >= a;
  q("[data-kal-grid]").hidden = false;

  function tegn() {
    const y = vis.getFullYear(), m = vis.getMonth();
    const forste = new Date(y, m, 1), siste = new Date(y, m + 1, 0, 23, 59, 59);
    q("[data-kal-label]").textContent = `${mnd[m]} ${y}`;
    q("[data-kal-title]").textContent = `${T.i} ${mnd[m]} ${y}`;
    const tom = (forste.getDay() + 6) % 7;
    const tbody = q("[data-kal-days]");
    tbody.replaceChildren();
    let rad = document.createElement("tr");
    for (let i = 0; i < tom; i++) rad.append(document.createElement("td"));
    for (let d = 1; d <= siste.getDate(); d++) {
      if ((tom + d - 1) % 7 === 0 && d > 1) { tbody.append(rad); rad = document.createElement("tr"); }
      const dag = new Date(y, m, d), slutt = new Date(y, m, d, 23, 59, 59);
      const td = document.createElement("td"), span = document.createElement("span");
      span.className = "kal-day";
      span.textContent = d;
      if (items.some((it) => overlapper(it, dag, slutt))) { span.classList.add("kal-day--on"); span.title = T.dag; }
      if (+dag === +iDag) { span.classList.add("kal-day--today"); span.setAttribute("aria-current", "date"); }
      td.append(span); rad.append(td);
    }
    tbody.append(rad);
    let antall = 0;
    for (const it of items) {
      const synlig = overlapper(it, forste, siste);
      it.li.hidden = !synlig;
      if (synlig) antall++;
      const past = it.li.querySelector("[data-kal-past]");
      if (past) past.hidden = !(it.e < iDag);
    }
    q("[data-kal-empty]").hidden = antall > 0;
    const hopp = q("[data-kal-jump]");
    hopp.hidden = true;
    if (!antall) {
      const fram = items.filter((it) => it.s > siste).sort((a, b) => a.s - b.s)[0];
      const bak = items.filter((it) => it.e < forste).sort((a, b) => b.e - a.e)[0];
      const mal = fram || bak;
      if (mal) {
        hopp.hidden = false;
        hopp.textContent = `${fram ? T.neste : T.forrige} ${T.akt}: ${mnd[mal.s.getMonth()]} ${mal.s.getFullYear()} `;
        hopp.append(pil(fram ? "M2.5 8h11M9 3.5 13.5 8 9 12.5" : "M13.5 8h-11M7 3.5 2.5 8 7 12.5"));
        hopp.onclick = () => { vis = new Date(mal.s.getFullYear(), mal.s.getMonth(), 1); tegn(); };
      }
    }
  }
  root.addEventListener("click", (e) => {
    const steg = e.target.closest("[data-kal-step]");
    if (steg) { vis = new Date(vis.getFullYear(), vis.getMonth() + Number(steg.dataset.kalStep), 1); tegn(); }
    if (e.target.closest("[data-kal-today]")) { vis = new Date(iDag.getFullYear(), iDag.getMonth(), 1); tegn(); }
  });
  tegn();
})();
