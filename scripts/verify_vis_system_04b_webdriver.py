#!/usr/bin/env python3
"""VIS-SYSTEM-04B offline ChromeDriver QA. Python stdlib, installed Chrome, no network."""
import base64, json, os, subprocess, time, threading, urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]/'release-evidence/rc2-merge-prep-10/site'
OUT=Path(__file__).resolve().parents[1]/'release-evidence/vis-system-04b'
OUT.mkdir(parents=True,exist_ok=True)
MAN=json.loads((ROOT/'rc2-uat-version.json').read_text())
assert MAN['source_sha']==os.environ.get('GITHUB_SHA') and MAN['source_pr']==119
assert MAN['source_branch']=='isolate/vis-system-04b-20261111'
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
return {tags:tags(card.querySelectorAll('.mk-store-tag'),'tagType'),price:details(card.querySelector('.store-price b'))};
"""
S01=JSBASE+"""
const a=document.querySelector('#central-host')?.contentWindow;const f=a?.document.querySelector('#s01-r2-frame')?.contentWindow?.document;
const c=f?.querySelector('.store-card[data-card-kind="expanded"]');if(!c)return null;
return {tags:tags(c.querySelectorAll('.store-tags .mk-store-tag'),'tagType'),
price:details(c.querySelector('.unit-action-row .price[data-price-kind="term"] strong')),
discount:details(c.querySelector('.s01-term-discount:not([hidden])'))};
"""
S02=JSBASE+"""
const d=document.querySelector('#central-host')?.contentWindow?.document;if(!d?.querySelector('#screen.page-S02'))return null;
return {tags:tags(d.querySelectorAll('.s02-service-summary .s02-tag'),'tagKind'),
price:details(d.querySelector('.page-S02 .unit-price .br03-price-main')),phone:!!d.querySelector('.s02-call-400')};
"""
S5=JSBASE+"""
const a=document.querySelector('#central-host')?.contentWindow?.document;
const d=a?.querySelector('#br04-frame')?.contentWindow?.document;
const c=d?.querySelector('.s5-store-card[data-rank="0"]');
if(!c||!d?.querySelector('body[data-page=s5].bridge-ready'))return null;
return {tags:tags(c.querySelectorAll('.s5-store-services .mk-store-tag'),'tagType'),
price:details(c.querySelector('.s5-unit-price')),ctaHeight:c.querySelector('.s5-unit-buy').getBoundingClientRect().height};
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
   navigate(BASE+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1')
   wait("return !!document.querySelector('#central-host')?.contentWindow?.SIM_DEMO")
   execute("const b=document.querySelector('#central-host').contentWindow.SIM_DEMO;b.core.setCity('北京');b.core.setRequirement(3,12,true);b.persist();b.navigate('S01');return true;")
   row['pages']['S01']=wait(S01);verify('S01',row['pages']['S01']);screenshot('S01-'+str(width)+'.png')
   execute("const b=document.querySelector('#central-host').contentWindow.SIM_DEMO;b.openStore(b.s01R2Bridge.snapshot().stores[0].id,'S01');return true;")
   row['pages']['S02']=wait(S02);verify('S02',row['pages']['S02']);screenshot('S02-'+str(width)+'.png')
   execute("document.querySelector('#central-host').contentWindow.SIM_DEMO.navigate('S5');return true;")
   row['pages']['S5']=wait(S5);verify('S5',row['pages']['S5']);screenshot('S5-'+str(width)+'.png')
   row['status']='PASS'
  except Exception as e:row['error']=repr(e)
  finally:
   cases.append(row);print('VIS_04B_CASE',width,row['status'],row.get('error',''))
   if session:
    try:req('DELETE','/session/'+session)
    except Exception:pass
    session=None
 (OUT/'webdriver-results.json').write_text(json.dumps({'source_sha':MAN['source_sha'],'source_pr':119,'mode':'preinstalled ChromeDriver no network','cases':cases},ensure_ascii=False,indent=2))
 assert all(x['status']=='PASS' for x in cases),[x for x in cases if x['status']!='PASS']
 print('VIS-SYSTEM-04B BROWSER_375_390 PASS',MAN['source_sha'])
finally:
 if proc:proc.terminate()
 serve.shutdown()
