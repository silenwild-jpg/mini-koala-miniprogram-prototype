"""Chromium runtime smoke for primary journey pages. Local URL navigation is blocked by managed-browser policy; sources are inlined and executed in Chromium."""
from pathlib import Path
import re,json,sys
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]; proto=root/'prototype'
pages=[
 'mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
 'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
 'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
 'mini_storage_quote_q02_v4_self_service.html',
 'mini_storage_quote_q03_v4_self_service.html',
 'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
 'mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html',
 'mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html',
 'mini_storage_identity_id01_v2_7_4_5.html',
 'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html',
]
_inline_cache={}
def inline_page(name):
    if name in _inline_cache: return _inline_cache[name]
    p=proto/name;s=p.read_text(encoding='utf-8',errors='replace'); query='?orderNo=O-ID-1' if name in ('mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html','mini_storage_identity_id01_v2_7_4_5.html') else ''
    # Keep a stable simulated page URL for code that derives relative routes.
    s=s.replace('window.location.href=', 'window.__crossPageNav=')
    s=re.sub(r'(?<![\w.$])location\.href\s*=', 'window.__crossPageNav=', s)
    s=re.sub(r'(?<![\w.$])location\.assign\(', 'window.__crossPageNav=(', s)
    s=re.sub(r'(?<![\w.$])location\.replace\(', 'window.__crossPageNav=(', s)
    fake_url='https://demo.invalid/prototype/'+name+query
    s=s.replace('window.location.href',json.dumps(fake_url)).replace('location.href',json.dumps(fake_url))
    s=s.replace('window.location.pathname',json.dumps('/prototype/'+name)).replace('location.pathname',json.dumps('/prototype/'+name))
    s=s.replace('window.location.search',json.dumps(query)).replace('location.search',json.dumps(query))
    for m in list(re.finditer(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>',s,re.I))[::-1]:
        f=(proto/m.group(1)).resolve()
        if f.is_file():s=s[:m.start()]+'<style>'+f.read_text(encoding='utf-8',errors='replace')+'</style>'+s[m.end():]
    deferred=[]
    for m in list(re.finditer(r'<script\b([^>]*)\bsrc="([^"]+)"([^>]*)></script>',s,re.I))[::-1]:
        f=(proto/m.group(2)).resolve()
        if not f.is_file():continue
        data=f.read_text(encoding='utf-8',errors='replace').replace('document.currentScript.src',json.dumps(fake_url))
        if 'defer' in (m.group(1)+m.group(3)).lower():deferred.append(data);rep=''
        else:rep='<script>'+data+'</script>'
        s=s[:m.start()]+rep+s[m.end():]
    s=s.replace('</body>','\n'.join('<script>'+x+'</script>' for x in deferred)+'</body>')
    shim='''<script>const __crossStore=window.__crossStore||(window.__crossStore={});Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(__crossStore,k)?__crossStore[k]:null},setItem(k,v){__crossStore[k]=String(v)},removeItem(k){delete __crossStore[k]},clear(){Object.keys(__crossStore).forEach(k=>delete __crossStore[k])}}});</script>'''
    s=s.replace('<head>','<head>'+shim,1)
    if name in ('mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html','mini_storage_identity_id01_v2_7_4_5.html'):
        seed='''<script>__crossStore['mini_storage_order_current']=JSON.stringify({order_no:'O-ID-1',status:'PAID',payment_status:'PAID',inventory_status:'LOCKED_TO_ORDER',store_id:'jianguo',unit_id:'C008',volume:4.8,term_months:6,monthly_price:687,total_price:4120,deposit_amount:687,management_fee:50,payable_total:4857,start_date:new Date().toISOString().slice(0,10),identity_verification_status:'NOT_STARTED'});__crossStore['mini_storage_payment_result_current']=JSON.stringify({order_no:'O-ID-1',status:'PAID',processed_at:new Date().toISOString()});</script>'''
        s=s.replace('</head>',seed+'</head>',1)
    _inline_cache[name]=s
    return s
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for width,height in [(375,812),(390,844)]:
  context=b.new_context(viewport={'width':width,'height':height})
  for name in pages:
   page=context.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)[:220]))
   try:
    page.set_content(inline_page(name),wait_until='domcontentloaded',timeout=30000);page.wait_for_timeout(60)
    info=page.evaluate('''()=>({title:document.title,bodyWidth:document.body.scrollWidth,viewport:innerWidth,bodyText:(document.body.innerText||'').trim().slice(0,80),visibleButtons:[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0}).length,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.getAttribute('src')&&!i.getAttribute('src').startsWith('data:')).length})''')
    ok=not errors and info['bodyWidth']<=width+1
    rows.append({'page':name,'viewport':f'{width}x{height}','passed':bool(ok),'errors':errors,**info})
   except Exception as e:rows.append({'page':name,'viewport':f'{width}x{height}','passed':False,'errors':[str(e)[:250]]})
   page.close()
  context.close()
 b.close()
out=root/'outputs/cross_page_runtime_smoke_v1.json';out.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
for r in rows: print(('PASS' if r['passed'] else 'FAIL'),r['viewport'],r['page'],'errors=',r['errors'][:1],'width=',r.get('bodyWidth'), '/',r.get('viewport'))
print('TOTAL',sum(r['passed'] for r in rows),'/',len(rows))
sys.exit(0 if all(r['passed'] for r in rows) else 1)
