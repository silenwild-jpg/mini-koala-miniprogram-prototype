"""Browser rendering of actual S02 card renderer + exact bottom CTA handler injected offline.
Checks 375/390 safe area and consultation confirmation; does not claim URL E2E.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re, json
root=Path(__file__).resolve().parents[1]
p=root/'prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'
src=p.read_text(encoding='utf-8')
html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',src,flags=re.I)
html=re.sub(r'<link\b[^>]*rel=["\']?stylesheet["\']?[^>]*>','',html,flags=re.I)
render=src[src.index('function renderComboOffers(combos){'):src.index('function renderInventory(){')]
primary=src[src.index("$('#primaryBtn').onclick=()=>{"):src.index('const qp=new URLSearchParams(location.search);',src.index("$('#primaryBtn').onclick=()=>{"))]
combo={"capacity":25.7,"count":2,"total":11250,"monthly":1875,"fitStatus":"pending","parts":[{"id":"U1","size_option_id":"U1","v":9.98,"base":1300},{"id":"U2","size_option_id":"U2","v":15.68,"base":2000}],"physicalFit":{"allocations":[]}}
out=root/'outputs/combo_ux_regression_v2_visual';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for w,h in [(375,812),(390,844)]:
    page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
    page.set_content(html,wait_until='domcontentloaded')
    page.add_script_tag(content="""var state='nomatch',termMonths=6,inventoryStatus='AVAILABLE',targetVolume=25,storeId='test',estimatorRequirement={item_constraints:[]},travelMode='drive',searchOriginKey='guomao';var idealUnits=()=>[],$=s=>document.querySelector(s),openLeadCapture=x=>window.__captured=x,nearbyStoreUrl=()=>'/test',matchedCombos=()=>[window.__combo],gotoU01=()=>{window.__misrouted=true},recommendedUnit=()=>null;"""+render+primary)
    page.evaluate('(c)=>{window.__combo=c;renderComboOffers([c]);document.querySelector("#primaryBtn").textContent="查看组合方案";document.querySelector("#allUnits").classList.add("hidden")}',combo)
    page.locator('#primaryBtn').click()
    page.wait_for_timeout(750)
    metrics=page.evaluate('''() => {const a=document.querySelector('.combo-action').getBoundingClientRect(),f=document.querySelector('.bottombar').getBoundingClientRect(),c=document.querySelector('.combo-plan').getBoundingClientRect(),price=document.querySelector('.combo-total').getBoundingClientRect();return {action:{top:a.top,bottom:a.bottom,right:a.right},footerTop:f.top,cardTop:c.top,priceTop:price.top,width:document.querySelector('#comboOfferBlock').scrollWidth,client:document.querySelector('#comboOfferBlock').clientWidth}}''')
    assert metrics['action']['bottom']+8<=metrics['footerTop'],(w,metrics)
    assert metrics['priceTop']>=35,(w,metrics)
    assert metrics['width']<=metrics['client']+1,(w,metrics)
    assert metrics['action']['right']<=w,(w,metrics)
    page.screenshot(path=str(out/f'Combo_action_visible_{w}.png'))
    page.locator('.combo-action').first.click()
    lead=page.evaluate('window.__captured')
    assert lead['context']['combo_total_capacity']==combo['capacity']
    assert lead['context']['combo_total_rent']==combo['total']
    assert lead['context']['combo_parts'][0]['volume']==combo['parts'][0]['v']
    page.evaluate("window.__captured.onSuccess('13800138000')")
    assert '25.7m³ / 2间仓' in page.locator('#comboLeadFeedbackText').inner_text()
    assert page.locator('#comboContactService').is_visible()
    page.screenshot(path=str(out/f'Combo_saved_{w}.png'))
    print(json.dumps({'width':w,'action_visible':True,'fit_price_consistent':True,'lead_feedback':True,'metrics':metrics},ensure_ascii=False))
    page.close()
  browser.close()
