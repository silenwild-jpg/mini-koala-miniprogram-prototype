"""Offline DOM/CSS fixture: verifies StoreCard presentation, not actual URL E2E."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json
root=Path(__file__).resolve().parents[1]
p=root/'prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'
s=p.read_text(encoding='utf8')
css=lambda m: '<style>'+((p.parent/re.search(r'href=["\']([^"\']+)',m.group(0)).group(1)).read_text(encoding='utf8'))+'</style>'
html=re.sub(r'<link\s+[^>]*rel=["\']stylesheet["\'][^>]*>',css,s,flags=re.I)
html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',html,flags=re.I)
card=s[s.index('function storeDemoTags(id){'):s.index('function baseOrder(){')]
fixture="""
var state='browse',termMonths=6;
var stores={a:{name:'望京店',typeTag:'社区仓',area:'朝阳区 · 望京',community:'望京',range:'1.5–7.2m³',availableCount:5,features:'电梯直达'},b:{name:'双井店',typeTag:'社区仓',area:'朝阳区 · 双井',community:'双井',range:'2.1–5.8m³',availableCount:3,features:'热门'}};
var routeFor=id=>id==='a'?({m:8,km:1.4}):({m:16,km:3.1}),travelMeta=()=>({icon:'🚗',label:'驾车'});
var currentData=id=>({hasMatch:true,availableMatchedCount:2,sizes:'2.0～4.5m³',total:id==='a'?1980:1780,alternativeEligible:false,matchType:'single'});
var browseUnitPrice=id=>id==='a'?88:72,distanceOverNote=()=>'',recoveryValue=()=>'';
"""
out=root/'outputs/ui_system_v1_visual';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(375,812),(390,844)]:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.set_content(html,wait_until='domcontentloaded')
  page.add_script_tag(content=fixture+card)
  for scenario in ('browse','estimated'):
   page.evaluate('''scenario => {
      state=scenario;
      document.getElementById('locatedContent').classList.remove('hidden');
      document.getElementById('page').classList.toggle('v274-browse-state',scenario==='browse');
      document.getElementById('page').classList.toggle('v274-demand-state',scenario==='estimated');
      document.getElementById('storeList').innerHTML=makeCard('a',0)+makeCard('b',1);
      document.getElementById('page').scrollTop=0;
      document.getElementById('page').scrollTop=document.getElementById('storeList').offsetTop-218;
    }''',scenario)
   page.wait_for_timeout(160)
   metrics=page.evaluate('''() => ({viewport:innerWidth, scroll:document.documentElement.scrollWidth, cards:document.querySelectorAll('#storeList .store').length, tags:[...document.querySelectorAll('#storeList .store-demo-tags')].map(n=>({client:n.clientWidth,scroll:n.scrollWidth,wrap:getComputedStyle(n).flexWrap})), action:getComputedStyle(document.querySelector('.controls.compact-filters .compact-filter-btn')).height, total:document.querySelector('#storeList').innerText.includes('整期租金')})''')
   assert metrics['scroll']<=w+1,metrics
   assert metrics['cards']==2,metrics
   assert metrics['tags'][0]['wrap']=='nowrap',metrics
   assert metrics['total']==(scenario=='estimated'),metrics
   path=out/f'S01_{scenario}_{w}_offline_fixture.png';page.screenshot(path=str(path),full_page=False)
   print(json.dumps({'scenario':scenario,'width':w,'passed':True,'metrics':metrics},ensure_ascii=False))
  page.close()
 browser.close()
