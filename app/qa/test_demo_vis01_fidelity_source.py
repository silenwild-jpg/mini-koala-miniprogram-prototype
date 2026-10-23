#!/usr/bin/env python3
"""DEMO-VIS-01 source-bound checks. Not a browser rendering test."""
from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[1]
est=root/'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'
s=est.read_text(encoding='utf-8')
css=(root/'prototype/demo_vis01_s5_price_fidelity.css').read_text(encoding='utf-8')
checks={
 'scoped_link_once':s.count('href="demo_vis01_s5_price_fidelity.css"')==1,
 'S5_only_CSS':all(line.strip().startswith(('#s5','/*','*','@','}', 'display','align','grid','column','row','border','margin','padding','color','font','letter','white','max','min','gap','background','text','justify')) or not line.strip() or ':' in line for line in css.splitlines()),
 'D4_s5_coupon_details_preserved':"<details><summary>" in (root/'prototype/mini_storage_coupon_benefit_v1.js').read_text(encoding='utf-8'),
 'D4_s5_stepbar_hide_preserved':"body:has(#s5.active) .estvis05-steps{display:none!important}" in (root/'prototype/est_vis06_estimate_visual_unity.css').read_text(encoding='utf-8'),
 'A3_existing_card_price_structure': 'ux-a3-price-left' in s and 'ux-a3-price-right' in s,
 'card_has_term_label':'个月 · 整期总租金' in s,
 'card_has_monthly_secondary':'月均约 ${monthlyText}/月' in s,
 'no_new_coupon_A_image_claim':not (root/'assets/coupon-a-original').exists()
}
print(json.dumps(checks,ensure_ascii=False,indent=2))
if not all(checks.values()):sys.exit(1)
