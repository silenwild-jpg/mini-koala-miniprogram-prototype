#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),out=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-06');
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const server=http.createServer((req,res)=>{const u=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=path.resolve(root,'.'+u);if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(f,(e,b)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'}).end(b));});
const base='http://127.0.0.1:4406/prototype/parallel/core-journey-fix-01/demo/';
const cases=[],errors=[];
async function newPage(browser,width,height,title){const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await ctx.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));return {ctx,page,pageErrors,title,width,height};}
async function capReady(page){await page.locator('body[data-journey-ready="true"]').waitFor();await page.locator('#capacity').waitFor();}
async function itemsReady(page){await page.locator('body[data-journey-ready="true"]').waitFor();await page.locator('#footerBtn').waitFor();}
async function capSet(page,volume,term){await page.locator('#capacity').fill(String(volume));const c=page.locator('[data-month="'+term+'"]');await c.click();await page.locator('#cta').click();}
async function requirement(page){return page.evaluate(()=>window.SIM_DEMO.core.state().requirement);}
async function shot(page,label,width){const filename=label+'-'+width+'.png';await page.screenshot({path:path.join(out,filename),fullPage:true});return filename;}
async function pass(o,details){assert.deepEqual(o.pageErrors,[],o.title+' JS exceptions');cases.push({case:o.title,size:o.width+'x'+o.height,status:'PASS',...details});await o.ctx.close();}
async function expectRoute(page,target,query=''){await page.waitForURL(new RegExp('index\\.html\\?page='+target));if(query)assert(page.url().includes(query),'missing return query '+query);await page.locator('#screen.page-'+target).waitFor();}
async function r2Edit(page){const frame=page.frameLocator('#s01-r2-frame');await frame.locator('button.nav-more').click();await page.locator('button[data-action="r2EditDemand"]').click();}
async function cssAudit(page,width,selector){
 const m=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),d=document.documentElement;return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,scroll:d.scrollWidth,viewport:d.clientWidth};});
 assert(m.scroll<=width+4,'horizontal overflow: '+JSON.stringify(m));return m;
}
(async()=>{await new Promise(ok=>server.listen(4406,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const [width,height] of [[375,812],[390,844]]){
 // S01 R2 -> CAP -> S01, S02 -> CAP -> original S02 same ID -> back to R2 list.
 {
  const o=await newPage(browser,width,height,'S01 R2/S02 CAP return preserves selected store and visual mode');const {page}=o;
  await page.goto(base+'index.html?page=S01&s01_r2=1');
  const r2=page.frameLocator('#s01-r2-frame');await r2.locator('.filter').first().waitFor();
  const cols=await r2.locator('.filter').evaluateAll(xs=>xs.map(x=>({width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})));
  assert.equal(cols.length,4);assert(cols.every(x=>x.height>=40));assert(Math.max(...cols.map(x=>x.width))-Math.min(...cols.map(x=>x.width))<2);
  await r2.locator('.nav-more').click();
  assert.equal(await page.locator('button[data-action="r2EditDemand"]').count(),1);
  await page.locator('button[data-action="r2EditDemand"]').click();
  await page.waitForURL(/cap\.html$/);await capReady(page);
  await capSet(page,3,12);await expectRoute(page,'S01','s01_r2=1');
  let need=await requirement(page);assert.equal(need.capacity_m3,3);assert.equal(need.term_months,12);
  await r2.locator('.store-card').first().click();
  await expectRoute(page,'S02','s01_r2=1');
  const store=await page.evaluate(()=>window.SIM_DEMO.core.state().storeId);assert(store);
  await page.locator('[data-edit-demand]').click();
  await page.waitForURL(/cap\.html$/);await capReady(page);
  assert.equal(await page.locator('#capacity').inputValue(),'3');
  await capSet(page,8,6);await expectRoute(page,'S02','store='+encodeURIComponent(store));
  assert(page.url().includes('s01_r2=1'),'R2 state dropped after S02 edit');
  assert.equal(await page.evaluate(()=>window.SIM_DEMO.core.state().storeId),store);
  need=await requirement(page);assert.equal(need.capacity_m3,8);assert.equal(need.term_months,6);
  assert.equal(await page.locator('#screen.page-S02').count(),1);
  await cssAudit(page,width,'#screen');
  const screenshot=await shot(page,'s02-after-demand-edit',width);
  await page.locator('button[aria-label="返回门店列表"]').click();await expectRoute(page,'S01','s01_r2=1');await r2.locator('.filter').first().waitFor();
  await pass(o,{storeId:store,capacity:'3→8',term:'12→6',r2ModePreserved:true,screen:screenshot});
 }
 // From S01 to CAP to ITEMS: estimate, return S01 and choose S02, then S02 edit routes to ITEMS.
 {
  const o=await newPage(browser,width,height,'S01/S02 ITEMS source return and variant preservation');const {page}=o;
  await page.goto(base+'index.html?page=S01&s01_r2=1');
  const r2=page.frameLocator('#s01-r2-frame');await r2.locator('.filter').first().waitFor();
  await r2Edit(page);await page.waitForURL(/cap\.html$/);await capReady(page);
  await page.locator('[data-flow="按物品估算"]').click();await page.waitForURL(/items\.html$/);await itemsReady(page);
  await page.locator('[data-category="furniture"]').click();
  await page.locator('[data-step="1"][data-id="sofa3"]').click();
  await page.locator('[data-variant="sofa3"]').selectOption('single');
  await page.locator('#termNav').click();await page.locator('[data-term="12"]').click();
  await page.locator('#footerBtn').click();await expectRoute(page,'S01','s01_r2=1');
  let need=await requirement(page);assert.equal(need.source,'items_estimate');assert.equal(need.term_months,12);
  assert.equal(need.items.find(x=>x.id==='sofa3').variant,'single');
  await r2.locator('.store-card').first().click();await expectRoute(page,'S02','s01_r2=1');
  const store=await page.evaluate(()=>window.SIM_DEMO.core.state().storeId);
  await page.locator('[data-edit-demand]').click();
  await page.waitForURL(/items\.html$/);await itemsReady(page);
  await page.locator('[data-category="furniture"]').click();
  const choice=page.locator('[data-variant="sofa3"]');
  assert.equal(await choice.inputValue(),'single');
  await choice.selectOption('double');
  await page.locator('#termNav').click();await page.locator('[data-term="6"]').click();
  await page.locator('#footerBtn').click();await expectRoute(page,'S02','store='+encodeURIComponent(store));
  need=await requirement(page);assert.equal(need.source,'items_estimate');
  assert.equal(need.items.find(x=>x.id==='sofa3').variant,'double');assert.equal(need.term_months,6);
  assert.equal(await page.evaluate(()=>window.SIM_DEMO.core.state().storeId),store);
  const screenshot=await shot(page,'s02-items-variant-return',width);
  await pass(o,{storeId:store,variant:'single→double',term:'12→6',screenshot});
 }
 // Real input boundaries: reject <0.5 and >200 in ITEMS known mode; accept .5 and 200 and 60-month max.
 for(const [cap,term] of [[.5,60],[200,1]]){
  const o=await newPage(browser,width,height,'ITEMS known-capacity extremes '+cap+'m3 / '+term+'m');const {page}=o;
  await page.goto(base+'items.html');await itemsReady(page);
  await page.locator('[data-known]').first().click();
  await page.locator('#knownVolume').fill('0.49');await page.locator('#toTerm').click();
  assert.equal(await page.locator('#knownVolume').count(),1,'under-minimum value advanced');
  await page.locator('#knownVolume').fill('200.01');await page.locator('#toTerm').click();
  assert.equal(await page.locator('#knownVolume').count(),1,'over-maximum value advanced');
  await page.locator('#knownVolume').fill(String(cap));await page.locator('#toTerm').click();
  await page.locator('[data-term="'+term+'"]').click();
  await page.locator('#footerBtn').click();await expectRoute(page,'S5');
  const need=await requirement(page);assert.equal(need.capacity_m3,cap);assert.equal(need.term_months,term);
  const screenshot=await shot(page,'items-known-extreme-'+String(cap).replace('.','-'),width);
  await pass(o,{capacity:cap,term,screenshot});
 }
 // Item variant and qty upper bound: 99 max with selected variant; prevent 100th.
 {
  const o=await newPage(browser,width,height,'ITEMS variant and quantity upper bound');const {page}=o;
  await page.goto(base+'items.html');await itemsReady(page);
  await page.locator('[data-category="furniture"]').click();
  await page.locator('[data-variant="sofa3"]').selectOption('single');
  const clicks=await page.evaluate(()=>{
   let n=0;
   for(let i=0;i<101;i++){const b=document.querySelector('[data-step="1"][data-id="sofa3"]');if(!b)break;b.click();n++;}
   return n;
  });
  assert.equal(clicks,101);
  const qty=await page.locator('[data-item="sofa3"] .stepper span').first().innerText();assert.equal(qty,'99','upper bound exceeded');
  const draft=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_items_draft_v3')));
  assert.equal(draft.counts.sofa3,99);assert.equal(draft.variants.sofa3,'single');
  await page.locator('#termNav').click();await page.locator('[data-term="60"]').click();
  await page.locator('#footerBtn').click();await expectRoute(page,'S5');
  const need=await requirement(page);assert.equal(need.items.find(x=>x.id==='sofa3').quantity,99);
  assert.equal(need.items.find(x=>x.id==='sofa3').variant,'single');
  await pass(o,{upperBound:99,variant:'single',term:60});
 }
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',tests:cases,technical_visual_only:true,visual_manual_signoff:false,hifi06:'ABANDONED'},null,2));
console.log('RC2_MERGE_PREP_06_BROWSER_PASS',JSON.stringify(cases));
}finally{await browser.close();}
})().catch(e=>{console.error('RC2_MERGE_PREP_06_BROWSER_FAIL',e);process.exitCode=1}).finally(()=>server.close());
