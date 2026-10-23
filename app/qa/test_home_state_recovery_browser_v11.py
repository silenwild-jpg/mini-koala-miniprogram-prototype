"""Real source DOM/CSS/JS executed with inlined assets in Chromium; navigation intent capture only."""
from pathlib import Path
import re,base64,json,sys,datetime
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
proto=root/'prototype'
src=(proto/'mini_storage_home_H01_Visual_V2_7_4_SSOT.html').read_text()
# Inline CSS and JS to avoid file:// URL navigation restrictions.
for match in list(re.finditer(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/>',src))[::-1]:
 f=proto/match.group(1)
 if f.is_file():src=src[:match.start()]+'<style>'+f.read_text()+'</style>'+src[match.end():]
deferred=[]
for match in list(re.finditer(r'<script\b([^>]*)\bsrc="([^"]+)"([^>]*)></script>',src))[::-1]:
 f=proto/match.group(2)
 if not f.is_file():continue
 data=f.read_text()
 if 'defer' in match.group(1):deferred.append(data);replacement=''
 else:replacement='<script>'+data+'</script>'
 src=src[:match.start()]+replacement+src[match.end():]
src=src.replace('</body>','\n'.join('<script>'+x+'</script>' for x in deferred)+'</body>')
photo=root/'assets/real_store_demo/v1/MK_BJ_E56D0702/home_featured.webp'
if photo.exists():src=src.replace('../assets/real_store_demo/v1/MK_BJ_E56D0702/home_featured.webp','data:image/webp;base64,'+base64.b64encode(photo.read_bytes()).decode())
boot="""<script>
 const testStorage=Object.create(null);
 Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return testStorage[k]??null},setItem(k,v){testStorage[k]=String(v)},removeItem(k){delete testStorage[k]},clear(){Object.keys(testStorage).forEach(k=>delete testStorage[k])}}});
 history.replaceState=function(){};
</script>"""
src=src.replace('<head>','<head>'+boot,1)
src=src.replace('const homeParams=new URLSearchParams(location.search);',"const homeParams=new URLSearchParams('__RECOVERY_QUERY__');")
src=src.replace('document.currentScript.src','"https://demo.invalid/prototype/mini_storage_global_support_v274.js"')
src=src.replace('const url=new URL(location.href);url.searchParams.set','const url=new URL("https://demo.invalid/home");url.searchParams.set')
fixture=(proto/'mini_storage_demo_fixture_v2.js').read_text()
ssot=(proto/'mini_storage_business_ssot_v274.js').read_text()
src=src.replace('<script>'+ssot+'</script>',"<script>"+fixture+"\nwindow.MINI_KOALA_DEMO_V2.seed('__RECOVERY_SEED__');__RECOVERY_EXTRA__</script>\n"+'<script>'+ssot+'</script>',1)
assert src.count('__RECOVERY_SEED__')==1
src=re.sub(r'(?<![A-Za-z0-9_$])(?:window\.)?location\.href\s*=', 'window.__recoveryNav=',src)
# Some scripts use location.replace, but only actual home CTA href captures are asserted here.

extra_empty="localStorage.clear();"
extra_paid="window.MINI_KOALA_DEMO_V2.seed('active');"
extra_ended="window.MINI_KOALA_DEMO_V2.seed('historical');"
scenarios=[
 ('new','new','','','new',None,None),
 ('estimated','estimated','','','estimated','继续看推荐','mini_storage_store_list_s01'),
 ('estimated_1','estimated',"let r=JSON.parse(localStorage.getItem('mini_storage_requirement_current'));r.term_months=1;localStorage.setItem('mini_storage_requirement_current',JSON.stringify(r));",'','estimated','继续看推荐','term=1'),
 ('estimated_12','estimated',"let r=JSON.parse(localStorage.getItem('mini_storage_requirement_current'));r.term_months=12;localStorage.setItem('mini_storage_requirement_current',JSON.stringify(r));",'','estimated','继续看推荐','term=12'),
 ('estimated_no_term','estimated',"let r=JSON.parse(localStorage.getItem('mini_storage_requirement_current'));delete r.term_months;localStorage.setItem('mini_storage_requirement_current',JSON.stringify(r));",'','estimated','选择租期','knownSize=4.8'),
 ('viewing','appointed','','','viewing','查看预约','mini_storage_viewing_v02'),
 ('viewing_past','appointed',"let v=JSON.parse(localStorage.getItem('mini_storage_viewing_current'));v.appointment_date='2020-01-01';localStorage.setItem('mini_storage_viewing_current',JSON.stringify(v));",'','estimated','继续看推荐','mini_storage_store_list_s01'),
 ('quoted','quoted','','','quoted','查看方案','mini_storage_quote_q01'),
 ('quote_expired','quoted',"let q=JSON.parse(localStorage.getItem('mini_storage_quote_current'));q.valid_until='2020-01-01T00:00:00.000Z';localStorage.setItem('mini_storage_quote_current',JSON.stringify(q));",'','quoted','重新获取报价','quoteStatus=expired'),
 ('quote_missing_unit','quoted',"let q=JSON.parse(localStorage.getItem('mini_storage_quote_current'));delete q.unit_id;localStorage.setItem('mini_storage_quote_current',JSON.stringify(q));",'','estimated','继续看推荐','mini_storage_store_list_s01'),
 ('quote_missing_expiry','quoted',"let q=JSON.parse(localStorage.getItem('mini_storage_quote_current'));delete q.valid_until;localStorage.setItem('mini_storage_quote_current',JSON.stringify(q));",'','estimated','继续看推荐','mini_storage_store_list_s01'),
 ('pending','pending_payment','','','pending','继续支付','mini_storage_order_o01'),
 ('upcoming','pending_use','','','active','查看入仓准备','mini_storage_order_o03'),
 ('active','active','','','active','查看仓位','mini_storage_order_o03'),
 ('ending','ending','','','active','查看续租安排','mini_storage_renew_rn01'),
 ('returning','exiting','','','active','查看退租进度','mini_storage_exit_ex01'),
 ('ended','historical','','','new',None,None),
 ('no_asset_old_pending','new',extra_empty,'state=pending','new',None,None),
 ('no_asset_old_quoted','new',extra_empty,'state=quoted','new',None,None),
 ('no_asset_old_viewing','new',extra_empty,'state=viewing','new',None,None),
 ('no_asset_old_estimated','new',extra_empty,'state=estimated','new',None,None),
 ('paid_old_pending','active',extra_paid,'state=pending','active','查看仓位','mini_storage_order_o03'),
 ('ended_old_pending','historical',extra_ended,'state=pending','new',None,None),
 ('pending_old_active','pending_payment','','state=active','pending','继续支付','mini_storage_order_o01'),
 ('active_new_quote','active',"localStorage.setItem('mini_storage_quote_current',JSON.stringify({quote_id:'Q-NEW',status:'active',store_id:'MK_BJ_E56D0702',unit_id:'OTHER-SIZE-03',term_months:6,target_volume:4.8,volume:4.72,monthly_price:573,total_price:3440,valid_until:new Date(Date.now()+86400000).toISOString()}));",'','quoted','查看方案','mini_storage_quote_q01'),
 ('pending_quote_same','pending_payment','','','pending','继续支付','mini_storage_order_o01'),
 ('active_new_estimated','active',"localStorage.setItem('mini_storage_requirement_current',JSON.stringify(window.MINI_KOALA_DEMO_V2.requirement()));",'','estimated','继续看推荐','mini_storage_store_list_s01'),
]
rows=[]
out=root/'outputs/hsi_recovery_v11_evidence';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for viewport in [(375,812),(390,844)]:
  for label,seed,extra,query,expected_state,button_text,nav in scenarios:
   if viewport[0]==390 and label not in ('new','estimated','estimated_no_term','viewing_past','quote_expired','pending','active','ending','no_asset_old_pending','paid_old_pending','active_new_estimated'):continue
   page=b.new_page(viewport={'width':viewport[0],'height':viewport[1]})
   errors=[];page.on('pageerror',lambda err:errors.append(str(err)[:210]))
   try:
    doc=src.replace('__RECOVERY_SEED__',seed).replace('__RECOVERY_EXTRA__',extra).replace('__RECOVERY_QUERY__',query)
    page.set_content(doc,wait_until='domcontentloaded',timeout=30000)
    page.wait_for_timeout(35)
    result=page.evaluate('''()=>{
      const shown=id=>{const e=document.getElementById(id);return !!e&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'};
      const cards=['pendingCard','viewingCard','estimatedCard','quotedCard','activeCard'].filter(shown);
      const card=cards.length?document.getElementById(cards[0]):null;
      const btn=card?.querySelector('button.primary');
      const r=btn?.getBoundingClientRect(),other=document.getElementById('hsiOtherTasks');
      return {state:currentState,cards,cta:btn?.textContent?.trim()||null,btnId:btn?.id||null,btnH:r?.height||0,otherH:other?.getBoundingClientRect().height||0,otherText:shown('hsiOtherTasks')?other.textContent:null,core:['newHero','nearNew','scenesNew','homeServiceFlow','brandTrust','homeBottomProofs'].every(shown)&&!!document.querySelector('.dual-task-grid:not(.hidden)'),overflow:document.querySelector('.page').scrollWidth>document.querySelector('.page').clientWidth+2};
    }''')
    if result['btnId']:
     page.locator('#'+result['btnId']).click(timeout=2500)
     result['nav']=page.evaluate('window.__recoveryNav||null')
    else:result['nav']=None
    valid=result['state']==expected_state and result['core'] and not result['overflow'] and not errors and (not button_text or button_text in (result['cta'] or '')) and (not nav or nav in (result['nav'] or '')) and (label!='estimated_no_term' or 'requireTerm=1' in (result['nav'] or '')) and (result['btnH']>=44 if result['btnId'] else True) and (result['otherH']>=44 if result['otherText'] else True)
    result.update(scenario=label,viewport=viewport[0],passed=bool(valid),errors=errors)
    if label in ('new','estimated_no_term','quote_expired','pending','active','ending','viewing_past','no_asset_old_pending'):
     page.screenshot(path=str(out/f'{label}_{viewport[0]}.png'))
    rows.append(result)
   except Exception as err:rows.append({'scenario':label,'viewport':viewport[0],'passed':False,'error':str(err)[:300], 'errors':errors})
   page.close()
 b.close()
(out/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
for x in rows:print(('PASS' if x['passed'] else 'FAIL'),x['viewport'],x['scenario'],x.get('state'),x.get('cta'),str(x.get('nav'))[:80],x.get('error',''),x.get('errors',''))
print('TOTAL',sum(x['passed'] for x in rows),'/',len(rows))
sys.exit(0 if all(x['passed'] for x in rows) else 1)
