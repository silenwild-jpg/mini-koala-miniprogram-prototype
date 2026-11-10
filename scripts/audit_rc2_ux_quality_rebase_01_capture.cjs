#!/usr/bin/env node
'use strict';
/*
 RC2-UX-QUALITY-REBASE-01 Batch A: FRESH isolated same-app-tree Chromium capture.
 This is evidence gathering, NOT automated visual-signoff or Netlify-authenticated UAT.
 Do not modify any source page, business state machine, UAT branch, or user permissions.
*/
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const output=path.resolve(__dirname,'../release-evidence/rc2-ux-quality-rebase-01');
const host='http://127.0.0.1:4611';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let dest;try{dest=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}catch{res.writeHead(400).end();return}
  if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(dest,(e,v)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(dest)]||'application/octet-stream'}).end(v));
});
const records=[],issues=[],widths=[[375,812],[390,844]];
function auditFrame(){ // evaluated in browser frame, do not close over Node state
  const vw=innerWidth,vh=innerHeight,doc=document.documentElement;
  const isVisible=e=>{
    const s=getComputedStyle(e),r=e.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0&&r.bottom>0&&r.top<vh;
  };
  const texts=[...document.querySelectorAll('h1,h2,h3,p,span,label,button,a,small,strong')].filter(isVisible);
  const nodes=texts.map(e=>({tag:e.tagName.toLowerCase(),t:(e.innerText||e.textContent||'').replace(/\s+/g,' ').trim().slice(0,54),size:parseFloat(getComputedStyle(e).fontSize),weight:getComputedStyle(e).fontWeight})).filter(x=>x.t&&Number.isFinite(x.size));
  const touches=[...document.querySelectorAll('button,[role="button"],a,input,select,[data-action],[data-bridge]')].filter(isVisible).map(e=>{
    const r=e.getBoundingClientRect();return {tag:e.tagName.toLowerCase(),text:(e.innerText||e.getAttribute('aria-label')||e.getAttribute('title')||'').trim().replace(/\s+/g,' ').slice(0,42),w:Math.round(r.width),h:Math.round(r.height)}
  });
  const bad=touches.filter(x=>x.w<40||x.h<40);
  const candidates=nodes.filter(x=>x.size<12.5);
  const main=document.querySelector('main,#screen,.screen,.artboard,#artboard');
  const mainRect=main?.getBoundingClientRect();
  return {url:location.href,title:document.title,vw,vh,scrollWidth:doc.scrollWidth,scrollHeight:doc.scrollHeight,bodyTextLength:document.body?.innerText?.length||0,mainHeight:mainRect?Math.round(mainRect.height):null,visibleTextNodes:nodes.length,visibleSmallTextNodes:candidates.length,smallTextSamples:candidates.slice(0,14),visibleControls:touches.length,smallControls:bad.slice(0,16),smallControlsCount:bad.length,headingSamples:nodes.filter(x=>/^h[123]$/.test(x.tag)).slice(0,12),topText:(document.body?.innerText||'').replace(/\s+/g,' ').slice(0,500)};
}
async function take(page,scene,width,height,context,extra={}){
 await page.waitForTimeout(450);
 const name=String(records.length+1).padStart(2,'0')+'-'+scene+'-'+width+'.png';
 const dest=path.join(output,name);
 const failures=[];
 await page.screenshot({path:dest,fullPage:false,animations:'disabled',timeout:20000});
 const frames=[];
 for(const f of page.frames()){
  try{const m=await f.evaluate(auditFrame); frames.push(m);
    if(m.scrollWidth>m.vw+3)issues.push({scene,width,frame:m.url,type:'HORIZONTAL_OVERFLOW',delta:m.scrollWidth-m.vw});
  }catch(err){failures.push(String(err.message).slice(0,180))}
 }
 const bytes=fs.statSync(dest).size;
 const row={scene,width,height,context,screen:name,imageBytes:bytes,frames,frameEvaluationErrors:failures,...extra};
 records.push(row);
 if(bytes<9000)issues.push({scene,width,type:'SCREENSHOT_TOO_SMALL',bytes});
 console.log('CAPTURE '+JSON.stringify({scene,width,screen:name,bytes,frames:frames.map(x=>({path:new URL(x.url).pathname,text:x.bodyTextLength,scroll:x.scrollWidth+'/'+x.vw,small:x.visibleSmallTextNodes,controls:x.visibleControls}))}));
 return row;
}
async function shell(ctx,route){
 const p=await ctx.newPage();
 await p.goto(host+'/central-review-02g.html?catalog=sim&page='+route+'&s01_r2=1',{waitUntil:'domcontentloaded',timeout:30000});
 return {page:p,app:p.frameLocator('#central-host')};
}
async function safeScenario(name,width,fn){
 try{await fn()}catch(err){
  issues.push({scene:name,width,type:'CAPTURE_FLOW_ERROR',error:String(err.stack||err).slice(0,1700)});
  console.error('SCENE_ERROR '+name+' '+width+' '+String(err.message));
 }
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 await new Promise(ok=>server.listen(4611,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const [width,height] of widths){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  try{
   await safeScenario('H01',width,async()=>{
     const {page}=await shell(ctx,'H01');
     await take(page,'H01-initial',width,height,'default-first-visit');
     await page.close();
   });
   await safeScenario('S01_S02',width,async()=>{
     const {page,app}=await shell(ctx,'S01'),list=app.frameLocator('#s01-r2-frame');
     await list.locator('.store-card[data-card-kind="expanded"]').first().waitFor({timeout:12000});
     await take(page,'S01-first',width,height,'standard-list');
     await list.locator('.filters .filter').first().click();
     await take(page,'S01-sort-open',width,height,'filter-state');
     await list.locator('.filters .filter').first().click();
     const search=list.locator('#s01-search');
     await search.fill('找不到的测试门店999');
     await take(page,'S01-empty-search',width,height,'no-results');
     await search.fill('');
     await list.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
     await list.locator('.store-card[data-card-kind="expanded"] h2').first().click();
     await app.locator('#screen.page-S02').waitFor({timeout:12000});
     await take(page,'S02-details',width,height,'from-ranked-store');
     await page.close();
   });
   await safeScenario('CAP',width,async()=>{
     const page=await ctx.newPage();
     await page.goto(host+'/prototype/parallel/core-journey-fix-01/demo/cap.html',{waitUntil:'domcontentloaded'});
     await page.locator('body[data-journey-ready="true"]').waitFor({timeout:10000});
     await take(page,'CAP-empty',width,height,'no-choice');
     await page.locator('#quick button[data-v="3"]').click();
     await page.locator('button[data-month="12"]').click();
     await take(page,'CAP-selected',width,height,'3m3-12months');
     await page.close();
   });
   await safeScenario('ITEMS',width,async()=>{
     const page=await ctx.newPage();
     await page.goto(host+'/prototype/parallel/core-journey-fix-01/demo/items.html',{waitUntil:'domcontentloaded',timeout:30000});
     await take(page,'ITEMS-empty',width,height,'default-by-item');
     await page.close();
   });
   await safeScenario('S5',width,async()=>{
     const {page,app}=await shell(ctx,'S5');
     await app.frameLocator('#br04-frame').locator('body.bridge-ready').waitFor({timeout:13000});
     await take(page,'S5-no-capacity',width,height,'empty-demand');
     await app.locator('#screen').evaluate(()=>{
       const b=window.SIM_DEMO;b.core.setRequirement(3,12,true);b.persist();b.navigate('S5');
     });
     await app.frameLocator('#br04-frame').locator('.s5-store-card[data-rank="0"]:not([hidden])').first().waitFor({timeout:13000});
     await take(page,'S5-matched',width,height,'3m3-12months');
     await page.close();
   });
   await safeScenario('BOOKING',width,async()=>{
     const {page,app}=await shell(ctx,'BOOKING'),form=app.frameLocator('#br04-frame');
     await form.locator('#reserve-contact').waitFor({timeout:12000});
     await take(page,'BOOKING-empty',width,height,'new-booking');
     await form.locator('#booking-address').fill('北京市朝阳区青年路18号');
     await form.locator('#reserve-contact').fill('13800138000');
     await form.locator('#submit').click();
     await form.locator('#success').waitFor({state:'visible',timeout:7000});
     await take(page,'BOOKING-receipt',width,height,'local-only-confirmation');
     await page.close();
   });
   await safeScenario('QUICK',width,async()=>{
     const {page,app}=await shell(ctx,'QUICK');
     await app.frameLocator('#br04-frame').locator('body.bridge-ready').waitFor({timeout:12000});
     await take(page,'QUICK-empty',width,height,'direct-order-entry');
     await page.close();
   });
   await safeScenario('O01',width,async()=>{
     const {page,app}=await shell(ctx,'S01');
     await app.locator('#screen.page-S01').waitFor({timeout:10000});
     await app.locator('#screen').evaluate(()=>{
       const b=window.SIM_DEMO,c=b.core;
       c.setRequirement(3,12,true);
       const u=c.matchingUnits().find(x=>x.volume>=3);
       if(!u)throw Error('no selectable unit');
       c.select([u.id]);c.requestPhone();
       c.resolvePhone('success',{phone:'13800138000',method:'local_fixture'});
       c.setDate(c.today());b.persist();b.navigate('O01');
     });
     await app.locator('#screen.page-O01').waitFor({timeout:14000});
     const o=app.frameLocator('#br04-frame');
     await o.locator('body.bridge-ready').waitFor({timeout:12000});
     await take(page,'O01-confirm',width,height,'ready-without-agreement');
     await o.locator('#pay').click();
     await o.locator('#toast:not([hidden])').waitFor({timeout:7000});
     await take(page,'O01-validation',width,height,'unchecked-agreement');
     await o.locator('#agreed').check();
     await o.locator('#pay').click();
     await o.locator('#scrim:not([hidden])').waitFor({timeout:7000});
     await take(page,'O01-payment-sheet',width,height,'pending-order');
     await o.locator('[data-bridge="payResult"][data-value="success"]').click();
     await o.locator('#scrim:not([hidden])').waitFor();
     await take(page,'O01-payment-result',width,height,'local-no-charge');
     await page.close();
   });
   await safeScenario('M01',width,async()=>{
     const {page,app}=await shell(ctx,'M01');
     await app.locator('#screen').waitFor({timeout:10000});
     await take(page,'M01-my',width,height,'empty-orders');
     await page.close();
   });
  }finally{await ctx.close();}
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
 const captured=records.length;
 const required=['H01-initial','S01-first','S02-details','CAP-empty','CAP-selected','ITEMS-empty','S5-no-capacity','S5-matched','BOOKING-empty','BOOKING-receipt','QUICK-empty','O01-confirm','O01-payment-sheet','O01-payment-result','M01-my'];
 const missing=required.flatMap(scene=>widths.filter(([w])=>!records.some(x=>x.scene===scene&&x.width===w)).map(([w])=>({scene,width:w})));
 const report={audit:'RC2-UX-QUALITY-REBASE-01-BATCH-A',captureKind:'FRESH_OFFLINE_CHROMIUM_SAME_APP_TREE_AS_CURRENT_UAT',sourcePR96:'e435bb25eddc8a8ad4c84427ca9883d4ec3e9c16',sourceAppTree:'4fbf5eefccbc9ee3e05a969b88334314263a3e79',liveSSOAccess:false,visualApproved:false,mainMergeAllowed:false,captured,missing,issues,records};
 fs.writeFileSync(path.join(output,'capture-results.json'),JSON.stringify(report,null,2)+'\n');
 const m=records.map(x=>({scene:x.scene,width:x.width,file:x.screen,bytes:x.imageBytes,frames:x.frames.map(f=>({url:f.url,visibleSmallTextNodes:f.visibleSmallTextNodes,smallControlsCount:f.smallControlsCount,overflow:f.scrollWidth>f.vw+3}))}));
 fs.writeFileSync(path.join(output,'screen-index.json'),JSON.stringify(m,null,2)+'\n');
 console.log('UX_REBASE_A_DONE '+JSON.stringify({captured,missing:missing.length,issues:issues.length}));
 if(missing.length)process.exitCode=1;
})().catch(err=>{console.error('UX_REBASE_A_FATAL '+String(err.stack||err));process.exitCode=1});
