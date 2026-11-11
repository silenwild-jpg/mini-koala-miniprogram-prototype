#!/usr/bin/env python3
"""VIS-SYSTEM-04B offline ChromeDriver QA. Python stdlib, installed Chrome, no network."""
import base64, json, os, subprocess, time, threading, urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]/'release-evidence/rc2-merge-prep-10/site'
OUT=Path(__file__).resolve().parents[1]/'release-evidence/rc2-final-visual-review-03'
OUT.mkdir(parents=True,exist_ok=True)
MAN=json.loads((ROOT/'rc2-uat-version.json').read_text())
assert MAN['source_sha']==os.environ.get('GITHUB_SHA') and MAN['source_pr']==122
assert MAN['source_branch']=='isolate/rc2-final-visual-review-03-20261112'
BASE='http://127.0.0.1:4725'; WD='http://127.0.0.1:9517'
COL={'promotion':'rgb(166, 87, 30)','service':'rgb(83, 110, 94)','attribute':'rgb(101, 115, 108)','rent':'rgb(17, 132, 95)'}
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
serve=ThreadingHTTPServer(('127.0.0.1',4725),lambda *a,**k:Quiet(*a,directory=str(ROOT),**k))
threading.Thread(target=serve.serve_forever,daemon=True).start()
session=None;proc=None
def req(method,route,body=None):
 data=None if body is None else json.dumps(body).encode()
 request=urllib.request.Request(WD+route,data=data,method=method,headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(request,timeout=20) as res: v=json.loads(res.read())['value']
 if isinstance(v,dict) and v.get('error'):raise RuntimeError('WEBDRIVER '+str(v)[:800])
 return v
def execute(s):
 return req('POST','/session/'+session+'/execute/sync',{'script':'return (function(){'+s+'})();','args':[]})
def wait(s,seconds=14):
 until=time.time()+seconds;last=''
 while time.time()<until:
  try:
   result=execute(s)
   if result:return result
  except Exception as e:last=str(e)
  time.sleep(.18)
 raise RuntimeError('WAIT '+s[:95]+' '+last[:160])
def screenshot(name):
 data=req('GET','/session/'+session+'/screenshot')
 (OUT/name).write_bytes(base64.b64decode(data))
def navigate(u):
 req('POST','/session/'+session+'/url',{'url':u})
JSBASE="""
function cjkHealth(doc){
 const canvas=doc.createElement('canvas');canvas.width=160;canvas.height=55;
 const ctx=canvas.getContext('2d'), samples={};
 for(const ch of ['仓','中','考','测','\uE000']){
   ctx.clearRect(0,0,160,55);ctx.fillStyle='#000';ctx.font='30px sans-serif';ctx.fillText(ch,5,38);
   const image=ctx.getImageData(0,0,160,55).data;let hash=0,pixels=0;
   for(let k=3;k<image.length;k+=4)if(image[k]){pixels++;hash=(Math.imul(hash,31)+Math.floor(k/4)%173)|0;}
   samples[ch]={hash,pixels};
 }
 return {samples,distinct:new Set(Object.values(samples).map(v=>v.hash)).size};
}
function textBoxes(doc,selector){
 return [...doc.querySelectorAll(selector)].filter(el=>el.getClientRects().length).slice(0,30).map(el=>{
 const cs=doc.defaultView.getComputedStyle(el),r=el.getBoundingClientRect();
 return {text:el.textContent.trim().slice(0,32),width:r.width,height:r.height,
   clipped:el.scrollWidth>el.clientWidth+2,overflow:cs.textOverflow,
   scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
 });}
function tags(nodes,key){return [...nodes].filter(el=>el.getClientRects().length).map(el=>{
const c=el.ownerDocument.defaultView.getComputedStyle(el),r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();
const raw=el.dataset[key]||'attribute';
return {label:el.textContent.trim(),kind:raw==='promo'?'promotion':raw==='feature'?'attribute':raw,
font:c.fontSize,color:c.color,height:r.height,right:r.right,parentRight:p.right};
});}
function details(el){if(!el)throw Error('PRICE_MISSING');return {value:el.textContent.trim(),color:el.ownerDocument.defaultView.getComputedStyle(el).color};}
"""
H01=JSBASE+"""
const card=document.querySelector('#storeRail .store-card.featured');if(!card)return null;
return {tags:tags(card.querySelectorAll('.mk-store-tag'),'tagType'),price:details(card.querySelector('.store-price b')),cjk:cjkHealth(document),boxes:textBoxes(document,'.store-card.featured .store-price,.store-card.featured .store-tags')};
"""
S01=JSBASE+"""
const a=document.querySelector('#central-host')?.contentWindow;const f=a?.document.querySelector('#s01-r2-frame')?.contentWindow?.document;
const c=f?.querySelector('.store-card[data-card-kind="expanded"]');if(!c)return null;
return {tags:tags(c.querySelectorAll('.store-tags .mk-store-tag'),'tagType'),
price:details(c.querySelector('.unit-action-row .price[data-price-kind="term"] strong')),
discount:details(c.querySelector('.s01-term-discount:not([hidden])')),cjk:cjkHealth(f),boxes:textBoxes(f,'.store-card[data-card-kind=expanded] .store-tags,.store-card[data-card-kind=expanded] .unit-action-row')};
"""
S02=JSBASE+"""
const d=document.querySelector('#central-host')?.contentWindow?.document;if(!d?.querySelector('#screen.page-S02'))return null;
return {tags:tags(d.querySelectorAll('.s02-service-summary .s02-tag'),'tagKind'),
price:details(d.querySelector('.page-S02 .unit-price .br03-price-main')),phone:!!d.querySelector('.s02-call-400'),cjk:cjkHealth(d),boxes:textBoxes(d,'.s02-service-summary,.page-S02 .unit-price')};
"""
S5=JSBASE+"""
const a=document.querySelector('#central-host')?.contentWindow?.document;
const d=a?.querySelector('#br04-frame')?.contentWindow?.document;
const c=d?.querySelector('.s5-store-card[data-rank="0"]');
if(!c||!d?.querySelector('body[data-page=s5].bridge-ready'))return null;
return {tags:tags(c.querySelectorAll('.s5-store-services .mk-store-tag'),'tagType'),
price:details(c.querySelector('.s5-unit-price')),ctaHeight:c.querySelector('.s5-unit-buy').getBoundingClientRect().height,cjk:cjkHealth(d),boxes:textBoxes(d,'.s5-store-card[data-rank="0"] .s5-store-services,.s5-store-card[data-rank="0"] .s5-unit-price,.s5-store-card[data-rank="0"] .s5-unit-buy')};
"""
def verify(page,d):
 limit={'H01':(1,2),'S01':(1,3),'S02':(4,5),'S5':(1,2)}[page];ts=d['tags']
 assert limit[0]<=len(ts)<=limit[1],(page,'COUNT',len(ts))
 for t in ts:
  assert t['font']=='11px',(page,'FONT',t)
  assert t['color']==COL[t['kind']],(page,'COLOR',t)
  assert t['right']<=t['parentRight']+1.5 and t['height']>=18,(page,'CLIPPED',t)
 if page=='H01':
  assert d['price']['color']!=COL['rent'] and d['price']['value'].startswith('¥')
 else:
  assert d['price']['color']==COL['rent'],(page,'RENT',d['price'])
 if page=='S01':assert d['discount']['color']==COL['promotion']
 if page=='S02':assert d['phone'] and len({x['label'] for x in ts})==len(ts)
 if page=='S5':assert d['ctaHeight']>=47.5
 glyph=d['cjk']
 assert glyph['distinct']==5,(page,'CJK_TOFU_OR_MISSING',glyph)
 for k,g in glyph['samples'].items():assert g['pixels']>60,(page,'CJK_GLYPH_EMPTY',k,g)
 for box in d['boxes']:
  assert not box['clipped'] or box['overflow']=='ellipsis',(page,'UNEXPECTED_CJK_TEXT_CLIP',box)


def audit_scroll(page_name,width):
 """Inspect and screenshot TOP/MIDDLE/BOTTOM of actual scrollable document."""
 selectors={
  'H01':"document",
  'S01':"document.querySelector('#central-host')?.contentWindow?.document.querySelector('#s01-r2-frame')?.contentWindow?.document",
  'S02':"document.querySelector('#central-host')?.contentWindow?.document",
  'S5':"document.querySelector('#central-host')?.contentWindow?.document.querySelector('#br04-frame')?.contentWindow?.document"
 }
 js="""const doc=__DOC__;
 if(!doc)return {error:'DOCUMENT_MISSING'};
 const priority=['#scroller','#app-viewport','.screen','.app-shell','main','#app'];
 const candidates=[...priority.map(x=>doc.querySelector(x)),doc.scrollingElement,doc.body,doc.documentElement].filter(Boolean);
 let best=null,bestDelta=-1;
 for(const el of candidates){
  const delta=Math.max(0,el.scrollHeight-el.clientHeight);
  if(delta>bestDelta){bestDelta=delta;best=el;}
 }
 if(!best)return {error:'SCROLLABLE_ELEMENT_MISSING'};
 const label=best.id?('#'+best.id):(best.className&&typeof best.className==='string'?'.'+best.className.trim().replace(/\\s+/g,'.'):best.tagName);
 const horizontal=Math.max(0,doc.documentElement.scrollWidth-doc.documentElement.clientWidth);
 const stats={page:doc.title,selector:label,scrollHeight:best.scrollHeight,clientHeight:best.clientHeight,
  maxScroll:bestDelta,horizontalOverflow:horizontal,
  pageText:doc.body.innerText.length,images:doc.querySelectorAll('img').length,
  brokenImages:[...doc.querySelectorAll('img')].filter(x=>x.getClientRects().length && x.complete&&!x.naturalWidth).slice(0,8).map(x=>x.src),
  renderedChips:doc.querySelectorAll('.mk-store-tag,.s02-tag').length,
  s01Expanded:doc.querySelectorAll('.store-card[data-card-kind=expanded]').length,
  s01Compact:doc.querySelectorAll('.store-card[data-card-kind=compact]').length,
  s01Stores:doc.querySelectorAll('.store-card').length,
  s5Stores:doc.querySelectorAll('.s5-store-card').length,
  s02Units:doc.querySelectorAll('.unit-row').length,
  customerActions:doc.querySelectorAll('button,a[href]').length};
 return stats;""".replace('__DOC__',selectors[page_name])
 stats=execute(js)
 if stats is None or stats.get('error'):raise AssertionError((page_name,'AUDIT_SCROLL_NOT_FOUND',stats))
 assert stats['pageText']>80,(page_name,'PAGE_BODY_EMPTY',stats)
 # Different candidates can be nested. A real long scroll needs > one viewport.
 assert stats['maxScroll']>120,(page_name,'LONG_SCROLL_COVERAGE_FAILED',stats)
 assert stats['horizontalOverflow']<8,(page_name,'UNEXPECTED_HORIZONTAL_OVERFLOW',stats)
 assert not stats['brokenImages'],(page_name,'BROKEN_VISIBLE_IMAGES',stats['brokenImages'])
 for stop,fraction in [('top',0),('middle',0.5),('bottom',1)]:
  mutation="""const doc=__DOC__;
   const priority=['#scroller','#app-viewport','.screen','.app-shell','main','#app'];
   const candidates=[...priority.map(x=>doc.querySelector(x)),doc.scrollingElement,doc.body,doc.documentElement].filter(Boolean);
   const el=candidates.reduce((x,y)=>Math.max(0,y.scrollHeight-y.clientHeight)>Math.max(0,x.scrollHeight-x.clientHeight)?y:x);
   el.scrollTop=Math.max(0,el.scrollHeight-el.clientHeight)*__FRACTION__;
   el.dispatchEvent(new Event('scroll',{bubbles:true}));
   return {position:el.scrollTop,maxScroll:Math.max(0,el.scrollHeight-el.clientHeight)};""".replace('__DOC__',selectors[page_name]).replace('__FRACTION__',str(fraction))
  value=execute(mutation)
  time.sleep(.18)
  stats[stop]=value
  screenshot('AUDIT-'+page_name+'-'+str(width)+'-'+stop+'.png')
 assert stats['bottom']['position']>=stats['bottom']['maxScroll']-3,(page_name,'BOTTOM_SCROLL_NOT_REACHED',stats)
 return stats

cases=[]
try:
 prefix=os.environ.get('CHROMEWEBDRIVER','')
 choices=[Path(prefix)/'chromedriver',Path(prefix),Path('/usr/bin/chromedriver'),Path('/usr/local/bin/chromedriver')]
 bin=next((str(p) for p in choices if p.is_file()),None)
 assert bin,('CHROMEDRIVER_BINARY_MISSING',str(choices))
 proc=subprocess.Popen([bin,'--port=9517','--allowed-ips=127.0.0.1'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for _ in range(100):
  try:
   req('GET','/status');break
  except Exception:time.sleep(.1)
 else:raise RuntimeError('CHROMEDRIVER_NOT_READY')
 for width,height in [(375,812),(390,844)]:
  row={'width':width,'height':height,'status':'FAIL','pages':{}}
  try:
   s=req('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{'args':['--headless=new','--no-sandbox','--disable-dev-shm-usage','--window-size='+str(width)+','+str(height)]}}}})
   session=s['sessionId']
   req('POST','/session/'+session+'/goog/cdp/execute',{'cmd':'Emulation.setDeviceMetricsOverride','params':{'width':width,'height':height,'deviceScaleFactor':1,'mobile':True}})
   navigate(BASE+'/prototype/parallel/core-journey-fix-01/demo/home.html')
   row['pages']['H01']=wait(H01);verify('H01',row['pages']['H01']);screenshot('H01-'+str(width)+'.png')
   row['scroll_H01']=audit_scroll('H01',width)
   navigate(BASE+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1')
   wait("return !!document.querySelector('#central-host')?.contentWindow?.SIM_DEMO")
   execute("const b=document.querySelector('#central-host').contentWindow.SIM_DEMO;b.core.setCity('北京');b.core.setRequirement(3,12,true);b.persist();b.navigate('S01');return true;")
   row['pages']['S01']=wait(S01);verify('S01',row['pages']['S01']);screenshot('S01-'+str(width)+'.png')
   row['scroll_S01']=audit_scroll('S01',width)
   execute("const b=document.querySelector('#central-host').contentWindow.SIM_DEMO;b.openStore(b.s01R2Bridge.snapshot().stores[0].id,'S01');return true;")
   row['pages']['S02']=wait(S02);verify('S02',row['pages']['S02']);screenshot('S02-'+str(width)+'.png')
   row['scroll_S02']=audit_scroll('S02',width)
   execute("document.querySelector('#central-host').contentWindow.SIM_DEMO.navigate('S5');return true;")
   row['pages']['S5']=wait(S5);verify('S5',row['pages']['S5']);screenshot('S5-'+str(width)+'.png')
   row['scroll_S5']=audit_scroll('S5',width)

   # Business state replay: high-volume / long-term must not leave stale cards.
   execute("const b=document.querySelector('#central-host').contentWindow.SIM_DEMO;b.core.setRequirement(35,37,true);b.persist();b.navigate('S5');return true;")
   high=wait("const d=document.querySelector('#central-host')?.contentWindow?.document.querySelector('#br04-frame')?.contentWindow?.document;if(!d?.querySelector('body[data-page=s5].bridge-ready'))return null;return {demand:d.body.innerText.slice(0,300),bodyHeight:d.querySelector('#app-viewport')?.scrollHeight,cardCount:d.querySelectorAll('.s5-store-card:not([hidden])').length};")
   assert '37个月' in high['demand'] or '37个月' in str(high),(width,'LONG_TERM_NOT_RENDERED',high)
   row['S5_37_months_35m3']=high
   screenshot('AUDIT-S5-'+str(width)+'-37months.png')
   execute("const b=document.querySelector('#central-host').contentWindow.SIM_DEMO;b.core.setRequirement(3,12,true);b.persist();b.navigate('S5');return true;")
   wait(S5)
   # Identical user-facing label must have one semantic type and color
   # across all four real rendered pages, not merely in the fixture data.
   same={}
   for page,info in row['pages'].items():
    for tag in info['tags']:
     key=tag['label']
     seen=same.get(key)
     value=(tag['kind'],tag['color'],tag['font'])
     if seen: assert seen==value,('CROSS_PAGE_TAG_MISMATCH',key,seen,value,page)
     else: same[key]=value
   row['identical_label_matches']=sum(sum(1 for p in row['pages'].values() for t in p['tags'] if t['label']==k)>1 for k in same)
   assert row['identical_label_matches']>=2,('NO_CROSS_PAGE_OVERLAPS',same)
   row['status']='PASS'
  except Exception as e:row['error']=repr(e)
  finally:
   cases.append(row);print('VIS_04B_CASE',width,row['status'],row.get('error',''))
   if session:
    try:req('DELETE','/session/'+session)
    except Exception:pass
    session=None
 (OUT/'webdriver-results.json').write_text(json.dumps({'source_sha':MAN['source_sha'],'source_pr':122,'mode':'preinstalled ChromeDriver no network','cases':cases},ensure_ascii=False,indent=2))
 assert all(x['status']=='PASS' for x in cases),[x for x in cases if x['status']!='PASS']
 print('RC2-FINAL-VISUAL-REVIEW-03 CHINESE_LONG_SCROLL PASS',MAN['source_sha'])
finally:
 if proc:proc.terminate()
 serve.shutdown()
