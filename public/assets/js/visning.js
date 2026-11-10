// Liste eller bilder på Nytt og Arrangementer. Valget huskes i nettleseren (bare som bekvemmelighet).
(() => {
  const valg = document.querySelector(".visning");
  if (!valg) return;
  const sett = (v, lagre) => {
    document.querySelectorAll("[data-visning]").forEach((el) => { el.hidden = el.dataset.visning !== v; });
    valg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vis === v)));
    if (lagre) try { localStorage.setItem("hpgt-visning", v); } catch {}
  };
  let lagret = null;
  try { lagret = localStorage.getItem("hpgt-visning"); } catch {}
  valg.hidden = false;
  valg.addEventListener("click", (e) => { const b = e.target.closest("button[data-vis]"); if (b) sett(b.dataset.vis, true); });
  sett(lagret === "bilder" ? "bilder" : "liste", false);
})();
