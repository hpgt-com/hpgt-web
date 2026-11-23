// Lyst/mørkt tema. Uten valg følger siden telefonens/PC-ens innstilling. Valget lagres bare i nettleseren (localStorage).
// Lastes i <head> uten defer, så riktig tema er satt før siden tegnes. Knappen er en bryter (role=switch, aria-checked = mørkt).
(() => {
  const root = document.documentElement;
  // Valg lagret før navnene ble engelske («tema»: «lys»/«mork») gjelder fortsatt
  const LEGACY = { lys: "light", mork: "dark" };
  const saved = (() => {
    try { return localStorage.getItem("theme") ?? LEGACY[localStorage.getItem("tema")] ?? null; } catch { return null; }
  })();
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const update = (btn) => btn.setAttribute("aria-checked", String(isDark()));
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector("[data-theme-button]");
    if (!btn) return;
    update(btn);
    btn.hidden = false;
    btn.addEventListener("click", () => {
      root.dataset.theme = isDark() ? "light" : "dark";
      try { localStorage.setItem("theme", root.dataset.theme); localStorage.removeItem("tema"); } catch {}
      update(btn);
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => update(btn));
  });
})();
