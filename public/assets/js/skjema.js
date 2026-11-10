// RadioID-skjemaet: sender til /api/radioid og viser svaret. I prototypen (data-demo) vises bare hva saken ville blitt.
(() => {
  const form = document.querySelector(".skjema__form");
  if (!form) return;
  const status = form.querySelector(".skjema__status");
  const knapp = form.querySelector("button[type=submit]");
  const demo = form.querySelector(".skjema__demo");
  const vis = (tekst, ok) => { status.textContent = tekst; status.dataset.ok = String(ok); };
  const handlinger = { ny: "Legg til", endre: "Endre", fjern: "Fjern" };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    if (form.hasAttribute("data-demo")) {
      const h = handlinger[data.get("handling")];
      const id = String(data.get("radioid")).toUpperCase().replace(/^0X/, "");
      demo.textContent = `Ny sak i GitHub (etikett «radioid»):\n\nRadioID: ${h.toLowerCase()} ${data.get("navn")} (${id})\n\n` +
        `Handling:       ${h}\nNavn:           ${data.get("navn")}\nRadioID:        ${id}\nVario / utstyr: ${data.get("utstyr") || "–"}` +
        (data.get("kommentar") ? `\nKommentar:      ${data.get("kommentar")}` : "");
      demo.hidden = false;
      vis("Demo: ingenting er sendt. Slik ville saken sett ut.", true);
      return;
    }
    knapp.disabled = true;
    vis("Sender …", true);
    try {
      const r = await fetch(form.action, { method: "POST", body: data });
      const svar = await r.json();
      vis(svar.melding, svar.ok);
      if (svar.ok) form.reset();
    } catch {
      vis("Fikk ikke kontakt. Sjekk nettet og prøv igjen.", false);
    } finally {
      knapp.disabled = false;
      if (window.turnstile) window.turnstile.reset();
    }
  });
})();
