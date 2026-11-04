#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site'),out=path.resolve(__dirname,'../release-evidence/rc2-s5-final-01');
const port=4553,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(fp,(e,b)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(b));});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const records=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=S5&s01_r2=1',{waitUntil:'domcontentloaded',timeout:20000});
   const frame=page.frameLocator('#central-host').frameLocator('#br04-frame');
   await frame.locator('body.bridge-ready').waitFor({timeout:15000});
   // Use existing project state and native click handlers, without mocking offer rows.
   const chooseCity=async city=>{
     await frame.locator('#change-origin').click();
     await frame.locator('[data-bridge="city"][data-value="'+city+'"]').click();
   };
   const chooseArea=async (district)=>{
     await frame.locator('[data-bridge="s5Area"][data-value="'+district+'"]').click();
     assert((await frame.locator('#origin-name').innerText()).includes(district),'manual area label not persisted');
   };
   const initial=await frame.locator('body').evaluate(()=>{const f=parent.SIM_DEMO.core.fixture;return {cities:[...new Set(f.stores.map(s=>s.city))],hz:f.units.filter(u=>u.store_id.startsWith('SIM_HZ')).length,gz:f.units.filter(u=>u.store_id.startsWith('SIM_GZ')).length};});
   assert(initial.cities.includes('杭州')&&initial.cities.includes('广州'),'missing supported demonstration cities');
   assert(initial.hz>0&&initial.gz>0,'missing supplementary warehouse inventory');
   for(const [city,area] of [['杭州','西湖区'],['广州','天河区']]){
     await chooseCity(city);
     await chooseArea(area);
     const state=await frame.locator('body').evaluate(()=>{
       const h=parent.SIM_DEMO,c=h.core;
       c.setRequirement(3,12,true);window.BR04_REFRESH();
       const r=h.s5Offers(document.getElementById('origin-name').textContent.split(' · ')[1]);
       return {city:c.state().city,count:r.length,first:r[0]?.store.district||null,firstId:r[0]?.store.id||null,
         label:document.getElementById('origin-name').textContent,
         width:document.documentElement.scrollWidth,viewport:innerWidth,
         priceGuarded:!c.authorized(),hasFixedBuy:!!document.querySelector('.fixed-buy,.sticky-checkout')};
     });
     assert(state.count>0,city+' should support regular demand in demo');
     const parity=await frame.locator('body').evaluate(()=>{
       const cards=[...document.querySelectorAll('.s5-store-card:not([hidden])')];
       return cards.map(card=>{
         const img=card.querySelector('.s5-store-photo img'),rows=[...card.querySelectorAll('.s5-unit-row')];
         const r=card.getBoundingClientRect();
         return {storeId:card.dataset.storeId,storeName:card.querySelector('.s5-store-title strong')?.textContent,
           address:card.querySelector('.s5-store-address span')?.textContent,
           services:card.querySelectorAll('.s5-store-services span').length,
           image:img?.getAttribute('src'),unitCount:rows.length,rows:rows.map(row=>({
             ids:row.dataset.unitIds,uses:row.querySelector('.s5-unit-info p')?.textContent,
             price:row.querySelector('.s5-unit-price')?.textContent,action:row.querySelector('.s5-unit-buy')?.textContent
           })),top:r.top,bottom:r.bottom};
       });
     });
     assert.equal(parity.length,2,'S5 must render two uniformly structured S01-style store cards');
     for(const card of parity){
       assert(card.storeName&&card.address&&card.image,'store info/photo/address missing');
       assert(card.services>0,'no S01 matching service tags');
       assert(card.unitCount>=1&&card.unitCount<=2,'must show one or two unit previews per store');
       assert(card.rows.every(row=>row.ids&&row.uses&&row.price&&row.action),'unit prices/copy/actions must be complete');
       assert(card.rows.every(row=>row.price==='查看整期价'),'anonymous user must not receive formal full-term quote');
     }
     assert(parity[0].bottom<=parity[1].top+2,'two store cards overlap');
     const sourceParity=await frame.locator('body').evaluate(()=>{
       const h=parent.SIM_DEMO;
       const cards=[...document.querySelectorAll('.s5-store-card:not([hidden])')];
       return cards.map(card=>{
         const id=card.dataset.storeId,s=h.s5SharedStore(id),unitEls=[...card.querySelectorAll('.s5-unit-row')];
         return {id,source:s,unitRows:unitEls.map(el=>{
           const ids=el.dataset.unitIds.split(',');
           const summary=h.s5SharedUnit(ids);
           return {ids,source:summary,shown:el.querySelector('.s5-unit-info p')?.textContent};
         })};
       });
     });
     for(let i=0;i<parity.length;i++){
       const item=sourceParity[i],card=parity[i];
       assert.equal(item.id,card.storeId,'S5 store id must stay identical to S01/S02');
       assert.equal(item.source.name,card.storeName,'store name diverged from S01 source');
       assert.equal(item.source.address,card.address,'store address diverged from S01 source');
       assert(card.image.includes(item.source.photo),'store image not mapped to same S01 id');
       assert(item.unitRows.every(row=>row.source.available),'unavailable S02 warehouse rendered as buyable S5');
       assert(item.unitRows.every(row=>row.shown===row.source.description),'S01/S02 shared unit copy not applied');
       assert(item.unitRows.every(row=>row.source.ids.every(id=>initial.cities.length&&!!id)),'missing canonical warehouse identity');
     }
     assert(await frame.locator('#s5-compare').isVisible(),'two offers must expose lightweight compare entry');
     await frame.locator('#s5-compare').click();
     assert(await frame.locator('#modal').isVisible(),'compare sheet must open');
     assert.match(await frame.locator('#modal-title').innerText(),/对比推荐门店/);
     await frame.locator('#close-modal').click();
     const sync=await frame.locator('body').evaluate(()=>{
       const h=parent.SIM_DEMO,area=h.s5AreaPreference(),snap=h.s01R2Bridge.snapshot();
       return {area,first:snap.stores[0]?.district||'',topFilters:snap.filterLabels,visible:snap.stores.length};
     });
     assert.equal(sync.area,area,'S5 area must be stored for S01');
     assert.equal(sync.first,area,'S01 should rank selected district first without hiding full-city candidates');
     assert.deepEqual(sync.topFilters.length,3,'S01 three filters retained');
     records.push({city,width,height,sync,sourceParity});

     records.push({city,width,height,parity});

     assert.equal(state.first,area,'manual preferred district was not used for first offer');
     assert(state.width<=state.viewport+2,'horizontal overflow');
     assert.equal(state.priceGuarded,true,'phone gate must remain');
     assert(!state.hasFixedBuy,'S5 fixed buy action introduced');
     await frame.locator('#app-viewport').evaluate(e=>e.scrollTop=0);
     await page.screenshot({path:path.join(out,city+'-'+width+'.png'),fullPage:true});
     await frame.locator('#app-viewport').evaluate(e=>e.scrollTop=e.scrollHeight);
     await page.screenshot({path:path.join(out,city+'-'+width+'-scroll-bottom.png'),fullPage:true});
     records.push({...state,width,height});
   }
   // Confirmed term is displayed once and remains editable without losing selected store context.
   await frame.locator('#app-viewport').evaluate(el=>el.scrollTop=0);
   assert(await frame.locator('#term-summary').isVisible(),'confirmed term summary should be visible');
   assert.equal(await frame.locator('#term-options').isVisible(),false,'confirmed term should not duplicate option chips');
   await frame.locator('#term-edit').click();
   assert(await frame.locator('#term-options').isVisible(),'modify term should reveal the choices');
   await frame.locator('[data-term="6"]').click();
   assert(await frame.locator('#term-summary').isVisible(),'term should collapse again after changing');
   assert.match(await frame.locator('#term-current').innerText(),/6 个月/);
   const updated=await frame.locator('body').evaluate(()=>parent.SIM_DEMO.core.state().requirement.term_months);
   assert.equal(updated,6,'term edit must update central state and subsequent formal quote term');
   records.push({width,height,termEdit:updated,summaryCollapsed:true});
   await frame.locator('#term-edit').click();
   await frame.locator('[data-term="12"]').click();
   // Existing empty-city scenario remains available despite supplemental data.
   const scenario=await frame.locator('body').evaluate(()=>{
     const h=parent.SIM_DEMO;h.core.setScenario('emptyCity');window.BR04_REFRESH();
     return {offerCount:h.s5Offers().length,state:document.getElementById('artboard').dataset.match};
   });
   assert.equal(scenario.offerCount,0,'original empty-city scenario must remain valid');
   assert.equal(scenario.state,'none','empty-city state regression');
   assert.equal(errors.length,0,'uncaught JS errors: '+errors.join(';'));
   records.push({width,height,scenario:'emptyCity',...scenario});
   await ctx.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',records},null,2));
  console.log('RC2_S5_FINAL_01_PASS',JSON.stringify({records:records.length,cities:['杭州','广州'],widths:[375,390]}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error('RC2_S5_FINAL_01_FAIL',e);process.exitCode=1;server.close();});
