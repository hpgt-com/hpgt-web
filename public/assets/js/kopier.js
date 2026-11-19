// «Kopier lenke» under innlegg: kopierer adressen til utklippstavlen. Uten JavaScript (eller utklippstavle) vises
// adressen som tekst i stedet, så den kan kopieres for hånd.
(() => {
  const knapp = document.querySelector("[data-kopier]");
  if (!knapp || !navigator.clipboard) return;
  const status = knapp.parentElement.querySelector("[role=status]");
  knapp.parentElement.querySelector("[data-kopier-tekst]").hidden = true;
  knapp.hidden = false;
  knapp.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(knapp.dataset.kopier);
      status.textContent = knapp.dataset.ok;
    } catch {
      status.textContent = knapp.dataset.kopier;
    }
  });
})();
