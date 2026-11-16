// «Kopier»-knapp på kodeblokker (f.eks. NOTAM-malen). Legges til av skriptet, så siden virker uten JavaScript.
document.addEventListener("DOMContentLoaded", () => {
  if (!navigator.clipboard) return;
  const en = document.documentElement.lang === "en";
  const T = en ? { kopier: "Copy", kopiert: "Copied ✓", feil: "Could not copy" } : { kopier: "Kopier", kopiert: "Kopiert ✓", feil: "Kunne ikke kopiere" };
  for (const pre of document.querySelectorAll(".prose pre")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kopier";
    btn.textContent = T.kopier;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector("code")?.innerText ?? pre.innerText);
        btn.textContent = T.kopiert;
      } catch {
        btn.textContent = T.feil;
      }
      setTimeout(() => (btn.textContent = T.kopier), 2000);
    });
    pre.append(btn);
  }
});
