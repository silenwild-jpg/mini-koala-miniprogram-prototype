"""W5 site-wide regression renderer: EVERY redesigned page (W1–W5) × EVERY state × 375/390, WP02 metrics gate
(font floor <12, contrast, tap <32, overflow, console errors) + site-wide token inventory (font sizes / text colors / radii)
+ cross-page consistency checks (status bar, top bar, CSS layers, !important). Fold screenshots at 375 for all runs,
fold + full at 375/390 for BUSINESS (W5 new page). Writes evidence/W5_regression.json / .csv / W5_site_inventory.json.
Usage: python3 tools/render_w5_all.py http://127.0.0.1:PORT"""
import json, sys, os, csv, collections
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE=sys.argv[1].rstrip('/')
OUT=os.path.join(ROOT,'evidence'); os.makedirs(OUT,exist_ok=True)
JS=open(os.path.join(ROOT,'tools','metrics.js'),encoding='utf-8').read()
name=lambda s:s.replace('&overlay=','__').replace('&agreed=1','__agreed').replace('&review=1','__review')
PAGES={ # wave, page file, states (verbatim from render_w1..w4 + W5)
 'h01':('W1','pages/h01.html',['new','estimated','selected','booking','pending','expired','payment_failed','cancelled','invalidated','identity','upcoming','renewal','expiring','active','returning','lease_expired','refund']),
 's01':('W1','pages/s01.html',['browse','matched','nomatch','soldout','filtering','loading','matched&overlay=demand','matched&overlay=filter']),
 's02':('W2','pages/s02.html',['browse','matched','combo','near','nomatch','soldout','filtered','services','route']),
 's5':('W2','pages/s5.html',['matched','combo','near','none','large','advisor','cold','loading','expanded','matched&overlay=origin','matched&overlay=fees','matched&overlay=demand']),
 'o01':('W2','pages/o01.html',['empty','unauthorized','unauthorized&overlay=phone','ready','ready&agreed=1','ready&overlay=fees','coupon','coupon&overlay=coupon','pending','pending&overlay=pay','price_changed','payment_failed','payment_failed&agreed=1','expired']),
 'cap':('W3','pages/cap.html',['empty','filled','area','invalid','term','other','large','ai']),
 'items':('W3','pages/items.html',['empty','browse','selected','category','scenes','search','search_empty','term','known','cart','clear']),
 'quick':('W3','pages/quick.html',['empty','store','store&overlay=city','store&overlay=store','unit','unit&overlay=unit','term','term&overlay=terms','ready','ready&overlay=fees']),
 'booking':('W3','pages/booking.html',['empty','filled','filled&overlay=items','filled&overlay=capacity','filled&overlay=date','advisor','error','submitting','failed','success','success_advisor']),
 'o03':('W4','pages/o03.html',['empty','pending','payment_failed','expired','identity','upcoming','active','renewal','returning','inspection','refund','expired_lease','ended']),
 'rn01':('W4','pages/rn01.html',['empty','form','quote_pending','quote_ready','payment_pending','payment_pending&overlay=pay','payment_failed','cancelled','completed','unavailable']),
 'ex01':('W4','pages/ex01.html',['empty','form','form_early','form_expired','requested','waiting','failed','passed','unavailable']),
 'dp01':('W4','pages/dp01.html',['empty','held','waiting','refund_pending','refund_pending&overlay=progress','refunded','refund_failed&review=1','refund_failed']),
 'iv01':('W4','pages/iv01.html',['empty','form','filled','form_enterprise','invalid','submitted','processing','issue_failed&review=1','issue_failed','two_payments','two_payments&overlay=payment']),
 'business':('W5','pages/business.html',['empty','filled','custom','authorized','edit','blocked','error_phone','invalid_capacity','browse_error','submitting','failed','unknown','restored','success','success_update','filled&overlay=date']),
}
runs=[(k,w,f+'?state='+s,name(s)) for k,(w,f,ss) in PAGES.items() for s in ss]
for k in PAGES: os.makedirs(os.path.join(OUT,k),exist_ok=True)
CONSIST_JS="""() => ({statusbar:!!document.querySelector('.statusbar'),topbar:!!document.querySelector('.topbar'),actbar:!!document.querySelector('.actbar'),tabbar:!!document.querySelector('.tabbar'),
 cssLinks:[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.getAttribute('href')),inlineStyleTags:document.querySelectorAll('style').length,
 h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim()).slice(0,3),
 photoHero:[...document.querySelectorAll('*')].some(e=>{const s=getComputedStyle(e);return s.backgroundImage!=='none'&&e.getBoundingClientRect().height>200;}),
 darkGreenBlocks:[...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();if(r.width<200||r.height<120)return false;const m=s.backgroundColor.match(/rgba?\\((\\d+), (\\d+), (\\d+)/);if(!m)return false;const [R,G,B]=m.slice(1).map(Number);return G>R+30&&G>B+20&&G<120;}).length})"""
