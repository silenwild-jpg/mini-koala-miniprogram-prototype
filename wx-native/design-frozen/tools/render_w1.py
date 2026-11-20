"""W1 evidence renderer: every H01 / S01 state at 375×812 and 390×844, full-page + fold screenshots,
WP02 metrics gate (font floor <12, contrast, tap <32, overflow, console errors) and a JSON/CSV summary.
Usage: python3 tools/render_w1.py http://127.0.0.1:PORT   (serve the deliverable root with python3 -m http.server)"""
import json, sys, os, csv
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE=sys.argv[1].rstrip('/')
OUT=os.path.join(ROOT,'evidence'); os.makedirs(OUT,exist_ok=True)
for d in ('h01','s01'): os.makedirs(os.path.join(OUT,d),exist_ok=True)
JS=open(os.path.join(ROOT,'tools','metrics.js'),encoding='utf-8').read()
H01=['new','estimated','selected','booking','pending','expired','payment_failed','cancelled','invalidated','identity','upcoming','renewal','expiring','active','returning','lease_expired','refund']
S01=['browse','matched','nomatch','soldout','filtering','loading','matched&overlay=demand','matched&overlay=filter']
runs=[('h01','pages/h01.html?state='+s,s) for s in H01]+[('s01','pages/s01.html?state='+s,s.replace('&overlay=','__')) for s in S01]
rows=[]
with sync_playwright() as p:
    br=p.chromium.launch()
    for w,h in [(375,812),(390,844)]:
        ctx=br.new_context(viewport={'width':w,'height':h},device_scale_factor=2,locale='zh-CN')
        for folder,url,name in runs:
            pg=ctx.new_page(); errs=[]
            pg.on('console',lambda m,errs=errs: errs.append(m.text) if m.type=='error' else None)
            pg.on('pageerror',lambda e,errs=errs: errs.append(str(e)))
            pg.goto(f'{BASE}/{url}',wait_until='load'); pg.wait_for_timeout(600)
            # overlays are fixed: measure with scroll at top; full page captures the whole document
            m=pg.evaluate(JS); vm=pg.evaluate('window.__W1||null')
            pg.screenshot(path=f'{OUT}/{folder}/{name}_{w}_fold.png')
            pg.screenshot(path=f'{OUT}/{folder}/{name}_{w}_full.png',full_page=True)
            row={'page':folder.upper(),'state':name,'vp':w,'text':m['textCount'],'small12':len(m['small']),'contrast':len(m['contrast']),'tap32':len(m['tap']),'overflowX':m['overflowX'],'errors':len(errs),'scrollH':m['scrollH'],'fontSizes':sorted(m['fontSizes'].keys(),key=float),'colors':len(m['colors']),'radii':list(m['radii'].keys()),'policyKey':(vm or {}).get('state'),'vm':vm,'contrastItems':m['contrast'],'smallItems':m['small'],'tapItems':m['tap'],'errItems':errs}
            rows.append(row)
            print(f"{folder}/{name:28s} {w}: text={row['text']} <12={row['small12']} contrast={row['contrast']} tap<32={row['tap32']} ovx={row['overflowX']} err={row['errors']} h={row['scrollH']} key={row['policyKey']}")
            for c in m['contrast']: print('   contrast',c)
            for s in m['small']: print('   small',s)
            for t in m['tap']: print('   tap',t)
            for e in errs: print('   ERR',e[:200])
            pg.close()
        ctx.close()
    br.close()
json.dump(rows,open(f'{OUT}/W1_metrics.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
with open(f'{OUT}/W1_metrics.csv','w',newline='',encoding='utf-8') as f:
    wr=csv.writer(f); wr.writerow(['page','state','viewport','policy_key','text_nodes','font_lt12','contrast_fail','tap_lt32','overflow_x','console_errors','scroll_height','font_sizes','text_colors','radii'])
    for r in rows: wr.writerow([r['page'],r['state'],r['vp'],r['policyKey'],r['text'],r['small12'],r['contrast'],r['tap32'],r['overflowX'],r['errors'],r['scrollH'],' '.join(r['fontSizes']),r['colors'],' '.join(r['radii'])])
print('states:',len(runs),'runs:',len(rows))
