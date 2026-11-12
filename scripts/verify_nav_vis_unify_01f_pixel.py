#!/usr/bin/env python3
"""NAV-01F footer-only raster safety gate: only the 3 inactive caption strips may differ."""
import json,math
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]/'release-evidence'/'nav-vis-unify-01f'
records=json.loads((ROOT/'results.json').read_text('utf-8'))['checks']
summary=[]
for width in (375,390):
    unpatched=Image.open(ROOT/f'{width}-00-H01-original-bitmap-reference.png').convert('RGBA')
    patched=Image.open(ROOT/f'{width}-01-H01-corrected-live.png').convert('RGBA')
    assert unpatched.size==patched.size, f'{width}: screenshot resized'
    h01=next(item for item in records if item['width']==width and item['screen']=='H01')
    b=h01['nav']['box']
    top=max(0,math.floor(b['y']))
    bottom=min(unpatched.height,math.ceil(b['y']+b['h']))
    ya=max(0,math.floor(b['y']+.43*b['h'])-2)
    yb=min(unpatched.height,math.ceil(b['y']+.70*b['h'])+2)
    allowed=[]
    for idx in [1,2,3]:
        xa=max(0,math.floor(b['x']+(idx/4)*b['w'])-2)
        xb=min(width,math.ceil(b['x']+((idx+1)/4)*b['w'])+2)
        allowed.append((xa,ya,xb,yb))
    changed=[0,0,0];outliers=0
    for y in range(top,bottom):
        for x in range(width):
            if unpatched.getpixel((x,y))==patched.getpixel((x,y)):continue
            membership=[k for k,(x0,y0,x1,y1) in enumerate(allowed) if x0<=x<x1 and y0<=y<y1]
            if membership:
                changed[membership[0]]+=1
            else:outliers+=1
    assert min(changed)>20,f'{width}: one inactive label not changed {changed}'
    assert outliers==0,f'{width}: {outliers} changed pixels outside the three caption masks'
    summary.append({'width':width,'changed_pixels_by_tab':changed,'outside_all_three_caption_boxes':outliers,
                    'allowed_boxes':allowed,'status':'PASS'})
(ROOT/'pixel-contract.json').write_text(json.dumps({'status':'PASS','scope':'H01 footer only','runs':summary},ensure_ascii=False,indent=2)+'\n')
print('NAV_VIS_UNIFY_01F_3_LABEL_PIXEL_GUARD_PASS '+json.dumps(summary,ensure_ascii=False))
