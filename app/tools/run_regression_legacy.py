"""Run deterministic prototype checks; no browser E2E is implied."""
from pathlib import Path
import subprocess,json,sys,time
root=Path(__file__).resolve().parents[1]
out=root/'outputs/current_regression';out.mkdir(parents=True,exist_ok=True)
commands=[['python3','qa/run_acceptance_static.py'],['node','qa/test_phase2_ux.cjs'],['node','qa/test_phase3a_controlled_patch.cjs'],['node','qa/test_phase3a_independent_fix_v11.cjs'],['node','qa/test_phase3b_batch_ab.cjs'],['node','qa/test_phase3b_batch_c_u01.cjs'],['node','qa/test_phase3b_batch_d_cross_page.cjs'],['node','qa/test_phase3c_batch_a_price_gate.cjs'],['node','qa/test_phase3c_unified_final.cjs'],['node','qa/test_phase3c_unified_scope.cjs'],['node','qa/test_acceptance_v11_patch.cjs'],['node','qa/test_acceptance_v11_patch_b.cjs'],['node','qa/test_acceptance_v11_patch_c.cjs'],['node','qa/test_acceptance_v11_followup.cjs'],['node','qa/test_term_footer_geometry.cjs'],['node','qa/term_actions_v1/test_term_actions.cjs'],[sys.executable,'tools/check_package.py'],[sys.executable,'tools/check_http.py']]
commands[0][0]=sys.executable
results=[]
for command in commands:
 try:
  r=subprocess.run(command,cwd=root,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=120)
  result={'command':command,'exit':r.returncode,'output':r.stdout+r.stderr}
 except (OSError,subprocess.TimeoutExpired) as e:result={'command':command,'exit':-1,'output':str(e)}
 results.append(result);print(('PASS' if result['exit']==0 else 'FAIL')+' '+' '.join(command),flush=True)
(out/'results.json').write_text(json.dumps({'release_gate':'HOLD','browser_e2e':'NOT_VERIFIED','results':results},ensure_ascii=False,indent=2),encoding='utf-8')
raise SystemExit(0 if all(r['exit']==0 for r in results) else 1)
