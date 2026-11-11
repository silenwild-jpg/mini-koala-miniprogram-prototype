#!/usr/bin/env node
'use strict';
// S01-VIS-DECISION-02: real isolated Chromium 375/390 verification, never deploy.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s01-vis-decision-02');
const host='http://127.0.0.1:4629',port=4629;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}
  catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,data)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
const results=[];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
   await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
   await s01.locator('link[href*="s01-vis-decision-02.css"]').waitFor({state:'attached'});
   assert.equal(await s01.locator('.store-card[data-card-kind="expanded"]').count(),2,'first two expanded stores');
   assert.equal(await s01.locator('.s01-estore-card').count(),1,'E-store appears exactly once');
   assert.equal(await s01.locator('.nav-more:visible,.nav-target:visible').count(),0,'redundant top controls visible');
   assert.equal(await s01.locator('.filter').count(),3,'three approved filters');
   const geom=await s01.locator('.store-card[data-card-kind="expanded"]').first().evaluate(el=>{
     const visible=[...el.querySelectorAll('.unit')].filter(x=>!x.hidden);
     const photo=el.querySelector('.store-photo').getBoundingClientRect();
     const unit=visible[0],button=unit.querySelector('.order').getBoundingClientRect();
     const tag=el.querySelector('.store-tags span:not([hidden])');
     const addr=el.querySelector('.address-copy');
     return {units:visible.length,photo:{w:photo.width,h:photo.height},
       orderHeight:button.height,detailsHeight:el.querySelector('.s01-store-detail').getBoundingClientRect().height,
       tagFont:tag?parseFloat(getComputedStyle(tag).fontSize):null,addressFont:parseFloat(getComputedStyle(addr).fontSize),
       shadow:getComputedStyle(el).boxShadow,rate:el.querySelector('.store-cubic-price')?.textContent};
   });
   assert.equal(geom.units,1,'S01 each expanded store shows one unit');
   assert(geom.photo.w>=86&&geom.photo.w<=90&&geom.photo.h>=86&&geom.photo.h<=90,'88x88 store image');
   assert(geom.orderHeight>=48&&geom.detailsHeight>=44,'unit/store touch target');
   assert(geom.addressFont>=12&&geom.tagFont>=12,'text size minimum');
   assert.equal(geom.shadow,'none','flat card no unapproved shadow');
   assert.match(geom.rate,/门店低至.*\/m³\/月/);
   assert(!geom.rate.includes('个月租期'),'avoid repeated term copy');
   const horizontal=await s01.locator('html').evaluate(el=>el.scrollWidth-innerWidth);
   assert(horizontal<=2,'horizontal overflow '+horizontal);
   await page.screenshot({path:path.join(out,'S01-default-'+width+'.png'),fullPage:false});
   // Anonymous public price sorting must not launch phone verification.
   const auth=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.authorized());
   assert.equal(auth,false,'test should begin anonymous');
   await s01.locator('.filter').first().click();
   await s01.locator('[data-sort="price"]').click();
   const sorted=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
   assert.equal(sorted.filterLabels[0],'价格优先');
   assert.equal(await app.locator('.control-sheet').count(),0,'price sorting triggered phone modal');
   const rates=sorted.stores.map(s=>Number(String(s.publicCubicPrice||'').replace(/[^\d.]/g,''))).filter(Number.isFinite);
   assert(rates.every((n,i)=>i===0||rates[i-1]<=n),'anonymous sorting matches public visible cubic rate');
   await page.screenshot({path:path.join(out,'S01-price-sorted-'+width+'.png'),fullPage:false});
   // Filter anchor stays at viewport top after scrolling, dropdown remains attached.
   await s01.locator('body').evaluate(()=>window.scrollTo(0,280));
   const sticky=await s01.locator('.s01-filter-anchor').evaluate(el=>({
     top:el.getBoundingClientRect().top,position:getComputedStyle(el).position,scrollY:window.scrollY
   }));
   assert.equal(sticky.position,'sticky','sticky CSS not loaded');
   assert(sticky.scrollY>140,'list did not scroll');
   assert(sticky.top>=-2&&sticky.top<=2,'sticky filter not at top '+JSON.stringify(sticky));
   await s01.locator('.filter').first().click();
   await s01.locator('#s01-inline-panel').waitFor({state:'visible'});
   const panel=await s01.locator('#s01-inline-panel').evaluate(el=>{
     const r=el.getBoundingClientRect(),filters=document.querySelector('.filters').getBoundingClientRect();
     return {top:r.top,filterBottom:filters.bottom,height:r.height};
   });
   assert(Math.abs(panel.top-panel.filterBottom)<=3,'dropdown disconnected from sticky filter');
   await page.screenshot({path:path.join(out,'S01-sticky-sort-'+width+'.png'),fullPage:false});
   // Empty search must preserve independent E-store, advisor and reset.
   await s01.locator('#s01-search').fill('绝无此门店2026');
   await s01.locator('.s01-empty-state').waitFor({state:'visible'});
   assert.equal(await s01.locator('.s01-estore-card').count(),1);
   assert.equal(await s01.locator('[data-s01-advisor]').count(),1);
   assert.equal(await s01.locator('[data-s01-clear]').count(),1);
   await page.screenshot({path:path.join(out,'S01-empty-'+width+'.png'),fullPage:false});
   await s01.locator('[data-s01-clear]').click();
   await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
   assert.equal(await s01.locator('.s01-empty-state').count(),0,'reset did not restore stores');
   const reset=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
   assert.equal(reset.keyword,'','reset must clear search');
   assert.equal(reset.filterLabels[0],'排序');
   assert.equal(reset.servicesSelected.length,0);
   assert.equal(reset.maxKm,null);
   assert.equal(reset.quickSelected.length,0);
   // Advisor reuses existing BOOKING flow; phone/address guards remain in that flow.
   await s01.locator('#s01-search').fill('绝无此门店2026');
   await s01.locator('[data-s01-advisor]').click();
   await app.locator('#screen.page-BOOKING').waitFor();
   assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.authorized()),false,
     'advisor path must not silently authorize phone');
   assert.deepEqual(errors,[],'JavaScript errors');
   results.push({width,height,status:'PASS',geom,sticky,panel,anonymousPriceSort:true,
     noMatchAdvisor:true,estoreFallback:true,fullReset:true,jsErrors:errors.length});
  }finally{await context.close();}
 }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',offlineChromium:true,
   deployed:false,visualHumanSigned:false,results},null,2));
 console.log('S01_VIS_DECISION_02_PASS '+JSON.stringify(results.map(r=>({width:r.width,sticky:r.sticky.top}))));
})().catch(e=>{
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',message:e.stack||String(e)},null,2));
 console.error('S01_VIS_DECISION_02_FAIL '+(e.stack||e));process.exitCode=1;
});
