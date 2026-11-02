#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),out=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-05');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const server=http.createServer((req,res)=>{const uri=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+decodeURIComponent(uri.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end('missing');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b);});});
const base='http://127.0.0.1:4396/prototype/parallel/core-journey-fix-01/demo/';
const results=[];
async function newPage(browser,width,height,name){
 const ctx=await browser.newContext({viewport:{width,height}}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));return {ctx,page,errors,name,width,height};
}
async function itemsReady(page){await page.locator('body[data-journey-ready="true"]').waitFor();await page.locator('#footerBtn').waitFor();}
async function s5Ready(page){await page.waitForURL(/index\.html\?page=S5(?:&|$)/);await page.locator('#screen.page-S5').waitFor();await page.frameLocator('#br04-frame').locator('#modify').waitFor();}
async function requirement(page){return page.evaluate(()=>window.SIM_DEMO.core.state().requirement);}
async function screen(page,name,width){await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});}
async function noErrors(o){assert.deepEqual(o.errors,[],o.name+' page JavaScript errors');}
async function complete(o,detail){await noErrors(o);results.push({viewport:o.width+'x'+o.height,scenario:o.name,result:'PASS',...detail});await o.ctx.close();}
async function clickItem(page,id,times=1){for(let n=0;n<times;n++)await page.locator('[data-step="1"][data-id="'+id+'"]').first().click();}
async function term(page,month){const c=page.locator('[data-term="'+month+'"]');if(!(await c.isVisible()))await page.locator('#termNav').click();await c.click();}
async function itemPayloadFromDraft(page){return page.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_items_draft_v3')));}
function quantity(r,id){return r.items.find(i=>i.id===id)?.quantity||0;}
(async()=>{
 await new Promise(ok=>server.listen(4396,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  // Item-by-item quantity and term; S5 edit must preserve selected counts and recompute.
  {
   const o=await newPage(browser,width,height,'ITEMS item quantities → S5 → edit → S5');let {page}=o;
   await page.goto(base+'items.html');await itemsReady(page);
   assert.equal(await page.locator('#footerBtn').isDisabled(),true,'cannot continue before selecting an item');
   await page.locator('[data-browse]').first().click();
   const ids=await page.locator('#catalogResults article[data-item]').evaluateAll(els=>els.slice(0,2).map(x=>x.dataset.item));
   assert.equal(ids.length,2,'need two real item rows');
   await clickItem(page,ids[0],2);await clickItem(page,ids[1],1);
   assert.equal(await page.locator('[data-item="'+ids[0]+'"] .stepper span').first().innerText(),'2');
   const before=await itemPayloadFromDraft(page);assert.equal(before.counts[ids[0]],2);assert.equal(before.counts[ids[1]],1);
   assert.match(await page.locator('#footerBtn').innerText(),/选择租期/);
   await page.locator('#footerBtn').click();
   await term(page,12);
   assert.equal(await page.locator('#notice.show').count(),0,'obsolete select-term banner still covers content after a valid term is chosen');
   await screen(page,'items-counts-before-s5',width);
   await page.locator('#footerBtn').click();await s5Ready(page);
   let r=await requirement(page);
   assert.equal(r.source,'items_estimate');assert.equal(r.term_months,12);assert.equal(r.term_confirmed,true);
   assert.equal(quantity(r,ids[0]),2);assert.equal(quantity(r,ids[1]),1);
   const original=r.estimated_volume;
   await page.frameLocator('#br04-frame').locator('#modify').click();
   await page.waitForURL(/items\.html$/);await itemsReady(page);
   const restored=await itemPayloadFromDraft(page);
   assert.equal(restored.counts[ids[0]],2);assert.equal(restored.counts[ids[1]],1);
   const step=page.locator('[data-category]');
   await page.locator('[data-mode="items"]').click();
   await page.locator('[data-category="all"]').click();
   await clickItem(page,ids[0],1);
   await page.locator('#termNav').click();
   await term(page,6);
   await page.locator('#footerBtn').click();await s5Ready(page);
   r=await requirement(page);assert.equal(r.source,'items_estimate');assert.equal(r.term_months,6);
   assert.equal(quantity(r,ids[0]),3);assert.equal(quantity(r,ids[1]),1);
   assert(r.estimated_volume>original,'edited item quantity did not recompute estimated volume');
   assert.equal(r.capacity_m3,Math.max(.5,r.estimated_volume),'matchable capacity must respect 0.5m3 minimum');
   await screen(page,'items-edit-return-s5',width);
   await complete(o,{itemIds:ids,oldEstimatedVolume:original,newEstimatedVolume:r.estimated_volume,matchCapacity:r.capacity_m3,termChanged:'12→6',countsRestored:true});
  }
  // Scene mode -> select -> switch tabs -> S5 -> modify -> preserve scene mode and counts.
  {
   const o=await newPage(browser,width,height,'SCENES moving → selection → S5 → edit preserves mode');let {page}=o;
   await page.goto(base+'items.html');await itemsReady(page);
   await page.locator('[data-mode="scenes"]').click();
   await page.locator('[data-category="scene_moving"]').click();
   const id=await page.locator('#catalogResults article[data-item]').first().getAttribute('data-item');
   assert(id,'moving scene must contain visible matching item');
   await clickItem(page,id,2);
   await page.locator('[data-mode="items"]').click();
   await page.locator('[data-mode="scenes"]').click();
   assert.equal(await page.locator('[data-item="'+id+'"] .stepper span').first().innerText(),'2','mode switching lost count');
   await page.locator('#termNav').click();await term(page,6);
   await screen(page,'scenes-before-s5',width);
   await page.locator('#footerBtn').click();await s5Ready(page);
   const before=await requirement(page);assert.equal(before.source,'items_estimate');assert.equal(quantity(before,id),2);
   assert.equal(before.term_months,6);
   await page.frameLocator('#br04-frame').locator('#modify').click();
   await page.waitForURL(/items\.html$/);await itemsReady(page);
   const state=await itemPayloadFromDraft(page);
   assert.equal(state.state.mode,'scenes');assert.equal(state.counts[id],2);
   await page.locator('[data-category="scene_moving"]').click();
   await clickItem(page,id,1);
   await page.locator('#footerBtn').click();await s5Ready(page);
   const after=await requirement(page);assert.equal(quantity(after,id),3);assert(after.estimated_volume>before.estimated_volume);
   assert.equal(after.capacity_m3,Math.max(.5,after.estimated_volume));
   await screen(page,'scenes-edit-return-s5',width);
   await complete(o,{itemId:id,sceneModeRestored:true,quantityBefore:2,quantityAfter:3});
  }
  // Capacity return must retain original demand; modifying capacity/term must replace S5, not stale result.
  {
   const o=await newPage(browser,width,height,'CAP → S5 → modify capacity and term → S5');let {page}=o;
   await page.goto(base+'cap.html');await page.locator('body[data-journey-ready="true"]').waitFor();
   await page.locator('#quick [data-v="3"]').click();await page.locator('[data-month="12"]').click();
   await page.locator('#cta').click();await s5Ready(page);
   let r=await requirement(page);assert.equal(r.capacity_m3,3);assert.equal(r.term_months,12);
   await page.frameLocator('#br04-frame').locator('#modify').click();
   await page.waitForURL(/cap\.html$/);await page.locator('body[data-journey-ready="true"]').waitFor();
   assert.equal(await page.locator('#capacity').inputValue(),'3');
   await page.locator('#quick [data-v="8"]').click();await page.locator('[data-month="6"]').click();
   await page.locator('#cta').click();await s5Ready(page);
   r=await requirement(page);assert.equal(r.capacity_m3,8);assert.equal(r.term_months,6);
   await screen(page,'capacity-edit-return-s5',width);
   await complete(o,{capacityChanged:'3→8',termChanged:'12→6'});
  }
 }
 fs.writeFileSync(path.join(out,'items-scenes-return-results.json'),JSON.stringify({result:'PASS',cases:results,scope:'isolated real clicks; no HIFI-06; not visual master signoff'},null,2));
 console.log('RC2_MERGE_PREP_05_BROWSER_PASS',JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error('RC2_MERGE_PREP_05_BROWSER_FAILED',e);process.exitCode=1}).finally(()=>server.close());
