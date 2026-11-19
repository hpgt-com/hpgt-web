// Klikkstatistikk: telles som hendelser i GoatCounter (public/assets/js/goatcounter.js), som på flysteder.hpgt.com.
// Navnene er på engelsk, f.eks. «link/xcc.no/for-piloter/vaer/» (lenke til xcc.no fra Vær og lenker). Elementer med
// data-goatcounter-click telles av goatcounter.js selv (kalenderabonnement, kopier lenke, meld feil).
// Gjør ingenting når telleren ikke er lastet (lokalt, eller stoppet av en annonseblokkering).
(() => {
  const tell = (path, title) => window.goatcounter?.count?.({ path, title: title || path, event: true });
  // Lenker ut av siden og nedlastinger (PDF-er). Midtklikk (ny fane) telles også.
  const klikk = (ev) => {
    const a = ev.target.closest?.("a[href]");
    if (!a || a.closest("[data-goatcounter-click]")) return;
    const tekst = a.textContent.trim().replace(/\s+/g, " ");
    if (a.hostname && a.hostname !== location.hostname && /^https?:$/.test(a.protocol)) tell(`link/${a.hostname.replace(/^www\./, "")}${location.pathname}`, tekst);
    else if (a.hostname === location.hostname && /\.pdf$/i.test(a.pathname)) tell(`download${a.pathname}`, `${tekst} (${location.pathname})`);
  };
  document.addEventListener("click", klikk);
  document.addEventListener("auxclick", klikk);
  // Skjemaene: telles når innsendingen gikk gjennom (skjema.js sender «hpgt:skjema-sendt»)
  document.addEventListener("hpgt:skjema-sendt", (ev) => tell(`form/${ev.detail}`, `Skjema sendt: ${ev.detail}`));
})();
