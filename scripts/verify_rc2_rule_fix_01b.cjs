#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const contract=require(path.join(root,'lifecycle-contract.js'));
const route=require(path.join(root,'central-contract.js'));
const core=read('app.js'),loader=read('index.html'),legacy=fs.readFileSync(path.resolve(__dirname,'../app/central-review-02g.html'),'utf8');
const sample={orders:[
 {id:'SIM_ORDER_1',status:'paid_simulated',store_id:'SIM_STORE_1',unit_ids:['SIM_UNIT_1'],term_months:6,start_date:'2026-11-02',payable:4857,deposit:687},
 {id:'SIM_ORDER_2',status:'payment_failed',store_id:'SIM_STORE_1',unit_ids:['SIM_UNIT_2'],term_months:3,start_date:'2026-11-02',payable:800,deposit:300},
 {id:'SIM_ORDER_3',status:'pending',store_id:'SIM_STORE_1',unit_ids:['SIM_UNIT_3'],term_months:1,start_date:'2026-11-02',payable:400,deposit:100}
],services:{SIM_ORDER_1:{identity:'pending',deposit:'held'}}};
const all=contract.history(sample);
assert.equal(all.length,3);assert.equal(all[0].id,'SIM_ORDER_3');
assert.equal(contract.orderById(sample,'SIM_ORDER_1').payment_records.length,1);
assert.equal(contract.orderById(sample,'SIM_ORDER_2').payment_records.length,0);
assert.equal(contract.orderById(sample,'SIM_ORDER_3').lease_status,'not_active');
assert.equal(contract.orderById(sample,'SIM_ORDER_1').deposit_status,'held');
assert.equal(contract.orderById(sample,'no-such-order'),null);
assert.deepEqual(contract.history({orders:[]}),[]);
for(const p of ['M01','O03','OH01'])assert.match(read('central-contract.js'),new RegExp(p+":'index.html\\?page="+p+"'"));
for(const p of ['U01','Q01'])assert.doesNotMatch(read('central-contract.js'),new RegExp(p+":"));
assert.match(loader,/src="lifecycle-contract\.js"/);
assert.match(core,/function renderM01/);assert.match(core,/function renderO03/);assert.match(core,/function renderOH01/);
assert.match(core,/selectedOrderId=sessionStorage\.getItem/);
assert.match(core,/sessionStorage\.setItem\('mk_lifecycle_selected_order_v1',id\)/);
assert.match(core,/button\('orderDetail','查看订单详情',o\.id/);
assert.doesNotMatch(core,/location\.href='account\.html'/);
assert.doesNotMatch(core,/page=U01|page=Q01/);
assert.match(legacy,/SIM_CENTRAL_CONTRACT_V1/);
console.log('RC2_RULE_FIX_01B_STATIC_CONTRACT_PASS',JSON.stringify({cases:19,coverage:'static+node-contract; NOT real-browser QA'}));
