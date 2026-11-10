#!/usr/bin/env node
'use strict';
// RC2-VISUAL-DECISION-01: verify real S01/S02 iframe model and price ownership at 375/390.
// Uses only locally built isolated RC2 candidate. No deployment, real orders or live APIs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-visual-decision-01');
const host='http://127.0.0.1:4594';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,body)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(body));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4594,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const records=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
   await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
   await s01.locator('.store-cubic-price').first().waitFor({state:'visible'});
   await s01.locator('link[href="s01-r2-price-surface.css"]').waitFor({state:'attached'});
   const snapshot=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
   const cards=s01.locator('.store-card[data-card-kind="expanded"]');
   assert.equal(await cards.count(),2,'two ranked expanded stores');
   const observations=await cards.evaluateAll(elements=>elements.map(card=>({
     storeId:card.dataset.storeId,
     publicCount:card.querySelectorAll('.store-cubic-price').length,
     publicText:card.querySelector('.store-cubic-price')?.textContent||'',
     perUnit:[...card.querySelectorAll('.unit:not([hidden])')].map(unit=>({
       kind:unit.querySelector('.price')?.dataset.priceKind,
       price:unit.querySelector('.price strong')?.textContent,
       suffix:unit.querySelector('.price span')?.textContent,
       term:unit.querySelector('.price-secondary')?.textContent,
       ctaHeight:unit.querySelector('.order')?.getBoundingClientRect().height
     })),
     scrollWidth:card.scrollWidth,clientWidth:card.clientWidth
   })));
   observations.forEach(row=>{
     const model=snapshot.stores.find(s=>s.id===row.storeId);
     assert(model,'store identity must exist in the shared bridge');
     assert.equal(row.publicCount,1,'one store-level cubic price only');
     assert.match(row.publicText,/门店低至.*\/m³\/月/);
     assert(row.publicText.includes(model.publicCubicPrice),'public minimum based on same central source');
     assert(row.perUnit.length>0,'expanded store shows selectable units');
     for(let i=0;i<row.perUnit.length;i++){
       const unit=row.perUnit[i],given=model.units[i];
       assert.equal(unit.kind,'unit_month','public store cubic number must not be copied onto each unit');
       assert.equal(unit.price,given.price,'individual unit price must follow its own unit ID');
       assert.equal(unit.suffix,'/月');
       assert.equal(unit.term,snapshot.termMonths||model.publicCubicTerm+'个月租期');
       assert(unit.ctaHeight>=48,'S01 choose unit touch target must be at least 48px');
     }
     assert(row.scrollWidth<=row.clientWidth+2,'expanded store horizontal overflow');
   });
   const pageWidth=await s01.locator('html').evaluate(el=>el.scrollWidth);
   assert(pageWidth<=width+2,'S01 page overflows on '+width);
   await page.screenshot({path:path.join(out,'s01-public-price-'+width+'.png'),fullPage:true});
   // Following the same list into S02 must not claim urgency from unverified synthetic stock.
   await cards.first().locator('h2').click();
   await app.locator('#screen.page-S02').waitFor();
   assert.equal(await app.locator('.s02-hot').count(),0,'synthetic inventory must not trigger urgent marketing banner');
   assert.equal(await app.getByText('热门仓型余量紧张',{exact:false}).count(),0,'legacy scarcity claim leaked');
   const firstModel=snapshot.stores[0].units[0];
   const actualDetailMonthly=await app.locator('.unit-row[data-unit="'+firstModel.id+'"] .unit-price .br03-price-main').innerText();
   assert.equal(actualDetailMonthly,firstModel.price,'S01 to S02 must not jump from discounted monthly to standard monthly');
   const detailBasis=await app.locator('.unit-row[data-unit="'+firstModel.id+'"] .unit-price .br03-reference').innerText();
   assert(detailBasis.includes(String(snapshot.stores[0].publicCubicTerm)+'个月租期'),'S02 reference month must disclose discount term');
   await page.screenshot({path:path.join(out,'s02-no-unverified-scarcity-'+width+'.png'),fullPage:true});
   assert.deepEqual(errors,[],'JavaScript runtime errors');
   records.push({width,status:'PASS',publicStoreCards:observations.length,unitPrices:observations.map(v=>v.perUnit.map(u=>u.price)),s02UnverifiedUrgency:false});
   await context.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',source:'SAME_GITHUB_SHA_ISOLATED',cases:records,visualHumanSignoff:false},null,2));
  console.log('RC2_VISUAL_DECISION_01_BROWSER_PASS '+JSON.stringify(records));
 }finally{await browser.close();await new Promise(done=>server.close(done));}
})().catch(e=>{console.error(e);process.exitCode=1;});
