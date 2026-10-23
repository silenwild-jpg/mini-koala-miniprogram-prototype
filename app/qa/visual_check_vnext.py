from playwright.sync_api import sync_playwright
from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1]
out=root/'outputs'/'vnext_visual';out.mkdir(parents=True,exist_ok=True)
def static_dom(filename):
 t=(root/'prototype'/filename).read_text()
 t=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',t,flags=re.I)
 t=re.sub(r'<link\b[^>]+(?:rel="stylesheet"|rel=stylesheet)[^>]*>','',t,flags=re.I)
 return t
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(375,812),(390,844)]:
  page=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content(static_dom('space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),wait_until='domcontentloaded')
  page.evaluate('''() => {
  document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
  let s=document.querySelector('#s5');s.classList.add('active');
  document.querySelector('#usageRange').textContent='约 4.5–5.8m³';
  document.querySelector('#usageMeta').textContent='约 2.0㎡ 地面空间';
  document.querySelector('#usageCapacityInput').value='5.0';
  }''')
  elems=page.evaluate('''() => ['#s5 .usage-summary.capacity-summary','#s5 .capacity-stepper','#capacityMinus','#capacityPlus','#usageCapacityInput'].map(x=>{let e=document.querySelector(x),r=e.getBoundingClientRect();return {selector:x,x:r.x,right:r.right,width:r.width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}})''')
  panel=elems[0];step=elems[1];assert step['right']<=panel['right']-5, (w,elems)
  page.locator('#s5 .usage-summary').screenshot(path=str(out/f'capacity_{w}.png'))
  page.close()
  page=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content(static_dom('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'),wait_until='domcontentloaded')
  page.evaluate('''() => {document.querySelector('#rentHeading').textContent='6个月整期总租金';document.querySelector('#contractTotal').textContent='¥12,850';document.querySelector('#selectedTermPrice').textContent='¥2,142/月';document.querySelector('#depositAmount').textContent='¥2,142';document.querySelector('#managementFee').textContent='¥50';document.querySelector('#initialPayable').textContent='¥15,042';document.querySelector('#termSummaryText').textContent='6个月';}''')
  style=page.evaluate('''() => {let p=document.querySelector('#termSection .term-price-combined'),box=document.querySelector('#termSection .unified-price'),pay=document.querySelector('#payableFormula'),total=document.querySelector('#contractTotal'),r=box.getBoundingClientRect(),t=total.getBoundingClientRect();return {panelWidth:p.clientWidth,panelScroll:p.scrollWidth,priceWidth:box.clientWidth,priceScroll:box.scrollWidth,priceRight:r.right,payDisplay:getComputedStyle(pay).display,totalFont:getComputedStyle(total).fontSize,totalRight:t.right}}''')
  assert style['panelScroll']<=style['panelWidth']+1,(w,style)
  assert style['priceScroll']<=style['priceWidth']+1,(w,style)
  assert style['payDisplay']=='none',(w,style)
  page.locator('#termSection').screenshot(path=str(out/f'price_{w}.png'))
  print(json.dumps({'width':w,'capacity':elems,'price':style},ensure_ascii=False))
  page.close()
 b.close()
