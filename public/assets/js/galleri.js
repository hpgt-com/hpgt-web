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
  const videoKort = [...prose.querySelectorAll('h2[id^="video"] + ul > li')]
    .map((li) => ({ li, a: li.querySelector("a[href]") }))
    .map((k) => ({ ...k, v: k.a && video(k.a.href) }))
    .filter((k) => k.v);
  if (!bilder.length && !videoKort.length) return;

  // --- Overlay (<dialog>) -------------------------------------------------------
  const d = document.createElement("dialog");
  d.className = "galleri";
  d.innerHTML = `<div class="galleri__topp"><span class="galleri__teller"></span><button type="button" class="galleri__lukk" aria-label="${T.lukk}">✕&#xFE0E;</button></div>
    <div class="galleri__flate"></div>
    <button type="button" class="galleri__pil galleri__pil--forrige" aria-label="${T.forrige}">‹</button>
    <button type="button" class="galleri__pil galleri__pil--neste" aria-label="${T.neste}">›</button>
    <p class="galleri__tekst"></p>`;
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
  const videoListe = videoKort.map(({ li, a, v }) => {
    const navn = [...li.childNodes].filter((n) => n !== a).map((n) => n.textContent).join("").trim();
    const thumb = document.createElement("img");
    thumb.className = "video__bilde"; thumb.alt = ""; thumb.loading = "lazy"; thumb.src = v.bilde;
    thumb.addEventListener("error", () => thumb.remove()); // ingen miniatyr: kortet vises som før
    li.prepend(thumb);
    li.classList.add("video");
    return { type: "video", v, href: a.href, tittel: a.textContent, tekst: `${a.textContent}${navn ? " – " + navn : ""}` };
  });
  videoKort.forEach(({ a }, n) => a.addEventListener("click", (e) => { e.preventDefault(); aapne(videoListe, n); }));
})();
