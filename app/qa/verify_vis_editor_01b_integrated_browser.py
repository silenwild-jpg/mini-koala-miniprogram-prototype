#!/usr/bin/env python3
"""VIS-EDITOR-01B-integrated: real HTTP+ChromeDriver UI QA; stdlib only; no production deploy."""
import base64
import json
import os
import shutil
import subprocess
import threading
import time
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'release-evidence'/'vis-editor-01b-integrated'
OUT.mkdir(parents=True,exist_ok=True)
PORT=4746
WD='http://127.0.0.1:9526'
SOURCE_URL='http://127.0.0.1:'+str(PORT)+'/tools/vis-editor-s01-integrated.html'
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
    try:
        with urllib.request.urlopen(req,timeout=25) as r:
            result=json.loads(r.read().decode('utf-8'))['value']
    except urllib.error.HTTPError as e:
        raise RuntimeError('WEBDRIVER_HTTP_'+str(e.code)+' '+e.read().decode('utf-8','replace')[:1100]) from e
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
    return wait("""const f=document.getElementById('preview'),root=f&&f.contentDocument;
const central=root?.querySelector('#central-host')?.contentDocument;
const d=central?.querySelector('#s01-r2-frame')?.contentDocument;
return d&&d.readyState==='complete'&&d.documentElement.dataset.binding==='CENTRAL_RC1'&&
d.querySelector('.store-card[data-card-kind="expanded"]')&&document.querySelector('#fields input') ?
{count:d.querySelectorAll('.store-card[data-card-kind="expanded"]').length,
frameWidth:f.clientWidth,frameHeight:f.clientHeight,title:d.title,source:root.querySelector('#central-host').getAttribute('src')} : false;""",timeout=22)

def select_dropdown(element_id,value):
    return js("""const e=document.getElementById("""+json.dumps(element_id)+""");e.value="""+json.dumps(value)+""";
e.dispatchEvent(new Event('change',{bubbles:true}));return e.value;""")

def set_number(section,value):
    return js("""const t=Array.from(document.querySelectorAll('#target-list .target')).find(x=>x.dataset.target==="""+json.dumps(section)+""");
if(!t)throw Error('MISSING_TARGET');t.click();
const n=document.querySelector('#fields .field input[type=number]');if(!n)throw Error('MISSING_FIELD');
n.value="""+str(int(value))+""";n.dispatchEvent(new Event('input',{bubbles:true}));
n.dispatchEvent(new Event('change',{bubbles:true}));
const root=document.getElementById('preview').contentDocument;
const d=root.querySelector('#central-host').contentDocument.querySelector('#s01-r2-frame').contentDocument;
const el=d.querySelector('.store-card[data-card-kind="expanded"]');
return {padding:el&&el.ownerDocument.defaultView.getComputedStyle(el).paddingTop,
inline:el&&el.getAttribute('style'),current:n.value,edits:document.getElementById('status-text').textContent,
sourceConnected:!!el&&el.isConnected,frameState:d.documentElement.dataset.matchMode,
targetName:document.getElementById('target-title').textContent};
""")

