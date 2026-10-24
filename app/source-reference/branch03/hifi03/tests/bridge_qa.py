from pathlib import Path
from playwright.sync_api import sync_playwright
import json,base64,html as htmlutils
P=Path(__file__).resolve().parents[1]
core=(P/'isolated'/'app.js').read_text('utf8')
css=(P/'isolated'/'styles.css').read_text('utf8')
child=(P/'module'/'child-bridge.js').read_text('utf8').replace("const embedded=PARAM.get('br03_embed')==='1';","const embedded=true; // test-only srcdoc iframe")
host=(P/'module'/'branch03-module.js').read_text('utf8').replace('const ownOrigin=location.origin, expectedOrigin=source.origin;', "const ownOrigin=location.origin, expectedOrigin='null'; // test-only opaque origin")
imgs={p.name:'data:image/jpeg;base64,'+base64.b64encode(p.read_bytes()).decode() for p in (P/'isolated'/'assets').glob('*.jpg')}
core=core.replace("(()=>{'use strict';", "(()=>{'use strict';\nconst IMGDATA="+json.dumps(imgs)+";")
for old,new in (
    ('assets/${s.photo}','${IMGDATA[s.photo]}'),('assets/${u.photo}','${IMGDATA[u.photo]}'),
    ('assets/${imgs[state.gallery%imgs.length]}','${IMGDATA[imgs[state.gallery%imgs.length]]}'),
    ('assets/unit_medium.jpg',"${IMGDATA['unit_medium.jpg']}")
):core=core.replace(old,new)
storage="""(function(){const slots={};function store(ns){const db=slots[ns]={};return {getItem:k=>Object.prototype.hasOwnProperty.call(db,k)?db[k]:null,setItem:(k,v)=>db[k]=String(v),removeItem:k=>delete db[k]}}Object.defineProperty(window,'sessionStorage',{value:store('session')});Object.defineProperty(window,'localStorage',{value:store('local')})})()"""
child_html='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'''+css+'''</style></head><body><div id="app" class="app-shell"><div id="screen" class="screen"></div><div id="overlay-root"></div><div id="toast"></div></div><aside class="qa-panel" id="qa-panel"><h3>演示</h3><button data-qa="reset">reset</button><div id="qa-status"></div></aside><script>'''+storage+'</script><script>'+core+'</script><script>'+child+'</script></body></html>'
# A test-only iframe src setter uses srcdoc instead of blocked URL navigation. This still invokes actual iframe DOM/JS.
encoded=json.dumps(child_html).replace('</','<\\/')
setup="""<html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='margin:0'><div id='target' style='width:100%;height:100dvh'></div><script>const TEST_IFRAME_HTML="""+encoded+""";
Object.defineProperty(HTMLIFrameElement.prototype,'src',{configurable:true,set(v){this.dataset.expectedSrc=v;this.srcdoc=TEST_IFRAME_HTML},get(){return this.dataset.expectedSrc||''}});
</script><script>"""+host+"""</script><script>window.LOG=[];window.RAWMSG=[];window.addEventListener('message',e=>RAWMSG.push({origin:e.origin,kind:e.data?.kind,sourceMatches:e.source===document.querySelector('iframe')?.contentWindow}));window.instance=MiniKoalaBranch03.mount('#target',{baseUrl:'file:///tmp/br03/isolated/',requirement:null,onOrderIntent:i=>LOG.push({kind:'ORDER_INTENT',data:i}),onBookingIntent:i=>LOG.push({kind:'BOOKING_INTENT',data:i}),onFavoriteChanged:i=>LOG.push({kind:'FAVORITE_CHANGED',data:i})});instance.subscribe(e=>{if(['READY','ERROR'].includes(e.kind))LOG.push(e)})</script></body></html>"""
results=[]
def assert_true(x):
 if not x: raise AssertionError('assertion failed')
