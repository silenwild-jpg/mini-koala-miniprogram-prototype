#!/usr/bin/env python3
"""VIS-EDITOR-01B: real HTTP+ChromeDriver UI QA; stdlib only; no production deploy."""
import base64
import json
import os
import shutil
import subprocess
import threading
import time
import urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'release-evidence'/'vis-editor-01b'
OUT.mkdir(parents=True,exist_ok=True)
PORT=4746
WD='http://127.0.0.1:9526'
SOURCE_URL='http://127.0.0.1:'+str(PORT)+'/tools/vis-editor-s01.html'
session=None
proc=None
results={'source_sha':os.environ.get('GITHUB_SHA',''), 'tests':[], 'screenshots':[], 'status':'FAIL', 'browser':'ChromeDriver', 'notes':[]}

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def step(name,fn):
    try:
        value=fn()
        results['tests'].append({'name':name,'status':'PASS','details':value})
        print('VIS_EDITOR_01B_PASS',name,flush=True)
        return value
    except Exception as error:
        results['tests'].append({'name':name,'status':'FAIL','error':repr(error)})
        print('VIS_EDITOR_01B_FAIL',name,repr(error),flush=True)
        raise

def request(method,route,body=None):
    payload=None if body is None else json.dumps(body).encode('utf-8')
    req=urllib.request.Request(WD+route,data=payload,method=method,headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=25) as r:
        result=json.loads(r.read().decode('utf-8'))['value']
    if isinstance(result,dict) and result.get('error'):
        raise RuntimeError('WEBDRIVER '+str(result)[:600])
    return result

def js(code):
    return request('POST','/session/'+session+'/execute/sync',{'script':'return (function(){'+code+'})();','args':[]})

def wait(code,timeout=18):
    end=time.monotonic()+timeout
    last=''
    while time.monotonic()<end:
        try:
            v=js(code)
            if v:return v
        except Exception as e:last=str(e)
        time.sleep(.22)
    raise RuntimeError('WAIT '+code[:110]+' / '+last[:150])

def navigate(url):
    return request('POST','/session/'+session+'/url',{'url':url})

def screenshot(filename):
    encoded=request('GET','/session/'+session+'/screenshot')
    (OUT/filename).write_bytes(base64.b64decode(encoded))
    results['screenshots'].append(filename)

def editor_ready():
    return wait("""const f=document.querySelector('#preview'),d=f&&f.contentDocument;
return d&&d.readyState==='complete'&&d.querySelector('#storeList')&&d.querySelector('.store')&&
document.querySelector('#fields input') ? {count:d.querySelectorAll('.store').length,
frameWidth:f.clientWidth,frameHeight:f.clientHeight,title:d.title} : false;""",timeout=23)

def select_dropdown(element_id,value):
    return js("""const e=document.getElementById("""+json.dumps(element_id)+""");e.value="""+json.dumps(value)+""";
e.dispatchEvent(new Event('change',{bubbles:true}));return e.value;""")

def set_number(section,value):
    return js("""const t=Array.from(document.querySelectorAll('#target-list .target')).find(x=>x.dataset.target==="""+json.dumps(section)+""");
if(!t)throw Error('MISSING_TARGET');t.click();
const n=document.querySelector('#fields .field input[type=number]');if(!n)throw Error('MISSING_FIELD');
n.value="""+str(int(value))+""";n.dispatchEvent(new Event('input',{bubbles:true}));
n.dispatchEvent(new Event('change',{bubbles:true}));
const f=document.querySelector('#preview').contentDocument;
return {padding:f.querySelector('#storeList .store') && getComputedStyle(f.querySelector('#storeList .store')).paddingTop,
current:n.value,edits:document.getElementById('status-text').textContent};
""")

def measure_card():
    return js("""const d=document.querySelector('#preview').contentDocument;const e=d.querySelector('#storeList .store');
if(!e)return null;return {padding:e.ownerDocument.defaultView.getComputedStyle(e).paddingTop, count:d.querySelectorAll('#storeList .store').length,
width:document.getElementById('preview').clientWidth, docWidth:d.documentElement.scrollWidth, bodyWidth:d.body.scrollWidth};
""")

def check(condition,details):
    assert condition, details
    return details

