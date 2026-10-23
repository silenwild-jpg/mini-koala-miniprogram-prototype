"""Offline static DOM + live S02 combo rendering. NOT a real navigation/WeChat acceptance."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json
root=Path(__file__).resolve().parents[1]
p=root/'prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'
src=p.read_text(encoding='utf-8')
content=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',src,flags=re.I)
content=re.sub(r'<link\b[^>]*rel=["\']?stylesheet["\']?[^>]*>','',content,flags=re.I)
start=src.index('function renderComboOffers(combos){');end=src.index('function renderInventory(){',start)
fn=src[start:end]
out=root/'outputs/physical_fit_p0_visual';out.mkdir(parents=True,exist_ok=True)
combo={"capacity":12,"count":3,"total":2600,"monthly":433,"fitStatus":"pending","parts":[{"v":2.1},{"v":2.34},{"v":7.56}],"physicalFit":{"reasonCodes":["UNIT_MEASUREMENTS_UNVERIFIED"],"allocations":[{"item_names":["标准纸箱"]},{"item_names":["衣物箱"]},{"item_names":["衣柜","冰箱"]}]}}
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(375,812),(390,844)]:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content(content,wait_until='domcontentloaded')
  page.add_script_tag(content="var state='nomatch',termMonths=6,inventoryStatus='AVAILABLE',targetVolume=12,storeId='test',estimatorRequirement={item_constraints:[]},travelMode='drive',searchOriginKey='guomao';var idealUnits=()=>[],$=s=>document.querySelector(s),openLeadCapture=x=>window.__captured=x,nearbyStoreUrl=()=>'/test';\n"+fn)
  for name,combos in [('combo',[combo]),('fallback',[])]:
   page.evaluate('(xs)=>renderComboOffers(xs)',combos)
   item=page.locator('#comboOfferBlock')
   item.scroll_into_view_if_needed()
   rect=item.bounding_box()
   metrics=page.evaluate("""() => {const p=document.querySelector('#comboOfferBlock'); const btn=p.querySelector('.combo-action,.nearby-recovery button');return {scroll:p.scrollWidth,client:p.clientWidth,btn:btn?{w:btn.getBoundingClientRect().width,right:btn.getBoundingClientRect().right}:null}}""")
   assert metrics['scroll']<=metrics['client']+1,(w,name,metrics)
   assert rect['x']>=0 and rect['x']+rect['width']<=w+2,(w,name,rect)
   item.screenshot(path=str(out/f'S02_{name}_{w}.png'))
   if name=='combo':
    page.locator('.combo-action').first.click()
    lead=page.evaluate('window.__captured')
    assert lead['node']=='S02_MULTI_UNIT_COMBO' and lead['context']['fit_status']=='pending'
   print(json.dumps({'width':w,'scenario':name,'element':rect,'overflow':metrics},ensure_ascii=False))
  page.close()
 browser.close()
