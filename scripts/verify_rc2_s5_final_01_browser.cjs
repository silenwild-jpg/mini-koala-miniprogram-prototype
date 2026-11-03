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
     assert.equal(state.first,area,'manual preferred district was not used for first offer');
     assert(state.width<=state.viewport+2,'horizontal overflow');
     assert.equal(state.priceGuarded,true,'phone gate must remain');
     assert(!state.hasFixedBuy,'S5 fixed buy action introduced');
     await frame.locator('#app-viewport').evaluate(e=>e.scrollTop=0);
     await page.screenshot({path:path.join(out,city+'-'+width+'.png'),fullPage:true});
     records.push({...state,width,height});
   }
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
