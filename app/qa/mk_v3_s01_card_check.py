#!/usr/bin/env python3
"""Task 02B-2 — S01 StoreCard / tag-row local check (read-only; serves the package root over local HTTP).
For browse / estimated / nomatch at 375x812 and 390x844: every .store card's natural height, tag-row parent, tag count,
tag wrap rows, clipping (tag box inside the row and the card content box), tag font-size / radius / colours, promo-tag
contrast, first-card shadow vs other cards, card radius / border, horizontal overflow, tab icon treatment, filter bar height,
E-store index, and the card click handler (click first card -> U01 URL). Usage: MK_ROOT=<pkg> python3 qa/mk_v3_s01_card_check.py --out <dir> --port N --label before|after"""
import os, sys, json, subprocess, time, argparse, re
from pathlib import Path
ROOT = Path(os.environ.get('MK_ROOT') or Path(__file__).resolve().parents[1])
sys.path.insert(0, str(Path(__file__).resolve().parent)); import mk_v3_pilot_probe as PR
from playwright.sync_api import sync_playwright

def lum(c):
    def ch(v):
        v /= 255.0; return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])
def ratio(a, b):
    la, lb = lum(a), lum(b); hi, lo = max(la, lb), min(la, lb); return (hi + 0.05) / (lo + 0.05)
def rgb(s):
    m = re.findall(r'[\d.]+', s or ''); return tuple(float(x) for x in m[:3]) if len(m) >= 3 else None

JS = '''()=>{
 const R=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}};
 const cards=[...document.querySelectorAll('#storeList .store')].map((c,i)=>{
   const cs=getComputedStyle(c); const row=c.querySelector('.store-demo-tags'); const cr=R(c);
   const pad={l:parseFloat(cs.paddingLeft),r:parseFloat(cs.paddingRight)};
   const content={l:cr.l+pad.l,r:cr.r-pad.r};
   let tags=[]; let rowInfo=null;
   if(row){const rr=R(row); const tops=new Set();
     tags=[...row.querySelectorAll('.tag')].map(t=>{const tr=R(t);const ts=getComputedStyle(t);tops.add(Math.round(tr.t));
       return {text:t.textContent.trim(),promo:t.classList.contains('mk-promo-tag'),w:+tr.w.toFixed(1),h:+tr.h.toFixed(1),
         insideRow:tr.l>=rr.l-0.5&&tr.r<=rr.r+0.5, insideCard:tr.l>=content.l-0.5&&tr.r<=content.r+0.5,
         fontSize:ts.fontSize,radius:ts.borderRadius,bg:ts.backgroundColor,color:ts.color,border:ts.borderTopColor+' '+ts.borderTopWidth,
         overflowHidden:ts.overflow}});
     rowInfo={parentIsHead:row.parentElement.classList.contains('store-head'),parent:row.parentElement.className,w:+rr.w.toFixed(1),
       scrollW:row.scrollWidth,clientW:row.clientWidth,wrap:getComputedStyle(row).flexWrap,gridColumn:getComputedStyle(row).gridColumn,rows:tops.size,
       ariaLabel:row.getAttribute('aria-label')};}
   const badges=[...c.querySelectorAll('.badge')].map(b=>({text:b.textContent.trim(),radius:getComputedStyle(b).borderRadius,fontSize:getComputedStyle(b).fontSize}));
   const name=c.querySelector('.name'); const area=c.querySelector('.area'); const route=c.querySelector('.route');
   return {i,id:c.dataset.id,name:name?name.childNodes[0].textContent.trim():null,height:+cr.h.toFixed(1),width:+cr.w.toFixed(1),
     radius:cs.borderRadius,border:cs.borderTopWidth+' '+cs.borderTopColor,shadow:cs.boxShadow,bg:cs.backgroundColor,
     areaFs:area?getComputedStyle(area).fontSize:null,routeFs:route?getComputedStyle(route).fontSize:null,nameFs:name?getComputedStyle(name).fontSize:null,
     tabindex:c.getAttribute('tabindex'),role:c.getAttribute('role'),ariaLabel:c.getAttribute('aria-label'),
     row:rowInfo,tags,badges}});
 const es=[...document.querySelectorAll('#storeList>*')].findIndex(e=>e.classList.contains('estore-list-card'));
 const tabs=[...document.querySelectorAll('.tabbar .tab')].map(t=>{const i=t.querySelector('.ico');const cs=i?getComputedStyle(i):null;return {label:t.textContent.trim(),icoFs:cs?cs.fontSize:null,mask:cs?(cs.webkitMaskImage||cs.maskImage||'none').slice(0,40):null,labelFs:getComputedStyle(t).fontSize}});
 const fb=document.querySelector('.controls.compact-filters .compact-filter-btn'); const fbs=fb?getComputedStyle(fb):null;
 const chev=document.querySelector('.compact-filter-btn .filter-chevron'); const chs=chev?getComputedStyle(chev):null;
 const ph=document.querySelector('.location-search-entry .placeholder'); const phs=ph?getComputedStyle(ph):null;
 const page=document.querySelector('.page');
 return {cards,estoreIndex:es,n:document.querySelectorAll('#storeList>*').length,
   overflow:{docScrollW:document.documentElement.scrollWidth,inner:innerWidth,pageScrollW:page?page.scrollWidth:null,pageClientW:page?page.clientWidth:null},
   tabs,filterBtn:fbs?{h:fbs.height,fs:fbs.fontSize,color:fbs.color,bg:fbs.backgroundColor}:null,chevron:chs?{fs:chs.fontSize,mask:(chs.webkitMaskImage||chs.maskImage||'none').slice(0,30),color:chs.color}:null,
   placeholder:phs?{fs:phs.fontSize,color:phs.color,text:ph.textContent.trim()}:null,
   filterOrder:[...document.querySelectorAll('.controls.compact-filters .compact-filter-btn')].map(b=>b.textContent.trim().replace(/\\s+/g,' ')),
   quick:[...document.querySelectorAll('.quick-store-filters button')].map(b=>({t:b.textContent.trim(),h:getComputedStyle(b).height,fs:getComputedStyle(b).fontSize,r:getComputedStyle(b).borderRadius})),
   headerH:getComputedStyle(document.querySelector('.header')).height,headerBg:getComputedStyle(document.querySelector('.header')).backgroundColor,
   pageBg:getComputedStyle(document.body).backgroundColor}}'''

