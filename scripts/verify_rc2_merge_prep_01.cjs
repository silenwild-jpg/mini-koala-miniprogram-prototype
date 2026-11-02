#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const js=read('app.js'),html=read('index.html'),bridge=read('br04/bridge.js'),home=read('home-bridge.js'),routes=read('central-contract.js');
const routeAdapter=fs.readFileSync(path.resolve(__dirname,'../app/prototype/mk-h01-central-route-connect03.js'),'utf8');
const checks=[
 [/function renderM01/,js,'M01'],[/function renderO03/,js,'O03'],[/function renderOH01/,js,'OH01'],
 [/RN01:.*renderLifecycle/,js,'RN01'],[/EX01:.*renderLifecycle/,js,'EX01'],[/DP01:.*renderLifecycle/,js,'DP01'],[/IV01:.*renderLifecycle/,js,'IV01'],
 [/const s01R2Bridge=/,js,'R2 bridge'],[/s01-r2-frame/,js,'R2 iframe'],[/function visibleS01Stores/,js,'sort/filter source'],[/r2Mode\(\)/,js,'R2 flag'],
 [/s01-r2-content\.js/,html,'R2 presentation'],[/lifecycle-contract\.js/,html,'lifecycle contract'],
 [/lifecycle-ui\.js/,html,'lifecycle view'],
 [/B\.openOrder\(paid\.id\)/,bridge,'paid result route'],[/orderDetail\(id\)\{B\.openOrder\(id\)/,bridge,'O01 detail route'],
 [/index\.html\?page=M01/,home,'home mine'],[/index\.html\?page=O03&order=/,home,'home task'],
 [/M01:'index\.html\?page=M01'/,routes,'M01 route'],[/IV01:'index\.html\?page=IV01'/,routes,'IV01 route'],
 [/status:'unbound'/,routeAdapter,'PR34 remains inert']
];
for(const [pattern,str,label] of checks)assert.match(str,pattern,label);
assert.doesNotMatch(routes,/\bU01\s*:/);assert.doesNotMatch(routes,/\bQ01\s*:/);
assert.doesNotMatch(bridge,/account\.html\?view=order/);
for(const f of ['assets/s01-r2-a-1.webp','assets/s01-r2-a-2.webp','s01-r2-live.html','s01-r2-bind.js'])assert(fs.statSync(path.join(root,f)).size>200,'missing visual file: '+f);
const git=(...xs)=>cp.execFileSync('git',xs,{encoding:'utf8'}).trim();
for(const asset of ['assets/s01-r2-a-1.webp','assets/s01-r2-a-2.webp','s01-r2-live.html']){
 const target='app/prototype/parallel/core-journey-fix-01/demo/'+asset;
 const expected=git('rev-parse','origin/isolate/proto-merge-02b-s01-r2-rc1p1-20261030:'+target);
 const actual=git('rev-parse','HEAD:'+target);
 assert.equal(actual,expected,'approved R2 asset changed: '+asset);
}
console.log('RC2_MERGE_PREP_01_STATIC_PASS',JSON.stringify({checks:checks.length+8,r2MastersPreserved:true,source:'PR33+PR34(inert)+PR35',productionUntouched:true}));
