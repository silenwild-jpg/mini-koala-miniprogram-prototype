"""Active-version lightweight checks. Historical V1 text/fingerprint and prior page-level freeze assertions are archived, not active.
This does not replace mobile browser or WeChat acceptance.
"""
from pathlib import Path
import subprocess,sys,json,os
root=Path(__file__).resolve().parents[1]
bundled_node=Path(r'C:\Users\silence\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe')
node_executable=os.environ.get('NODE_EXECUTABLE') or (str(bundled_node) if bundled_node.is_file() else 'node')
# H01-007-P1: route checks write into outputs before the runner's final report.
(root/'outputs').mkdir(parents=True,exist_ok=True)
commands=[
 [node_executable,'qa/test_external_review_merge_v2.cjs'],
 [node_executable,'qa/test_ux_simplification_v1.cjs'],
 [node_executable,'qa/test_store_card_unification_v1.cjs'],
 [node_executable,'qa/test_s01_filter_sort_refinement_v1.cjs'],
 [node_executable,'qa/test_s01_inline_filter_location_v2.cjs'],
 [node_executable,'qa/test_phase2_ux.cjs'],
 [node_executable,'qa/test_phase3a_controlled_patch.cjs'],
 [node_executable,'qa/test_phase3a_independent_fix_v11.cjs'],
 [node_executable,'qa/test_phase3c_batch_a_price_gate.cjs'],
 [node_executable,'qa/test_phase3c_unified_final.cjs'],
 [node_executable,'qa/test_acceptance_v11_patch.cjs'],
 [node_executable,'qa/test_acceptance_v11_patch_b.cjs'],
 [node_executable,'qa/test_term_footer_geometry.cjs'],
 [node_executable,'qa/test_p1_review_fix_behaviors.js'],
 [node_executable,'qa/test_p1_s01_search_context.js'],
 [node_executable,'qa/test_s01_ux_continuity_patch_v1.js'],
 [node_executable,'qa/test_navigation_vnext.cjs'],
 [node_executable,'qa/test_home_state_integration_patch_v1.cjs'],
 [node_executable,'qa/test_home_state_recovery_v11.cjs'],
 [sys.executable,'qa/test_home_state_recovery_browser_v11.py'],
 [sys.executable,'qa/test_home_visual_closeout_patch_v1.py'],
 [sys.executable,'qa/test_cross_page_route_targets_v1.py'],
 [sys.executable,'qa/test_cross_page_runtime_smoke_v1.py'],
 [node_executable,'qa/test_combo_recommendation_v1.cjs'],
 [node_executable,'qa/test_combo_physical_fit_p0.cjs'],
 [node_executable,'qa/test_demo_price_combo_cleanup.cjs'],
 [node_executable,'qa/test_combo_ux_regression_v2.cjs'],
 [node_executable,'qa/test_combo_full_journey_recovery_v21.cjs'],
 [sys.executable,'qa/visual_check_combo_recovery_v21.py'],
 [node_executable,'qa/test_identity_flow.js'],
 [sys.executable,'qa/visual_check_demo_price_closeout.py'],
 [sys.executable,'qa/visual_check_combo_ux_v2.py'],
 # H01-007-S5: stage logic tests S1-S4 registered (fast, no browser). The four HTTP flow suites (qa/test_h01_007_s{1,2,3,4}_http_flows.py)
 # drive real Chromium for several minutes each and exceed the 100 s per-command budget here; run them separately (see README_CURRENT.md, H01-007 section).
 [node_executable,'qa/test_h01_007_s1_requirement_trade_snapshot.cjs'],
 [node_executable,'qa/test_h01_007_s2_coupon_eligibility.cjs'],
 [node_executable,'qa/test_h01_007_s3_trade_recheck.cjs'],
 [node_executable,'qa/test_h01_007_s4_entry_contracts.cjs'],
 [node_executable,'qa/test_h01_007_p1_coupon_settlement.cjs'],
 [node_executable,'qa/test_h01_recommendation_card_fix.cjs'],
 [sys.executable,'tools/check_package.py'],
 [sys.executable,'tools/check_http.py'],
]
results=[]
for cmd in commands:
 try:
  proc=subprocess.run(cmd,cwd=root,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=100)
  results.append(dict(command=cmd,exit=proc.returncode,output=(proc.stdout+proc.stderr)[-6000:]))
 except Exception as exc:results.append(dict(command=cmd,exit=-1,output=str(exc)))
 print(('PASS' if results[-1]['exit']==0 else 'FAIL')+' '+' '.join(cmd),flush=True)
out=root/'outputs/current_regression';out.mkdir(parents=True,exist_ok=True)
(out/'results.json').write_text(json.dumps({'release_gate':'HOLD','browser_e2e':'NOT_VERIFIED','legacy_fingerprint_checks':'CONVERSION_FRICTION_V1_SHA_ARCHIVED_NOT_REWRITTEN','results':results},ensure_ascii=False,indent=2),encoding='utf-8')
raise SystemExit(0 if all(r['exit']==0 for r in results) else 1)
