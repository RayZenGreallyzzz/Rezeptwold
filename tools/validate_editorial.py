#!/usr/bin/env python3
"""Editorial QA: cookbook tone without losing cooking procedures and safety."""
import json
import pathlib
import re

assets=pathlib.Path(__file__).resolve().parents[1]/"app/src/main/assets"
html=(assets/"index.html").read_text(encoding="utf-8")
body=re.search(r'id="baseRecipes">([\s\S]*?)</script>',html)
assert body,"Embedded recipe JSON missing"
rows=json.loads(body.group(1))
for filename,key in [
    ("iba-cocktails.js","VKUSFERA_IBA"),
    ("alcohol-recipes.js","VKUSFERA_ALCOHOL"),
    ("world-baking-1.js","VKUSFERA_WORLD_A"),
    ("world-main-1.js","VKUSFERA_WORLD_B"),
    ("world-drinks-preserves-1.js","VKUSFERA_WORLD_C"),
    ("journal-recipes.js","VKUSFERA_JOURNAL"),
    ("extra-cuisines-1.js","VKUSFERA_EXTRA"),
]:
    s=(assets/filename).read_text(encoding="utf-8").strip()
    prefix="window."+key+"="
    assert s.startswith(prefix) and s.endswith(";"),filename
    rows.extend(json.loads(s[len(prefix):-1]))
assert len(rows)==579
assert sum(not r.get("reference_only",False) for r in rows)==569
assert sum(bool(r.get("reference_only")) for r in rows)==10
assert len(set(r["series_number"] for r in rows))==len(rows)
assert len(set(r["name"].casefold() for r in rows))==len(rows)
school=re.compile(r"учебн|пособи|домашняя адаптац|авторская адаптац|справочная статья|готовьте с удовольствием",re.I)
for r in rows:
    caption=" ".join(str(r.get(k,"")) for k in ("name","note","recipe_type","reference_kind"))
    assert not school.search(caption),(r["series_number"],caption)
    if not r.get("reference_only",False):
        assert len(r["ingredients"])>=1 and len(r["steps"])>=1,r["series_number"]
# Cookbook still distinguishes the ten overviews from quantified recipes.
assert 'Описание производства · без пропорций' in html
assert 'О ТЕХНОЛОГИИ' in html
assert "'Храните в холодильнике; не используйте как консервы" in html
assert "Алкоголь — только для совершеннолетних." not in html
assert "Готовьте с удовольствием." not in html
assert "el('readerNote').style.display=note||safety||source?'block':'none'" in html
print("OK: adult cookbook copy for 569 recipes; 10 clear technical articles; food safety retained.")
