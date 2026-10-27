from pathlib import Path
import json,subprocess,re
root=Path(__file__).resolve().parent
node='C:/Users/silence/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
results=[]
for p in sorted((root/'demo/qa').glob('test_*.js')):
    r=subprocess.run([node,str(p)],capture_output=True,encoding='utf-8',errors='replace')
    lines=r.stdout.strip().splitlines()
    try:summary=json.loads(lines[-1])
    except Exception:summary={}
    results.append({'file':str(p.relative_to(root)),'exit_code':r.returncode,'summary':summary,'stdout':r.stdout,'stderr':r.stderr})
syntax=[]
for p in [*(root/'demo').rglob('*.js'),root/'qa_browser.cjs']:
    r=subprocess.run([node,'--check',str(p)],capture_output=True,encoding='utf-8',errors='replace')
    syntax.append({'file':str(p.relative_to(root)),'exit_code':r.returncode,'stderr':r.stderr})
for name in ['home.html','cap.html','items.html','business.html']:
    html=(root/'demo'/name).read_text(encoding='utf-8')
    blocks=re.findall(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>',html,re.I)
    for i,js in enumerate(blocks):
        if not js.strip():continue
        r=subprocess.run([node,'--check'],input=js,capture_output=True,encoding='utf-8',errors='replace')
        syntax.append({'file':name+' inline '+str(i),'exit_code':r.returncode,'stderr':r.stderr})
(root/'evidence/model-checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'evidence/syntax-checks.json').write_text(json.dumps(syntax,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'model_groups':sum(x['summary'].get('groups',0) for x in results),'model_failures':[x['file'] for x in results if x['exit_code']],'syntax_checks':len(syntax),'syntax_failures':[x['file'] for x in syntax if x['exit_code']]}))
assert all(x['exit_code']==0 for x in results+syntax)
