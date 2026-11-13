#!/usr/bin/env node
'use strict';
// QA-S5-DEEPLINK-01: verify missing capacity/term never opens the S5 recommendation
// UI on direct entry; positive control requires both confirmed values.
// QA-only branch from signed RC2. Does not modify application or approved visual.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/qa-s5-deeplink-01');
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const rows=[],errors=[];
const server=http.createServer((req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);res.end();return;}
 const file=path.resolve(root,'.'+pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(err,data)=>{
   if(err){res.writeHead(404);res.end('not found');return;}
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
   res.end(data);
 });
});
function check(condition,msg){assert(condition,msg);}
async function run(){
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const home='http://127.0.0.1:'+port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN'});
   const page=await ctx.newPage();
   const pageErrors=[];
   page.on('pageerror',e=>pageErrors.push(String(e)));
   const shot=async label=>{
     const filename=width+'-'+label+'.png';
     await page.screenshot({path:path.join(out,filename)});
     return filename;
   };
   // Case 1: a brand-new user opens the URL directly with no capacity or term.
   await page.goto(home+'/index.html?page=S5',{waitUntil:'domcontentloaded'});
   await page.waitForURL(/\/cap\.html(?:\?|$)/,{timeout:12000});
   check(await page.locator('#br04-frame').count()===0,'S5 iframe must not survive empty requirement');
   rows.push({width,case:'cold_no_requirements',status:'PASS',url:page.url(),shot:await shot('cold-to-cap')});

   // Case 2: capacity is known, but term has not been explicitly confirmed.
   await page.goto(home+'/index.html?page=S01',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.SIM_DEMO?.core,{timeout:10000});
   const partial=await page.evaluate(()=>{
     const app=window.SIM_DEMO;
     app.core.setRequirement(3,null,false);
     app.persist();
     const r=app.core.state().requirement;
     return {capacity:r.capacity_m3,termConfirmed:r.term_confirmed,ready:app.core.requirementReady()};
   });
   assert.equal(partial.capacity,3);
   assert.equal(partial.termConfirmed,false);
   assert.equal(partial.ready,false);
   await page.goto(home+'/index.html?page=S5',{waitUntil:'domcontentloaded'});
   await page.waitForURL(/\/cap\.html(?:\?|$)/,{timeout:12000});
   rows.push({width,case:'capacity_without_term',status:'PASS',url:page.url(),shot:await shot('partial-to-cap')});

   // Case 3: both upstream inputs are confirmed. S5 must open, not redirect.
   await page.goto(home+'/index.html?page=S01',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.SIM_DEMO?.core,{timeout:10000});
   const ready=await page.evaluate(()=>{
     const app=window.SIM_DEMO;
     app.core.setRequirement(3,12,true);
     app.persist();
     return {requirement:app.core.state().requirement,ready:app.core.requirementReady()};
   });
   assert.equal(ready.ready,true);
   assert.equal(ready.requirement.capacity_m3,3);
   assert.equal(ready.requirement.term_months,12);
   assert.equal(ready.requirement.term_confirmed,true);
   await page.goto(home+'/index.html?page=S5',{waitUntil:'domcontentloaded'});
   await page.locator('#br04-frame').waitFor({state:'visible',timeout:12000});
   await page.waitForFunction(()=>{
     const d=document.querySelector('#br04-frame')?.contentDocument;
     const text=d?.body?.innerText||'';
     return text.length>80 && /仓位|推荐|考拉E存|用仓/.test(text);
   },{timeout:12000});
   const status=await page.evaluate(()=>{
     const f=document.querySelector('#br04-frame');
     const app=window.SIM_DEMO;
     return{page:new URL(location.href).searchParams.get('page'),
       iframeLoaded:!!f?.contentDocument?.body?.innerText,
       ready:app?.core?.requirementReady(),
       capacity:app?.core?.state()?.requirement?.capacity_m3,
       term:app?.core?.state()?.requirement?.term_months,
       termConfirmed:app?.core?.state()?.requirement?.term_confirmed};
   });
   assert.deepEqual(status,{page:'S5',iframeLoaded:true,ready:true,capacity:3,term:12,termConfirmed:true});
   rows.push({width,case:'confirmed_capacity_and_term',status:'PASS',url:page.url(),shot:await shot('confirmed-S5'),status});
   assert.deepEqual(pageErrors,[],'browser script errors '+width);
   await ctx.close();
  }
 }finally{await browser.close();}
}
(async()=>{
 let status='PASS';
 try{await run()}catch(e){status='FAIL';errors.push(String(e.stack||e));console.error('QA_S5_DEEPLINK_01_FAIL',String(e.stack||e));}
 finally{await new Promise(resolve=>server.close(resolve));}
 const report={task:'QA-S5-DEEPLINK-01',status,
  signed_runtime_sha:'41a8a079eb48049e1060512bddf71c226bfd3738',
  qa_head_sha:process.env.GITHUB_SHA||null,
  site_runtime_modified:false,rows,errors,visual_signoff_inherited:false,main_merge_allowed:false,deployment_allowed:false};
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
 if(status!=='PASS'){process.exitCode=1;return;}
 console.log('QA_S5_DEEPLINK_01_PASS',rows.length,'cases across 375/390');
})();
