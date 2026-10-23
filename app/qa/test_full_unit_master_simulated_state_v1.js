const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const ctx={window:{},console};ctx.window.window=ctx.window;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data','mini_koala_data.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(proto,'mini_storage_unit_master_v1.js'),'utf8'),ctx);
const D=ctx.window.MINI_KOALA_DATA,M=ctx.window.MINI_STORAGE_UNIT_MASTER_V1;
assert(M,'full unit master exists');
assert(M.records.some(r=>r.status==='OFFLINE'),'full unit master contains offline units for lifecycle coverage');
assert.deepEqual(Array.from(M.states),['AVAILABLE','RENTED','RESERVED','MAINTENANCE','OFFLINE']);
for(const store of D.stores){
  const summary=M.getStoreSummary(store.store_id);
  assert.equal(summary.available_units,Number(store.available_unit_count||0),`${store.store_name}: master keeps authoritative available count`);
  assert(summary.total_units>=summary.available_units,`${store.store_name}: total units cover available units`);
}
const canonical='MK_BJ_2CDB7BEE';
const cs=M.getStoreSummary(canonical);
assert.equal(cs.available_units,9,'canonical store keeps 9 available units');
assert(cs.capacity_count>cs.available_capacity_count,'canonical store includes currently-full capacities');
assert(M.getSoldoutCapacities(canonical).length>=1,'canonical store exposes full capacity rows');
assert.equal(M.getStoreSummary(canonical,'soldout').available_units,0,'sold-out scenario can drive full-store empty state');

const s01=fs.readFileSync(path.join(proto,'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const s02=fs.readFileSync(path.join(proto,'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),'utf8');
for(const s of [s01,s02])assert(s.includes('mini_storage_unit_master_v1.js'),'S01/S02 load full unit master');
assert(s02.includes('id="otherCapacitySection"'),'S02 has other-capacity section');
assert(s02.includes('其他容量')&&s02.includes('已售出'),'S02 exposes capacity-level sold state');
assert(!s02.includes('库存状态演示')&&!s01.includes('库存状态演示'),'inventory UI contains no demo-data badge');
assert(!s01.includes('演示服务条件')&&!s01.includes('当前演示档位'),'S01 customer-facing filters/term labels are product language');
assert(!s02.includes('当前为演示路线数据'),'S02 route note is customer-facing language');
console.log('PASS Full Unit Master V1: complete unit-state layer, exact available counts, capacity-level sold-out UX, no demo labels in user-facing inventory flow');
