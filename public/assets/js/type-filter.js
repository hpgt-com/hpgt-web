// Kalenderen: vis bare én type (kurs og fagdag, møter, sosialt, konkurranser). År uten treff skjules.
(() => {
  const f = document.querySelector(".type-filter");
  if (!f) return;
  f.hidden = false;
  f.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-filter]");
    if (!b) return;
    const v = b.dataset.filter;
    f.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    document.querySelectorAll("[data-group]").forEach((el) => { el.hidden = !!v && el.dataset.group !== v; });
    document.querySelectorAll("[data-section]").forEach((s) => {
      const rows = s.querySelectorAll("[data-group]");
      s.hidden = rows.length > 0 && [...rows].every((r) => r.hidden);
    });
  });
})();