def measure_card():
    return js("""const root=document.getElementById('preview').contentDocument;
const d=root.querySelector('#central-host').contentDocument.querySelector('#s01-r2-frame').contentDocument;
const el=d.querySelector('.store-card[data-card-kind="expanded"]');
if(!el)return null;return {padding:el.ownerDocument.defaultView.getComputedStyle(el).paddingTop,
count:d.querySelectorAll('.store-card[data-card-kind="expanded"]').length,
width:document.getElementById('preview').clientWidth,
docWidth:d.documentElement.scrollWidth,bodyWidth:d.body.scrollWidth};
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
      'prefs':{'download.default_directory':str(OUT),'download.prompt_for_download':False,'download.directory_upgrade':True,'profile.default_content_setting_values.automatic_downloads':1}
    }}}}
    session=request('POST','/session',capabilities)['sessionId']
    request('POST','/session/'+session+'/goog/cdp/execute',{'cmd':'Browser.setDownloadBehavior','params':{'behavior':'allow','downloadPath':str(OUT),'eventsEnabled':True}})
    navigate(SOURCE_URL)
    first=step('real_integrated_S01_load',editor_ready)
    step('source_is_central_bridge',lambda:check(
        'index.html?page=S01' in first['source'] and first['count']>0 and '附近门店' in first['title'],
        first))
    step('375_frame_dimensions',lambda:check(js("""const f=document.getElementById('preview');return [f.clientWidth,f.clientHeight];""")==[375,812],'375x812'))
    screenshot('375-matched3-baseline.png')
    select_dropdown('viewport','390')
    step('390_frame_dimensions',lambda:check(js("""const f=document.getElementById('preview');return [f.clientWidth,f.clientHeight];""")==[390,844],'390x844'))
    screenshot('390-matched3-baseline.png')
    for state in ('matched3','matched8','browse','matched3'):
        select_dropdown('scene',state)
        step('state_'+state,lambda st=state:check(wait("""const f=document.getElementById('preview'),root=f&&f.contentDocument;
const central=root?.querySelector('#central-host')?.contentDocument;
const d=central?.querySelector('#s01-r2-frame')?.contentDocument;
return d&&d.documentElement.dataset.binding==='CENTRAL_RC1'&&
d.documentElement.dataset.matchMode==="""+json.dumps('browse' if state=='browse' else 'matched')+"""&&
d.querySelector('.store-card')&&document.querySelector('#fields input[type=number]')?{mode:d.documentElement.dataset.matchMode,
expanded:d.querySelectorAll('.store-card[data-card-kind="expanded"]').length,compact:d.querySelectorAll('.s01-compact-store').length}:false;
""",timeout=22),state))
        if state=='matched8': screenshot('390-matched8.png')
    select_dropdown('viewport','375')
    def test_visual_change():
        d=set_number('store-card',18)
        print('VIS_EDITOR_INTEGRATED_DIAG',json.dumps(d,ensure_ascii=False),flush=True)
        return check(d['padding']=='18px',d)
    a=step('visual_change',test_visual_change)
    step('undo_revert',lambda:check((js("document.getElementById('undo').click();return true;") and measure_card()['padding']!='18px'),'undo restored baseline'))
    step('redo_reapply',lambda:check((js("document.getElementById('redo').click();return true;") and measure_card()['padding']=='18px'),'redo padding 18px'))
    screenshot('375-card-padding-18.png')
    select_dropdown('variant','B')
    step('variant_B_isolated',lambda:check(measure_card()['padding']!='18px','B has no A change'))
    def test_B_edit():
        d=set_number('store-card',16)
        print('VIS_EDITOR_INTEGRATED_B_DIAG',json.dumps(d,ensure_ascii=False),flush=True)
        return check(d['padding']=='16px',d)
    step('variant_B_edit',test_B_edit)
    js("document.getElementById('save').click();return true;")
    select_dropdown('variant','A')
    step('variant_A_restored',lambda:check(measure_card()['padding']=='18px','A padding 18px'))
    js("document.getElementById('save').click();return true;")
    navigate(SOURCE_URL)
    editor_ready()
    step('persistent_A_after_reload',lambda:check(measure_card()['padding']=='18px','A persisted in localStorage'))
    select_dropdown('variant','B')
    step('persistent_B_after_reload',lambda:check(measure_card()['padding']=='16px','B persisted in localStorage'))
    js("document.getElementById('export').click();return true;")
    def exported():
        j=list(OUT.glob('S01_VIS_EDITOR_01B_B_*.json'))
        c=list(OUT.glob('S01_VIS_EDITOR_01B_B_*.css'))
        return {'json':j[0].name,'css':c[0].name} if j and c and j[0].stat().st_size>0 and c[0].stat().st_size>0 else False
    end=time.monotonic()+12
    export_files=None
    while time.monotonic()<end:
        export_files=exported()
        if export_files:break
        time.sleep(.25)
    step('export_JSON_CSS',lambda:check(export_files,{'files':sorted(x.name for x in OUT.iterdir()),'expected':export_files}))
    j=json.loads((OUT/export_files['json']).read_text(encoding='utf-8'))
    step('export_exact_source',lambda:check(j['sourceBranch']=='isolate/vis-system-04b2-20261111' and 'central-review-02g.html' in j['sourceRoute'] and j['changes']['store-card']['padding']==16 and j['variant']=='B',j['baseSha']))
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
