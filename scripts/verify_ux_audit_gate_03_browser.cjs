#!/usr/bin/env node
'use strict';
// UX-AUDIT-GATE-03: use the exact built isolated candidate; never connect to a live payment backend.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/ux-audit-gate-03');
const host='http://127.0.0.1:4591';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(fp,(err,buf)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(buf));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(4591,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const result=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   const app=page.frameLocator('#central-host');let s01=app.frameLocator('#s01-r2-frame');
   await s01.locator('.s01-context').waitFor({state:'visible'});
   assert.equal(await s01.locator('.nav-back').count(),0,'S01 primary tab must not have a back arrow');
   assert.equal(await app.locator('.bottom-nav .bottom-item').count(),4,'S01 must retain four bottom positions');
   assert.equal(await app.locator('.bottom-nav .bottom-item.active').count(),1,'exactly one real tab selected');
   assert.equal(await app.locator('.bottom-nav [data-action="navBooking"].active').count(),0,'appointment is an action, not a selected tab');
   await app.locator('#screen').evaluate(()=>{
     window.SIM_DEMO.core.setRequirement(3,12,true);
     window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S01');
   });
   s01=app.frameLocator('#s01-r2-frame');
   await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
   const previews=await s01.locator('.store-card[data-card-kind="expanded"]').evaluateAll(cards=>
     cards.map(card=>({id:card.dataset.storeId,visible:[...card.querySelectorAll('.unit')].filter(x=>getComputedStyle(x).display!=='none'&&!x.hidden).length}))
   );
   assert.equal(previews.length,2,'two comparable stores');
   assert(previews.every(x=>x.visible===1),'known capacity: one matching preview per store: '+JSON.stringify(previews));
   await page.screenshot({path:path.join(out,'s01-known-'+width+'.png'),fullPage:false});

   // Real S5 → S01 → S5 source recovery without prices or IDs in URL.
   await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('S5'));
   await app.frameLocator('#br04-frame').locator('#see-more').click();
   await app.locator('#screen.page-S01').waitFor();
   s01=app.frameLocator('#s01-r2-frame');
   await s01.locator('.s01-return-recommend').waitFor({state:'visible'});
   const widthTest=await s01.locator('.s01-context').evaluate(el=>({
     viewport:innerWidth,scroll:document.documentElement.scrollWidth,
     labels:[...el.querySelectorAll('button:not([hidden])')].map(b=>b.innerText.trim())
   }));
   assert(widthTest.scroll<=width+1,'S01 context causes horizontal overflow');
   assert(widthTest.labels.includes('返回推荐 ›'),'S5 origin context missing');
   await page.screenshot({path:path.join(out,'s01-from-s5-'+width+'.png'),fullPage:false});
   await s01.locator('.s01-return-recommend').click();
   await app.locator('#screen.page-S5').waitFor();
   const recovered=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.state().requirement);
   assert.equal(recovered.capacity_m3,3);assert.equal(recovered.term_months,12);assert.equal(recovered.term_confirmed,true);

   // My is a primary tab; order detail and aftercare are tasks with no bottom tab.
   await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('M01'));
   await app.locator('#screen.page-M01').waitFor();
   assert.equal(await app.locator('.view-title-primary strong').innerText(),'我的');
   assert.equal(await app.locator('.view-title-primary .back-button,.view-title-primary a').count(),0);
   assert.equal(await app.locator('.bottom-nav .bottom-item.active').count(),1);
   // Order/aftercare navigation requires a valid paid order and is verified by the full-journey test.
   result.push({width,stage:'navigation-and-s01-known',status:'PASS',previews});
   assert.deepEqual(errors,[],'no JS page exceptions in primary navigation');
   await ctx.close();

   // Capacity unknown: S5 must lead with capacity, not a rent term selector.
   const emptyCtx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const empty=await emptyCtx.newPage();
   await empty.goto(host+'/central-review-02g.html?catalog=sim&page=S5&s01_r2=1',{waitUntil:'domcontentloaded'});
   const s5=empty.frameLocator('#central-host').frameLocator('#br04-frame');
   await s5.locator('body.bridge-ready').waitFor();
   assert.equal(await s5.locator('#artboard').getAttribute('data-requires-capacity'),'true');
   assert.equal(await s5.locator('.term').isVisible(),false,'capacity missing: term must not compete');
   assert.match(await s5.locator('[data-nm="range"]').innerText(),/先确定容量/);
   assert.equal(await s5.locator('[data-nm="capacity"]').isVisible(),false,'no duplicate capacity CTA');
   await empty.screenshot({path:path.join(out,'s5-capacity-first-'+width+'.png'),fullPage:false});
   await s5.locator('[data-nm="range"]').click();
   await empty.waitForTimeout(450);
   assert(empty.frames().some(f=>/cap\.html/.test(f.url())),'capacity CTA must navigate to CAP');
   result.push({width,stage:'s5-missing-capacity',status:'PASS'});
   await emptyCtx.close();

   const termCtx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const termPage=await termCtx.newPage();
   await termPage.goto(host+'/central-review-02g.html?catalog=sim&page=S5&s01_r2=1',{waitUntil:'domcontentloaded'});
   const termApp=termPage.frameLocator('#central-host');
   await termApp.locator('#screen').evaluate(()=>{
     window.SIM_DEMO.core.setRequirement(3,null,false);
     window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S5');
   });
   const termS5=termApp.frameLocator('#br04-frame');
   await termS5.locator('body.bridge-ready').waitFor();
   assert.equal(await termS5.locator('#artboard').getAttribute('data-requires-capacity'),'false');
   assert.equal(await termS5.locator('.term').isVisible(),true,'known capacity must allow rent term');
   assert.match(await termS5.locator('[data-nm="range"]').innerText(),/选择租期/);
   result.push({width,stage:'s5-missing-term',status:'PASS'});
   await termCtx.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',source:'NEW_GIT_HEAD_ONLY',cases:result,main_merged:false,live_wechat_tested:false},null,2));
  console.log('UX_AUDIT_GATE_03_BROWSER_PASS '+JSON.stringify(result));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
