"""Homepage visual closeout checks in Chromium using source HTML with local CSS/JS inlined.
Actual localhost/file navigation is blocked by the managed Chromium policy in this runtime.
"""
from pathlib import Path
import re,base64,json,sys
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
proto=root/'prototype'
source=(proto/'mini_storage_home_H01_Visual_V2_7_4_SSOT.html').read_text(encoding='utf-8')
# Inline styles in source order.
for m in list(re.finditer(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>',source,re.I))[::-1]:
    f=proto/m.group(1).split('?',1)[0]
    if f.is_file(): source=source[:m.start()]+'<style>'+f.read_text(encoding='utf-8')+'</style>'+source[m.end():]
# Inline scripts; defer scripts run after document parsing.
deferred=[]
for m in list(re.finditer(r'<script\b([^>]*)\bsrc="([^"]+)"([^>]*)></script>',source,re.I))[::-1]:
    rel=m.group(2).split('?',1)[0]
    f=(proto/rel).resolve()
    if not f.is_file(): continue
    data=f.read_text(encoding='utf-8',errors='replace')
    data=data.replace('document.currentScript.src','"https://demo.invalid/prototype/mini_storage_global_support_v274.js"')
    if 'defer' in (m.group(1)+m.group(3)).lower(): deferred.append(data);replacement=''
    else: replacement='<script>'+data+'</script>'
    source=source[:m.start()]+replacement+source[m.end():]
source=source.replace('</body>','\n'.join('<script>'+x+'</script>' for x in deferred)+'</body>')
# Inline local <img> assets so the source-DOM screenshots preserve actual imagery despite about:blank base URLs.
for match in list(re.finditer(r'<img\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>',source,re.I))[::-1]:
    rel=match.group(1)
    if rel.startswith(('data:','http:','https:','//','blob:')): continue
    asset=(proto/rel).resolve()
    if not asset.is_file(): continue
    ext=asset.suffix.lower(); mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml'}.get(ext)
    if not mime: continue
    uri='data:'+mime+';base64,'+base64.b64encode(asset.read_bytes()).decode()
    source=source.replace(rel,uri)
# VIS-03B.1 fixture fix: mirror the HTTP acceptance URL (?state=new&loc=precise). With empty params the page treated location as
# 'unknown' and opened the demo location-permission sheet, which intercepted every click on the help launcher.
source=source.replace('const homeParams=new URLSearchParams(location.search);',"const homeParams=new URLSearchParams('state=new&loc=precise');")
source=re.sub(r'(?<![A-Za-z0-9_$])(?:window\.)?location\.href\s*=', 'window.__closeoutNav=', source)
source=source.replace('location.href)', 'window.__closeoutNav)')
source=source.replace('location.href,', 'window.__closeoutNav,')
# Stub localStorage to keep the page safe in about:blank and ensure no real data is written.
boot='''<script>const __closeoutStorage={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(__closeoutStorage,k)?__closeoutStorage[k]:null},setItem(k,v){__closeoutStorage[k]=String(v)},removeItem(k){delete __closeoutStorage[k]},clear(){Object.keys(__closeoutStorage).forEach(k=>delete __closeoutStorage[k])}}});</script>'''
source=source.replace('<head>','<head>'+boot,1)
# Use the same official demo fixture as the existing homepage state regression.
fixture=(proto/'mini_storage_demo_fixture_v2.js').read_text(encoding='utf-8')
ssot=(proto/'mini_storage_business_ssot_v274.js').read_text(encoding='utf-8')
if '<script>'+ssot+'</script>' in source:
    source=source.replace('<script>'+ssot+'</script>', '<script>'+fixture+"\nwindow.MINI_KOALA_DEMO_V2.seed('new');"+'</script><script>'+ssot+'</script>',1)
else:
    # fixture may already be included in the source bundle; fail loudly rather than fake the seed.
    if 'MINI_KOALA_DEMO_V2' not in source: raise SystemExit('Fixture boot point not found')
rows=[]
with sync_playwright() as p:
    launch={"headless":True,"args":["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]}
    if Path('/usr/bin/chromium').is_file(): launch['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**launch)
    for width,height in [(375,812),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)[:180]))
        page.set_content(source,wait_until='domcontentloaded',timeout=30000)
        page.wait_for_timeout(200)

        closed=page.evaluate('''()=>{const f=document.querySelector('#miniGlobalSupport'),l=document.querySelector('#miniSupportLauncher'),n=document.querySelector('.bottomnav'),p=document.querySelector('.page');const fr=f.getBoundingClientRect(),lr=l.getBoundingClientRect(),nr=n.getBoundingClientRect(),cs=getComputedStyle(f);return {className:f.className,rect:fr.toJSON(),launcher:lr.toJSON(),nav:nr.toJSON(),visible:cs.visibility,background:cs.backgroundColor,borderTop:cs.borderTopWidth,pointerEvents:cs.pointerEvents,pagePadding:getComputedStyle(p).paddingBottom,aria:l.getAttribute('aria-expanded')}}''')
        page.locator('#miniSupportLauncher').click()
        page.wait_for_timeout(100)
        expanded=page.evaluate('''()=>{const f=document.querySelector('#miniGlobalSupport'),n=document.querySelector('.bottomnav'),l=document.querySelector('#miniSupportLauncher'),phone=document.querySelector('#miniSupportPhone'),chat=document.querySelector('#miniSupportChat');const fr=f.getBoundingClientRect(),nr=n.getBoundingClientRect();return {rect:fr.toJSON(),navOverlap:fr.bottom>nr.top,aria:l.getAttribute('aria-expanded'),phoneVisible:getComputedStyle(phone).display!=='none'&&phone.getBoundingClientRect().height===44,chatVisible:getComputedStyle(chat).display!=='none'&&chat.getBoundingClientRect().height===44}}''')

        scroller=page.locator('.page')
        max_scroll=page.evaluate("document.querySelector('.page').scrollHeight-document.querySelector('.page').clientHeight")
        samples=[]
        for y in [round(max_scroll*i/8) for i in range(9)]:
            page.evaluate("y=>document.querySelector('.page').scrollTop=y",y)
            page.wait_for_timeout(50)
            samples.append(page.evaluate('''()=>{const f=document.querySelector('#miniGlobalSupport'),n=document.querySelector('.bottomnav'),fr=f.getBoundingClientRect(),nr=n.getBoundingClientRect();const hit=(a,b,g=8)=>a.left<b.right+g&&a.right>b.left-g&&a.top<b.bottom+g&&a.bottom>b.top-g;const targets=[...document.querySelectorAll('[data-home-price],.home-brand-materials .materials-action')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight});return {scrollTop:document.querySelector('.page').scrollTop,visible:getComputedStyle(f).visibility,navOverlap:hit(fr,nr,0),criticalOverlaps:targets.filter(e=>hit(fr,e.getBoundingClientRect())).map(e=>e.classList.contains('materials-action')?'materials':e.dataset.storePrice||'price'),unresolved:f.hasAttribute('data-collision-unresolved')}}'''))

        page.locator('.hero-benefits').first.click()
        page.wait_for_timeout(60)
        outside_closed=page.evaluate("!document.querySelector('#miniGlobalSupport').classList.contains('expanded')")
        page.locator('#miniSupportLauncher').click()
        page.locator('#miniSupportLauncher').press('Escape')
        escape_closed=page.evaluate("!document.querySelector('#miniGlobalSupport').classList.contains('expanded')&&document.activeElement.id==='miniSupportLauncher'")
        page.locator('#miniSupportLauncher').click()
        page.locator('#miniSupportChat').click()
        sheet_open=page.evaluate("document.querySelector('#miniSupportMask').classList.contains('show')&&!document.querySelector('#miniGlobalSupport').classList.contains('expanded')")
        page.locator('#miniSupportClose').click()
        sheet_closed=page.evaluate("!document.querySelector('#miniSupportMask').classList.contains('show')")
        phone_path=page.evaluate("document.querySelector('#miniSupportPhone').onclick.toString().includes('tel:4000358805')")

        geometry=(closed['rect']['width']==44 and closed['rect']['height']==44 and closed['launcher']['width']==44 and
                  closed['rect']['x']>=width-57 and closed['rect']['bottom']<=closed['nav']['top']-11 and
                  closed['background']=='rgba(0, 0, 0, 0)' and closed['borderTop']=='0px' and
                  closed['visible']=='visible' and closed['pagePadding']!='132px' and 'home-support-float' in closed['className'])
        collisions=all(x['visible']=='visible' and not x['navOverlap'] and not x['criticalOverlaps'] and not x['unresolved'] for x in samples)
        behavior=(expanded['aria']=='true' and expanded['phoneVisible'] and expanded['chatVisible'] and not expanded['navOverlap'] and
                  outside_closed and escape_closed and sheet_open and sheet_closed and phone_path)
        ok=geometry and collisions and behavior and not errors
        page.screenshot(path=str(root/f'outputs/home_visual_closeout_{width}_h01_004b.png'))
        rows.append({'viewport':f'{width}x{height}','closed':closed,'expanded':expanded,'scroll_samples':samples,'outside_closed':outside_closed,'escape_closed':escape_closed,'sheet_open':sheet_open,'sheet_closed':sheet_closed,'phone_path_preserved':phone_path,'page_errors':errors,'passed':bool(ok)})
        page.close()
    browser.close()
out=root/'outputs/home_visual_closeout_results.json';out.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
for r in rows: print(('PASS' if r['passed'] else 'FAIL'),r['viewport'],json.dumps(r,ensure_ascii=False))
print('TOTAL',sum(r['passed'] for r in rows),'/',len(rows))
sys.exit(0 if all(r['passed'] for r in rows) else 1)
