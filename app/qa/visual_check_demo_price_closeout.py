"""U01 real HTML + inline ALL linked CSS, no external JS or network navigation.
Validate final cascade and static fixtures at mobile sizes; not a full E2E."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json
root=Path(__file__).resolve().parents[1]
source=root/'prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'
html=source.read_text(encoding='utf-8')

def inject_css(m):
 tag=m.group(0)
 mt=re.search(r'href\s*=\s*[\'\"]([^\'\"]+)',tag)
 if not mt:return tag
 f=(source.parent/mt.group(1)).resolve()
 return f'<style data-origin="{mt.group(1)}">\n{f.read_text(encoding="utf-8")}\n</style>' if f.is_file() else ''
html=re.sub(r'<link\s+[^>]*rel=[\'\"]stylesheet[\'\"][^>]*>',inject_css,html,flags=re.I)
html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',html,flags=re.I)
out=root/'outputs/demo_price_closeout';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(375,812),(390,844)]:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content(html,wait_until='domcontentloaded')
  page.evaluate('''() => {
   const put=(id,value)=>document.getElementById(id).textContent=value;
   put('rentHeading','6个月整期总租金');put('contractTotal','¥12,850');
   put('termSummaryText','6个月');put('selectedTermPrice','月均约 ¥2,142/月');
   put('termPriceHint','当前租期折扣 7折');put('depositAmount','¥2,142');
   put('managementFee','¥50');put('initialPayable','¥15,042');
   put('payableFormula','整期租金 ¥12,850 + 押金 ¥2,142 + 管理费 ¥50');
  }''')
  metrics=page.evaluate('''() => {
   const selectors=['#termSection .unified-price','#rentHeading','#contractTotal','#selectedTermPrice','#depositAmount','#managementFee','#initialPayable'];
   return selectors.map(sel=>{const el=document.querySelector(sel),s=getComputedStyle(el),r=el.getBoundingClientRect();return {sel,color:s.color,background:s.backgroundColor,rect:{x:r.x,width:r.width},overflow:el.scrollWidth-el.clientWidth}})
  }''')
  assert metrics[0]['background']=='rgb(255, 252, 248)',metrics
  assert metrics[1]['color']=='rgb(101, 112, 103)',metrics
  assert metrics[2]['color']=='rgb(206, 104, 38)',metrics
  assert metrics[6]['color']=='rgb(185, 87, 27)',metrics
  assert all(x['overflow']<=1 and x['rect']['x']>=0 and x['rect']['x']+x['rect']['width']<=w+1 for x in metrics),metrics
  page.locator('#termSection').scroll_into_view_if_needed()
  page.locator('#termSection').screenshot(path=str(out/f'U01_price_{w}.png'))
  print(json.dumps({'width':w,'passed':True,'fields':metrics},ensure_ascii=False))
  page.close()
 browser.close()
