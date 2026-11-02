#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),output=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-02');
fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data);});});
(async()=>{await new Promise(ok=>server.listen(4387,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const all=[];
try{
 for(const [width,height] of [[375,812],[390,844]]){
  const ctx=await browser.newContext({viewport:{width,height}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4387/central-review-02g.html?catalog=sim&page=S01&s01_r2=1');
  const app=page.frameLocator('#central-host'),r2=app.frameLocator('#s01-r2-frame');
  await r2.locator('.filter').first().waitFor();
  assert.deepEqual(await r2.locator('.filter').allTextContents(),['排序 ','距离 ','价格 ','服务 ']);
  assert.equal(await r2.locator('.searchbar').count(),0);
  assert.equal(await r2.locator('#r2-search').count(),0);
  assert.equal(await r2.locator('button.nav-more[aria-label="搜索门店"]').count(),1);
  assert.equal(await r2.locator('.filter').count(),4);
  const state=()=>app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
  const snap=await state();assert.equal(snap.filterActive.length,4);
  // Hidden obsolete filters must never restrict the new four-column display.
  assert.equal(snap.filters.region,'all');assert.equal(snap.filters.capacity,'all');
  await r2.locator('button.nav-more').click();
  await app.locator('#r2-search-query').fill('一个不会存在的门店');
  await r2.getByRole('status').first().waitFor();
  assert.equal((await state()).stores.length,0);
  await app.locator('button[data-action="r2SearchClear"]').click();
  assert((await state()).stores.length>0);
  await app.locator('button[data-action="close"]').last().click();
  // P17: closing sort/service overlays must not change filters or leave an obscuring scrim.
  for(const filterIndex of [0,3]){
   const before=await state();
   await r2.locator('.filter').nth(filterIndex).click();
   await app.locator('.control-sheet').waitFor();
   await app.locator('.control-sheet button[data-action="close"]').click();
   await app.locator('.control-sheet').waitFor({state:'detached'});
   const after=await state();
   assert.deepEqual(after.filterActive,before.filterActive,'closing filter sheet changed selections');
   assert.equal(await app.locator('.scrim').count(),0,'scrim stuck after close');
  }
  // UX-02: repeated close/open must not duplicate sheets or leak a scrim.
  for(let attempt=0;attempt<3;attempt++){
   await r2.locator('.filter').nth(0).click();
   assert.equal(await app.locator('.control-sheet').count(),1,'duplicate sort sheets');
   await app.locator('.control-sheet button[data-action="close"]').click();
   await app.locator('.control-sheet').waitFor({state:'detached'});
   assert.equal(await app.locator('.scrim').count(),0,'stale overlay');
  }
  // Returning from a store detail must keep selection, identity and browser back control.
  const beforeStore=await state();
  await r2.locator('.store-card').first().click();
  await app.locator('#screen.page-S02').waitFor();
  await app.locator('button[aria-label="返回门店列表"]').click();
  await r2.locator('.store-card').first().waitFor();
  assert.deepEqual((await state()).filterActive,beforeStore.filterActive,'return changed filter state');
  // sorting
  await r2.locator('.filter').nth(0).click();
  await app.locator('button[data-action="setSort"][data-value="recommended"]').waitFor();
  await app.locator('button[data-action="setSort"][data-value="recommended"]').click();
  // Approved demo distance sort follows the same per-store seeded kilometers
  // without changing the core trusted-location flag.
  await r2.locator('.filter').nth(1).click();
  const distanceState=await state();
  assert.equal(distanceState.distanceVerified,false);
  assert.equal(distanceState.distanceSortSource,'STABLE_DEMO_DISTANCE');
  assert.equal(distanceState.filterActive[1],true);
  assert.equal(distanceState.filterLabels[1],'距离优先');
  assert(Number.parseFloat(distanceState.stores[0].distance)<=Number.parseFloat(distanceState.stores[1].distance));
  await r2.locator('.filter').nth(0).click();
  await app.locator('button[data-action="setSort"][data-value="recommended"]').click();
  assert.equal((await state()).filterActive[1],false);
  // services, including reverting back to all
  await r2.locator('.filter').nth(3).click();
  await app.locator('button[data-action="setService"][data-value="近地铁"]').click();
  assert.equal((await state()).filterActive[3],true);
  await r2.locator('.filter').nth(3).click();
  await app.locator('button[data-action="setService"][data-value="all"]').click();
  assert.equal((await state()).filterActive[3],false);
  // price requires verified phone and term, preserving quote-gate rules
  await r2.locator('.filter').nth(2).click();
  await app.locator('.mk-auth-overlay').waitFor();
  const auth=app.locator('.mk-auth-overlay');
  await auth.locator('#mk-auth-agree').check();await auth.locator('button[data-auth="wechat"]').click();
  await auth.waitFor({state:'detached'});
  await app.locator('.control-sheet').waitFor();
  await app.locator('button[data-action="setTerm"][data-value="6"]').click();
  await app.locator('button[data-action="setPrice"][data-value="3000"]').waitFor();
  await app.locator('button[data-action="setPrice"][data-value="3000"]').click();
  assert.equal((await state()).filterActive[2],true);
  await r2.locator('.filter').nth(2).click();
  await app.locator('button[data-action="setPrice"][data-value="all"]').click();
  assert.equal((await state()).filterActive[2],false);
  // R2 cards are still linked to the exact existing O01/O03 order lifecycle.
  const overflow=await r2.locator('html').evaluate(el=>el.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=4,'S01 horizontal overflow: '+overflow);
  await r2.locator('.order[aria-disabled="false"]').first().click();
  await app.locator('#screen.page-O01').waitFor();
  const o=app.frameLocator('#br04-frame');await o.locator('#pay').waitFor();
  const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
  await o.locator('#start-date').fill(day);
  await o.locator('#agreed').check();await o.locator('#pay').click();
  await o.locator('[data-bridge="payResult"][data-value="success"]').click();
  await o.locator('[data-bridge="orderDetail"]').click();
  await app.locator('#screen.page-O03').waitFor();
  await app.locator('button[data-value="RN01"]').waitFor();
  assert.equal((await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().orders.at(-1))).status,'paid_simulated');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(output,'S01_four_filters_'+width+'x'+height+'.png'),fullPage:true});
  all.push({width,height,controls:['排序','距离','价格','服务'],search:'nav-more',gate:{distance:'UNVERIFIED_BLOCKED',price:'PHONE_AND_TERM_REQUIRED'},paidOrderToO03:'PASS',browserErrors:0});
  await ctx.close();
 }
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({status:'PASS',cases:all,scope:'isolated; not published RC2; H01 master pending source'},null,2));
 console.log('RC2_MERGE_PREP_02_BROWSER_PASS',JSON.stringify(all));
 }finally{await browser.close();}
})().catch(e=>{console.error('RC2_MERGE_PREP_02_BROWSER_FAILED',e);process.exitCode=1;}).finally(()=>server.close());
