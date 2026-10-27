'use strict';
const assert=require('node:assert/strict');
const fixture=require('../demo/fixtures');
const {create}=require('../demo/demo-core');
const C=require('../demo/central-contract');
let n=0;const check=(title,fn)=>{fn();console.log('PASS',title);n++;};
check('canonical data fixture includes expected source namespace',()=>{
 const c=C.source(fixture);
 assert(c.stores.has('SIM_BJ01'));assert(c.units.has('SIM_BJ01_U03'));
 assert.equal(c.fixtureVersion,fixture.version);
});
check('central candidate rejects legacy MK IDs and invalid cross-store or unknown units',()=>{
 assert.throws(()=>C.storeId(fixture,'MK_BJ_2CDB7BEE'),/LEGACY_STORE_ID_UNMAPPED/);
 assert.throws(()=>C.unitIds(fixture,'SIM_BJ01',['SIM_BJ02_U01']),/UNIT_STORE_MISMATCH/);
 assert.throws(()=>C.unitIds(fixture,'SIM_BJ01',['SIM_BJ01_U01','SIM_BJ01_U01']),/INVALID_UNIT_SELECTION/);
 assert.throws(()=>C.unitIds(fixture,'SIM_BJ01',['MK_BJ_2CDB7BEE__4.72']),/UNIT_STORE_MISMATCH/);
});
check('central approved route names are safe; legacy/direct order entry is blocked',()=>{
 assert.equal(C.route(fixture,{page:'H01'}),'home.html');
 assert.equal(C.route(fixture,{page:'S02',store:'SIM_BJ01'}),'index.html?page=S02&store=SIM_BJ01');
 assert.throws(()=>C.route(fixture,{page:'S02',store:'MK_BJ_2CDB7BEE'}),/LEGACY_STORE_ID_UNMAPPED/);
 assert.throws(()=>C.route(fixture,{page:'O01'}),/DIRECT_ORDER_NOT_ALLOWED/);
 assert.throws(()=>C.route(fixture,{page:'S02',store:'SIM_BJ01',unit:'SIM_BJ01_U03'}),/DIRECT_UNIT_ROUTE_NOT_SUPPORTED/);
});
function setup(){
 const core=create();
 core.setRequirement(3.5,6,true);
 core.setStore('SIM_BJ01');
 core.select(['SIM_BJ01_U03']);
 core.setDate('2026-11-01');
 core.requestPhone();
 core.resolvePhone('success',{method:'wechat',phone:'13800000000'});
 return core;
}
check('one canonical quote and one order share identical store/unit/term and 5 price components',()=>{
 const core=setup();
 const pre=C.selection(core);
 assert.equal(pre.store_id,'SIM_BJ01');assert.deepEqual(pre.unit_ids,['SIM_BJ01_U03']);
 const q=core.quote(),s=C.quote(core,q);
 assert.equal(s.store_id,q.store_id);assert.equal(s.quote_id,q.id);
 assert.equal(s.amounts.payable,s.amounts.rent_after_coupon+s.amounts.deposit+s.amounts.management_fee);
 const o=core.submit();
 const certified=C.order(core,o,s);
 assert.equal(o.quote_id,q.id);assert.equal(certified.order_id,o.id);
 assert.equal(certified.amounts.payable,o.payable);
 assert.equal(o.management_fee,50);
});
check('identity or amount tampering cannot be certified even with a quoted total',()=>{
 const core=setup();const q=core.quote();
 assert.throws(()=>C.quote(core,{...q,store_id:'SIM_BJ02'}),/QUOTE_IDENTITY_MISMATCH/);
 assert.throws(()=>C.quote(core,{...q,payable:q.payable+10}),/QUOTE_AMOUNT_MISMATCH_payable/);
 const certified=C.quote(core,q),o=core.submit();
 assert.throws(()=>C.order(core,{...o,unit_ids:['SIM_BJ02_U03']},certified),/ORDER_SNAPSHOT_MISMATCH/);
 assert.throws(()=>C.order(core,{...o,payable:o.payable+1},certified),/ORDER_AMOUNT_MISMATCH_payable/);
});
check('cannot issue formal quote without verified phone or confirmed term',()=>{
 const core=create();core.setRequirement(3.5,6,true);core.setStore('SIM_BJ01');core.select(['SIM_BJ01_U03']);core.setDate('2026-11-01');
 assert.throws(()=>C.selection(core),/PHONE_UNVERIFIED/);
 core.requestPhone();core.resolvePhone('success',{method:'wechat',phone:'13800000000'});
 core.setTerm(12);assert.throws(()=>C.selection(core),/INVALID_UNIT_SELECTION/);
});
console.log('CONTRACT_SUMMARY',JSON.stringify({checks:n,source:C.VERSION,status:'PASS'}));
