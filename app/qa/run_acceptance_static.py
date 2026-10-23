from pathlib import Path
import subprocess,json,concurrent.futures,time,hashlib
root=Path(__file__).resolve().parent.parent;out=root/'outputs'/'acceptance_static';out.mkdir(parents=True,exist_ok=True)
def run(p):
 s=p.read_text();argv=['node',str(p)]
 if 'process.argv[' in s:
  mapping={'test_ssot.js':['prototype/mini_storage_business_ssot_v274.js'],'test_viewing_runtime.js':['prototype/mini_storage_business_ssot_v274.js','prototype/mini_storage_viewing_v01_v1_14_self_service_synced.html','prototype/mini_storage_viewing_v02_v1_14_self_service_synced.html'],'test_o01_runtime.js':['prototype/mini_storage_business_ssot_v274.js','prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html'],'test_renew_payment_confirmation.js':['prototype/mini_storage_business_ssot_v274.js','prototype/mini_storage_renew_rn01_v2_7_4.html']}
  if p.name in mapping:argv += [str(root/x) for x in mapping[p.name]]
  elif 'process.argv[2]' in s:argv += [str(root)]
 try:
  r=subprocess.run(argv,cwd=root,capture_output=True,text=True,timeout=60)
  return {'test':p.name,'exit':r.returncode,'output':(r.stdout+r.stderr)[-16000:],'args':argv[2:]}
 except subprocess.TimeoutExpired:return {'test':p.name,'exit':'timeout','output':'60s timeout'}
files=sorted((root/'qa').glob('test*.js'))
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:res=list(ex.map(run,files))
(out/'existing_checks.json').write_text(json.dumps(res,ensure_ascii=False,indent=2))
print(json.dumps({'total':len(res),'pass':sum(x['exit']==0 for x in res),'fail':[{'test':x['test'],'output':x['output'][:550]} for x in res if x['exit']!=0]},ensure_ascii=False,indent=2))
manifest=[{'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in root.rglob('*') if p.is_file() and p.suffix in ['.html','.js','.css']]
(out/'baseline_manifest.json').write_text(json.dumps(manifest,indent=2))

raise SystemExit(0 if all(x['exit']==0 for x in res) else 1)
