// Innholdsfortegnelsen til venstre: markerer overskriften du er ved nå (aria-current). Siden virker uten JavaScript.
(() => {
  const toc = document.querySelector("[data-toc]");
  if (!toc) return;
  const lenker = [...toc.querySelectorAll("a")];
  const mal = lenker.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  let venter = false;
  const oppdater = () => {
    venter = false;
    // Siste overskrift som har passert øvre tredjedel av vinduet; nederst på siden: den siste
    let aktiv = 0;
    const grense = window.innerHeight / 3;
    mal.forEach((h, i) => { if (h.getBoundingClientRect().top <= grense) aktiv = i; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) aktiv = mal.length - 1;
    lenker.forEach((a) => a.removeAttribute("aria-current"));
    const id = mal[aktiv]?.id;
    lenker.find((a) => decodeURIComponent(a.hash.slice(1)) === id)?.setAttribute("aria-current", "true");
  };
  const planlegg = () => { if (!venter) { venter = true; requestAnimationFrame(oppdater); } };
  addEventListener("scroll", planlegg, { passive: true });
  addEventListener("resize", planlegg);
  oppdater();
})();