rows=[]; inv={'fontSizes':collections.Counter(),'colors':collections.Counter(),'radii':collections.Counter()}; perpage={}
with sync_playwright() as p:
    br=p.chromium.launch()
    for w,h in [(375,812),(390,844)]:
        ctx=br.new_context(viewport={'width':w,'height':h},device_scale_factor=2,locale='zh-CN')
        for folder,wave,url,nm in runs:
            pg=ctx.new_page(); errs=[]
            pg.on('console',lambda m,errs=errs: errs.append(m.text) if m.type=='error' else None)
            pg.on('pageerror',lambda e,errs=errs: errs.append(str(e)))
            pg.goto(f'{BASE}/{url}',wait_until='load'); pg.wait_for_timeout(500)
            m=pg.evaluate(JS); c=pg.evaluate(CONSIST_JS)
            if w==375 or folder=='business': pg.screenshot(path=f'{OUT}/{folder}/{nm}_{w}_fold.png')
            if folder=='business':
                pg.evaluate("document.body.style.position='relative';document.querySelectorAll('.actbar,.tabbar,.toastwrap').forEach(e=>e.style.position='absolute')")
                pg.screenshot(path=f'{OUT}/{folder}/{nm}_{w}_full.png',full_page=True)
            for k in ('fontSizes','colors','radii'):
                for kk,v in m[k].items(): inv[k][kk]+=v
            pp=perpage.setdefault(folder,{'fontSizes':set(),'colors':set(),'radii':set()})
            for k in pp: pp[k]|=set(m[k].keys())
            row={'page':folder.upper(),'wave':wave,'state':nm,'vp':w,'text':m['textCount'],'small12':len(m['small']),'contrast':len(m['contrast']),'tap32':len(m['tap']),'overflowX':m['overflowX'],'errors':len(errs),'scrollH':m['scrollH'],'fontSizes':sorted(m['fontSizes'].keys(),key=float),'colors':len(m['colors']),'radii':list(m['radii'].keys()),'consist':c,'contrastItems':m['contrast'],'smallItems':m['small'],'tapItems':m['tap'],'errItems':errs}
            rows.append(row)
            print(f"{folder}/{nm:28s} {w}: text={row['text']} <12={row['small12']} contrast={row['contrast']} tap<32={row['tap32']} ovx={row['overflowX']} err={row['errors']} h={row['scrollH']} sb={int(c['statusbar'])} tb={int(c['topbar'])} dg={c['darkGreenBlocks']}",flush=True)
            for e in errs: print('   ERR',e[:300])
            pg.close()
        ctx.close()
    br.close()
json.dump(rows,open(f'{OUT}/W5_regression.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
with open(f'{OUT}/W5_regression.csv','w',newline='',encoding='utf-8') as f:
    wr=csv.writer(f); wr.writerow(['page','wave','state','viewport','text_nodes','font_lt12','contrast_fail','tap_lt32','overflow_x','console_errors','scroll_height','font_sizes','text_colors','radii','statusbar','topbar','dark_green_blocks'])
    for r in rows: wr.writerow([r['page'],r['wave'],r['state'],r['vp'],r['text'],r['small12'],r['contrast'],r['tap32'],r['overflowX'],r['errors'],r['scrollH'],' '.join(r['fontSizes']),r['colors'],' '.join(r['radii']),int(r['consist']['statusbar']),int(r['consist']['topbar']),r['consist']['darkGreenBlocks']])
json.dump({'site':{k:dict(v) for k,v in inv.items()},'perPage':{k:{kk:sorted(vv) for kk,vv in v.items()} for k,v in perpage.items()}},open(f'{OUT}/W5_site_inventory.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('runs:',len(rows))
