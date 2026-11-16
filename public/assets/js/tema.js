// Lyst/mørkt tema. Uten valg følger siden telefonens/PC-ens innstilling. Valget lagres bare i nettleseren (localStorage).
// Lastes i <head> uten defer, så riktig tema er satt før siden tegnes. Knappen er en bryter (role=switch, aria-checked = mørkt).
(() => {
  const rot = document.documentElement;
  const lagret = (() => { try { return localStorage.getItem("tema"); } catch { return null; } })();
  if (lagret === "lys" || lagret === "mork") rot.dataset.tema = lagret;
  const morkNaa = () => rot.dataset.tema ? rot.dataset.tema === "mork" : matchMedia("(prefers-color-scheme: dark)").matches;
  const oppdater = (btn) => btn.setAttribute("aria-checked", String(morkNaa()));
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector("[data-tema-knapp]");
    if (!btn) return;
    oppdater(btn);
    btn.hidden = false;
    btn.addEventListener("click", () => {
      rot.dataset.tema = morkNaa() ? "lys" : "mork";
      try { localStorage.setItem("tema", rot.dataset.tema); } catch {}
      oppdater(btn);
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => oppdater(btn));
  });
})();