server=ThreadingHTTPServer(('127.0.0.1',PORT),lambda *a,**k:Quiet(*a,directory=str(ROOT),**k))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    chromedriver=os.getenv('CHROMEWEBDRIVER','')
    options=[Path(chromedriver)/'chromedriver',Path(chromedriver),Path('/usr/bin/chromedriver'),Path('/usr/local/bin/chromedriver')]
    exe=next((str(p) for p in options if p.is_file()),None) or shutil.which('chromedriver')
    if not exe: raise RuntimeError('CHROMEDRIVER_NOT_FOUND')
    proc=subprocess.Popen([exe,'--port=9526','--allowed-ips=127.0.0.1'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(80):
        try:request('GET','/status');break
        except Exception:time.sleep(.15)
    else:raise RuntimeError('CHROMEDRIVER_NOT_READY')
    capabilities={'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{
      'args':['--headless=new','--no-sandbox','--disable-dev-shm-usage','--window-size=1440,1000'],
      'prefs':{'download.default_directory':str(OUT),'download.prompt_for_download':False,'download.directory_upgrade':True}
    }}}}
    session=request('POST','/session',capabilities)['sessionId']
    navigate(SOURCE_URL)
    first=step('real_S01_load',editor_ready)
    step('origin_unmodified',lambda:check('附近门店' in first['title'] and first['count']>0,first))
    step('375_frame_dimensions',lambda:check(js("""const f=document.getElementById('preview');return [f.clientWidth,f.clientHeight];""")==[375,812],'375x812'))
    screenshot('375-browse-baseline.png')
    select_dropdown('viewport','390')
    step('390_frame_dimensions',lambda:check(js("""const f=document.getElementById('preview');return [f.clientWidth,f.clientHeight];""")==[390,844],'390x844'))
    screenshot('390-browse-baseline.png')
    for state in ('estimated','unlocated','nomatch','extended','far','browse'):
        select_dropdown('scene',state)
        step('state_'+state,lambda st=state:check(wait("""const f=document.getElementById('preview'),d=f&&f.contentDocument;
return f&&f.getAttribute('src')&&f.getAttribute('src').includes('state="""+state+"""')&&d&&d.readyState==='complete'&&
d.querySelector('#storeList')&&document.querySelector('#fields input')?{state:"""+json.dumps(state)+""",
cardCount:d.querySelectorAll('#storeList .store').length}:false;""",timeout=20),state))
        if state=='estimated': screenshot('390-estimated.png')
    select_dropdown('viewport','375')
    a=step('visual_change',lambda:check(set_number('store-card',18)['padding']=='18px','card padding 18px'))
    step('undo_revert',lambda:check((js("document.getElementById('undo').click();return true;") and measure_card()['padding']!='18px'),'undo restored baseline'))
    step('redo_reapply',lambda:check((js("document.getElementById('redo').click();return true;") and measure_card()['padding']=='18px'),'redo padding 18px'))
    screenshot('375-card-padding-18.png')
    select_dropdown('variant','B')
    step('variant_B_isolated',lambda:check(measure_card()['padding']!='18px','B has no A change'))
    step('variant_B_edit',lambda:check(set_number('store-card',20)['padding']=='20px','B padding 20px'))
    js("document.getElementById('save').click();return true;")
    select_dropdown('variant','A')
    step('variant_A_restored',lambda:check(measure_card()['padding']=='18px','A padding 18px'))
    js("document.getElementById('save').click();return true;")
    navigate(SOURCE_URL)
    editor_ready()
    step('persistent_A_after_reload',lambda:check(measure_card()['padding']=='18px','A persisted in localStorage'))
    select_dropdown('variant','B')
    step('persistent_B_after_reload',lambda:check(measure_card()['padding']=='20px','B persisted in localStorage'))
    js("document.getElementById('export').click();return true;")
    def exported():
        j=list(OUT.glob('S01_VIS_EDITOR_01A_B_*.json'))
        c=list(OUT.glob('S01_VIS_EDITOR_01A_B_*.css'))
        return {'json':j[0].name,'css':c[0].name} if j and c and j[0].stat().st_size>0 and c[0].stat().st_size>0 else False
    end=time.monotonic()+12
    export_files=None
    while time.monotonic()<end:
        export_files=exported()
        if export_files:break
        time.sleep(.25)
    step('export_JSON_CSS',lambda:check(export_files,export_files))
    j=json.loads((OUT/export_files['json']).read_text(encoding='utf-8'))
    step('export_exact_source',lambda:check(j['sourceBranch']=='isolate/vis-system-04b2-20261111' and j['changes']['store-card']['padding']==20 and j['variant']=='B',j['baseSha']))
    results['status']='PASS'
except Exception as e:
    results['error']=repr(e)
    print('VIS_EDITOR_01B_ERROR',repr(e),flush=True)
finally:
    if session:
        try:request('DELETE','/session/'+session)
        except Exception:pass
    if proc:proc.terminate()
    server.shutdown()
    (OUT/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print('VIS_EDITOR_01B_SUMMARY',results['status'],len(results['tests']),flush=True)
if results['status']!='PASS':raise SystemExit(1)
