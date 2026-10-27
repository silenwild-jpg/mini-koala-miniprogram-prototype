'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../evidence/merge02j');
fs.mkdirSync(out,{recursive:true});
const root='http://127.0.0.1:4270/';
const cases=[];
const test=async(name,width,fn)=>{
 try{const meta=await fn();const record={name,width,status:'PASS',...meta};cases.push(record);console.log('MK_BROWSER_CASE',JSON.stringify(record));}
 catch(e){const record={name,width,status:'FAIL',error:String(e)};cases.push(record);console.log('MK_BROWSER_CASE',JSON.stringify(record));}
};
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const [width,height] of [[375,812],[390,844]]){
 const ctx=await browser.newContext({viewport:{width,height},locale:'zh-CN'});
 const p=await ctx.newPage(),errors=[];p.on('pageerror',x=>errors.push(String(x)));
 const outer=p.frameLocator('#central-host');
 await test('legacy-central-5city-store-option-catalog',width,async()=>{
   await p.goto(root+'index.html',{waitUntil:'domcontentloaded'});
   await p.locator('[data-integration="CENTRAL_DEMO_02J"]').click();
   await p.waitForURL(/catalog=mk/);
   await outer.locator('.task-hotspots [data-action*="估大小"]').first().waitFor({state:'visible'});
   assert.equal(await p.locator('body').getAttribute('data-catalog'),'MK');
   const cards=await outer.locator('#storeRail [data-sim-store]').evaluateAll(ns=>ns.map(x=>x.dataset.simStore));
   assert(cards.length>=2);assert(cards.every(x=>x.startsWith('MK_')));
   const all=await outer.locator('body').evaluate(()=>({
      source:window.SIM_FIXTURES.sourceNamespace,stores:window.SIM_FIXTURES.stores.length,options:window.SIM_FIXTURES.units.length,
      cities:[...new Set(window.SIM_FIXTURES.stores.map(s=>s.city))].sort(),
      sample:window.SIM_FIXTURES.stores.find(s=>s.city==='北京').id
   }));
   assert.equal(all.stores,126);assert.equal(all.options,766);
   assert(all.cities.includes('杭州'),'Hangzhou missing');
   assert.equal(all.source,'MK');
   await p.screenshot({path:path.join(out,'MK-H01-'+width+'.png')});
   return {...all,homeCards:cards};
 });
 await test('legacy-store-S01-S02-original-size-option-identity',width,async()=>{
   await p.goto(root+'central-review-02g.html?catalog=mk&page=S01',{waitUntil:'domcontentloaded'});
   const rows=outer.locator('.store-row');await rows.first().waitFor({timeout:9000});
   const list=await outer.locator('body').evaluate(()=>({city:window.SIM_DEMO.core.state().city,
      count:document.querySelectorAll('.store-row').length,
      first:document.querySelector('.store-row')?.dataset.storeId}));
   assert(list.count>0);assert(list.first.startsWith('MK_'));
   await p.screenshot({path:path.join(out,'MK-S01-'+width+'.png')});
   await rows.first().locator('[data-store]').first().click();
   await outer.locator('.unit-row[data-unit]').first().waitFor({timeout:9000});
   const detail=await outer.locator('body').evaluate(()=>{
     const core=window.SIM_DEMO.core,s=core.state();
     return {store:s.storeId,units:[...document.querySelectorAll('.unit-row[data-unit]')].map(x=>x.dataset.unit)};
   });
   assert(detail.store===list.first);
   assert(detail.units.length>0);
   assert(detail.units.every(x=>x.startsWith(detail.store+'__')));
   await p.screenshot({path:path.join(out,'MK-S02-'+width+'.png')});
   return {city:list.city,store:detail.store,optionCount:detail.units.length};
 });
 await test('legacy-CAP-S5-O01-snapshot-verified-payment',width,async()=>{
   await p.goto(root+'central-review-02g.html?catalog=mk',{waitUntil:'domcontentloaded'});
   await outer.locator('.task-hotspots [data-action*="估大小"]').first().click();
   await outer.locator('#capacity').fill('3.5');
   await outer.locator('#capacity').dispatchEvent('input');
   await outer.getByRole('button',{name:/^6/}).first().click();
   await outer.locator('#cta').click();
   const child=outer.frameLocator('iframe');
   await child.locator('#main-buy').waitFor({state:'visible',timeout:11000});
   const rec=await outer.locator('body').evaluate(()=>{
      const r=window.SIM_DEMO.offers();
      return {store:r[0]?.store.id,unit_ids:r[0]?.ids,origin:window.SIM_DEMO.core.fixture.sourceNamespace};
   });
   assert.equal(rec.origin,'MK');assert(rec.store?.startsWith('MK_'));assert(rec.unit_ids?.[0]?.startsWith(rec.store+'__'));
   await p.screenshot({path:path.join(out,'MK-S5-'+width+'.png')});
   await child.locator('#main-buy').click();
   await outer.locator('.mk-auth-overlay').waitFor({timeout:8500});
   await outer.locator('#mk-auth-agree').check();
   await outer.locator('[data-auth="wechat"]').click();
   await child.locator('#agreed').waitFor({state:'visible',timeout:8500});
   await child.locator('#start-date').fill('2026-11-01');
   await child.locator('#start-date').dispatchEvent('change');
   await child.locator('#agreed').check();
   await child.locator('#pay').click();
   await child.locator('[data-bridge="payResult"][data-value="success"]').waitFor({timeout:8500});
   // A pending order reserves stock; do not re-run C.quote() after submit().
   // C.quote() and C.order() were called by the actual O01 click before reservation.
   const pending=await outer.locator('body').evaluate(()=>{
     const B=window.SIM_DEMO,s=B.core.state(),q=s.quote,o=s.orders[0],F=B.core.fixture;
     const records=o.unit_ids.map(id=>F.units.find(u=>u.id===id));
     if(!q||!o||!records.every(Boolean)||q.id!==o.quote_id||
       q.store_id!==o.store_id||JSON.stringify(q.unit_ids)!==JSON.stringify(o.unit_ids)||
       q.payable!==o.payable||q.deposit!==o.deposit||q.management_fee!==o.management_fee)
       throw Error('O01 pending snapshot mismatch');
     return {source:F.sourceNamespace,type:records[0].unit_identity_type,ids:o.unit_ids,
       representatives:records.map(u=>u.representative_unit_no),quote:q.id,order:o.id,
       payable:o.payable,management:o.management_fee};
   });
   assert.equal(pending.type,'SIZE_OPTION');assert.equal(pending.source,'MK');
   assert(pending.ids.every(x=>x.startsWith('MK_')));assert.equal(pending.management,50);
   await p.screenshot({path:path.join(out,'MK-O01-'+width+'.png')});
   await child.locator('[data-bridge="payResult"][data-value="success"]').click();
   const paid=await outer.locator('body').evaluate(()=>window.SIM_DEMO.core.state().orders[0].status);
   assert.equal(paid,'paid_simulated');
   return {...pending,paymentState:paid};
 });
 await test('legacy-five-city-navigation-and-SIM-sandbox-separation',width,async()=>{
   await p.goto(root+'central-review-02g.html?catalog=mk&page=S01',{waitUntil:'domcontentloaded'});
   await outer.locator('.store-row').first().waitFor();
   const ctxState=await outer.locator('body').evaluate(()=>{
     const c=window.SIM_DEMO.core;c.setCity('杭州');window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S01');
     return {city:c.state().city,source:c.fixture.sourceNamespace};
   });
   await outer.locator('.store-row').first().waitFor();
   const hz=await outer.locator('body').evaluate(()=>({city:window.SIM_DEMO.core.state().city,
     ids:[...document.querySelectorAll('.store-row')].map(x=>x.dataset.storeId)}));
   assert.equal(hz.city,'杭州');assert(hz.ids.length>0);assert(hz.ids.every(x=>x.startsWith('MK_HZ_')));
   await p.goto(root+'central-review-02g.html?catalog=sim&page=S01',{waitUntil:'domcontentloaded'});
   await outer.locator('.store-row').first().waitFor();
   const back=await outer.locator('body').evaluate(()=>({source:window.SIM_DEMO.core.fixture.sourceNamespace||'SIM',
     ids:[...document.querySelectorAll('.store-row')].map(x=>x.dataset.storeId)}));
   assert.equal(back.source,'SIM');assert(back.ids.every(x=>x.startsWith('SIM_')));
   assert.equal(errors.length,0,'pageerrors '+errors.join('|'));
   return {hangzhouStores:hz.ids.length,simRecovered:true};
 });
 await ctx.close();
}}finally{await browser.close();}
fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({cases,counts:cases.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})},null,2));
console.log('MK_BROWSER_SUMMARY',JSON.stringify(cases.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})));
if(cases.some(x=>x.status==='FAIL'))process.exitCode=1;
})().catch(e=>{console.log('MK_BROWSER_FATAL',e);process.exitCode=1;});