def run(label,fn):
 try:
  d=fn();results.append({'name':label,'status':'PASS','detail':str(d)[:300] if d is not None else ''})
 except Exception as e:results.append({'name':label,'status':'FAIL','error':str(e)[:400]})

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for w,h in [(375,812),(390,844)]:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=2)
  page.set_default_timeout(8000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(setup,wait_until='load',timeout=30000)
  label=f'{w}x{h} '
  try:page.wait_for_function('window.instance.isReady()===true',timeout=7000)
  except Exception as e:
   print('READY FAILED:',e,'logs',page.evaluate('window.LOG'),'frames',[(f.url,f.name) for f in page.frames],'errors',errors, 'CHILD',page.frames[1].evaluate("({api:!!window.BRANCH03_DEMO,screen:document.querySelector('#screen')?.innerHTML.slice(0,80),parent:window.parent!==window,origin:location.origin,posted:window.TEST_POSTS,styles:document.querySelectorAll('style').length})"),'RAW',page.evaluate('window.RAWMSG'), 'HOST',page.evaluate('window.HOST_RECV'));raise
  frame=page.frame_locator('iframe')
  run(label+'ready handshake',lambda:page.evaluate('instance.isReady()'))
  run(label+'initial no demand',lambda:assert_true(page.evaluate('instance.getState().then(s=>!s.requirement?.capacity_m3)')))
  run(label+'initial list',lambda:assert_true(frame.locator('.store-row').count()==4))
  run(label+'no matching labels without demand',lambda:assert_true(frame.locator('.matchline').count()==0))
  run(label+'bring CAP unconfirmed rental',lambda:(page.evaluate("instance.setRequirement({capacityM3:3.53,source:'CAP',rentalMonths:12,termConfirmed:false})"),assert_true(frame.locator('.matchline').count()==4),assert_true('/月参考' in frame.locator('.store-pricing').first.inner_text())))
  run(label+'CAP precision preserved',lambda:assert_true(page.evaluate('instance.getState().then(s=>s.requirement.capacity_m3===3.53)')))
  run(label+'navigate to S02 store',lambda:(page.evaluate("instance.openS02('jingan')"),assert_true(frame.locator('.unit-row').count()>=3)))
  run(label+'unconfirmed term gate',lambda:(frame.locator('[data-action=order][data-val="A-102"]').click(),assert_true(frame.get_by_role('dialog',name='选择租期').is_visible())))
  run(label+'confirm term emits order intent',lambda:(frame.locator('[data-action=confirmTerm][data-val="12"]').click(),page.wait_for_function("LOG.some(x=>x.kind==='ORDER_INTENT')"),assert_true(page.evaluate("LOG.filter(x=>x.kind==='ORDER_INTENT').at(-1).data.term_confirmed"))))
  run(label+'quote ref not fabricated when absent',lambda:assert_true(page.evaluate("LOG.filter(x=>x.kind==='ORDER_INTENT').at(-1).data.quote_snapshot_ref===null")))
  run(label+'close intent',lambda:frame.locator('[data-action=close]').last.click())
  run(label+'import S5 confirmed context',lambda:page.evaluate("instance.setRequirement({capacityM3:4.25,source:'S5',rentalMonths:6,termConfirmed:true,quoteSnapshotRef:'snapshot-demo-7',quoteStoreId:'jingan',quoteUnitId:'A-102',returnContext:{origin:'S5',selectedUnit:'A-102'}})"))
  run(label+'S5 term shown in S02',lambda:assert_true('6个月' in frame.locator('.unit-price').first.inner_text() and '月租参考' in frame.locator('.unit-price').first.inner_text()))
  run(label+'favorite event',lambda:(frame.locator('[data-action=favorite][data-val="A-102"]').click(),page.wait_for_function("LOG.some(x=>x.kind==='FAVORITE_CHANGED')"),assert_true(page.evaluate("LOG.filter(x=>x.kind==='FAVORITE_CHANGED').at(-1).data.unit_id==='A-102'"))))
  run(label+'valid order intent preserves ref',lambda:(frame.locator('[data-action=order][data-val="A-102"]').click(),page.wait_for_function("LOG.filter(x=>x.kind==='ORDER_INTENT').length>=2"),assert_true(page.evaluate("LOG.filter(x=>x.kind==='ORDER_INTENT').at(-1).data.quote_snapshot_ref==='snapshot-demo-7'"))))
  run(label+'no payable amount in intent',lambda:assert_true(page.evaluate("!('payable' in LOG.filter(x=>x.kind==='ORDER_INTENT').at(-1).data)")))
  run(label+'returnContext carries S5',lambda:assert_true(page.evaluate("LOG.filter(x=>x.kind==='ORDER_INTENT').at(-1).data.return_context.from==='S5'")))
  run(label+'close prior intent',lambda:frame.locator('[data-action=close]').last.click())
  run(label+'mismatched quote ref cleared',lambda:(page.evaluate("instance.setRequirement({capacityM3:4.25,source:'S5',rentalMonths:6,termConfirmed:true,quoteSnapshotRef:'stale',quoteStoreId:'xuhui',quoteUnitId:'A-102'})"),frame.locator('[data-action=order][data-val="A-102"]').click(),page.wait_for_function("LOG.filter(x=>x.kind==='ORDER_INTENT').length>=3"),assert_true(page.evaluate("LOG.filter(x=>x.kind==='ORDER_INTENT').at(-1).data.quote_snapshot_ref===null"))))
  run(label+'close mismatched intent',lambda:frame.locator('[data-action=close]').last.click())
  run(label+'term edit invalidates prior quote',lambda:(page.evaluate("instance.setRequirement({capacityM3:4.25,source:'S5',rentalMonths:6,termConfirmed:false,quoteSnapshotRef:'stale',quoteStoreId:'jingan',quoteUnitId:'A-102'})"),frame.locator('[data-action=order][data-val="A-102"]').click(),frame.locator('[data-action=confirmTerm][data-val="12"]').click(),page.wait_for_function("LOG.filter(x=>x.kind==='ORDER_INTENT').length>=4"),assert_true(page.evaluate("LOG.filter(x=>x.kind==='ORDER_INTENT').at(-1).data.quote_snapshot_ref===null"))))
  run(label+'close updated intent',lambda:frame.locator('[data-action=close]').last.click())
  run(label+'booking lead event',lambda:(frame.locator('[data-action=booking]').click(),frame.locator('[data-action=submitBooking]').click(),page.wait_for_function("LOG.some(x=>x.kind==='BOOKING_INTENT')"),assert_true(page.evaluate("LOG.filter(x=>x.kind==='BOOKING_INTENT').at(-1).data.type==='BOOKING_LEAD_INTENT'"))))
  run(label+'invalid external store rejected',lambda:assert_true(page.evaluate("instance.openS02('random').then(()=>false,()=>true)")))
  run(label+'no map and comparison mode',lambda:assert_true('地图模式' not in frame.locator('body').inner_text() and '加入对比' not in frame.locator('body').inner_text()))
  run(label+'no app-level JS errors',lambda:assert_true(not errors))
  page.close()
 browser.close()
(P/'evidence'/'adapter_bridge_results.json').write_text(json.dumps({'total':len(results),'passed':sum(x['status']=='PASS' for x in results),'failed':[x for x in results if x['status']=='FAIL'],'checks':results},indent=2,ensure_ascii=False),'utf-8')
print(json.dumps({'total':len(results),'passed':sum(x['status']=='PASS' for x in results),'failed':[x for x in results if x['status']=='FAIL']},ensure_ascii=False))

def noop():pass
