"""Verify every literal HTML route target referenced by the primary user journey resolves inside prototype/."""
from pathlib import Path
import re,json,sys
root=Path(__file__).resolve().parents[1]; proto=root/'prototype'
primary=[
 'mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
 'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
 'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
 'mini_storage_quote_q02_v4_self_service.html',
 'mini_storage_quote_q03_v4_self_service.html',
 'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
 'mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html',
 'mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html',
 'mini_storage_identity_id01_v2_7_4_5.html',
 'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html',
]
errors=[];checked=[];targets={}
for name in primary:
 p=proto/name;s=p.read_text(encoding='utf-8',errors='replace')
 refs=sorted(set(re.findall(r'[A-Za-z0-9_./-]+\.html',s)))
 for ref in refs:
  if ref.startswith('../'):
   dest=(p.parent/ref).resolve()
  elif '/' in ref:
   dest=(p.parent/ref).resolve()
  else:dest=proto/ref
  if not dest.is_file(): errors.append({'source':name,'target':ref,'reason':'missing local route target'})
  else: checked.append((name,ref))
 targets[name]=refs
required={
 primary[0]:[primary[1],primary[2],primary[3],primary[12]],
 primary[1]:[primary[0],primary[2],primary[3]],
 primary[2]:[primary[0],primary[1],primary[3]],
 primary[3]:[primary[1],primary[2],primary[4]],
 primary[4]:[primary[3],primary[5],primary[8]],
 primary[8]:[primary[4],primary[9]],
 primary[9]:[primary[0],primary[8],primary[10]],
 primary[10]:[primary[11]],
}
for src,expected in required.items():
 alltext=(proto/src).read_text(encoding='utf-8',errors='replace')
 for dst in expected:
  if dst not in alltext: errors.append({'source':src,'target':dst,'reason':'expected primary route reference not found'})
out=root/'outputs/cross_page_route_targets_v1.json';out.write_text(json.dumps({'pages_checked':len(primary),'route_references_checked':len(checked),'errors':errors,'primary_targets':targets},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pages_checked':len(primary),'route_references_checked':len(checked),'errors':errors},ensure_ascii=False,indent=2))
sys.exit(0 if not errors else 1)
