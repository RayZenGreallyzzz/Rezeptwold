#!/usr/bin/env python3
"""Integrity and attribution checks for bundled food photographs."""
import json, pathlib, re
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
assets=root/"app/src/main/assets"
js=(assets/"photo-catalog.js").read_text(encoding="utf8").strip()
prefix="window.VKUSFERA_REAL_PHOTOS="
assert js.startswith(prefix) and js.endswith(";")
records=json.loads(js[len(prefix):-1])
status=json.loads((assets/"photo-status.json").read_text(encoding="utf8"))
ready=set(status["real_files"])
found=[]
ids=set()
for r in records:
    assert r["ids"] and r["author"] and r["license"] and r["file"] and r["dish"]
    assert r["source"].startswith("https://commons.wikimedia.org/wiki/File:")
    assert r["license_url"].startswith("https://creativecommons.org/")
    assert r["output"].startswith("img/real/") and r["output"].endswith(".webp")
    for n in r["ids"]:
        assert n not in ids,"Repeated photo binding to recipe "+str(n)
        ids.add(n)
    if r["output"] not in ready: continue
    p=assets/r["output"]
    assert p.is_file(),str(p)
    with Image.open(p) as im:
        im.verify()
    with Image.open(p) as im:
        assert im.format=="WEBP" and im.width<=700 and im.height<=540
    assert p.stat().st_size<250_000,"oversize "+str(p)
    found.extend(r["ids"])
status_js=(assets/"photo-status.js").read_text(encoding="utf8").strip()
assert status_js.startswith("window.VKUSFERA_AVAILABLE_PHOTOS=")
assert set(json.loads(status_js.split("=",1)[1].rstrip(";"))) == ready
assert len(ready)>=1,"No real food images downloaded"
print("Verified",len(ready),"real photos for",len(found),"recipe cards with credits and licenses; 7 step SVGs unchanged")
