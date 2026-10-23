"""Offline visual check of genuine S01 HTML/CSS + card markup. Not a real cross-URL E2E."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json
root=Path(__file__).resolve().parents[1]
p=root/'prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'
s=p.read_text(encoding='utf-8')
html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',s,flags=re.I)
html=re.sub(r'<link\b[^>]*rel=["\']?stylesheet["\']?[^>]*>','',html,flags=re.I)
card=s[s.index('function storeDemoTags(id){'):s.index('function baseOrder(){')]
status=s[s.index('function unavailableStoreCard(id,status){'):s.index('function renderInventorySecondary(){')]
out=root/'outputs/combo_full_journey_recovery_v21_visual';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(375,812),(390,844)]:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content(html,wait_until='domcontentloaded')
  page.add_script_tag(content="""var state='estimated',termMonths=6,stores={small:{name:'玉桥店',typeTag:'社区仓',area:'通州区 · 玉桥',community:'玉桥',range:'1.9–4.2m³',availableCount:3,features:'社区仓 · 3个可租仓位'}};
var routeFor=id=>({m:18,km:4.3}),travelMeta=()=>({icon:'🚗',label:'驾车'}),currentData=()=>({hasMatch:false,alternativeEligible:false,matchedCount:0,availableMatchedCount:0,sizes:'1.9–4.2m³',total:null}),browseUnitPrice=()=>80,distanceOverNote=()=>'',recoveryValue=()=>'';"""+card+status)
  page.evaluate("""() => {document.querySelector('#locatedContent').classList.remove('hidden');document.querySelector('#storeList').innerHTML='<div class="zero-match-recovery"><h3>附近其他存储选择</h3><p>当前需求暂无符合容量的仓位，可调整需求或咨询顾问。</p></div>'+makeCard('small');document.querySelector('#page').scrollTop=document.querySelector('#storeList').offsetTop-95;}""")
  page.wait_for_timeout(200)
  assert page.locator('#storeList').is_visible()
  assert '暂无匹配报价' in page.locator('#storeList').inner_text()
  assert '相近仓体容量' not in page.locator('#storeList').inner_text()
  dim=page.evaluate('''() => ({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,storeWidth:document.querySelector('#storeList').getBoundingClientRect().width})''')
  assert dim['scroll']<=w+1,dim
  page.screenshot(path=str(out/f'nomatch_S01_{w}.png'))
  page.evaluate("""() => {document.querySelector('#inventorySecondary').classList.remove('hidden');document.querySelector('#inventoryStatusList').innerHTML=unavailableStoreCard('small','SOLD_OUT');document.querySelector('#inventorySecondaryTitle').textContent='附近其他门店';document.querySelector('#inventorySecondaryDesc').textContent='当前门店已售罄';document.querySelector('#storeList').innerHTML='';document.querySelector('#page').scrollTop=document.querySelector('#inventorySecondary').offsetTop-125;}""")
  assert page.locator('#inventoryStatusList').inner_text().find('已售罄')>=0
  page.screenshot(path=str(out/f'soldout_S01_{w}.png'))
  print(json.dumps({'width':w,'nomatch_no_price':True,'soldout_visible':True,'no_horizontal_overflow':True,'measures':dim},ensure_ascii=False))
  page.close()
 browser.close()
