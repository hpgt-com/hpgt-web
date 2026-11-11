// Redaktørdemo: oppdaterer forhåndsvisningen mens man skriver, og viser publiseringsstegene. Ingenting sendes noe sted.
(() => {
  const f = document.getElementById("rd-form");
  if (!f) return;
  const $ = (id) => document.getElementById(id);
  const mnd = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
  const vis = () => {
    const d = f.dato.value ? new Date(f.dato.value) : null;
    $("pv-tittel").textContent = f.tittel.value || "Uten tittel";
    $("pv-ingress").textContent = f.ingress.value;
    $("pv-tekst").textContent = f.tekst.value;
    $("pv-meta").textContent = `${f.kategori.value}${d ? ` · ${d.getDate()}. ${mnd[d.getMonth()]} ${d.getFullYear()}` : ""}${f.utkast.checked ? " · utkast" : ""}`;
    // Alle bildene ligger ferdig i forhåndsvisningen; det valgte vises, resten skjules (ingen verdi kopieres fra DOM-en).
    const valgt = [...f.querySelectorAll('input[name="bilde"]')].findIndex((r) => r.checked);
    document.querySelectorAll(".pv-bilde").forEach((img, i) => { img.hidden = i !== valgt; });
    document.querySelector(".rd__preview").classList.toggle("utkast", f.utkast.checked);
    $("rd-status").textContent = "Ikke lagret";
    document.querySelectorAll(".rd__steps li").forEach((li) => li.classList.remove("on"));
  };
  // Tekstfeltet vokser med innholdet, så alt du skriver er synlig
  const ta = f.tekst;
  const vokse = () => { ta.style.height = "auto"; ta.style.height = `${ta.scrollHeight + 2}px`; };
  ta.addEventListener("input", vokse);
  vokse();
  // Eget bilde: leses lokalt i nettleseren (lastes ikke opp noe sted) og vises i forhåndsvisningen
  const fil = $("rd-fil");
  fil.addEventListener("change", () => {
    const fila = fil.files && fil.files[0];
    if (!fila || !fila.type.startsWith("image/") || fila.size > 20e6) return;
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result !== "string" || !r.result.startsWith("data:image/")) return;
      $("rd-eget-mini").src = r.result;
      $("pv-eget").src = r.result;
      $("rd-eget").hidden = false;
      $("rd-eget").querySelector("input").checked = true;
      vis();
    };
    r.readAsDataURL(fila);
  });
  f.addEventListener("input", vis);
  f.addEventListener("change", vis);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const steg = [...document.querySelectorAll(".rd__steps li")];
    const tekster = ["Lagret (demo)", "Bygger og kontrollerer siden …", f.utkast.checked ? "Lagret som utkast (demo)" : "Publisert (demo)"];
    steg.forEach((li, i) => setTimeout(() => { li.classList.add("on"); $("rd-status").textContent = tekster[i]; }, i * 900));
  });
})();
