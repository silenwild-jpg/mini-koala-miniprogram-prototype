#!/usr/bin/env node
'use strict';
// Isolated A/B visual comparison. Does not deploy/merge/sign off the master.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const site=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s01-ux-refine-05');
const host='http://127.0.0.1:4645';
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(site,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return}
  if(!file.startsWith(site+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(err,b)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b));
});
const results=[];
const almost=(a,b,tolerance=2)=>Math.abs(a-b)<=tolerance;
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4645,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const variant of ['A','B']){
   for(const [width,height]of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     const url=host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1&s01_ux_refine='+variant;
     await page.goto(url,{waitUntil:'domcontentloaded'});
     const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
     await s01.locator('.store-card[data-card-kind="compact"]').first().waitFor();
     await s01.locator('link[href*="s01-ux-refine-05.css"]').waitFor({state:'attached'});
     const root=await s01.locator('html').getAttribute('data-s01-ux-refine');
     assert.equal(root,variant);
     const browse=await s01.locator('body').evaluate(body=>{
       const ctx=body.querySelector('.s01-context'),chips=body.querySelector('.s01-quick'),stores=body.querySelector('.stores');
       const cr=ctx.getBoundingClientRect(),sr=stores.getBoundingClientRect(),qr=chips.getBoundingClientRect();
       return {
         context:ctx.innerText.trim(),cta:ctx.querySelector('button.s01-edit').textContent,
         contextHeight:cr.height,contextTop:cr.y,quickBottom:qr.bottom,storesTop:sr.y,
         firstCardHeight:body.querySelector('.store-card.s01-compact').getBoundingClientRect().height,
         allCompact:body.querySelectorAll('.store-card.s01-compact').length,
         matchCount:body.querySelectorAll('.store-card[data-card-kind="expanded"]').length,
         eCount:body.querySelectorAll('.s01-estore-card').length,
         overflow:document.documentElement.scrollWidth-innerWidth
       };
     });
     assert(browse.context.includes(variant==='A'?'不知道租多大？':'先估算需要多大空间'));
     assert.equal(browse.cta.trim(),'估算一下 ›');
     assert(browse.quickBottom<=browse.contextTop+3&&crIsOrdered(browse.contextTop,browse.storesTop),'visual hierarchy changed');
     assert.equal(browse.matchCount,0);assert.equal(browse.eCount,1);assert(browse.allCompact>=3);
     assert(browse.overflow<=2,'browse horizontal overflow');
     await page.screenshot({path:path.join(out,variant+'-browse-'+width+'.png'),fullPage:false});
     const details=[];
     for(const months of [12,60]){
       await app.locator('#screen').evaluate((_,m)=>{
         const core=window.SIM_DEMO.core;core.setRequirement(3,m,true);
         window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S01');
       },months);
       const first=s01.locator('.store-card[data-card-kind="expanded"]').first();
       await first.waitFor();
       const data=await s01.locator('body').evaluate(body=>{
         const ctx=body.querySelector('.s01-context'), cards=[...body.querySelectorAll('.store-card[data-card-kind="expanded"]')];
         return {
           context:ctx.innerText.trim(),contextHeight:ctx.getBoundingClientRect().height,
           ctaLabel:ctx.querySelector('.s01-edit').textContent.trim(),
           cards:cards.map(card=>{
             const unit=card.querySelector('.unit:not([hidden])'),meta=unit?.querySelector('.s01-ux-unit-meta'),action=unit?.querySelector('.order'),price=unit?.querySelector('.price'),amount=price?.querySelector('strong'),secondary=price?.querySelector('.price-secondary');
             const br=card.getBoundingClientRect(),ur=unit?.getBoundingClientRect(),mr=meta?.getBoundingClientRect(),pr=price?.getBoundingClientRect(),ar=action?.getBoundingClientRect();
             return {
               id:card.dataset.storeId,cardHeight:br.height,unitHeight:ur?.height,
               meta:meta?.innerText.replace(/\\s+/g,' ').trim(),
               metaY:mr?.y,priceY:pr?.y,actionY:ar?.y,
               actionHeight:ar?.height,actionWidth:ar?.width,
               price:amount?.textContent,secondary:secondary?.textContent,
               priceFont:amount?parseFloat(getComputedStyle(amount).fontSize):null,
               priceFits:amount?amount.scrollWidth<=amount.clientWidth+1:false,
               priceRight:pr?.right,actionLeft:ar?.left,
               visualRow:Math.abs((pr?.y||0)-(ar?.y||0))<=6,
               priceOverflow:price?price.scrollWidth-price.clientWidth:999,
               units:card.querySelectorAll('.unit:not([hidden])').length,
               cubic:!!card.querySelector('.store-cubic-price:not([hidden])')
             };
           }),
           compactCount:body.querySelectorAll('.store-card.s01-compact').length,
           eCount:body.querySelectorAll('.s01-estore-card').length,
           overflow:document.documentElement.scrollWidth-innerWidth
         };
       });
       assert.equal(data.cards.length,2);assert.equal(data.eCount,1);
       assert.equal(data.ctaLabel,'修改 ›');assert(data.context.includes('3m³')&&data.context.includes(months+'个月'));
       for(const c of data.cards){
        assert.equal(c.units,1,'two physical stores must each show one unit');
        assert(!c.cubic,'matched card must not display public cubic price');
        assert(c.meta.includes('仓位')&&/m(?:3|³)/.test(c.meta)&&c.meta.includes('适合'),'meta missing label, size or usage: '+c.meta);
        assert.equal(c.actionHeight,48);assert(c.priceFont>=21,'total price not dominant');
        assert(c.priceFits,'actual whole-term price clipped');
        assert(c.secondary.includes('/月 × '+months+'个月'));
        assert(c.priceOverflow<=2,'price container exceeds allocation');
        assert(variant==='A'?c.visualRow:!c.visualRow,'variant did not produce intended CTA structure');
       }
       assert(data.overflow<=2,'matched horizontal overflow');
       // Compare like-for-like in each viewport, including long-term high price.
       await page.screenshot({path:path.join(out,variant+'-matched-'+months+'m-'+width+'.png'),fullPage:false});
       details.push({months,...data});
     }
     assert.deepEqual(errors,[],'runtime JS errors');
     results.push({variant,width,height,browse,matched:details,errors:errors.length,status:'PASS'});
     await context.close();
    }catch(e){await page.screenshot({path:path.join(out,variant+'-FAIL-'+width+'.png')}).catch(()=>{});throw e}
   }
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',verifiedSource:'isolated GitHub candidate',noDeploy:true,noMerge:true,visualSignoff:false,results},null,2));
  console.log('S01_UX_REFINE_05_PASS '+JSON.stringify(results.map(r=>({variant:r.variant,width:r.width,context:r.browse.contextHeight,matched12:r.matched[0].cards[0].cardHeight,matched60:r.matched[1].cards[0].cardHeight}))));
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',error:e.stack||String(e)},null,2));console.error('S01_UX_REFINE_05_FAIL '+(e.stack||e));process.exitCode=1});
function crIsOrdered(contextTop,storesTop){return contextTop<storesTop}
