#!/usr/bin/env node
'use strict';
// PR118: one source_sha, actual Chromium page/navigation, mock phone auth only.
// All business data in this test is synthetic; no provider or WeChat calls.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site'),out=path.resolve(__dirname,'../release-evidence/price-integer-integration-02');
const host='http://127.0.0.1:4702',port=4702,mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}catch{res.writeHead(400).end();return}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,v)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(v));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 assert.equal(manifest.source_pr,119);
 assert.equal(manifest.source_branch,'isolate/vis-system-04b-20261111');
 assert.equal(manifest.source_sha,process.env.GITHUB_SHA);
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),results=[];
 try{for(const [w,h] of [[375,812],[390,844]]){
  const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
  const page=await ctx.newPage(),errors=[],row={width:w,height:h,status:'FAIL'};
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
   await app.locator('#screen').evaluate(()=>{
    const b=window.SIM_DEMO;
    b.core.setCity('北京');b.core.setRequirement(3,12,true);b.core.setDate(b.core.today());
    b.core.requestPhone();b.core.resolvePhone('success',{phone:'13800138000'});
    b.persist();b.navigate('S01');
   });
   await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
   const first=await app.locator('#screen').evaluate(()=>{
    const b=window.SIM_DEMO,s=b.s01R2Bridge.snapshot().stores[0],u=s.units[0];
    return {store:s.id,unit:u.id,cabin:u.cabinNo,volume:u.volume,term:b.core.state().requirement.term_months,total:b.core.amounts([u.id],12).rent_total};
   });
   assert(first.cabin&&first.unit&&first.store,'S01 matched identity missing');
   assert.equal(first.term,12);
   assert(Number.isInteger(first.total));
   await page.screenshot({path:path.join(out,'S01-'+w+'.png')});
   // Invoke the same public route as S01's detail chevron, preserving demand.
   await app.locator('#screen').evaluate((_,id)=>window.SIM_DEMO.openStore(id,'S01'),first.store);
   await app.locator('#screen.page-S02').waitFor();
   const rowText=await app.locator('.unit-row[data-unit="'+first.unit+'"]').first().innerText();
   assert(rowText.includes(first.cabin),'S02 must show same cabin');
   assert(rowText.includes(String(first.volume)),'S02 capacity identity changed');
   const s02Tags=await app.locator('.s02-service-summary .s02-tag').allTextContents();
   assert.equal(s02Tags.length,new Set(s02Tags).size,'S02 service label duplication');
   assert.equal(await app.locator('.s02-call-400').count(),1);
   await page.screenshot({path:path.join(out,'S02-'+w+'.png')});
   // S02 and S5 use the shared central requirement; traverse the public S5 route.
   await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('S5'));
   const s5=app.frameLocator('#br04-frame');
   await s5.locator('body[data-page=s5].bridge-ready').waitFor();
   const s5Row=await s5.locator('.s5-store-card[data-rank="0"] .s5-unit-row').first().evaluate(el=>{
    const c=window.parent.SIM_DEMO.core,s=c.state(),id=el.dataset.unitIds.split(',')[0];
    return {ids:el.dataset.unitIds.split(','),caption:el.querySelector('.s5-unit-info>strong').textContent,
      term:s.requirement.term_months,capacity:s.requirement.capacity_m3,
      total:c.amounts([id],s.requirement.term_months).rent_total};
   });
   assert.deepEqual(s5Row.ids,[first.unit],'S01 and S5 first recommended unit differs');
   assert(s5Row.caption.includes(first.cabin),'S5 same cabin number missing');
   assert.equal(s5Row.total,first.total);
   assert.equal(s5Row.term,12);assert.equal(s5Row.capacity,3);
   await page.screenshot({path:path.join(out,'S5-'+w+'.png')});
   await s5.locator('.s5-store-card[data-rank="0"] .s5-unit-buy').first().click();
   const o01=app.frameLocator('#br04-frame');
   await o01.locator('body[data-page=o01].bridge-ready').waitFor({timeout:15000});
   const orderState=await app.locator('#screen').evaluate(()=>{
    const c=window.SIM_DEMO.core,s=c.state(),a=c.amounts(s.selected,s.requirement.term_months);
    return {selected:s.selected,months:s.requirement.term_months,capacity:s.requirement.capacity_m3,
      total:a.rent_total,monthly:a.monthly_average,deposit:a.deposit,fee:a.management_fee,payable:a.payable};
   });
   assert.deepEqual(orderState.selected,[first.unit],'S5 buy changed selected unit');
   assert.equal(orderState.total,first.total);
   assert.equal(orderState.monthly*12,orderState.total);
   assert.equal(orderState.deposit,orderState.monthly);
   assert.equal(orderState.fee,50);
   assert.equal(orderState.payable,orderState.total+orderState.deposit+50);
   assert.deepEqual(errors,[],'uncaught browser errors');
   await page.screenshot({path:path.join(out,'O01-'+w+'.png')});
   row.status='PASS';row.first=first;row.s5=s5Row;row.order=orderState;
  }catch(e){row.error=String(e.stack||e);await page.screenshot({path:path.join(out,'FAIL-'+w+'.png')}).catch(()=>{});}
  finally{results.push(row);await ctx.close();}
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({source_sha:manifest.source_sha,source_pr:119,results},null,2));
 assert(results.every(x=>x.status==='PASS'),'cross-page S01→S02→S5→O01 FAIL '+results.filter(x=>x.status!=='PASS').map(x=>x.width+': '+x.error).join(' | '));
 console.log('PRICE-INTEGER-INTEGRATION-02 CROSS_PAGE PASS '+JSON.stringify(results.map(x=>({width:x.width,unit:x.first.unit,cabin:x.first.cabin,term:x.order.months,total:x.order.total}))));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
