#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app');
const out=path.resolve(__dirname,'../release-evidence/h01-ux-review-02');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1'),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,b)=>e?res.writeHead(404).end('NOT_FOUND'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b));
});
const route='http://127.0.0.1:4968/prototype/parallel/core-journey-fix-01/demo/';
(async()=>{
 await new Promise(ok=>server.listen(4968,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(route+'home.html',{waitUntil:'load'});
   for(const city of ['北京','上海','深圳','杭州','广州']){
    if(city!=='北京'){
     await page.locator('.hero-hotspots .hot-search').click();
     await page.locator('#home-city').selectOption({label:city});
     await page.locator('[data-h="search"]').click();
     await page.waitForURL(/page=S01/);
     assert.equal(await page.evaluate(()=>window.SIM_DEMO?.state()?.city),city,'S01 should retain city');
     await page.goto(route+'home.html',{waitUntil:'load'});
    }
    await page.locator('#storeRail .store-card').first().waitFor();
    const cards=await page.locator('#storeRail .store-card').count();assert.equal(cards,3,city+' missing cards');
    const data=await page.locator('#storeRail .store-card').evaluateAll(xs=>xs.map(x=>({
      id:x.dataset.simStore,km:x.querySelector('.dist')?.textContent,price:x.querySelector('.store-price b')?.textContent,
      photo:x.querySelector('img')?.getAttribute('src'),loaded:x.querySelector('img')?.naturalWidth>0
    })));
    assert(data.every(x=>/^\d+\.\d+km$/.test(x.km||'')&&/^¥/.test(x.price||'')&&x.loaded),city+': invalid card');
    assert(data.every(x=>x.photo.includes('store-curated/')),city+': not curated');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'H01 overflow');
    await page.screenshot({path:path.join(out,city+'-'+width+'-top.png')});
    await page.locator('#scroller').evaluate(el=>{el.scrollTop=el.scrollHeight-el.clientHeight});
    await page.screenshot({path:path.join(out,city+'-'+width+'-bottom.png')});
    await page.locator('#storeRail .store-card').first().click({force:true});
    await page.waitForURL(/page=S02/);
    const selected=await page.evaluate(()=>window.SIM_DEMO?.state()?.storeId);
    assert.equal(selected,data[0].id,'H01 card ID mismatch with S02');
    results.push({width,height,city,cards,photoLoaded:true,routeStore:selected,ids:data.map(x=>x.id)});
    await page.goto(route+'home.html',{waitUntil:'load'});
   }
   // Injection occurs before page JS: pagehide otherwise overwrites ad-hoc storage changes.
   await page.addInitScript(()=>{
    const stage=sessionStorage.getItem('mk_h01_test_stage');if(!['demand','pending','rented'].includes(stage))return;
    const key='mk_independent_sim_v1',s=JSON.parse(sessionStorage.getItem(key)||'null');if(!s)return;
    s.orders=[];s.leads=[];s.enterpriseLeads=[];
    s.requirement={capacity_m3:3,term_months:12,term_confirmed:true};
    if(stage==='pending')s.orders=[{id:'SIM_ORDER_TEST',status:'pending',expiresAt:Date.now()+900000}];
    if(stage==='rented'){
      s.orders=[{id:'SIM_ORDER_RENT',status:'paid_simulated',start_date:'2026-11-01',term_months:12}];
      s.services={SIM_ORDER_RENT:{identity:'verified',renewals:[]}};
    }
    sessionStorage.setItem(key,JSON.stringify(s));sessionStorage.setItem('mk_h01_test_stage','done');
   });
   await page.evaluate(()=>sessionStorage.setItem('mk_h01_test_stage','demand'));
   await page.reload();await page.locator('.lifecycle-home-task').waitFor();
   assert.match(await page.locator('.lifecycle-home-task').innerText(),/继续查看已估算方案/);
   await page.screenshot({path:path.join(out,'demand-'+width+'.png')});
   await page.evaluate(()=>sessionStorage.setItem('mk_h01_test_stage','pending'));
   await page.reload();await page.locator('.lifecycle-home-task').waitFor();
   assert.match(await page.locator('.lifecycle-home-task').innerText(),/待支付订单/);
   await page.screenshot({path:path.join(out,'pending-'+width+'.png')});
   await page.evaluate(()=>sessionStorage.setItem('mk_h01_test_stage','rented'));
   await page.reload();await page.locator('.lifecycle-home-task').waitFor();
   assert.match(await page.locator('.lifecycle-home-task').innerText(),/我的在租仓位/);
   await page.screenshot({path:path.join(out,'rented-'+width+'.png')});
   assert.equal(errors.length,0,errors.join('\n'));await ctx.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({pass:true,source:'RC2 isolated H01 candidate',rows:results},null,2));
 console.log(JSON.stringify({pass:true,cases:results.length,cities:5,sizes:2,states:['default','saved-demand','pending-order']},null,2));
})().catch(err=>{console.error(err);process.exitCode=1;});
