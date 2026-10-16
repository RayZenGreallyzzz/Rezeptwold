#!/usr/bin/env python3
"""Download and optimize curated *real* Wikimedia Commons dish photographs for APK.
Not an automatic image search: every filename, recipe ID, attribution and license
is reviewed in photo-catalog.js before being added.
"""
import hashlib
import io
import json
import pathlib
import time
import urllib.parse
import urllib.request
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT=pathlib.Path(__file__).resolve().parents[1]
ASSETS=ROOT/"app/src/main/assets"
DATA=(ASSETS/"photo-catalog.js").read_text(encoding="utf8").strip()
PREFIX="window.VKUSFERA_REAL_PHOTOS="
assert DATA.startswith(PREFIX) and DATA.endswith(";")
RECORDS=json.loads(DATA[len(PREFIX):-1])
OUT=ASSETS/"img/real"
OUT.mkdir(parents=True,exist_ok=True)
UA="VkusferaCookbook/0.9 (https://github.com/RayZenGreallyzzz/Rezeptwold; contact via repository issues)"
HEADERS={"User-Agent":UA,"Accept":"image/avif,image/webp,image/*;q=0.9,*/*;q=0.8"}
good=[]
bad=[]
for rec in RECORDS:
    name=rec["file"].replace(" ","_")
    assert "/" not in name and name.lower().endswith((".jpg",".jpeg",".png"))
    h=hashlib.md5(name.encode("utf8")).hexdigest()
    original="https://upload.wikimedia.org/wikipedia/commons/"+h[0]+"/"+h[:2]+"/"+urllib.parse.quote(name,safe="()_-.")
    # Short thumbnail first to save bandwidth, full original as backup.
    thumb="https://upload.wikimedia.org/wikipedia/commons/thumb/"+h[0]+"/"+h[:2]+"/"+urllib.parse.quote(name,safe="()_-.")+"/640px-"+urllib.parse.quote(name,safe="()_-.")
    dest=ASSETS/rec["output"]
    assert str(dest.resolve()).startswith(str(OUT.resolve()))
    reason=""
    for url in (thumb,original):
        try:
            request=urllib.request.Request(url,headers=HEADERS)
            with urllib.request.urlopen(request,timeout=22) as response:
                data=response.read(11_000_000)
                mime=response.headers.get("content-type","")
            if len(data)<1000 or len(data)>10_000_000 or not mime.startswith("image/"):
                raise RuntimeError("Invalid size or mime: "+str((len(data),mime)))
            with Image.open(io.BytesIO(data)) as im:
                im=ImageOps.exif_transpose(im)
                im.thumbnail((700,540),Image.Resampling.LANCZOS)
                if im.mode not in ("RGB","RGBA"): im=im.convert("RGB")
                if im.mode=="RGBA":
                    base=Image.new("RGB",im.size,"#f8f5ec")
                    base.paste(im,mask=im.getchannel("A"))
                    im=base
                im.save(dest,"WEBP",quality=74,method=5)
            with Image.open(dest) as test:
                test.verify()
            print("PHOTO",rec["ids"],name,round(dest.stat().st_size/1024),"KiB")
            good.append(rec)
            break
        except Exception as exc:
            reason=str(exc)[:190]
            time.sleep(.25)
    else:
        print("UNAVAILABLE",name,reason)
        bad.append({"file":name,"reason":reason})
# A missing image must NEVER be mislabeled a real photograph in the UI:
# Android's img onerror uses the recipe illustration.
(ASSETS/"photo-status.json").write_text(json.dumps({
    "real_files":[x["output"] for x in good],
    "matched_recipe_ids":sorted(set(i for x in good for i in x["ids"])),
    "missing":[x["file"] for x in bad]
},ensure_ascii=False),encoding="utf8")
(ASSETS/"photo-status.js").write_text("window.VKUSFERA_AVAILABLE_PHOTOS="+json.dumps([x["output"] for x in good],ensure_ascii=False)+";\n",encoding="utf8")
print("CURATED PHOTO COVERAGE:",len(good),"/",len(RECORDS),"files,",
      len(set(i for x in good for i in x["ids"])),"recipe cards")
if not good:
    raise SystemExit("No photographs downloaded; failing build instead of releasing an empty photo update")
