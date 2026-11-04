#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app'),out=path.resolve(__dirname,'../release-evidence/h01-ux-review-03a');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end('FORBIDDEN');return;}
  fs.readFile(file,(e,b)=>e?res.writeHead(404).end('NOT_FOUND'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b));
});
const origin='http://127.0.0.1:4983/prototype/parallel/core-journey-fix-01/demo/';
async function contract(page){
  assert.equal((await page.locator('.store-section .section-heading h2').innerText()).trim(),'为您推荐');
  assert.equal(await page.locator('.store-section .section-heading p').count(),0);
  assert.equal(await page.locator('.store-section .section-heading button').count(),0);
  assert.equal(await page.locator('.store-section .section-heading [data-action]').count(),0);
  assert.equal(await page.locator('.store-section .store-card').count(),3);
  assert.equal(await page.locator('.store-section .store-card.featured').count(),1);
  const badge=await page.locator('.store-card.featured').evaluate(e=>getComputedStyle(e,'::after').content);
  assert(badge.includes('距离最近')&&!badge.includes('优先推荐'),'wrong badge: '+badge);
  const bounds=await page.locator('.store-section').evaluate(e=>{
    const r=e.querySelector('.section-heading').getBoundingClientRect(),t=e.querySelector('h2').getBoundingClientRect();
    return {height:r.height,left:r.left,titleLeft:t.left,scroll:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  assert(bounds.height>=42&&bounds.height<=46,'heading height drift '+JSON.stringify(bounds));
  assert(bounds.titleLeft>=bounds.left,'heading text out of bounds');
  assert(bounds.scroll<=bounds.viewport+1,'overflow '+JSON.stringify(bounds));
  assert.equal(await page.locator('.footer-nav button').count(),4);
}
(async()=>{
 await new Promise(resolve=>server.listen(4983,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await context.newPage(),errors=[],failed=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1')&&r.status()>=400)failed.push(r.url()+':'+r.status())});
   await page.goto(origin+'home.html',{waitUntil:'load',timeout:25000});
   await page.locator('#storeRail .store-card').first().waitFor();
   await contract(page);
   await page.screenshot({path:path.join(out,'H01-'+width+'-default.png')});
   await page.locator('#scroller').evaluate(e=>{e.scrollTop=170});
   await page.screenshot({path:path.join(out,'H01-'+width+'-recommend-focus.png')});
   const first=await page.locator('.store-card').first().getAttribute('data-sim-store');
   await page.locator('.store-card').first().click();
   await page.waitForURL(/page=S02/);
   assert.equal(await page.evaluate(()=>window.SIM_DEMO?.state()?.storeId),first,'H01>S02 route mismatch');
   await page.goto(origin+'home.html');
   await contract(page);
   await page.addInitScript(()=>{
     const type=sessionStorage.getItem('mk_h01_03a_test_type');
     if(!['saved','pending','rented'].includes(type))return;
     const key='mk_independent_sim_v1',s=JSON.parse(sessionStorage.getItem(key)||'null');if(!s)return;
     s.orders=[];s.leads=[];s.enterpriseLeads=[];
     s.requirement={capacity_m3:3,term_months:12,term_confirmed:true};
     if(type==='pending')s.orders=[{id:'SIM_ORDER_TEST',status:'pending',expiresAt:Date.now()+900000}];
     if(type==='rented'){
       s.orders=[{id:'SIM_ORDER_RENT',status:'paid_simulated',start_date:'2026-11-01',term_months:12}];
       s.services={SIM_ORDER_RENT:{identity:'verified',renewals:[]}};
     }
     sessionStorage.setItem(key,JSON.stringify(s));sessionStorage.setItem('mk_h01_03a_test_type','done');
   });
   for(const [state,label] of [['saved','继续查看已估算方案'],['pending','待支付订单'],['rented','我的在租仓位']]){
     await page.evaluate(s=>sessionStorage.setItem('mk_h01_03a_test_type',s),state);
     await page.reload({waitUntil:'load'});
     await contract(page);
     assert((await page.locator('.lifecycle-home-task').innerText()).includes(label),'state lost: '+state);
     await page.screenshot({path:path.join(out,'H01-'+width+'-'+state+'.png')});
   }
   assert.deepEqual(errors,[]);
   assert.deepEqual(failed,[]);
   results.push({width,height,title:'为您推荐',badge:'距离最近',removed_secondary:true,removed_more:true,states:['default','saved','pending','rented'],firstStore:first,pass:true});
   await context.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 const output={source:'RC2 isolated H01-UX-REVIEW-03A',sourceSha:process.env.GITHUB_SHA||null,pass:true,results};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(output,null,2));
 console.log(JSON.stringify(output,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
