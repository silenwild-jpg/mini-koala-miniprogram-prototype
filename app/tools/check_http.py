"""Local HTTP resource smoke check; does not execute browser JS or user journeys."""
from pathlib import Path
import http.server,threading,json,hashlib,urllib.request,urllib.parse
root=Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root),**kwargs)
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
paths=['START_HERE.html','index.html']+[x['path'] for x in json.loads((root/'docs/BASELINE_RUNTIME_HASHES.json').read_text())['files']]
errors=[]
try:
 for name in paths:
  try:
   with urllib.request.urlopen('http://127.0.0.1:'+str(server.server_port)+'/'+urllib.parse.quote(name),timeout=5) as response:data=response.read()
   if data!=(root/name).read_bytes():errors.append(name+': bytes differ')
  except Exception as e:errors.append(name+': '+str(e))
finally:server.shutdown();server.server_close()
print(json.dumps({'http_resources_checked':len(paths),'errors':errors,'browser_js':'NOT_EXECUTED','e2e':'NOT_VERIFIED'},ensure_ascii=False,indent=2))
raise SystemExit(1 if errors else 0)
