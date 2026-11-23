// Liste eller bilder på Nytt og Arrangementer. Valget huskes i nettleseren (bare som bekvemmelighet).
(() => {
  const toggle = document.querySelector(".view-toggle");
  if (!toggle) return;
  const set = (v, save) => {
    document.querySelectorAll("[data-view]").forEach((el) => { el.hidden = el.dataset.view !== v; });
    toggle.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.viewOption === v)));
    if (save) try { localStorage.setItem("hpgt-view", v); localStorage.removeItem("hpgt-visning"); } catch {}
  };
  let saved = null;
  // Valg lagret før navnene ble engelske («hpgt-visning»: «bilder») gjelder fortsatt
  try { saved = localStorage.getItem("hpgt-view") ?? (localStorage.getItem("hpgt-visning") === "bilder" ? "pictures" : null); } catch {}
  toggle.hidden = false;
  toggle.addEventListener("click", (e) => { const b = e.target.closest("button[data-view-option]"); if (b) set(b.dataset.viewOption, true); });
  set(saved === "pictures" ? "pictures" : "list", false);
})();
