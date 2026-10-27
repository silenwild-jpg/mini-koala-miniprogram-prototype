from pathlib import Path
import hashlib,json,shutil
R=Path(__file__).resolve().parent
P=Path('C:/Users/silence/Documents/Codex/2026-10-26/mini-koala-decisions-apply')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((P/'MANIFEST_SHA256.json').read_text(encoding='utf-8'))
assert all(sha(P/n)==h for n,h in manifest.items())
assert not (R/'demo').exists(),'Candidate already exists; do not overwrite'
shutil.copytree(P/'demo',R/'demo',ignore=shutil.ignore_patterns('prior-stage-records','README.md','serve_demo.py','START_DEMO.cmd'))
(R/'evidence').mkdir(exist_ok=True)
shutil.copy2(P/'check_runner.py',R/'check_runner.py')
shutil.copy2(P/'qa_browser.cjs',R/'qa_base_browser.cjs')
test=(R/'qa_base_browser.cjs').read_text(encoding='utf-8').replace('127.0.0.1:4210','127.0.0.1:4230').replace("evidence/browser-checks.json","evidence/base-browser-checks.json").replace("'browser-checks.json'","'base-browser-checks.json'")
(R/'qa_base_browser.cjs').write_text(test,encoding='utf-8')
provenance={'version':'CORE_JOURNEY_FIX_01_20261026','parent':str(P),'parent_zip_sha256':sha(P/'Mini_Koala_DECISION_APPLY_01_裁决应用版_2026-10-26.zip'),'parent_manifest':manifest,'scope':['F01 address layout','F02 renewal quote binding','F03 enterprise update identity'],'policy':'Independent candidate; D25/D38 and other audit findings remain unchanged'}
(R/'SOURCE_PROVENANCE.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared independent fix candidate')
