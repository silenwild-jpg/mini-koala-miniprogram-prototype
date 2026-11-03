'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const evidence=path.resolve(__dirname,'../evidence/vis-rebuild-03b');
fs.mkdirSync(evidence,{recursive:true});
const records=[];
async function run(width,height,source='mk'){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width,height},locale:'zh-CN',deviceScaleFactor:1});
 const page=await ctx.newPage(),outer=page.frameLocator('#central-host'),s01=outer.frameLocator('#s01-r2-frame');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
   await page.goto('http://127.0.0.1:4270/central-review-02g.html?catalog='+source+'&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   await s01.locator('html[data-binding="CENTRAL_RC1"]').waitFor({timeout:10000});
   await s01.locator('.store-card[data-store-id]').first().waitFor({timeout:10000});
   const data=await outer.locator('body').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
   assert.equal(data.sourceNamespace,source.toUpperCase());
   assert.equal(data.city,'北京');
   assert.equal(data.stores.length,source==='mk'?41:30);
   const info=await s01.locator('body').evaluate(()=>{
     const d=document;return {storeIDs:[...d.querySelectorAll('.store-card[data-store-id]')].map(x=>x.dataset.storeId),
       units:[...d.querySelectorAll('.store-card')].slice(0,2).map(x=>[...x.querySelectorAll('.unit:not([hidden])')].map(z=>z.dataset.unitId)),
       filters:[...d.querySelectorAll('.filter')].map(x=>x.textContent.trim()),photos:[...d.querySelectorAll('.store-photo')].slice(0,2).map(x=>({loaded:x.complete&&x.naturalWidth>0,origin:x.dataset.assetOrigin,alt:x.alt})),
       firstName:d.querySelector('.store-card h2')?.textContent,cssBackground:getComputedStyle(d.body).backgroundColor,
       viewport:innerWidth,root:d.documentElement.scrollWidth,notes:[...d.querySelectorAll('.store-preview-toggle,.store-more,.demand,.store-preview-bar')].length,
       formalExtra:/参考价说明|仓型预览|收起仓位/.test(d.body.textContent),
       km:[...d.querySelectorAll('.km')].slice(0,2).map(x=>x.textContent)};
   });
   assert.equal(info.cssBackground,'rgb(255, 255, 255)');
   assert.equal(info.filters.length,3);assert.equal(info.notes,0);
   assert.equal(info.formalExtra,false);
   assert.equal(info.firstName,data.stores[0].name);
   assert.equal(info.root<=width+2,true,'horizontal overflow');
   assert(info.photos.every(p=>p.loaded&&p.origin==='A_APPROVED_CONCEPT_ONLY'&&p.alt.includes('不代表')));
   assert.deepEqual(info.units[0],data.stores[0].units.map(u=>u.id));
   assert.deepEqual(info.units[1],data.stores[1].units.map(u=>u.id));
   assert(info.storeIDs.every(s=>s.startsWith(source==='mk'?'MK_':'SIM_')));
   assert(info.km.every(x=>x.includes('演示')||x.includes('待定位')));
   await page.screenshot({path:path.join(evidence,'R2-live-'+source+'-'+width+'-viewport.png')});
   // Search uses the original A search slot and updates the central store selector.
   const target=data.stores[0].name;
   const search=s01.locator('#r2-search');
   await search.fill(target);
   await s01.locator('.store-card[data-store-id]').first().waitFor();
   const count=await s01.locator('.store-card[data-store-id]').count();
   assert(count>0&&count<data.stores.length,'search must filter actual stores');
   await search.fill('');
   await s01.locator('.store-card[data-store-id]').first().waitFor();
   // Opening the store uses the original RC1 navigation and preserves MK/SIM store IDs.
   await s01.locator('.store-card').first().locator('h2').click();
   await outer.locator('.detail-name').waitFor({timeout:9000});
   const afterStore=await outer.locator('body').evaluate(()=>({store:window.SIM_DEMO.core.state().storeId,city:window.SIM_DEMO.core.state().city}));
   assert.equal(afterStore.store,data.stores[0].id);
   await outer.locator('body').evaluate(()=>window.SIM_DEMO.navigate('S01'));
   await s01.locator('.store-card[data-store-id]').first().waitFor({timeout:9000});
   // Ordering cannot bypass the original term and phone gates.
   const firstUnit=data.stores[0].units.find(x=>x.available);
   assert(firstUnit,'sample must have an available size option');
   await s01.locator('.store-card').first().locator('.order[aria-disabled="false"]').first().click();
   await outer.locator('button[data-action="setTerm"][data-value="6"]').waitFor({timeout:9000});
   const preAuth=await outer.locator('body').evaluate(()=>({selected:window.SIM_DEMO.core.state().selected,authorized:window.SIM_DEMO.core.authorized()}));
   assert.equal(preAuth.authorized,false);
   await outer.locator('button[data-action="setTerm"][data-value="6"]').click();
   await outer.locator('.mk-auth-overlay').waitFor({timeout:9000});
   await outer.locator('#mk-auth-agree').check();
   await outer.locator('[data-auth="wechat"]').click();
   await outer.frameLocator('#br04-frame').locator('#store-name').waitFor({timeout:10000});
   const checkout=await outer.locator('body').evaluate(()=>({selected:window.SIM_DEMO.core.state().selected,authorized:window.SIM_DEMO.core.authorized(),term:window.SIM_DEMO.core.state().requirement.term_months}));
   assert(checkout.authorized);assert.equal(checkout.term,6);assert.deepEqual(checkout.selected,[firstUnit.id]);
   assert(!errors.length,'JS errors: '+errors.join('|'));
   const result={source,width,status:'PASS',stores:data.stores.length,firstStore:afterStore.store,firstUnit:firstUnit.id,searchCount:count,phoneGate:true,orderLinked:true,structureUnchanged:true};
   records.push(result);console.log('VIS03B_CASE',JSON.stringify(result));
 }finally{await ctx.close();await browser.close();}
}
(async()=>{
 try{
  await run(375,812,'mk');await run(390,844,'mk');await run(375,812,'sim');await run(390,844,'sim');
  fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({status:'PASS',records,visualFinalSignOff:false},null,2));
  console.log('VIS03B_SUMMARY',JSON.stringify({PASS:records.length,FAIL:0}));
 }catch(err){console.error('VIS03B_FAIL',err.stack);fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({status:'FAIL',records,error:String(err)},null,2));process.exitCode=1;}
})();
