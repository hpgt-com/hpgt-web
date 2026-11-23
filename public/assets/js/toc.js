// Innholdsfortegnelsen til venstre: markerer overskriften du er ved nå (aria-current). Siden virker uten JavaScript.
(() => {
  const toc = document.querySelector("[data-toc]");
  if (!toc) return;
  const links = [...toc.querySelectorAll("a")];
  const targets = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  let pending = false;
  const update = () => {
    pending = false;
    // Siste overskrift som har passert øvre tredjedel av vinduet; nederst på siden: den siste
    let active = 0;
    const limit = window.innerHeight / 3;
    targets.forEach((h, i) => { if (h.getBoundingClientRect().top <= limit) active = i; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = targets.length - 1;
    links.forEach((a) => a.removeAttribute("aria-current"));
    const id = targets[active]?.id;
    links.find((a) => decodeURIComponent(a.hash.slice(1)) === id)?.setAttribute("aria-current", "true");
  };
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  update();
})();
