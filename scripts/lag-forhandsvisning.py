"""Lager en kompakt forhåndsvisning av de fem prototypene: et utvalg sider, felles bilder og relative lenker.

Bruk: python3 -I scripts/lag-forhandsvisning.py prototyper forhandsvisning
"""
import os, re, shutil, sys, urllib.parse

SRC, OUT = sys.argv[1], sys.argv[2]
THEMES = ["fjordpluss", "fjordpluss-tw", "fjordpluss-bs", "fjord", "pico", "magasin", "klassisk", "nordlys"]
REF = os.path.join(SRC, "fjordpluss")

def keep(rel):  # rel: sidens mappe relativt til temaroten, f.eks. "kurs-2026" eller ""
    if rel in ("", "nytt", "arrangementer", "bidra", "events", "galleri") or rel.startswith("nytt/kategori/"):
        return True
    html = open(os.path.join(REF, rel, "index.html"), encoding="utf-8").read()
    if 'property="og:title"' in html and re.search(r"/event/", "/" + rel + "/"):
        return bool(re.search(r"20(2[0-9])", html[:3000]) and any(y in html for y in ("2026", "2021", "2020")))
    return rel in SIDER or rel in NYESTE

# Faste sider og de nyeste innleggene
SIDER = {"redaktor-demo", "kurs-2026", "tandem", "om-oss", "om-klubben", "flysteder", "flysteder/flarm-fanet-radioid", "lenker", "notam",
         "grasrotandelen", "konkurranser", "konkurranser/konkurranse-2014", "konkurranser/konkurranse-2017"}
NYESTE = {"ny-flystedsoversikt-flysteder-hpgt-com", "hpgt-julebord-2026-🎄", "nodskjermpakking-og-kontroll-av-vinge-dag-23-mai-2026",
          "arsmote-2026", "hpgt-var-kickoff-2021", "protokoll-arsmote-2021", "ars-beretning-2020", "arsmote-2021",
          "sikkerhetsseminar", "protokoll-fra-arsmote-2020", "arsmote-hang-og-paragliderklubb-2020",
          "arsberetning-for-harstad-hang-og-paragliderklubb-2020"}

pages = []
for root, _, files in os.walk(REF):
    if "index.html" in files:
        rel = os.path.relpath(root, REF).replace(os.sep, "/")
        rel = "" if rel == "." else rel
        if keep(rel) or rel.startswith("event/") and rel.split("/")[1] in ("sikkerhetsdag-nodskjerm", "nybegynnerkurs", "hpgt-var-kickoff-2021", "sikkerhetsseminar", "arsmote-2020", "hpgt-julebord-2026"):
            pages.append(rel)
pages = sorted(set(p for p in pages if not p.startswith("event/") or p.split("/")[1] in
               ("sikkerhetsdag-nodskjerm", "nybegynnerkurs", "hpgt-var-kickoff-2021", "sikkerhetsseminar", "arsmote-2020", "hpgt-julebord-2026")))
page_set = set(pages)

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
media = set()
ATTR = re.compile(r'(href|src)="(/[^"]*)"')

def rewrite(html, theme, rel):
    depth = 1 + (len(rel.split("/")) if rel else 0)  # temamappe + sidens mapper
    up = "../" * depth
    def fix(m):
        attr, url = m.group(1), m.group(2)
        path, _, frag = url.partition("#")
        path = urllib.parse.unquote(path)
        if not path.startswith(f"/{theme}/"):
            return m.group(0)
        inner = path[len(theme) + 2:]
        if inner.startswith("wp-content/") or inner.startswith("filer/"):
            media.add(inner)
            return f'{attr}="{up}{urllib.parse.quote(inner)}"'
        if inner.startswith(("_astro/", "assets/")) or re.search(r"\.\w{2,5}$", inner):
            return f'{attr}="{up}{theme}/{urllib.parse.quote(inner)}"'
        target = inner.strip("/")
        if target not in page_set:
            return f'{attr}="{up}utenfor.html"'
        dest = f"{theme}/{target}/index.html" if target else f"{theme}/index.html"
        return f'{attr}="{up}{urllib.parse.quote(dest)}{"#" + frag if frag else ""}"'
    html = ATTR.sub(fix, html)
    html = html.replace('href="/"', f'href="{up}"')  # «Bytt prototype» peker til oversikten
    # Astro sine omdirigeringssider bruker meta refresh med absolutt sti
    html = re.sub(r'content="(\d+);url=(/[^"]*)"', lambda m: f'content="{m.group(1)};url={up}{m.group(2).strip("/")}/index.html"', html)
    return html

for theme in THEMES:
    tdir = os.path.join(SRC, theme)
    for rel in pages:
        src = os.path.join(tdir, rel, "index.html")
        if not os.path.exists(src):
            continue
        dst = os.path.join(OUT, theme, rel, "index.html")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, "w", encoding="utf-8").write(rewrite(open(src, encoding="utf-8").read(), theme, rel))
    for sub in ("_astro", "assets"):
        if os.path.isdir(os.path.join(tdir, sub)):
            shutil.copytree(os.path.join(tdir, sub), os.path.join(OUT, theme, sub))
    # CSS kan peke på skrifter med absolutt sti
    for root, _, files in os.walk(os.path.join(OUT, theme, "_astro")):
        for f in files:
            if f.endswith(".css"):
                p = os.path.join(root, f)
                css = open(p, encoding="utf-8").read().replace(f"/{theme}/_astro/", "./")
                open(p, "w", encoding="utf-8").write(css)

for m in sorted(media):
    s = os.path.join(SRC, "fjord", m)
    if os.path.exists(s):
        os.makedirs(os.path.dirname(os.path.join(OUT, m)), exist_ok=True)
        shutil.copy(s, os.path.join(OUT, m))
print("sider per design:", len(pages), "| media:", len(media))

# Faste filer for forhåndsvisningen: miniatyrbilder og «ikke med»-siden
STATISK = os.path.join(os.path.dirname(__file__), "forhandsvisning-statisk")
shutil.copytree(os.path.join(STATISK, "bilder"), os.path.join(OUT, "bilder"))
shutil.copy(os.path.join(STATISK, "utenfor.html"), os.path.join(OUT, "utenfor.html"))
# Emoji i mappenavn tåles dårlig av enkelte verter
for theme in THEMES:
    emo = os.path.join(OUT, theme, "hpgt-julebord-2026-🎄")
    if os.path.isdir(emo):
        os.rename(emo, os.path.join(OUT, theme, "hpgt-julebord-2026"))
for root, _, files in os.walk(OUT):
    for f in files:
        if f.endswith(".html"):
            p = os.path.join(root, f)
            t = open(p, encoding="utf-8").read()
            if "%F0%9F%8E%84" in t:
                open(p, "w", encoding="utf-8").write(t.replace("hpgt-julebord-2026-%F0%9F%8E%84", "hpgt-julebord-2026"))

# Forhåndsvisningen har et tak på antall filer: fjern skriftfiler som aldri lastes for norsk tekst
# (eldre .woff-varianter og tegnsett for vietnamesisk, kyrillisk og gresk). Det ferdige nettstedet beholder alt.
for root, _, files in os.walk(OUT):
    for f in files:
        if f.endswith(".woff") or any(s in f for s in ("vietnamese", "cyrillic", "greek")):
            os.remove(os.path.join(root, f))
