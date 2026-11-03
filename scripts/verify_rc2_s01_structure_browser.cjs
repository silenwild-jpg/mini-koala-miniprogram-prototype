#!/usr/bin/env node
'use strict';
// RC2-STRUCTURE-RESTORE: use real Chromium/iframe DOM, not screenshot count proxies.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-structure-restore');
const port=4514,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(filename,(e,b)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream'}).end(b));});
async function run(){
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(port,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let rows=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1');
   const app=page.frameLocator('#central-host'),child=app.frameLocator('#s01-r2-frame');
   await child.locator('#s01-search').waitFor({state:'visible'});
   const labels=(await child.locator('.filter').allInnerTexts()).map(x=>x.trim());
   assert.deepEqual(labels,['排序','距离','服务']);
   const nav=(await app.locator('.bottom-nav .bottom-item').allInnerTexts()).map(x=>x.trim());
   assert.deepEqual(nav,['首页','附近门店','预约订单','我的']);
   const spatial=await app.locator('#screen').evaluate(el=>{
    const nav=el.querySelector('.bottom-nav').getBoundingClientRect(),frame=el.querySelector('#s01-r2-frame').getBoundingClientRect();
    return {frameBottom:frame.bottom,navTop:nav.top,navBottom:nav.bottom,bodyWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
   });
   assert(spatial.frameBottom<=spatial.navTop+2,'S01 list is covered by nav');
   assert(spatial.bodyWidth<=spatial.viewport+2,'unexpected horizontal page overflow');
   const initial=await child.locator('.store-card').count();assert(initial>=3,'R2 still truncates to just two stores');
   // Source contract: same store id must retain address, service tags and photo,
   // not R2-generated "88号B1层" placeholders or two rotating generic cards.
   const firstId=await child.locator('.store-card').first().getAttribute('data-store-id');
   const original=await app.locator('#screen').evaluate(id=>{const x=window.SIM_FIXTURES.stores.find(s=>s.id===id);return {id:x.id,address:x.address,photo:x.photo,services:x.serviceTags||[]};},firstId);
   const first=child.locator('.store-card').first();
   assert.equal(await first.locator('.address-copy').innerText(),original.address,'store address was fabricated in R2');
   assert((await first.locator('.store-photo').getAttribute('src')).endsWith('/'+original.photo),'store photo was replaced with a generic carousel asset');
   const tags=await first.locator('.store-tags span:not([hidden])').allInnerTexts();
   assert(tags.every(x=>original.services.includes(x)),'store card services are not from same store source');
   assert(await child.locator('.s01-result-summary').innerText()!=='正在载入门店');
   await page.screenshot({path:path.join(out,'S01-restored-'+width+'.png'),fullPage:true});
   await child.locator('#s01-search').fill('安贞');
   await page.waitForTimeout(100);
   assert.equal(await child.locator('.store-card').count(),1,'search by store name did not filter visible results');
   await child.locator('#s01-search').fill('');
   await page.waitForTimeout(100);
   assert((await child.locator('.store-card').count())>=3,'clear search did not restore store list');
   await child.locator('.filter').first().click();
   assert(await child.locator('#s01-inline-panel').isVisible(),'sort options not visible inline');
   assert(await child.locator('[data-sort="recommended"]').count());
   await child.locator('[data-sort="recommended"]').click();
   await child.locator('.filter').nth(1).click();
   assert(await child.locator('[data-radius="3"]').isVisible(),'distance range is missing');
   await child.locator('[data-radius="3"]').click();
   assert((await child.locator('.store-card').count())>0,'3km radius unexpectedly produced no candidate');
   await child.locator('.filter').nth(1).click();await child.locator('[data-radius="0"]').click();
   await child.locator('.filter').nth(2).click();
   assert(await child.locator('[name="s01-service"]').count()>=7,'service option list incomplete');
   await child.locator('input[name="s01-service"][value="近地铁"]').check();
   await child.locator('input[name="s01-service"][value="电梯直达"]').check();
   await child.locator('[data-apply-service]').click();
   const n=await child.locator('.store-card').count();assert(n>0,'multi-select matching services lost data');
   await child.locator('.filter').nth(2).click();assert.equal(await child.locator('input[name="s01-service"]:checked').count(),2);
   await child.locator('[data-clear-service]').click();
   const quick=child.locator('[data-quick="promo"]');await quick.click();
   assert.equal(await quick.getAttribute('aria-pressed'),'true');
   await quick.click();
   assert.equal(await quick.getAttribute('aria-pressed'),'false');
   if(await child.locator('#s01-more').isVisible()){
     const before=await child.locator('.store-card').count();await child.locator('#s01-more').click();
     assert(await child.locator('.store-card').count()>before,'more stores button did not reveal more shops');
   }
   await child.locator('.s01-city').click();
   assert(await app.locator('#overlay-root').getByText('选择城市').isVisible(),'city picker missing');
   await app.locator('#overlay-root [data-action="close"]').last().click();
   await app.locator('.bottom-nav [data-action="mine"]').click();
   assert.equal(new URL(page.url()).searchParams.get('page'),'S01','wrapper URL remains central while frame navigation updates');
   assert.equal(await app.locator('#s01-r2-frame').count(),0,'bottom My did not navigate away from S01');
   assert.deepEqual(errors,[],'browser runtime errors');
   rows.push({width,nav,initialShown:initial,filters:labels,multiSelected:2,search:'PASS',distance:'PASS',quick:'PASS',more:'PASS',jsErrors:0});
   await ctx.close();
  }
  fs.writeFileSync(path.join(out,'test-results.json'),JSON.stringify({status:'PASS',rows},null,2));
  console.log('RC2_S01_STRUCTURE_RESTORED_PASS',JSON.stringify(rows));
 }finally{await browser.close();server.close();}
}
run().catch(e=>{console.error('RC2_S01_STRUCTURE_RESTORED_FAIL',e);server.close();process.exitCode=1;});
