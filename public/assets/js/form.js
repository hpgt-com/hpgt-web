// Skjemaene (RadioID og «Meld feil»): sender til workeren og viser svaret. I prototypen (data-demo) vises bare hva saken ville blitt.
// Feltnavnene (handling, navn, radioid, utstyr, kommentar, side, melding, kontakt) og ?side= er de samme som workeren leser.
(() => {
  const form = document.querySelector(".form__fields");
  if (!form) return;
  const status = form.querySelector(".form__status");
  const button = form.querySelector("button[type=submit]");
  const demo = form.querySelector(".form__demo");
  const show = (text, ok) => { status.textContent = text; status.dataset.ok = String(ok); };
  const actions = { ny: "Legg til", endre: "Endre", fjern: "Fjern" };
  // «Meld feil»: siden det gjelder kommer fra ?side= (lenken i bunnen av hver side). Bare en sti på denne nettsiden.
  const pageField = form.querySelector("[data-from-url]");
  const page = new URLSearchParams(location.search).get("side");
  if (pageField && page && /^\/[A-Za-z0-9\/._~%-]{0,199}$/.test(page)) pageField.value = page;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    if (form.hasAttribute("data-demo") && pageField) {
      demo.textContent = `Ny sak i GitHub (etikett «feedback»):\n\nSide:    ${data.get("side") || "–"}\nKontakt: ${data.get("kontakt") || "–"}\n\n${data.get("melding")}`;
      demo.hidden = false;
      show("Demo: ingenting er sendt. Slik ville saken sett ut.", true);
      return;
    }
    if (form.hasAttribute("data-demo")) {
      const h = actions[data.get("handling")];
      const id = String(data.get("radioid")).toUpperCase().replace(/^0X/, "");
      demo.textContent = `Ny sak i GitHub (etikett «radioid»):\n\nRadioID: ${h.toLowerCase()} ${data.get("navn")} (${id})\n\n` +
        `Handling:       ${h}\nNavn:           ${data.get("navn")}\nRadioID:        ${id}\nVario / utstyr: ${data.get("utstyr") || "–"}` +
        (data.get("kommentar") ? `\nKommentar:      ${data.get("kommentar")}` : "");
      demo.hidden = false;
      show("Demo: ingenting er sendt. Slik ville saken sett ut.", true);
      return;
    }
    button.disabled = true;
    show(form.dataset.sending || "Sender …", true);
    try {
      const r = await fetch(form.action, { method: "POST", body: data });
      const res = await r.json();
      show(res.message, res.ok);
      if (res.ok) {
        form.reset(); if (pageField && page) pageField.value = page;
        // Til klikkstatistikken (stats.js): bare hvilket skjema, aldri innholdet. Navnene (meld-feil, radioid) er
        // hendelsene i GoatCounter og beholdes, så statistikken henger sammen.
        document.dispatchEvent(new CustomEvent("hpgt:form-sent", { detail: pageField ? "meld-feil" : "radioid" }));
      }
    } catch {
      show(form.dataset.networkError || "Fikk ikke kontakt. Sjekk nettet og prøv igjen.", false);
    } finally {
      button.disabled = false;
      if (window.turnstile) window.turnstile.reset();
    }
  });
})();
