#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),out=path.resolve(__dirname,'../release-evidence/rc2-final-integration-02/screens');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let p;try{p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname))}catch{res.writeHead(400).end();return}
 if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(p,(e,b)=>e?res.writeHead(404).end('NOT_FOUND'):res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'}).end(b));
});
const base='http://127.0.0.1:4949/central-review-02g.html?catalog=sim&page=';
(async()=>{
 await new Promise(ok=>server.listen(4949,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const rows=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[],assets=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1')&&r.status()>=400)assets.push([r.status(),r.url().split('?')[0]])});
   await page.goto(base+'H01',{waitUntil:'domcontentloaded'});
   const home=page.frameLocator('#central-host');
   await home.locator('#storeRail .store-card').first().waitFor();
   assert.equal((await home.locator('.section-heading h2').innerText()).trim(),'为您推荐');
   assert.equal(await home.locator('.section-heading p,.section-heading button').count(),0);
   assert((await home.locator('.store-card.featured').evaluate(el=>getComputedStyle(el,'::after').content)).includes('距离最近'));
   await page.screenshot({path:path.join(out,'H01-'+width+'-top.png')});
   await page.goto(base+'S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   const central=page.frameLocator('#central-host'),s01=central.frameLocator('#s01-r2-frame');
   await s01.locator('#s01-search').waitFor({state:'visible'});
   await s01.locator('.s01-estore-card').waitFor({state:'attached'});
   assert.equal(await s01.locator('.filter').count(),3,'S01 three filters');
   assert.equal(await s01.locator('[data-quick="single"]').count(),0,'single filter must be removed');
   assert.equal(await s01.locator('.s01-result-summary').count(),0,'S01 result strip retired');
   const slots=await s01.locator('.stores').evaluate(el=>[...el.children].slice(0,4).map(n=>n.dataset.service||n.dataset.presentation||'unknown'));
   assert.deepEqual(slots,['expanded-two','expanded-two','estore','compact-direct'],'S01 cards 1/2 + fixed E + fourth compact');
   assert.equal(await s01.locator('.s01-estore-card').count(),1);
   await s01.locator('.s01-estore-card').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,'S01-'+width+'-estore-third.png')});
   const fourth=s01.locator('.store-card').nth(2);
   await fourth.scrollIntoViewIfNeeded();
   const imageBox=await fourth.locator('.store-photo').boundingBox();assert(imageBox&&imageBox.width>=108&&imageBox.width<=136,'S01 horizontal compact photo ratio');
   assert.equal(await fourth.locator('.order:visible,.price:visible,.s01-compact-summary:visible').count(),0);
   await page.screenshot({path:path.join(out,'S01-'+width+'-fourth-compact.png')});
   const sid=await fourth.getAttribute('data-store-id');await fourth.click();
   await central.locator('#screen.page-S02').waitFor({state:'attached'});
   assert.equal(await central.locator('body').evaluate(()=>window.SIM_DEMO.state().storeId),sid,'store ID preserved');
   await page.screenshot({path:path.join(out,'S02-'+width+'-after-S01.png')});
   await page.goto(base+'S5',{waitUntil:'domcontentloaded'});
   const s5=central.frameLocator('#br04-frame');
   await s5.locator('#artboard').waitFor();
   await central.locator('body').evaluate(()=>{window.SIM_DEMO.core.setRequirement(3,12,true);window.SIM_DEMO.navigate('S5');});
   await s5.locator('#term-summary-value').waitFor();
   await page.waitForTimeout(350);
   assert.equal((await s5.locator('#term-summary-value').innerText()).trim(),'12个月','S5 term inherited');
   assert.equal(await s5.locator('#term-options').isHidden(),true,'S5 term options should collapse');
   assert.equal(await s5.locator('.major-unit').isVisible(),true);
   assert.equal(await s5.locator('.minor-unit').isVisible(),true);
   const photos=await s5.locator('.major-photo img,.minor-photo').evaluateAll(es=>es.map(e=>({loaded:e.complete&&e.naturalWidth>=1000,src:e.src})));
   assert.equal(photos.length,2,'S5 two photos');
   assert(photos.every(p=>p.loaded&&p.src.includes('store-curated/v1/')),'S5 real photo loading '+JSON.stringify(photos));
   assert.notEqual(photos[0].src,photos[1].src,'S5 duplicate photos');
   assert.equal(await s5.locator('.store-preview-toggle,.store-previews').count(),0);
   const fits=await s5.locator('#artboard').evaluate(el=>el.scrollWidth<=el.clientWidth+1);
   assert(fits,'S5 horizontal overflow');
   await page.screenshot({path:path.join(out,'S5-'+width+'-matched-top.png')});
   await s5.locator('#app-viewport').evaluate(e=>e.scrollTop=Math.floor(e.scrollHeight/2));
   await page.screenshot({path:path.join(out,'S5-'+width+'-matched-mid.png')});
   await s5.locator('#app-viewport').evaluate(e=>e.scrollTop=e.scrollHeight);
   await page.screenshot({path:path.join(out,'S5-'+width+'-matched-bottom.png')});
   assert.deepEqual(errors,[],'browser JS errors');
   assert.deepEqual(assets,[],'missing assets');
   rows.push({width,height,home:true,s01:{slots,storeId:sid},s5:{term:'12个月',photoIDs:photos.map(p=>p.src.split('/').slice(-2,-1)[0])},jsErrors:errors.length,assetErrors:assets.length,pass:true});
   await ctx.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
 const result={source:'single RC2-FINAL-INTEGRATION-02 isolated candidate',head:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),pass:true,rows};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
