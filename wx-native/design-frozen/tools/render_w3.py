"""W3 evidence renderer: every CAP / ITEMS / QUICK / BOOKING state (+ overlays) at 375×812 and 390×844, fold + full-page
screenshots, WP02 metrics gate (font floor <12, contrast, tap <32, overflow, console errors) and a JSON/CSV summary.
Usage: python3 tools/render_w3.py http://127.0.0.1:PORT   (serve the deliverable root with python3 -m http.server --directory .)"""
import json, sys, os, csv
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE=sys.argv[1].rstrip('/')
OUT=os.path.join(ROOT,'evidence'); os.makedirs(OUT,exist_ok=True)
JS=open(os.path.join(ROOT,'tools','metrics.js'),encoding='utf-8').read()
CAP=['empty','filled','area','invalid','term','other','large','ai']
ITEMS=['empty','browse','selected','category','scenes','search','search_empty','term','known','cart','clear']
QUICK=['empty','store','store&overlay=city','store&overlay=store','unit','unit&overlay=unit','term','term&overlay=terms','ready','ready&overlay=fees']
BOOKING=['empty','filled','filled&overlay=items','filled&overlay=capacity','filled&overlay=date','advisor','error','submitting','failed','success','success_advisor']
name=lambda s:s.replace('&overlay=','__')
runs=[('cap','pages/cap.html?state='+s,name(s)) for s in CAP]+[('items','pages/items.html?state='+s,name(s)) for s in ITEMS]+[('quick','pages/quick.html?state='+s,name(s)) for s in QUICK]+[('booking','pages/booking.html?state='+s,name(s)) for s in BOOKING]
for d in set(r[0] for r in runs): os.makedirs(os.path.join(OUT,d),exist_ok=True)
rows=[]
with sync_playwright() as p:
    br=p.chromium.launch()
    for w,h in [(375,812),(390,844)]:
        ctx=br.new_context(viewport={'width':w,'height':h},device_scale_factor=2,locale='zh-CN')
        for folder,url,nm in runs:
            pg=ctx.new_page(); errs=[]
            pg.on('console',lambda m,errs=errs: errs.append(m.text) if m.type=='error' else None)
            pg.on('pageerror',lambda e,errs=errs: errs.append(str(e)))
            pg.goto(f'{BASE}/{url}',wait_until='load'); pg.wait_for_timeout(600)
            m=pg.evaluate(JS); vm=pg.evaluate('window.__W3||null')
            pg.screenshot(path=f'{OUT}/{folder}/{nm}_{w}_fold.png')
            pg.evaluate("document.body.style.position='relative';document.querySelectorAll('.actbar,.tabbar,.toastwrap').forEach(e=>e.style.position='absolute')")
            pg.screenshot(path=f'{OUT}/{folder}/{nm}_{w}_full.png',full_page=True)
            row={'page':folder.upper(),'state':nm,'vp':w,'text':m['textCount'],'small12':len(m['small']),'contrast':len(m['contrast']),'tap32':len(m['tap']),'overflowX':m['overflowX'],'errors':len(errs),'scrollH':m['scrollH'],'fontSizes':sorted(m['fontSizes'].keys(),key=float),'colors':len(m['colors']),'radii':list(m['radii'].keys()),'vm':vm,'contrastItems':m['contrast'],'smallItems':m['small'],'tapItems':m['tap'],'errItems':errs}
            rows.append(row)
            print(f"{folder}/{nm:28s} {w}: text={row['text']} <12={row['small12']} contrast={row['contrast']} tap<32={row['tap32']} ovx={row['overflowX']} err={row['errors']} h={row['scrollH']}")
            for c in m['contrast']: print('   contrast',c)
            for s in m['small']: print('   small',s)
            for t in m['tap']: print('   tap',t)
            for e in errs: print('   ERR',e[:300])
            pg.close()
        ctx.close()
    br.close()
json.dump(rows,open(f'{OUT}/W3_metrics.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
with open(f'{OUT}/W3_metrics.csv','w',newline='',encoding='utf-8') as f:
    wr=csv.writer(f); wr.writerow(['page','state','viewport','text_nodes','font_lt12','contrast_fail','tap_lt32','overflow_x','console_errors','scroll_height','font_sizes','text_colors','radii'])
    for r in rows: wr.writerow([r['page'],r['state'],r['vp'],r['text'],r['small12'],r['contrast'],r['tap32'],r['overflowX'],r['errors'],r['scrollH'],' '.join(r['fontSizes']),r['colors'],' '.join(r['radii'])])
print('runs:',len(rows))
