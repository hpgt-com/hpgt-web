// Mobilmeny: åpner/lukker navigasjonen. Siden virker uten JavaScript (menyen vises da alltid).
document.documentElement.classList.add("js");
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-menu-button]");
  if (!btn) return;
  const panel = document.getElementById(btn.getAttribute("aria-controls"));
  const open = btn.getAttribute("aria-expanded") !== "true";
  btn.setAttribute("aria-expanded", String(open));
  panel?.toggleAttribute("data-open", open);
});
// Vist inne i forhåndsviseren (PC/mobil-rammen): skjul prototypestripen, verktøylinjen der har samme info.
try { if (window.self !== window.top) document.documentElement.classList.add("framed"); } catch { document.documentElement.classList.add("framed"); }
// Nedtrekksmenyene i toppen: ▾-knappen åpner/lukker (tastatur og berøring); musepekeren åpner dem med CSS.
// Esc eller klikk utenfor lukker. Uten JavaScript virker toppordene som vanlige lenker til oversiktssidene.
const closeAll = (except) => document.querySelectorAll("[data-dropdown][data-open]").forEach((g) => {
  if (g === except) return;
  g.removeAttribute("data-open");
  g.querySelector(".nav__toggle")?.setAttribute("aria-expanded", "false");
});
document.addEventListener("click", (e) => {
  const toggle = e.target.closest(".nav__toggle");
  if (toggle) {
    const g = toggle.closest("[data-dropdown]");
    const open = !g.hasAttribute("data-open");
    closeAll(g);
    g.toggleAttribute("data-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    return;
  }
  if (!e.target.closest("[data-dropdown]")) closeAll();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const g = document.activeElement?.closest("[data-dropdown][data-open]");
  closeAll();
  g?.querySelector(".nav__toggle")?.focus();
});
