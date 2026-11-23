// Visning i stort format over siden:
//  • Bilder: klikk på et bilde i teksten som lenker til en bildefil, og bla med knapper, piltaster eller sveip.
//  • Videoer: klikk på et videokort (lenke til YouTube/Vimeo i en liste under «Videoer») for å spille av her.
//    Spilleren lastes først ved klikk, fra youtube-nocookie.com eller Vimeo med «do not track».
// Uten JavaScript virker lenkene som før (åpner bildefilen eller videoen hos YouTube/Vimeo).
(() => {
  const en = document.documentElement.lang === "en";
  const T = en
    ? { lukk: "Close", forrige: "Previous", neste: "Next", aapne: "Open on", bilde: "Image", av: "of" }
    : { lukk: "Lukk", forrige: "Forrige", neste: "Neste", aapne: "Åpne på", bilde: "Bilde", av: "av" };
  const prose = document.querySelector(".prose");
  if (!prose) return;

  // --- Finn bilder og videoer -------------------------------------------------
  const erBilde = (a) => /\.(jpe?g|png|webp|gif)$/i.test(new URL(a.href, location.href).pathname) && a.querySelector("img");
  const bilder = [...prose.querySelectorAll("a[href]")].filter(erBilde);
  const video = (href) => {
    const u = new URL(href, location.href);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    // Nøyaktig vertsnavn (ikke «slutter på»), så f.eks. «evilyoutube.com» ikke godtas
    const vert = u.hostname.toLowerCase();
    const YT = ["youtube.com", "www.youtube.com", "m.youtube.com"];
    const yt = YT.includes(vert) ? u.searchParams.get("v") : vert === "youtu.be" ? u.pathname.slice(1) : null;
    if (yt && /^[\w-]{6,20}$/.test(yt)) return { kilde: "YouTube", id: yt, spiller: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`, bilde: `/media/generated/video-thumbnails/yt-${yt}.jpg` };
    const vm = (vert === "vimeo.com" || vert === "www.vimeo.com") && u.pathname.match(/^\/(\d+)/)?.[1];
    if (vm) return { kilde: "Vimeo", id: vm, spiller: `https://player.vimeo.com/video/${vm}?autoplay=1&dnt=1`, bilde: `/media/generated/video-thumbnails/vimeo-${vm}.jpg` };
    return null;
  };
  // Alle lenker til YouTube/Vimeo i teksten, i rekkefølge. Kort: punkter under «Videoer», og avsnitt som bare er
  // en videolenke (med ev. navn etter). Andre videolenker i løpende tekst åpner bare avspillingen.
  const videoKort = [...prose.querySelectorAll("a[href]")]
    .map((a) => ({ a, v: video(a.href) }))
    .filter((k) => k.v && !k.a.querySelector("img"))
    .map((k) => {
      const li = k.a.closest('h2[id^="video"] + ul > li');
      const p = !li && k.a.parentElement?.tagName === "P" && k.a.parentElement.querySelectorAll("a").length === 1 && k.a.parentElement.firstChild === k.a ? k.a.parentElement : null;
      return { ...k, kort: li || p };
    });
  if (!bilder.length && !videoKort.length) return;

  // --- Overlay (<dialog>) -------------------------------------------------------
  const d = document.createElement("dialog");
  d.className = "galleri";
  // Bygges med DOM-metoder, så ingen tekst tolkes som HTML
  const node = (tag, className, attrs = {}, text = "") => {
    const e = document.createElement(tag);
    e.className = className;
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text) e.textContent = text;
    return e;
  };
  const knapp = (className, label, text) => node("button", className, { type: "button", "aria-label": label }, text);
  const topp = node("div", "galleri__topp");
  topp.append(node("span", "galleri__teller"), knapp("galleri__lukk", T.lukk, "✕︎"));
  d.append(
    topp,
    node("div", "galleri__flate"),
    knapp("galleri__pil galleri__pil--forrige", T.forrige, "‹"),
    knapp("galleri__pil galleri__pil--neste", T.neste, "›"),
    node("p", "galleri__tekst"),
  );
  document.body.append(d);
  const flate = d.querySelector(".galleri__flate");
  const tekst = d.querySelector(".galleri__tekst");
  const teller = d.querySelector(".galleri__teller");
  let liste = [], i = 0;

  const vis = () => {
    const el = liste[i];
    flate.replaceChildren();
    if (el.type === "bilde") {
      const img = document.createElement("img");
      img.src = el.src; img.alt = el.alt;
      flate.append(img);
    } else {
      const f = document.createElement("iframe");
      f.src = el.v.spiller; f.title = el.tittel;
      f.allow = "autoplay; fullscreen; picture-in-picture"; f.allowFullscreen = true;
      flate.append(f);
    }
    tekst.replaceChildren(el.tekst || "");
    if (el.type === "video") {
      const a = document.createElement("a");
      a.href = el.href; a.textContent = `${T.aapne} ${el.v.kilde} ↗︎`; a.rel = "noopener";
      tekst.append(el.tekst ? " · " : "", a);
    }
    teller.textContent = liste.length > 1 ? `${i + 1} ${T.av} ${liste.length}` : "";
    d.classList.toggle("galleri--en", liste.length < 2);
  };
  const aapne = (l, n) => { liste = l; i = n; vis(); d.showModal(); };
  const flytt = (n) => { if (liste.length > 1) { i = (i + n + liste.length) % liste.length; vis(); } };
  d.addEventListener("close", () => flate.replaceChildren()); // stopper videoen
  d.querySelector(".galleri__lukk").addEventListener("click", () => d.close());
  d.querySelector(".galleri__pil--forrige").addEventListener("click", () => flytt(-1));
  d.querySelector(".galleri__pil--neste").addEventListener("click", () => flytt(1));
  d.addEventListener("click", (e) => { if (e.target === d || e.target === flate) d.close(); });
  d.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") flytt(-1);
    if (e.key === "ArrowRight") flytt(1);
  });
  let x0 = null;
  d.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  d.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) flytt(dx < 0 ? 1 : -1);
    x0 = null;
  });

  // --- Bilder ---------------------------------------------------------------------
  const bildeListe = bilder.map((a) => {
    const img = a.querySelector("img");
    // Bildetekst: teksten ved siden av bildet i listen (f.eks. fotografens navn), ellers alt-teksten
    const li = a.closest("li");
    const navn = li ? [...li.childNodes].filter((n) => n !== a).map((n) => n.textContent).join("").trim() : "";
    return { type: "bilde", src: a.href, alt: img.alt, tekst: navn || img.alt };
  });
  bilder.forEach((a, n) => a.addEventListener("click", (e) => { e.preventDefault(); aapne(bildeListe, n); }));

  // --- Videoer: miniatyrbilde på kortet, avspilling i overlay ----------------------
  const videoListe = videoKort.map(({ kort, a, v }) => {
    const navn = kort ? [...kort.childNodes].filter((n) => n !== a).map((n) => n.textContent).join("").trim() : "";
    if (kort) {
      const thumb = document.createElement("img");
      thumb.className = "video__bilde"; thumb.alt = ""; thumb.loading = "lazy"; thumb.src = v.bilde;
      thumb.addEventListener("error", () => thumb.remove()); // ingen miniatyr: kortet vises uten bilde
      kort.prepend(thumb);
      kort.classList.add("video");
      if (kort.tagName === "P") kort.classList.add("videokort", `videokort--${v.kilde.toLowerCase()}`);
    }
    return { type: "video", v, href: a.href, tittel: a.textContent, tekst: `${a.textContent}${navn ? " – " + navn : ""}` };
  });
  videoKort.forEach(({ a }, n) => a.addEventListener("click", (e) => { e.preventDefault(); aapne(videoListe, n); }));
})();
