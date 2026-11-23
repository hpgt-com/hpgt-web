// «Kopier lenke» under innlegg: kopierer adressen til utklippstavlen. Uten JavaScript (eller utklippstavle) vises
// adressen som tekst i stedet, så den kan kopieres for hånd.
(() => {
  const button = document.querySelector("[data-copy]");
  if (!button || !navigator.clipboard) return;
  const status = button.parentElement.querySelector("[role=status]");
  button.parentElement.querySelector("[data-copy-fallback]").hidden = true;
  button.hidden = false;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      status.textContent = button.dataset.ok;
    } catch {
      status.textContent = button.dataset.copy;
    }
  });
})();
