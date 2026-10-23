from pathlib import Path
import sys,hashlib,re
root=Path(__file__).resolve().parents[1]
proto=root/'prototype'
checks=[]
css=(proto/'demo_price01_b1_discovery_contract.css').read_text()
checks.append(('B1 CSS scopes all three pages',all(x in css for x in ['.koala-h01','.koala-s01','.koala-s02'])))
checks.append(('B1 contract/reference selectors distinct',all(x in css for x in ['.is-term-price','.browse-unit-price','.demand-card .contract-price','.unit-price-label'])))
checks.append(('No display currency rewriting',not any(x in css for x in ['content:"¥','content:\"¥','innerHTML','calcRent','priceFor'])))
for name in ['mini_storage_home_H01_Visual_V2_7_4_SSOT.html','mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html','mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html']:
 t=(proto/name).read_text()
 checks.append((name+' mounts B1 once',t.count('href="demo_price01_b1_discovery_contract.css"')==1))
checks.append(('S01 browse/demand semantics preserved',all(s in (proto/'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html').read_text() for s in ['参考单价','整期租金 · ${termMonths}个月','暂无匹配报价'])))
checks.append(('S02 browse/term semantics preserved',all(s in (proto/'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html').read_text() for s in ['整期总租金','参考价格','选择租期后重新计算'])))
checks.append(('D4-A coupon content still present','couponEstimateGrantV1' in (proto/'mini_storage_coupon_benefit_v1.js').read_text()))
for name,res in checks:print(('PASS' if res else 'FAIL')+' '+name)
sys.exit(0 if all(x[1] for x in checks) else 1)
