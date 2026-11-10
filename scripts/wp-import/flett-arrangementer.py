"""Engangsflytting: arrangementer (The Events Calendar) blir en del av innleggene.

Et arrangement er nå et innlegg med feltet «arrangement» (dato, sted, nettmøte, type). Finnes det allerede et innlegg om
samme arrangement, får det innlegget arrangementsfeltene, og /event/<navn>/ omdirigeres dit. Ellers blir arrangementet
et eget innlegg som beholder adressen /event/<navn>/. Omdirigeringene skrives til src/data/omdirigeringer.json.

Bruk: python3 -I scripts/wp-import/flett-arrangementer.py
"""
import difflib, glob, json, os, re

ARR, INN = "src/content/arrangementer", "src/content/innlegg"
GRUPPE = {"Kurs": "Kurs og fagdag", "Fagdag": "Kurs og fagdag", "Møte": "Møter og referater", "Sosialt": "Sosialt og turer",
          "Konkurranse": "Konkurranser"}  # arrangementsgruppe → kategori på Nytt for nye innlegg
# Arrangement → eksisterende innlegg (filnavn uten .md) der titlene ikke er like nok til å finnes automatisk
MANUELT = {"2018-02-26-arsmote-hang-og-paragliderklubb-2018": "2018/arsmote-2018",
           "2018-05-14-kickoff-2018": "2018/hpgt-kaller-inn-til-kickoff-2018",
           "2018-06-01-nybegynnerkurs-i-paragliding-pp2": "2018/nybegynnerkurs-i-paragliding-pp2",
           "2020-02-25-arsmote-2020": "2020/arsmote-hang-og-paragliderklubb-2020",
           "2026-05-23-sikkerhetsdag-nodskjerm": "2026/nodskjermpakking-og-kontroll-av-vinge-dag-23-mai-2026"}

def type_for(t):
    t = t.lower()
    for mønster, typ in [(r"siv", "Kurs / SIV (sikkerhetskurs)"), (r"nybegynner|pp2", "Kurs / PP2 (nybegynner)"), (r"prøvedag", "Kurs / Prøvedag"),
                         (r"nødskjerm", "Fagdag / Nødskjerm og vingesjekk"), (r"sikkerhetsseminar", "Fagdag / Sikkerhetsseminar"),
                         (r"styremøte", "Møte / Styremøte"), (r"klubbmøte", "Møte / Klubbmøte"), (r"årsmøte", "Møte / Årsmøte"),
                         (r"julebord", "Sosialt / Julebord"), (r"kickoff", "Sosialt / Kickoff"), (r"cup|konkurranse", "Konkurranse / Cup og stevne")]:
        if re.search(mønster, t): return typ
    return "Sosialt / Tur"

def les(f):
    t = open(f, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n?(.*)", t, re.S)
    d = {}
    for l in m.group(1).splitlines():
        k, _, v = l.partition(": ")
        d[k] = v
    return m.group(1), d, m.group(2)

norm = lambda s: re.sub(r"[\W_]+", "", s.lower())
q = lambda s: s.strip('"')
innlegg = {os.path.relpath(f, INN)[:-3]: les(f) for f in glob.glob(f"{INN}/**/*.md", recursive=True)}
omdir = {}
for f in sorted(glob.glob(f"{ARR}/*.md")):
    navn = os.path.basename(f)[:-3]
    _, e, ebody = les(f)
    tittel, start = q(e["title"]), q(e["start"])
    typ = type_for(tittel)
    blokk = ["arrangement:", f'  start: {e["start"]}']
    if "slutt" in e: blokk.append(f'  slutt: {e["slutt"]}')
    blokk.append(f'  heldag: {e.get("heldag", "false")}')
    blokk.append(f'  type: "{typ}"')
    if "sted" in e: blokk.append(f'  sted: {e["sted"]}')
    mål = MANUELT.get(navn)
    if not mål:  # samme tittel, og innlegget er skrevet inntil 4 måneder før
        for k, (_, d, _) in innlegg.items():
            dager = (int(start[:4]) * 365 + int(start[5:7]) * 30 + int(start[8:10])) - (int(q(d["date"])[:4]) * 365 + int(q(d["date"])[5:7]) * 30 + int(q(d["date"])[8:10]))
            if norm(q(d["title"])) == norm(tittel) and -5 <= dager <= 120:
                mål = k
    if mål:
        fm, d, body = innlegg[mål]
        tekst = body
        if ebody.strip() and difflib.SequenceMatcher(None, norm(body), norm(ebody)).ratio() < 0.6 and norm(ebody) not in norm(body):
            tekst = body.rstrip() + "\n\n## Praktisk info\n\n" + ebody.strip() + "\n"
        open(f"{INN}/{mål}.md", "w", encoding="utf-8").write("---\n" + fm + "\n" + "\n".join(blokk) + "\n---\n" + tekst)
        omdir[q(e["permalink"])] = q(d.get("permalink", f'"/{mål.split("/")[-1]}/"'))
        print(f"flettet  {navn}  →  {mål}  ({typ})")
    else:
        fm = [f'title: {e["title"]}', f'date: "{start.replace(" ", "T")}"', f'kategorier: ["{GRUPPE[typ.split(" / ")[0]]}"]', f'permalink: {e["permalink"]}']
        if "wp_id" in e: fm.append(f'wp_id: {e["wp_id"]}')
        aar = start[:4]
        os.makedirs(f"{INN}/{aar}", exist_ok=True)
        ut = f"{INN}/{aar}/{q(e['permalink']).strip('/').split('/')[-1]}.md"
        assert not os.path.exists(ut), ut
        open(ut, "w", encoding="utf-8").write("---\n" + "\n".join(fm + blokk) + "\n---\n" + ebody)
        print(f"nytt     {navn}  →  {ut}  ({typ})")
    os.remove(f)
json.dump(omdir, open("src/data/omdirigeringer.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open("src/data/omdirigeringer.json", "a").write("\n")
print(len(omdir), "omdirigeringer")
