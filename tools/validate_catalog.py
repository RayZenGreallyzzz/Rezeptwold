#!/usr/bin/env python3
import json, pathlib, re, sys
root=pathlib.Path(__file__).resolve().parents[1]
assets=root/"app/src/main/assets"
page=(assets/"index.html").read_text(encoding="utf-8")
m=re.search(r'<script type="application/json" id="baseRecipes">([\s\S]*?)</script>',page)
assert m, "base recipes not embedded"
base=json.loads(m.group(1))
extra=[]
for filename,var in [("iba-cocktails.js","VKUSFERA_IBA"),("alcohol-recipes.js","VKUSFERA_ALCOHOL"),("world-baking-1.js","VKUSFERA_WORLD_A"),("world-main-1.js","VKUSFERA_WORLD_B"),("world-drinks-preserves-1.js","VKUSFERA_WORLD_C")]:
    assert f'src="{filename}"' in page, "Missing external script "+filename
    raw=(assets/filename).read_text(encoding="utf-8").strip()
    prefix="window."+var+"="
    assert raw.startswith(prefix) and raw.endswith(";"), "invalid JSON variable "+filename
    extra.extend(json.loads(raw[len(prefix):-1]))
records=base+extra
ids=[r["series_number"] for r in records]
assert len(ids)==len(set(ids)), "Duplicate IDs"
names=[re.sub(r"\\s+"," ",r["name"].lower().strip().replace("ё","е")) for r in records]
assert len(names)==len(set(names)), "Duplicate recipe names"
assert len(base)==332 and len(extra)==192 and len(records)==524, "Catalog unexpectedly truncated"
assert ids==list(range(1,len(records)+1)), "Gap in recipe identifiers"
for r in records:
    assert r.get("name") and r.get("country") and r.get("category"),f"missing metadata in {r['series_number']}"
    assert len(r.get("ingredients",[]))>=2 and len(r.get("steps",[]))>=2,f"missing ingredient or steps in {r['series_number']}"
    assert all((" — " in i) for i in r["ingredients"]),f"malformed ingredient {r['series_number']}"
    if not r.get("reference_only"):
        assert all(re.search(r"\d|по вкусу|по желанию|щепот|нескольк|горст|шт\.|зубчик",i,re.I) for i in r["ingredients"]),f"missing amount {r['series_number']}"
    url=r.get("source_url")
    assert not url or url.startswith("https://"),f"unsafe source URL {r['series_number']}"
assert "var base=JSON.parse" in page and "VKUSFERA_ALCOHOL" in page
assert "VKUSFERA_WORLD_A" in page and "VKUSFERA_WORLD_B" in page and "VKUSFERA_WORLD_C" in page
assert sum(x.get("reference_only",False) for x in records)==10
print(f"Validated: {len(records)} cards, {len(extra)} expansion cards, {sum(x.get('reference_only',False) for x in records)} guides, remaining are measured recipes.")
