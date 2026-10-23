"""Real HTTP URL smoke for the Mini Koala prototype.
Run in an environment whose Chromium policy permits localhost navigation. Unlike the source-inline tests,
this script intentionally navigates the actual HTTP-served HTML files and follows a real homepage-to-S01 click.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import quote
import json, os, shutil, sys, time
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
pages=[
 'prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
 'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
 'prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
 'prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
 'prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
 'prototype/mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
 'prototype/mini_storage_quote_q02_v4_self_service.html',
 'prototype/mini_storage_quote_q03_v4_self_service.html',
 'prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
 'prototype/mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html',
 'prototype/mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html',
 'prototype/mini_storage_identity_id01_v2_7_4_5.html',
 'prototype/mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html',
]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(root),**kwargs)
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
results=[];blocked=None
try:
    with sync_playwright() as p:
        exe=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        if not exe and Path('/usr/bin/chromium').exists(): exe='/usr/bin/chromium'
        kwargs={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
        if exe: kwargs['executable_path']=exe
        browser=p.chromium.launch(**kwargs)
        for width,height in [(375,812),(390,844)]:
            context=browser.new_context(viewport={'width':width,'height':height})
            for path in pages:
                page=context.new_page();errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)[:180]))
                try:
                    response=page.goto(base+quote(path,safe='/'),wait_until='networkidle',timeout=15000)
                    if not response or response.status>=400: raise RuntimeError(f'HTTP status {response.status if response else None}')
                    info=page.evaluate('''()=>({title:document.title,width:document.documentElement.scrollWidth,viewport:innerWidth,bodyText:(document.body.innerText||'').trim().slice(0,80)})''')
                    if info['width']>width+1: raise RuntimeError(f'horizontal overflow {info["width"]}>{width}')
                    if errors: raise RuntimeError('page errors: '+ '; '.join(errors))
                    results.append({'page':path,'viewport':f'{width}x{height}','passed':True,**info})
                except Exception as e:
                    message=str(e)
                    if 'ERR_BLOCKED_BY_ADMINISTRATOR' in message:
                        blocked=message.splitlines()[0]
                        results.append({'page':path,'viewport':f'{width}x{height}','passed':False,'blocked':blocked})
                        page.close();break
                    results.append({'page':path,'viewport':f'{width}x{height}','passed':False,'error':message[:250],'page_errors':errors})
                page.close()
            context.close()
            if blocked: break
        if not blocked:
            # Real click path: homepage's visible "全部门店" CTA should open S01 by URL navigation.
            page=browser.new_page(viewport={'width':375,'height':812});page.goto(base+pages[0],wait_until='networkidle',timeout=15000)
            cta=page.locator('#allNearbyStores')
            cta.scroll_into_view_if_needed(timeout=5000);cta.click(timeout=5000)
            page.wait_for_url('**mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html**',timeout=8000)
            results.append({'journey':'H01 -> S01 via #allNearbyStores','passed':True,'url':page.url})
            page.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
out=root/'outputs/real_url_e2e_smoke_v1.json';out.write_text(json.dumps({'base_url':base,'blocked':blocked,'results':results,'passed':sum(1 for x in results if x.get('passed')),'total':len(results)},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'blocked':blocked,'passed':sum(1 for x in results if x.get('passed')),'total':len(results),'first_results':results[:3]},ensure_ascii=False,indent=2))
if blocked: sys.exit(2)
sys.exit(0 if all(x.get('passed') for x in results) else 1)
