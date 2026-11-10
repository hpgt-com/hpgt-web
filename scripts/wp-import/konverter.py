"""Convert the WordPress REST export of hpgt.com to Markdown + local media for Eleventy.

Usage: python3 -I convert.py <crawl_dir> <site_dir>
"""
import glob, html, json, os, re, sys, urllib.parse
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from PIL import Image, ImageOps

CRAWL, SITE = sys.argv[1], sys.argv[2]
SRC = os.path.join(SITE, "src", "content")
UP = os.path.join(SITE, "public", "wp-content", "uploads")
MAXW = 1600

load = lambda pat: sum([json.load(open(f)) for f in sorted(glob.glob(os.path.join(CRAWL, pat)))], [])
pages, posts, media = load("pages_*.json"), load("posts_*.json"), load("media_*.json")
cats = {c["id"]: html.unescape(c["name"]) for c in load("categories_*.json")}
events = json.load(open(os.path.join(CRAWL, "ev.json")))["events"]


def key(name):
    stem, ext = os.path.splitext(urllib.parse.unquote(name).lower())
    stem = re.sub(r"-\d+x\d+$", "", stem)
    stem = re.sub(r"-(scaled|rotated)$", "", stem)
    stem = re.sub(r"-e\d{10,}$", "", stem)
    return stem


media_by_key, media_by_id, missing = {}, {}, set()
for m in media:
    rel = m["source_url"].split("/wp-content/uploads/")[1]
    media_by_key[key(os.path.basename(rel))] = rel
    media_by_id[m["id"]] = rel


def localize(url):
    """Map any hpgt.com upload URL (incl. resized/i0.wp.com variants) to a local web copy."""
    url = re.sub(r"^https?://i\d\.wp\.com/", "https://", url).split("?")[0]
    if "/wp-content/uploads/" not in url or "hpgt.com" not in url and not url.startswith("/"):
        return None
    rel = url.split("/wp-content/uploads/")[1]
    rel = media_by_key.get(key(os.path.basename(rel)), urllib.parse.unquote(rel))
    src = os.path.join(CRAWL, "media", os.path.basename(rel))
    dst = os.path.join(UP, urllib.parse.unquote(rel))
    if not os.path.exists(src):
        missing.add(rel)
        return "/wp-content/uploads/" + rel
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if rel.lower().endswith((".jpg", ".jpeg", ".png")):
            im = ImageOps.exif_transpose(Image.open(src))
            if im.width > MAXW:
                im = im.resize((MAXW, round(im.height * MAXW / im.width)))
            if rel.lower().endswith(".png"):
                im.save(dst, optimize=True)
            else:
                im.convert("RGB").save(dst, quality=80, optimize=True, progressive=True)
        else:
            with open(src, "rb") as a, open(dst, "wb") as b:
                b.write(a.read())
    return "/wp-content/uploads/" + rel


def internal(url):
    if re.match(r"^https?://(www\.)?hpgt\.com", url):
        path = re.sub(r"^https?://(www\.)?hpgt\.com", "", url) or "/"
        return path
    return url


