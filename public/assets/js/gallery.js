// Visning i stort format over siden:
//  • Bilder: klikk på et bilde i teksten som lenker til en bildefil, og bla med knapper, piltaster eller sveip.
//  • Videoer: klikk på et videokort (lenke til YouTube/Vimeo i en liste under «Videoer») for å spille av her.
//    Spilleren lastes først ved klikk, fra youtube-nocookie.com eller Vimeo med «do not track».
//  • Innsendte bilder (listen under «Innsendte bilder» på konkurransesidene): et stort bilde med bla-knapper over en
//    stripe med miniatyrer som kan rulles sideveis. Klikk på en miniatyr viser bildet stort, klikk på det store bildet
//    åpner det i fullskjerm.
// Uten JavaScript virker lenkene som før (åpner bildefilen eller videoen hos YouTube/Vimeo).
(() => {
  const en = document.documentElement.lang === "en";
  const T = en
    ? { close: "Close", previous: "Previous", next: "Next", openOn: "Open on", image: "Image", of: "of" }
    : { close: "Lukk", previous: "Forrige", next: "Neste", openOn: "Åpne på", image: "Bilde", of: "av" };
  T.fullscreen = en ? "Full screen" : "Fullskjerm";
  T.entries = en ? "Submitted photos" : "Innsendte bilder";
  const prose = document.querySelector(".prose");
  if (!prose) return;

  // --- Finn bilder og videoer -------------------------------------------------
  const isImage = (a) => /\.(jpe?g|png|webp|gif)$/i.test(new URL(a.href, location.href).pathname) && a.querySelector("img");
  const images = [...prose.querySelectorAll("a[href]")].filter(isImage);
  const video = (href) => {
    const u = new URL(href, location.href);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    // Nøyaktig vertsnavn (ikke «slutter på»), så f.eks. «evilyoutube.com» ikke godtas
    const host = u.hostname.toLowerCase();
    const YT = ["youtube.com", "www.youtube.com", "m.youtube.com"];
    const yt = YT.includes(host) ? u.searchParams.get("v") : host === "youtu.be" ? u.pathname.slice(1) : null;
    if (yt && /^[\w-]{6,20}$/.test(yt)) return { source: "YouTube", id: yt, player: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`, thumb: `/media/generated/video-thumbnails/yt-${yt}.jpg` };
    const vm = (host === "vimeo.com" || host === "www.vimeo.com") && u.pathname.match(/^\/(\d+)/)?.[1];
    if (vm) return { source: "Vimeo", id: vm, player: `https://player.vimeo.com/video/${vm}?autoplay=1&dnt=1`, thumb: `/media/generated/video-thumbnails/vimeo-${vm}.jpg` };
    return null;
  };
  // Alle lenker til YouTube/Vimeo i teksten, i rekkefølge. Kort: punkter under «Videoer», og avsnitt som bare er
  // en videolenke (med ev. navn etter). Andre videolenker i løpende tekst åpner bare avspillingen.
  const videoLinks = [...prose.querySelectorAll("a[href]")]
    .map((a) => ({ a, v: video(a.href) }))
    .filter((k) => k.v && !k.a.querySelector("img"))
    .map((k) => {
      const li = k.a.closest('h2[id^="video"] + ul > li');
      const p = !li && k.a.parentElement?.tagName === "P" && k.a.parentElement.querySelectorAll("a").length === 1 && k.a.parentElement.firstChild === k.a ? k.a.parentElement : null;
      return { ...k, card: li || p };
    });
  if (!images.length && !videoLinks.length) return;

  // --- Overlay (<dialog>) -------------------------------------------------------
  const d = document.createElement("dialog");
  d.className = "gallery";
  // Bygges med DOM-metoder, så ingen tekst tolkes som HTML
  const node = (tag, className, attrs = {}, text = "") => {
    const e = document.createElement(tag);
    e.className = className;
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text) e.textContent = text;
    return e;
  };
  const button = (className, label, text) => node("button", className, { type: "button", "aria-label": label }, text);
  const top = node("div", "gallery__top");
  top.append(node("span", "gallery__counter"), button("gallery__close", T.close, "✕︎"));
  d.append(
    top,
    node("div", "gallery__stage"),
    button("gallery__arrow gallery__arrow--prev", T.previous, "‹"),
    button("gallery__arrow gallery__arrow--next", T.next, "›"),
    node("p", "gallery__caption"),
  );
  document.body.append(d);
  const stage = d.querySelector(".gallery__stage");
  const caption = d.querySelector(".gallery__caption");
  const counter = d.querySelector(".gallery__counter");
  let list = [], i = 0;

  const show = () => {
    const el = list[i];
    stage.replaceChildren();
    if (el.type === "image") {
      const img = document.createElement("img");
      img.src = el.src; img.alt = el.alt;
      stage.append(img);
    } else {
      const f = document.createElement("iframe");
      f.src = el.v.player; f.title = el.title;
      f.allow = "autoplay; fullscreen; picture-in-picture"; f.allowFullscreen = true;
      stage.append(f);
    }
    caption.replaceChildren(el.caption || "");
    if (el.type === "video") {
      const a = document.createElement("a");
      a.href = el.href; a.textContent = `${T.openOn} ${el.v.source} ↗︎`; a.rel = "noopener";
      caption.append(el.caption ? " · " : "", a);
    }
    counter.textContent = list.length > 1 ? `${i + 1} ${T.of} ${list.length}` : "";
    d.classList.toggle("gallery--single", list.length < 2);
  };
  const open = (l, n) => { list = l; i = n; show(); d.showModal(); };
  const move = (n) => { if (list.length > 1) { i = (i + n + list.length) % list.length; show(); } };
  d.addEventListener("close", () => stage.replaceChildren()); // stopper videoen
  d.querySelector(".gallery__close").addEventListener("click", () => d.close());
  d.querySelector(".gallery__arrow--prev").addEventListener("click", () => move(-1));
  d.querySelector(".gallery__arrow--next").addEventListener("click", () => move(1));
  d.addEventListener("click", (e) => { if (e.target === d || e.target === stage) d.close(); });
  d.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") move(-1);
    if (e.key === "ArrowRight") move(1);
  });
  let x0 = null;
  d.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  d.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
    x0 = null;
  });

  // --- Bilder ---------------------------------------------------------------------
  const imageList = images.map((a) => {
    const img = a.querySelector("img");
    // Bildetekst: teksten ved siden av bildet i listen (f.eks. fotografens navn), ellers alt-teksten
    const li = a.closest("li");
    const name = li ? [...li.childNodes].filter((n) => n !== a).map((n) => n.textContent).join("").trim() : "";
    return { type: "image", src: a.href, alt: img.alt, caption: name || img.alt };
  });
  const strip = prose.querySelector('h2[id^="innsendte-bilder"] + ul, h2[id^="submitted"] + ul');
  const inStrip = (a) => strip && strip.contains(a) && images.length > 1;
  images.forEach((a, n) => { if (!inStrip(a)) a.addEventListener("click", (e) => { e.preventDefault(); open(imageList, n); }); });

  // --- Innsendte bilder: stort bilde over en stripe med miniatyrer ------------------
  const entries = images.map((a, n) => ({ a, item: imageList[n] })).filter(({ a }) => inStrip(a));
  if (entries.length > 1) {
    const entryList = entries.map((e) => e.item);
    const viewer = node("figure", "entries", { "aria-label": T.entries });
    const view = node("button", "entries__stage", { type: "button", "aria-label": T.fullscreen });
    const big = node("img", "entries__image");
    view.append(big, node("span", "entries__full", { "aria-hidden": "true" }, `⛶ ${T.fullscreen}`));
    const prev = button("entries__arrow entries__arrow--prev", T.previous, "‹");
    const next = button("entries__arrow entries__arrow--next", T.next, "›");
    const cap = node("figcaption", "entries__caption");
    const name = node("span", "entries__name");
    const count = node("span", "entries__count");
    cap.append(name, count);
    viewer.append(view, prev, next, cap);
    strip.before(viewer);
    strip.classList.add("entries__thumbs");
    let cur = 0;
    const select = (n, scroll = true) => {
      cur = (n + entries.length) % entries.length;
      const e = entryList[cur];
      big.src = e.src; big.alt = e.alt;
      name.textContent = e.caption;
      count.textContent = `${cur + 1} / ${entries.length}`;
      entries.forEach(({ a }, k) => { if (k === cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
      if (scroll) {
        const li = entries[cur].a.closest("li") || entries[cur].a;
        strip.scrollTo({ left: li.offsetLeft - (strip.clientWidth - li.offsetWidth) / 2, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    };
    entries.forEach(({ a }, n) => a.addEventListener("click", (e) => { e.preventDefault(); select(n); }));
    prev.addEventListener("click", () => select(cur - 1));
    next.addEventListener("click", () => select(cur + 1));
    view.addEventListener("click", () => open(entryList, cur));
    let sx = null;
    view.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    view.addEventListener("touchend", (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) { e.preventDefault(); select(cur + (dx < 0 ? 1 : -1)); }
      sx = null;
    });
    select(0, false);
  }

  // --- Videoer: miniatyrbilde på kortet, avspilling i overlay ----------------------
  const videoList = videoLinks.map(({ card, a, v }) => {
    const name = card ? [...card.childNodes].filter((n) => n !== a).map((n) => n.textContent).join("").trim() : "";
    if (card) {
      const thumb = document.createElement("img");
      thumb.className = "video__thumb"; thumb.alt = ""; thumb.loading = "lazy"; thumb.src = v.thumb;
      thumb.addEventListener("error", () => thumb.remove()); // ingen miniatyr: kortet vises uten bilde
      card.prepend(thumb);
      card.classList.add("video");
      if (card.tagName === "P") card.classList.add("video-card", `video-card--${v.source.toLowerCase()}`);
    }
    return { type: "video", v, href: a.href, title: a.textContent, caption: `${a.textContent}${name ? " – " + name : ""}` };
  });
  videoLinks.forEach(({ a }, n) => a.addEventListener("click", (e) => { e.preventDefault(); open(videoList, n); }));
})();