def run(a):
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(a.port), '--bind', '127.0.0.1'], cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.2)
    base = f'http://127.0.0.1:{a.port}/prototype/'; R = {'label': a.label, 'root': str(ROOT), 'viewports': {}}
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            for vp in ['375x812', '390x844']:
                w, h = map(int, vp.split('x')); R['viewports'][vp] = {}
                for st in ['browse', 'estimated', 'nomatch']:
                    c = PR.new_ctx(b, w, h); pg = c.new_page(); errs = PR.attach(pg)
                    pg.goto(base + PR.S01 + PR.S01_STATES[st]); pg.wait_for_timeout(1600); PR.allow_location(pg)
                    if st in PR.SET_STATE: pg.evaluate('''(s)=>{if(typeof setState==='function'){setState(s)}}''', st); pg.wait_for_timeout(700)
                    pg.wait_for_timeout(300)
                    d = pg.evaluate(JS)
                    # contrast of every tag text on its own background (tag bg is opaque in both before/after)
                    for card in d['cards']:
                        for t in card['tags']:
                            fg, bg = rgb(t['color']), rgb(t['bg']); t['contrast'] = round(ratio(fg, bg), 2) if fg and bg else None
                    # summary
                    cards = d['cards']
                    d['summary'] = {
                        'cards': len(cards), 'heights': [x['height'] for x in cards],
                        'tagCounts': [len(x['tags']) for x in cards],
                        'tagRowParentIsHead': all(x['row']['parentIsHead'] for x in cards if x['row']),
                        'tagRowRows': [x['row']['rows'] for x in cards if x['row']],
                        'tagClipped': sum(1 for x in cards for t in x['tags'] if not (t['insideRow'] and t['insideCard'])),
                        'tagRowScrollable': sum(1 for x in cards if x['row'] and x['row']['scrollW'] > x['row']['clientW'] + 1),
                        'tagFontSizes': sorted({t['fontSize'] for x in cards for t in x['tags']}),
                        'tagRadii': sorted({t['radius'] for x in cards for t in x['tags']}),
                        'badgeRadii': sorted({bb['radius'] for x in cards for bb in x['badges']}),
                        'promoTags': [(x['name'], t['text'], t['contrast']) for x in cards for t in x['tags'] if t['promo']],
                        'minTagContrast': min([t['contrast'] for x in cards for t in x['tags'] if t['contrast']] or [None]),
                        'shadows': sorted({x['shadow'] for x in cards}), 'firstShadow': cards[0]['shadow'] if cards else None,
                        'radii': sorted({x['radius'] for x in cards}), 'borders': sorted({x['border'] for x in cards}),
                        'areaFs': sorted({x['areaFs'] for x in cards if x['areaFs']}), 'routeFs': sorted({x['routeFs'] for x in cards if x['routeFs']}),
                        'overflowOutside': d['overflow']['docScrollW'] > d['overflow']['inner'] or (d['overflow']['pageScrollW'] or 0) > (d['overflow']['pageClientW'] or 0),
                        'estoreIndex': d['estoreIndex'], 'filterOrder': d['filterOrder'],
                        'handlersIntact': all(x['role'] == 'link' and x['tabindex'] == '0' and bool(x['ariaLabel']) for x in cards),
                    }
                    # click handler after relocation: first store card -> U01
                    if cards:
                        pg.evaluate('''()=>{const c=document.querySelector('#storeList .store');c.scrollIntoView();}'''); pg.wait_for_timeout(150)
                        before_url = pg.url; pg.locator('#storeList .store').first.click(); pg.wait_for_timeout(1200)
                        d['summary']['cardClickNavigates'] = (pg.url != before_url) and ('unit_detail_u01' in pg.url)
                        d['summary']['cardClickUrl'] = pg.url[-90:]
                    d['errors'] = errs
                    R['viewports'][vp][st] = d; c.close()
                    s = d['summary']; print(f"{a.label:6s} {vp} {st:9s} cards={s['cards']} h={s['heights']} tags={s['tagCounts']} rows={s['tagRowRows']} parentHead={s['tagRowParentIsHead']} clipped={s['tagClipped']} scrollRows={s['tagRowScrollable']} tagFs={s['tagFontSizes']} tagR={s['tagRadii']} badgeR={s['badgeRadii']} minC={s['minTagContrast']} promo={len(s['promoTags'])} overflow={s['overflowOutside']} estore={s['estoreIndex']} click={s.get('cardClickNavigates')} err={len(errs['pageerror'])}")
            b.close()
    finally:
        srv.terminate()
    (out / f'card_check_{a.label}.json').write_text(json.dumps(R, ensure_ascii=False, indent=1), encoding='utf-8'); print('written', out / f'card_check_{a.label}.json')
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--port', type=int, default=8840); ap.add_argument('--label', default='after'); run(ap.parse_args())