def to_md(h):
    soup = BeautifulSoup(h, "html.parser")
    for t in soup(["style", "script", "noscript", "form"]):
        t.decompose()
    for f in soup.find_all("iframe"):
        src = f.get("src", "")
        label = "Vimeo" if "vimeo" in src else "YouTube" if "youtu" in src else "ekstern side"
        src = re.sub(r"player\.vimeo\.com/video/(\d+).*", r"vimeo.com/\1", src)
        src = re.sub(r"youtube(-nocookie)?\.com/embed/([\w-]+).*", r"youtube.com/watch?v=\2", src)
        p = soup.new_tag("p")
        a = soup.new_tag("a", href=src)
        a.string = f"▶ Se video på {label}"
        p.append(a)
        f.replace_with(p)
    for img in soup.find_all("img"):
        src = img.get("data-orig-file") or img.get("src", "")
        if "mail.google.com" in src:
            img.decompose()
            continue
        loc = localize(src)
        for attr in list(img.attrs):
            if attr not in ("alt",):
                del img[attr]
        img["src"] = loc or src
        if not img.get("alt"):
            img["alt"] = ""
    for a in soup.find_all("a", href=True):
        loc = localize(a["href"]) if "/wp-content/uploads/" in a["href"] else None
        a["href"] = loc or internal(a["href"])
    text = md(str(soup), heading_style="ATX", bullets="-", strip=["span", "div", "figure"])
    # Bilder fra andre nettsteder blir lenker: CSP tillater bare egne bilder, og mange er døde uansett.
    text = re.sub(r"!\[([^\]]*)\]\((https?://[^)]+)\)", lambda m: f"[Eksternt bilde]({m.group(2)})", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    return text.strip() + "\n"


def yaml_str(s):
    return json.dumps(s, ensure_ascii=False)


MOTE = re.compile(r"årsmøte|arsmote|protokoll|referat|beretning|styremøte|regler", re.I)


def categories(p):
    names = [cats[c] for c in p["categories"] if cats[c] not in ("Ukategorisert", "Slider")]
    title = html.unescape(p["title"]["rendered"])
    if MOTE.search(title) and "Møter" not in names:
        names.append("Møter")
    if not names:
        names = ["Nyhet"]
    if any(n.lower().startswith("foto/video") for n in names):
        names = ["Konkurranser"]
    # Slått sammen til fem kategorier (Nyhet, Møter og referater, Kurs, Sosialt og turer, Konkurranser)
    samle = {"Møter": "Møter og referater", "Tilbud": "Nyhet", "Sosialt": "Sosialt og turer", "Turer": "Sosialt og turer",
             "norgescup": "Konkurranser", "10-nedturer 2016": "Konkurranser"}
    return list(dict.fromkeys(samle.get(n, n) for n in names))


def write(path, fm, body):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    lines = ["---"] + [f"{k}: {yaml_str(v)}" for k, v in fm.items() if v not in (None, "", [])] + ["---", ""]
    with open(path, "w") as f:
        f.write("\n".join(lines) + body)


# Posts
for p in posts:
    slug = urllib.parse.unquote(p["slug"])
    fm = {
        "title": html.unescape(p["title"]["rendered"]),
        "date": p["date"],
        "kategorier": categories(p),
        "bilde": localize("https://hpgt.com/wp-content/uploads/" + media_by_id[p["featured_media"]])
        if p.get("featured_media") in media_by_id else None,
        "permalink": f"/{slug}/",
        "wp_id": p["id"],
    }
    write(os.path.join(SRC, "innlegg", p["date"][:4], f"{p['slug'][:80]}.md"), fm, to_md(p["content"]["rendered"]))

# Pages (some are hand-written in the prototype and skipped here)
HANDMADE = {"om-klubben", "om-oss", "flysteder", "flarm-fanet-radioid", "konkurranse-2019"}
for p in pages:
    if p["slug"] in HANDMADE:
        continue
    path = re.sub(r"^https?://hpgt\.com", "", p["link"])
    fm = {"title": html.unescape(p["title"]["rendered"]), "permalink": path, "wp_id": p["id"],
          "sist_endret": p["modified"][:10]}
    write(os.path.join(SRC, "sider", f"{p['slug']}.md"), fm, to_md(p["content"]["rendered"]))

# Events
for e in events:
    venue = e.get("venue") if isinstance(e.get("venue"), dict) else {}
    fm = {
        "title": html.unescape(e["title"]),
        "start": e["start_date"],
        "slutt": e["end_date"],
        "heldag": bool(e.get("all_day")),
        "sted": html.unescape(venue.get("venue", "")) if venue else "",
        "permalink": f"/event/{urllib.parse.unquote(e['slug'])}/",
        "wp_id": e["id"],
    }
    write(os.path.join(SRC, "arrangementer", f"{e['start_date'][:10]}-{e['slug'][:60]}.md"), fm,
          to_md(e.get("description") or ""))

print("posts", len(posts), "pages", len(pages), "events", len(events))
print("missing media:", len(missing))
with open(os.path.join(CRAWL, "missing.txt"), "w") as f:
    f.write("\n".join(sorted(missing)))
