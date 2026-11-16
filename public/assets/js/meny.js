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
const lukkAlle = (unntatt) => document.querySelectorAll("[data-nedtrekk][data-open]").forEach((g) => {
  if (g === unntatt) return;
  g.removeAttribute("data-open");
  g.querySelector(".nav__pil")?.setAttribute("aria-expanded", "false");
});
document.addEventListener("click", (e) => {
  const pil = e.target.closest(".nav__pil");
  if (pil) {
    const g = pil.closest("[data-nedtrekk]");
    const apen = !g.hasAttribute("data-open");
    lukkAlle(g);
    g.toggleAttribute("data-open", apen);
    pil.setAttribute("aria-expanded", String(apen));
    return;
  }
  if (!e.target.closest("[data-nedtrekk]")) lukkAlle();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const g = document.activeElement?.closest("[data-nedtrekk][data-open]");
  lukkAlle();
  g?.querySelector(".nav__pil")?.focus();
});
