// Klikkstatistikk: telles som hendelser i GoatCounter (public/assets/js/goatcounter.js), som på flysteder.hpgt.com.
// Navnene er på engelsk, f.eks. «link/xcc.no/for-piloter/vaer/» (lenke til xcc.no fra Vær og lenker). Elementer med
// data-goatcounter-click telles av goatcounter.js selv (kalenderabonnement, kopier lenke, meld feil).
// Gjør ingenting når telleren ikke er lastet (lokalt, eller stoppet av en annonseblokkering).
(() => {
  const count = (path, title) => window.goatcounter?.count?.({ path, title: title || path, event: true });
  // Lenker ut av siden og nedlastinger (PDF-er). Midtklikk (ny fane) telles også.
  const onClick = (ev) => {
    const a = ev.target.closest?.("a[href]");
    if (!a || a.closest("[data-goatcounter-click]")) return;
    const text = a.textContent.trim().replace(/\s+/g, " ");
    if (a.hostname && a.hostname !== location.hostname && /^https?:$/.test(a.protocol)) count(`link/${a.hostname.replace(/^www\./, "")}${location.pathname}`, text);
    else if (a.hostname === location.hostname && /\.pdf$/i.test(a.pathname)) count(`download${a.pathname}`, `${text} (${location.pathname})`);
  };
  document.addEventListener("click", onClick);
  document.addEventListener("auxclick", onClick);
  // Skjemaene: telles når innsendingen gikk gjennom (form.js sender «hpgt:form-sent»)
  document.addEventListener("hpgt:form-sent", (ev) => count(`form/${ev.detail}`, `Skjema sendt: ${ev.detail}`));
})();
