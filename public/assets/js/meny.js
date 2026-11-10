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
