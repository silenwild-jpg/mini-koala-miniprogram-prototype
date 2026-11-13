#!/usr/bin/env python3
"""Check untouched bottom corner/curvature from H01 approved bitmap against S01/M01 at same SHA."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]/"release-evidence"/"rc2-merge-ready-08-nav"
summary = json.loads((root/"results.json").read_text("utf-8"))
checks=[]
for width in (375,390):
    h=Image.open(root/f"{width}-H01-approved-nav.png").convert("RGB")
    for page in ("S01","M01"):
        c=Image.open(root/f"{width}-{page}-footer.png").convert("RGB")
        assert h.size==c.size,(width,page,h.size,c.size)
        w,hh=h.size
        xcoords=list(range(0, min(25,w)))+list(range(max(w-25,0),w))
        ycoords=range(round(hh*0.81),hh)
        bad=[]
        total=0
        for y in ycoords:
            for x in xcoords:
                a,b=h.getpixel((x,y)),c.getpixel((x,y))
                difference=max(abs(i-j) for i,j in zip(a,b))
                total+=1
                if difference>15:
                    bad.append((x,y,difference))
        # The approved H01 home icon starts near the top of the source raster.
        # Its replacement on S01/M01 must fully hide those old top-edge pixels.
        # The new SVGs do not paint before y=8, so y=0..6 must be clear white.
        active=1 if page=="S01" else 3
        ghost=[]
        for col in (0,active):
            center=round((col+.5)*w/4)
            for y in range(min(7,hh)):
                for x in range(center-20,center+21):
                    if min(c.getpixel((x,y)))<225:
                        ghost.append((col,x,y,c.getpixel((x,y))))
        assert not ghost,(width,page,"TOP_EDGE_GHOST_ICON",ghost[:10])
        ratio=len(bad)/max(1,total)
        assert ratio<=0.012,(width,page,ratio,bad[:4])
        checks.append(dict(width=width,page=page,source_png=f"nav_original_{width}.png",
                           bottom_corner_pixels=total,corner_diff_over_15=len(bad),
                           ratio=round(ratio,5),status="PASS"))
(root/"pixel-results.json").write_text(json.dumps(dict(source_sha=summary["source_sha"],
                                                        cases=checks),ensure_ascii=False,indent=2)+"\n","utf-8")
print("RC2_MERGE_READY_08_H01_CURVE_PIXEL_PASS",json.dumps(checks))
