// Kalenderen: vis bare én type (kurs og fagdag, møter, sosialt, konkurranser). År uten treff skjules.
(() => {
  const f = document.querySelector(".typefilter");
  if (!f) return;
  f.hidden = false;
  f.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-filter]");
    if (!b) return;
    const v = b.dataset.filter;
    f.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    document.querySelectorAll("[data-gruppe]").forEach((el) => { el.hidden = !!v && el.dataset.gruppe !== v; });
    document.querySelectorAll("[data-seksjon]").forEach((s) => {
      const rader = s.querySelectorAll("[data-gruppe]");
      s.hidden = rader.length > 0 && [...rader].every((r) => r.hidden);
    });
  });
})();
