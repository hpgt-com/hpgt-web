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
    const b = f.querySelector('input[name="bilde"]:checked');
    if (b) $("pv-bilde").src = b.value;
    document.querySelector(".rd__preview").classList.toggle("utkast", f.utkast.checked);
    $("rd-status").textContent = "Ikke lagret";
    document.querySelectorAll(".rd__steps li").forEach((li) => li.classList.remove("on"));
  };
  f.addEventListener("input", vis);
  f.addEventListener("change", vis);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const steg = [...document.querySelectorAll(".rd__steps li")];
    const tekster = ["Lagret (demo)", "Bygger og kontrollerer siden …", f.utkast.checked ? "Lagret som utkast (demo)" : "Publisert (demo)"];
    steg.forEach((li, i) => setTimeout(() => { li.classList.add("on"); $("rd-status").textContent = tekster[i]; }, i * 900));
  });
})();
