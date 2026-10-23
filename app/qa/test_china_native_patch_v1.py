"""Targeted China-native UX PATCH V1 verification.

Offline Chromium uses inlined JS/CSS + embedded real demo image bytes so
managed file/HTTP URL restrictions cannot silently hide legitimate local assets.
This is not proof of real URL navigation or WeChat mini-program runtime.
"""
from pathlib import Path
import re,sys,json,base64
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PRO=ROOT/'prototype'
OUT=ROOT/'outputs/china_native_ux_patch_v1'
OUT.mkdir(parents=True,exist_ok=True)
FILES={
  's01':'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
  'h01':'mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
  'u01':'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
}
asset_cache={}
def embed_assets(text):
  def replace(m):
    rel=m.group(0)
    if rel not in asset_cache:
      asset=(PRO/rel).resolve()
      if asset.is_file() and str(asset).startswith(str(ROOT)):
        typ='image/webp' if asset.suffix=='.webp' else 'image/png'
        asset_cache[rel]='data:'+typ+';base64,'+base64.b64encode(asset.read_bytes()).decode()
      else: asset_cache[rel]=rel
    return asset_cache[rel]
  return re.sub(r'\.\./assets/real_store_demo/v1/MK_BJ_[A-Z0-9]+/[\w.]+\.webp',replace,text)
def inline_html(name):
  source=(PRO/name).read_text(encoding='utf-8',errors='replace')
  fake_url='https://demo.invalid/prototype/'+name
  source=source.replace('window.location.href=', 'window.__cnNav=')
  source=re.sub(r'(?<![\w.$])location\.href\s*=', 'window.__cnNav=', source)
  source=source.replace('window.location.href',json.dumps(fake_url)).replace('location.href',json.dumps(fake_url))
  source=source.replace('window.location.pathname',json.dumps('/prototype/'+name)).replace('location.pathname',json.dumps('/prototype/'+name))
  source=source.replace('window.location.search',"''").replace('location.search',"''")
  for m in list(re.finditer(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>',source,re.I))[::-1]:
    dep=(PRO/m.group(1)).resolve()
    if dep.is_file():source=source[:m.start()]+'<style>'+dep.read_text(encoding='utf-8',errors='replace')+'</style>'+source[m.end():]
  deferred=[]
  for m in list(re.finditer(r'<script\b([^>]*)\bsrc="([^"]+)"([^>]*)></script>',source,re.I))[::-1]:
    dep=(PRO/m.group(2)).resolve()
    if not dep.is_file():continue
    data=dep.read_text(encoding='utf-8',errors='replace').replace('document.currentScript.src',json.dumps(fake_url))
    if 'defer' in (m.group(1)+m.group(3)).lower():deferred.append(data);rep=''
    else:rep='<script>'+data+'</script>'
    source=source[:m.start()]+rep+source[m.end():]
  source=source.replace('</body>','\n'.join('<script>'+s+'</script>' for s in deferred)+'</body>')
  shim='''<script>const __cnStore=window.__cnStore||(window.__cnStore={});Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(__cnStore,k)?__cnStore[k]:null},setItem(k,v){__cnStore[k]=String(v)},removeItem(k){delete __cnStore[k]},clear(){Object.keys(__cnStore).forEach(k=>delete __cnStore[k])}}});</script>'''
  return embed_assets(source.replace('<head>','<head>'+shim,1))

all_results=[]
with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for w,h in [(375,812),(390,844)]:
    context=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1)
    for key,name in FILES.items():
      page=context.new_page();errors=[]
      page.on('pageerror',lambda error:errors.append(str(error)))
      try:
        page.set_content(inline_html(name),wait_until='domcontentloaded',timeout=30000)
        page.wait_for_timeout(250)
        metrics=page.evaluate('''() => ({width:document.body.scrollWidth, viewport:innerWidth, brokenImages:[...document.images].filter(i=>i.complete && i.getAttribute('src') && i.naturalWidth===0 && !i.src.startsWith('data:image/svg')).length})''')
        assert metrics['width']<=w+2,(key,w,metrics)
        if key=='s01':
          stores=page.locator('.store[data-id]')
          assert stores.count()>=2,stores.count()
          metrics['storeOrder']=stores.evaluate_all('''els=>els.slice(0,6).map(e=>({id:e.dataset.id,route:e.querySelector('.route')?.textContent.trim()}))''')
          distances=[float(re.search(r'([0-9.]+)km',it['route']).group(1)) for it in metrics['storeOrder']]
          assert all(distances[i]<=distances[i+1]+1e-4 for i in range(len(distances)-1)),metrics['storeOrder']
          metrics['photoStatus']=page.locator('.store-photo img').evaluate_all('''els=>els.map(x=>({loaded:x.complete&&x.naturalWidth>0, alt:x.alt}))''')
          assert metrics['photoStatus'] and all(x['loaded'] for x in metrics['photoStatus']),metrics['photoStatus']
          assert page.locator('.store .label').filter(has_text='参考单价').count()>0
          page.screenshot(path=str(OUT/f'S01_after_{w}.png'))
        elif key=='h01':
          assert page.locator('#nearNew .featured-store').count()>0
          page.screenshot(path=str(OUT/f'H01_after_{w}.png'))
        elif key=='u01':
          assert page.locator('.term-quick button[data-quick="6"]').count()==1
          if page.locator('#termDetails').get_attribute('open') is None:
            page.locator('#termDetails summary').click()
          page.locator('.term-quick button[data-quick="6"]').click()
          assert 'active' in (page.locator('.term-quick button[data-quick="6"]').get_attribute('class') or '')
          active=page.locator('.term-quick button[data-quick="6"]').evaluate('''e=>({outline:getComputedStyle(e).borderColor,bg:getComputedStyle(e).backgroundColor,height:e.getBoundingClientRect().height})''')
          assert active['height']>=44,active
          metrics['selectedTerm']=active
          page.locator('#termSection').scroll_into_view_if_needed()
          page.wait_for_timeout(250)
          metrics['payableOverlapManaged']=page.evaluate("() => {const p=document.getElementById('initialPayable').getBoundingClientRect(),f=document.getElementById('miniSupportLauncher').getBoundingClientRect();const x=p.width>0&&p.height>0&&p.left-5<f.right&&p.right+5>f.left&&p.top-5<f.bottom&&p.bottom+5>f.top;return {overlaps:x,hidden:document.getElementById('miniGlobalSupport').classList.contains('cn-u01-amount-overlap')}}")
          assert not metrics['payableOverlapManaged']['overlaps'] or metrics['payableOverlapManaged']['hidden'],metrics
          page.screenshot(path=str(OUT/f'U01_after_{w}.png'))
        assert not errors,errors[:2]
        all_results.append({'page':key,'viewport':f'{w}x{h}','status':'PASS',**metrics})
        print('PASS',key,w,metrics.get('storeOrder',''),flush=True)
      except Exception as e:
        all_results.append({'page':key,'viewport':f'{w}x{h}','status':'FAIL','detail':str(e)[:800],'errors':errors[:3]})
        print('FAIL',key,w,str(e)[:300],flush=True)
      finally:page.close()
    context.close()
  b.close()
(OUT/'results.json').write_text(json.dumps({'mode':'inline Chromium with embedded image assets, not HTTP E2E','results':all_results},ensure_ascii=False,indent=2),encoding='utf-8')
sys.exit(0 if all(x['status']=='PASS' for x in all_results) else 1)
