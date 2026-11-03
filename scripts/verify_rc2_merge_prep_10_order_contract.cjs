#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const d=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const read=f=>fs.readFileSync(path.join(d,f),'utf8');
const app=read('app.js'),css=read('orders-ux.css'),index=read('index.html'),life=read('lifecycle-ui.js');
assert.match(index,/href="orders-ux\.css"/,'scoped orders style loaded');
for(const cls of ['mk-orders','mk-order-summary','mk-order-list-row','mk-order-badge','mk-order-action-grid','mk-order-primary']){
 assert.match(css,new RegExp('\\.'+cls),'style missing '+cls);
 assert.match(app,new RegExp(cls),'template missing '+cls);
}
assert.match(app,/function renderM01\(\)/);
assert.match(app,/function renderO03\(\)/);
assert.match(app,/function renderOH01\(\)/);
assert.match(app,/button\('resumeOrder','继续支付'/);
for(const x of ['RN01','EX01','DP01','IV01'])assert.match(app,new RegExp("button\\('go','[^']+','"+x+"'"),'action missing '+x);
assert.match(app,/money\(o\.payable\)/,'amount from original central order');
assert.match(app,/store\(o\.store_id\)\?\.name/,'store still from fixture entity');
assert.match(app,/unit\(id\)\?\.name/,'unit still from fixture entity');
assert.match(app,/MK_LIFECYCLE_CONTRACT_V1\.history\(state\(\)\)/);
for(const x of ['paid_simulated','payment_failed','pending'])assert.match(app,new RegExp(x+":'"),'status mapping missing '+x);
assert.doesNotMatch(css,/\.store-card|\.s01-r2-|\.br04-frame/,'must not modify frozen visual page styling');
assert.match(life,/const stateLabel=s=>/,'aftercare status mapper missing');
assert.doesNotMatch(life,/esc\(v\.lease_status\)|esc\(v\.deposit_status\)|esc\(r\.status\)/,'raw English aftercare status visible');
assert(!index.includes('HIFI_06'));
const gate=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/RC2_MERGE_PREP_02_SOURCE_GATE.json'),'utf8'));
assert.equal(gate.h01.status,'HIFI06_ABANDONED');
assert.equal(gate.release.allow_merge_main,false);
assert.equal(gate.release.allow_deploy,false);
console.log('RC2_MERGE_PREP_10_ORDER_VISUAL_CONTRACT_PASS',JSON.stringify({orderScreens:['M01','O03','OH01'],actions:['RN01','EX01','DP01','IV01','resumeOrder'],newCss:true,mainUnchanged:true,hifi06Retired:true}));
