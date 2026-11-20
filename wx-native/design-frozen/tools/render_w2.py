"""W2 evidence renderer: every S02 / S5 / O01 state (+ overlays) at 375×812 and 390×844, fold + full-page screenshots,
WP02 metrics gate (font floor <12, contrast, tap <32, overflow, console errors) and a JSON/CSV summary.
Usage: python3 tools/render_w2.py http://127.0.0.1:PORT [h01]   (serve the deliverable root with python3 -m http.server)
Passing a second arg 'h01' renders the W1 H01 states instead (used for the W1 v1.0.1 task-card copy patch)."""
import json, sys, os, csv
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE=sys.argv[1].rstrip('/')
MODE=sys.argv[2] if len(sys.argv)>2 else 'w2'
OUT=os.path.join(ROOT,'evidence'); os.makedirs(OUT,exist_ok=True)
JS=open(os.path.join(ROOT,'tools','metrics.js'),encoding='utf-8').read()
S02=['browse','matched','combo','nomatch','soldout','filtered','services','route']
S5=['matched','combo','near','none','large','advisor','cold','loading','matched&overlay=origin','matched&overlay=fees','matched&overlay=demand']
O01=['empty','unauthorized','unauthorized&overlay=phone','ready','ready&agreed=1','ready&overlay=fees','coupon','coupon&overlay=coupon','pending','pending&overlay=pay','price_changed','payment_failed','payment_failed&agreed=1','expired']
H01=['new','estimated','selected','booking','pending','expired','payment_failed','cancelled','invalidated','identity','upcoming','renewal','expiring','active','returning','lease_expired','refund']
name=lambda s:s.replace('&overlay=','__').replace('&agreed=1','__agreed')
if MODE=='h01':
    runs=[('h01','pages/h01.html?state='+s,s) for s in H01]; label='W1_H01'
else:
    runs=[('s02','pages/s02.html?state='+s,name(s)) for s in S02]+[('s5','pages/s5.html?state='+s,name(s)) for s in S5]+[('o01','pages/o01.html?state='+s,name(s)) for s in O01]; label='W2'
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
            pg.goto(f'{BASE}/{url}',wait_until='load'); pg.wait_for_timeout(500)
            m=pg.evaluate(JS); vm=pg.evaluate('window.__W2||window.__W1||null')
            pg.screenshot(path=f'{OUT}/{folder}/{nm}_{w}_fold.png')
            # full-page capture: pin fixed bars to the document end so they do not float mid-page in the long shot
            pg.evaluate("document.body.style.position='relative';document.querySelectorAll('.actbar,.tabbar').forEach(e=>e.style.position='absolute')")
            pg.screenshot(path=f'{OUT}/{folder}/{nm}_{w}_full.png',full_page=True)
            row={'page':folder.upper(),'state':nm,'vp':w,'text':m['textCount'],'small12':len(m['small']),'contrast':len(m['contrast']),'tap32':len(m['tap']),'overflowX':m['overflowX'],'errors':len(errs),'scrollH':m['scrollH'],'fontSizes':sorted(m['fontSizes'].keys(),key=float),'colors':len(m['colors']),'radii':list(m['radii'].keys()),'vm':vm,'contrastItems':m['contrast'],'smallItems':m['small'],'tapItems':m['tap'],'errItems':errs}
            rows.append(row)
            print(f"{folder}/{nm:30s} {w}: text={row['text']} <12={row['small12']} contrast={row['contrast']} tap<32={row['tap32']} ovx={row['overflowX']} err={row['errors']} h={row['scrollH']}")
            for c in m['contrast']: print('   contrast',c)
            for s in m['small']: print('   small',s)
            for t in m['tap']: print('   tap',t)
            for e in errs: print('   ERR',e[:300])
            pg.close()
        ctx.close()
    br.close()
json.dump(rows,open(f'{OUT}/{label}_metrics.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
with open(f'{OUT}/{label}_metrics.csv','w',newline='',encoding='utf-8') as f:
    wr=csv.writer(f); wr.writerow(['page','state','viewport','text_nodes','font_lt12','contrast_fail','tap_lt32','overflow_x','console_errors','scroll_height','font_sizes','text_colors','radii'])
    for r in rows: wr.writerow([r['page'],r['state'],r['vp'],r['text'],r['small12'],r['contrast'],r['tap32'],r['overflowX'],r['errors'],r['scrollH'],' '.join(r['fontSizes']),r['colors'],' '.join(r['radii'])])
print('runs:',len(rows))
