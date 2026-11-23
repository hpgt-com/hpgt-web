"""Engangsflytting: arrangementer (The Events Calendar) blir en del av innleggene.

Et arrangement er nå et innlegg med feltet «arrangement» (dato, sted, nettmøte, type). Finnes det allerede et innlegg om
samme arrangement, får det innlegget arrangementsfeltene, og /event/<navn>/ omdirigeres dit. Ellers blir arrangementet
et eget innlegg som beholder adressen /event/<navn>/. Omdirigeringene skrives til src/data/omdirigeringer.json.

Bruk: python3 -I scripts/wp-import/merge-events.py
"""
import difflib, glob, json, os, re

EVENTS_DIR, POSTS_DIR = "src/content/arrangementer", "src/content/innlegg"
CATEGORY_FOR_GROUP = {"Kurs": "Kurs og fagdag", "Fagdag": "Kurs og fagdag", "Møte": "Møter og referater", "Sosialt": "Sosialt og turer",
          "Konkurranse": "Konkurranser"}  # arrangementsgruppe → kategori på Nytt for nye innlegg
# Arrangement → eksisterende innlegg (filnavn uten .md) der titlene ikke er like nok til å finnes automatisk
MANUAL = {"2018-02-26-arsmote-hang-og-paragliderklubb-2018": "2018/arsmote-2018",
           "2018-05-14-kickoff-2018": "2018/hpgt-kaller-inn-til-kickoff-2018",
           "2018-06-01-nybegynnerkurs-i-paragliding-pp2": "2018/nybegynnerkurs-i-paragliding-pp2",
           "2020-02-25-arsmote-2020": "2020/arsmote-hang-og-paragliderklubb-2020",
           "2026-05-23-sikkerhetsdag-nodskjerm": "2026/nodskjermpakking-og-kontroll-av-vinge-dag-23-mai-2026"}

def type_for(t):
    t = t.lower()
    for pattern, event_type in [(r"siv", "Kurs / SIV"), (r"nybegynner|pp2", "Kurs / PP2"), (r"prøvedag", "Kurs / Prøvedag"),
                         (r"nødskjerm", "Fagdag / Nødskjerm og vingesjekk"), (r"sikkerhetsseminar", "Fagdag / Sikkerhetsseminar"),
                         (r"styremøte", "Møte / Styremøte"), (r"klubbmøte", "Møte / Klubbmøte"), (r"årsmøte", "Møte / Årsmøte"),
                         (r"julebord", "Sosialt / Julebord"), (r"kickoff", "Sosialt / Kickoff"), (r"cup|konkurranse", "Konkurranse / Cup og stevne")]:
        if re.search(pattern, t): return event_type
    return "Sosialt / Tur"

def read_post(f):
    t = open(f, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n?(.*)", t, re.S)
    d = {}
    for l in m.group(1).splitlines():
        k, _, v = l.partition(": ")
        d[k] = v
    return m.group(1), d, m.group(2)

norm = lambda s: re.sub(r"[\W_]+", "", s.lower())
q = lambda s: s.strip('"')
posts = {os.path.relpath(f, POSTS_DIR)[:-3]: read_post(f) for f in glob.glob(f"{POSTS_DIR}/**/*.md", recursive=True)}
redirects = {}
for f in sorted(glob.glob(f"{EVENTS_DIR}/*.md")):
    name = os.path.basename(f)[:-3]
    _, e, ebody = read_post(f)
    title, start = q(e["title"]), q(e["start"])
    event_type = type_for(title)
    block = ["arrangement:", f'  start: {e["start"]}']
    if "slutt" in e: block.append(f'  slutt: {e["slutt"]}')
    block.append(f'  heldag: {e.get("heldag", "false")}')
    block.append(f'  type: "{event_type}"')
    if "sted" in e: block.append(f'  sted: {e["sted"]}')
    target = MANUAL.get(name)
    if not target:  # samme tittel, og innlegget er skrevet inntil 4 måneder før
        for k, (_, d, _) in posts.items():
            days = (int(start[:4]) * 365 + int(start[5:7]) * 30 + int(start[8:10])) - (int(q(d["date"])[:4]) * 365 + int(q(d["date"])[5:7]) * 30 + int(q(d["date"])[8:10]))
            if norm(q(d["title"])) == norm(title) and -5 <= days <= 120:
                target = k
    if target:
        fm, d, body = posts[target]
        text = body
        if ebody.strip() and difflib.SequenceMatcher(None, norm(body), norm(ebody)).ratio() < 0.6 and norm(ebody) not in norm(body):
            text = body.rstrip() + "\n\n## Praktisk info\n\n" + ebody.strip() + "\n"
        open(f"{POSTS_DIR}/{target}.md", "w", encoding="utf-8").write("---\n" + fm + "\n" + "\n".join(block) + "\n---\n" + text)
        redirects[q(e["permalink"])] = q(d.get("permalink", f'"/{target.split("/")[-1]}/"'))
        print(f"flettet  {name}  →  {target}  ({event_type})")
    else:
        fm = [f'title: {e["title"]}', f'date: "{start.replace(" ", "T")}"', f'kategorier: ["{CATEGORY_FOR_GROUP[event_type.split(" / ")[0]]}"]', f'permalink: {e["permalink"]}']
        if "wp_id" in e: fm.append(f'wp_id: {e["wp_id"]}')
        year = start[:4]
        os.makedirs(f"{POSTS_DIR}/{year}", exist_ok=True)
        out = f"{POSTS_DIR}/{year}/{q(e['permalink']).strip('/').split('/')[-1]}.md"
        assert not os.path.exists(out), out
        open(out, "w", encoding="utf-8").write("---\n" + "\n".join(fm + block) + "\n---\n" + ebody)
        print(f"nytt     {name}  →  {out}  ({event_type})")
    os.remove(f)
json.dump(redirects, open("src/data/omdirigeringer.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open("src/data/omdirigeringer.json", "a").write("\n")
print(len(redirects), "omdirigeringer")
