// Aktivitetskalender: tegner månedsrutenettet og viser månedens aktiviteter. Leser data-start/data-end fra lista.
// Pil som i src/components/Arrow.astro (skrifttypen mangler piltegnene)
const arrow = (d) => {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "arrow"); svg.setAttribute("viewBox", "0 0 16 16"); svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  for (const [k, v] of Object.entries({ d, fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" })) p.setAttribute(k, v);
  svg.append(p);
  return svg;
};
(() => {
  const root = document.querySelector("[data-calendar]");
  if (!root) return;
  const q = (s) => root.querySelector(s);
  const items = [...root.querySelectorAll("[data-calendar-item]")].map((li) => ({
    li, s: new Date(li.dataset.start + "T00:00:00"), e: new Date(li.dataset.end + "T23:59:59"),
  }));
  // Språket følger siden (<html lang>): engelsk på /en/
  const en = document.documentElement.lang === "en";
  const months = en
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
  const T = en
    ? { in: "Activities in", day: "Activity on this day", next: "Next", previous: "Previous", activity: "activity" }
    : { in: "Aktiviteter i", day: "Aktivitet denne dagen", next: "Neste", previous: "Forrige", activity: "aktivitet" };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let shown = new Date(today.getFullYear(), today.getMonth(), 1);
  const overlaps = (it, a, b) => it.s <= b && it.e >= a;
  q("[data-calendar-grid]").hidden = false;

  function render() {
    const y = shown.getFullYear(), m = shown.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0, 23, 59, 59);
    q("[data-calendar-label]").textContent = `${months[m]} ${y}`;
    q("[data-calendar-title]").textContent = `${T.in} ${months[m]} ${y}`;
    const blanks = (first.getDay() + 6) % 7;
    const tbody = q("[data-calendar-days]");
    tbody.replaceChildren();
    let row = document.createElement("tr");
    for (let i = 0; i < blanks; i++) row.append(document.createElement("td"));
    for (let d = 1; d <= last.getDate(); d++) {
      if ((blanks + d - 1) % 7 === 0 && d > 1) { tbody.append(row); row = document.createElement("tr"); }
      const day = new Date(y, m, d), dayEnd = new Date(y, m, d, 23, 59, 59);
      const td = document.createElement("td"), span = document.createElement("span");
      span.className = "calendar-day";
      span.textContent = d;
      if (items.some((it) => overlaps(it, day, dayEnd))) { span.classList.add("calendar-day--on"); span.title = T.day; }
      if (+day === +today) { span.classList.add("calendar-day--today"); span.setAttribute("aria-current", "date"); }
      td.append(span); row.append(td);
    }
    tbody.append(row);
    let count = 0;
    for (const it of items) {
      const visible = overlaps(it, first, last);
      it.li.hidden = !visible;
      if (visible) count++;
      const past = it.li.querySelector("[data-calendar-past]");
      if (past) past.hidden = !(it.e < today);
    }
    q("[data-calendar-empty]").hidden = count > 0;
    const jump = q("[data-calendar-jump]");
    jump.hidden = true;
    if (!count) {
      const ahead = items.filter((it) => it.s > last).sort((a, b) => a.s - b.s)[0];
      const behind = items.filter((it) => it.e < first).sort((a, b) => b.e - a.e)[0];
      const target = ahead || behind;
      if (target) {
        jump.hidden = false;
        jump.textContent = `${ahead ? T.next : T.previous} ${T.activity}: ${months[target.s.getMonth()]} ${target.s.getFullYear()} `;
        jump.append(arrow(ahead ? "M2.5 8h11M9 3.5 13.5 8 9 12.5" : "M13.5 8h-11M7 3.5 2.5 8 7 12.5"));
        jump.onclick = () => { shown = new Date(target.s.getFullYear(), target.s.getMonth(), 1); render(); };
      }
    }
  }
  root.addEventListener("click", (e) => {
    const step = e.target.closest("[data-calendar-step]");
    if (step) { shown = new Date(shown.getFullYear(), shown.getMonth() + Number(step.dataset.calendarStep), 1); render(); }
    if (e.target.closest("[data-calendar-today]")) { shown = new Date(today.getFullYear(), today.getMonth(), 1); render(); }
  });
  render();
})();
