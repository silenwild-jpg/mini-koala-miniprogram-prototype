"""UX-PATCH D HTTP + Chromium capture (screening only; NOT full E2E acceptance).
Run from package root: python qa/ux_patch_d_browser_acceptance.py [--chromium /path/to/chrome]
Needs Python playwright and an installed browser. Output not included in RELEASE_MANIFEST.
"""
from pathlib import Path
import argparse,subprocess,sys,time,json,csv,urllib.request
from urllib.parse import quote

ROOT=Path(__file__).resolve().parents[1]
MATRIX=ROOT/'docs/ux_patch_d/UX_PATCH_D_REAL_BROWSER_ACCEPTANCE_MATRIX.csv'
OUT=ROOT/'outputs/ux_patch_d_browser'

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--chromium',default='',help='Optional Chrome/Chromium executable path')
 ap.add_argument('--port',type=int,default=4173)
 args=ap.parse_args()
 try:
  from playwright.sync_api import sync_playwright
 except ImportError:
  print('Missing playwright. Run pip install playwright, then python -m playwright install chromium.');return 2
 OUT.mkdir(parents=True,exist_ok=True)
 rows=list(csv.DictReader(MATRIX.open(encoding='utf-8-sig')))
 server=subprocess.Popen([sys.executable,'-m','http.server',str(args.port),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 result=[]
 try:
  time.sleep(1)
  with sync_playwright() as pw:
   kw={'headless':True};
   if args.chromium:kw['executable_path']=args.chromium
   browser=pw.chromium.launch(**kw)
   for row in rows:
    w,h=(int(n) for n in row['viewport'].split('x'))
    url=f"http://127.0.0.1:{args.port}/prototype/{quote(row['file'])}"
    entry={'id':row['id'],'page':row['page'],'viewport':row['viewport'],'url':url,'render':'NOT_VERIFIED'}
    try:
     context=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=2,locale='zh-CN',is_mobile=True,has_touch=True)
     page=context.new_page();errs=[]
     page.on('pageerror',lambda error:errs.append(str(error)))
     res=page.goto(url,wait_until='domcontentloaded',timeout=16000)
     page.wait_for_timeout(350)
     width=page.evaluate('({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})')
     broken=page.locator('img').evaluate_all('(imgs)=>imgs.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)')
     shot=f"{row['id']}_{row['page'].replace('/','-')}_{w}x{h}.png"
     page.screenshot(path=str(OUT/shot),full_page=True)
     entry.update(render='CAPTURED_AWAITING_REVIEW',http_status=res.status if res else None,screenshot=shot,horizontal_overflow_px=max(0,width['scroll']-width['client']),broken_images=broken[:20],page_errors=errs[:20])
     context.close()
    except Exception as exc:
     entry.update(render='BLOCKED_OR_FAILED',error=str(exc)[:500])
    result.append(entry)
   browser.close()
 except Exception as e:
  result.append({'render':'BROWSER_START_BLOCKED','error':str(e)[:500]})
 finally:
  server.terminate()
  try:server.wait(timeout=3)
  except subprocess.TimeoutExpired:server.kill()
 (OUT/'results.json').write_text(json.dumps({'disclaimer':'Screenshots are screening only; manual click journeys and WeChat remain untested.','results':result},ensure_ascii=False,indent=2),encoding='utf8')
 captures=sum(row.get('render')=='CAPTURED_AWAITING_REVIEW' for row in result)
 print(f'Captured {captures}/{len(rows)} viewports; see {OUT}/results.json')
 return 0 if captures==len(rows) else 2

if __name__=='__main__':raise SystemExit(main())
