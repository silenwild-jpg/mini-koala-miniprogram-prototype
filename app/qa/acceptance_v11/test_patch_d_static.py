from pathlib import Path
from hashlib import sha256
import re
import os
import subprocess
import tinycss2
root=Path(__file__).resolve().parents[2]
prior=Path(os.environ['MINI_KOALA_PREVIOUS_BASELINE']) if os.environ.get('MINI_KOALA_PREVIOUS_BASELINE') else None
# If the original baseline is not separately mounted, skip only direct baseline equivalence checks.
source=root/'prototype'
js=(source/'mini_koala_acceptance_v11_layout_patch.js').read_text()
css=(source/'mini_koala_acceptance_v11_layout_patch.css').read_text()
globaljs=(source/'mini_storage_global_support_v274.js').read_text()
passed=0

def check(title,predicate):
 global passed
 assert predicate,title
 passed+=1
 print('PASS D-STATIC',title)

check('additive D CSS+JS resources loaded through common support',all(x in globaljs for x in ['mini_koala_acceptance_v11_layout_patch.css','mini_koala_acceptance_v11_layout_patch.js']))
check('A/B/C patch loader still present',all(x in globaljs for x in ['mini_koala_acceptance_v11_state_patch.js','mini_koala_acceptance_v11_facts_patch.js','mini_koala_acceptance_v11_language_patch.js']))
check('requested floating help rollback retains original style and handlers', '.mkd-inline-support' not in css and 'position:fixed;right:' in globaljs and 'support.classList.add' not in js)
check('original contact handlers remain in common script',all(x in globaljs for x in ['miniSupportPhone','miniSupportChat','miniSupportMask']))
check('details state texts are scoped and responsive',all(x in js for x in ['section-collapsible','quote-secondary',"item.addEventListener('toggle',update)","aria-expanded"]))
check('inline validation does not reimplement order or promotion rules',all(x in js for x in ['showError','clearError',"addEventListener('invalid'",'aria-invalid']) and all(x not in js for x in ['localStorage','upfront_payable','coupon_discount_amount','termFactor']))
check('benefit info does not mimic rent redemption',all(x in js for x in ['搬运补贴','查看使用说明','不直接抵扣仓位租金']))
check('responsive breakpoints and scoped page spacing',all(x in css for x in ['.mkd-m01 .section','.mkd-b2b .hero h1','.mkd-coupon .coupon-card-name','@media(max-width:380px)']))
check('CSS parses without syntax errors',not [e for e in tinycss2.parse_stylesheet(css) if e.type=='error'])
check('D JavaScript passes node syntax check',subprocess.run(['node','--check',str(source/'mini_koala_acceptance_v11_layout_patch.js')],capture_output=True).returncode==0)
import json
manifest=json.loads((root/'qa/acceptance_v11/abc_core_html_sha256.json').read_text())
check('core source HTML matches packaged baseline hash manifest',all(sha256((source/n).read_bytes()).hexdigest()==h for n,h in manifest.items()))
if prior is not None and prior.is_dir():
 files=sorted(p.name for p in source.glob('*.html'))
 check('all primary HTML remain byte-identical to ABC',all((prior/'prototype'/n).read_bytes()==(source/n).read_bytes() for n in files))
 check('coupon pricing/fixture data unchanged',all((prior/'prototype'/n).read_bytes()==(source/n).read_bytes() for n in ['mini_storage_coupon_benefit_v1.js','mini_storage_demo_fixture_v2.js','mini_storage_business_ssot_v274.js']))
print(f'RESULT {passed}/{passed} D structural guards PASS; browser E2E not included')
