#!/usr/bin/env python3
"""Image-level guard: H01 original screenshot and the render-only label fix must be identical outside the third label."""
from __future__ import annotations
import json
import math
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1] / "release-evidence" / "nav-vis-unify-01d"
report=json.loads((ROOT/"results.json").read_text("utf-8"))
runs=[]
for width in (375,390):
    orig=Image.open(ROOT/f"{width}-00-H01-original-bitmap-reference.png").convert("RGBA")
    fixed=Image.open(ROOT/f"{width}-01-H01-corrected-live.png").convert("RGBA")
    assert orig.size==fixed.size, f"{width}: viewport resized"
    h01=next(v for v in report["checks"] if v["width"]==width and v["screen"]=="H01")
    box=h01["nav"]["box"]
    x0=max(0,math.floor(box["x"]+box["w"]*0.50)-2)
    x1=min(width,math.ceil(box["x"]+box["w"]*0.75)+2)
    y0=max(0,math.floor(box["y"]+box["h"]*0.43)-2)
    y1=min(orig.height,math.ceil(box["y"]+box["h"]*0.70)+2)
    navtop=max(0,math.floor(box["y"]))
    navend=min(orig.height,math.ceil(box["y"]+box["h"]))
    diff=0
    illegal=0
    for y in range(navtop,navend):
        for x in range(width):
            if orig.getpixel((x,y)) == fixed.getpixel((x,y)):
                continue
            diff+=1
            if not (x0<=x<x1 and y0<=y<y1):illegal+=1
    assert diff>10, f"{width}: caption never changed"
    assert illegal==0, f"{width}: {illegal} original H01 navigation pixels changed outside one caption mask"
    runs.append({"width":width,"changed_pixels":diff,"outside_caption_diff_pixels":illegal,
                 "allowed_box":[x0,y0,x1,y1],"status":"PASS"})
(ROOT/"pixel-contract.json").write_text(json.dumps({"status":"PASS","runs":runs},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("NAV_VIS_UNIFY_01D_PIXEL_GUARD_PASS",json.dumps(runs,ensure_ascii=False))
