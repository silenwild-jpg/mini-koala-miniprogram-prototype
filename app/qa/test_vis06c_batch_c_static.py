#!/usr/bin/env python3
"""Batch C static guard. Browser evidence is separate and NOT inferred."""
from pathlib import Path
import re,sys
root=Path(__file__).resolve().parents[1]
p=root/'prototype'
css=(p/'mk-v3-life-service-batch-c.css').read_text()
groups={
"mine":["mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html"],
"core":["mini_storage_renew_rn01_v2_7_4.html","mini_storage_exit_ex01_v2_7_4.html","mini_storage_deposit_dp01_v2_7_4.html","mini_storage_order_history_oh01_v2_7_4.html","mini_storage_invoice_iv01_v2_7_4.html"],
"service":["mini_storage_viewing_v01_v1_14_self_service_synced.html","mini_storage_viewing_v02_v1_14_self_service_synced.html","mini_storage_transport_status_v1.html","mini_storage_access_a01_v2_self_service_Visual_V2_7_4.html","mini_storage_business_b2b01_r113_Visual_V2_7_4.html","mini_storage_brand_b01_v1_10_self_service_synced_Visual_V2_7_4.html","mini_storage_referral_ref01_v1.html"]}
errors=[];n=0
for group,arr in groups.items():
 for filename in arr:
  n+=1;s=(p/filename).read_text();mark='koala-vis06c-life koala-life-'+group
  link='href="mk-v3-life-service-batch-c.css"'
  if s.count(mark)!=1 or s.count(link)!=1:errors.append(filename+' missing/multiple opt-in')
  if 'koala-site-shell' not in s and group!='mine':errors.append(filename+' lacks original shell')
  if s.count('</head>')!=1:errors.append(filename+' bad head')
if n!=13:errors.append('scope count')
if not all(x in css for x in ['body.koala-vis06c-life','koala-life-core','koala-life-service','koala-life-mine']):errors.append('CSS scope incomplete')
if re.search(r'\.coupon-bottom|#miniGlobalSupport|simulatePayment|locked_order_id',css):errors.append('forbidden transaction/help selector')
for filename in ['mini_storage_transport_t01_v4_self_service.html','mini_storage_transport_t02_v4_self_service.html']:
 if 'mk-v3-life-service-batch-c.css' in (p/filename).read_text():errors.append(filename+' must remain unchanged')
print(f'VIS06C_BATCH_C_STATIC {13-len(errors) if errors else 13}/13 pages; errors={errors}; browser=NOT_TESTED')
sys.exit(bool(errors))
