#!/usr/bin/env node
'use strict';
// RC2-UX-QUALITY-REBASE-03: source-identical isolated Chromium QA, NO Netlify deploy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-ux-quality-rebase-03');
const host='http://127.0.0.1:4616';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
const cases=[];
function rect(el){const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4616,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(host+'/central-review-02g.html?catalog=sim&page=S5&s01_r2=1',{waitUntil:'domcontentloaded'});
   const app=page.frameLocator('#central-host');
   await app.locator('#screen').evaluate(()=>{
    const b=window.SIM_DEMO;b.core.setRequirement(3,12,true);b.persist();b.navigate('S5');
   });
   const s5=app.frameLocator('#br04-frame');
   await s5.locator('.s5-store-card[data-rank="0"]:not([hidden]) .s5-unit-price').first().waitFor();
   const cards=s5.locator('.s5-store-card:not([hidden])');
   assert.equal(await cards.count(),2,'S5 must retain two real matching stores');
   const initial=await cards.evaluateAll(el=>el.map(x=>({
    rank:x.getAttribute('data-rank'),storeId:x.dataset.storeId,
    rect:(()=>{const r=x.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}})(),
    photo:{width:x.querySelector('.s5-store-photo')?.getBoundingClientRect().width,height:x.querySelector('.s5-store-photo')?.getBoundingClientRect().height},
    visibleUnitRows:[...x.querySelectorAll('.s5-unit-row')].filter(y=>!y.hidden).length,
    alternateUnits:x.querySelectorAll('.s5-alt-unit').length
   })));
   assert(initial.every(x=>x.photo.width>=86&&x.photo.width<=90&&x.photo.height>=86&&x.photo.height<=90),'S5 list photos must match S01 style 88x88');
   assert(initial[1].rect.top<height-110,'second recommended store not visible high enough for comparison');
   assert(initial.every(x=>x.visibleUnitRows===1&&x.alternateUnits===0),'one matched unit per store is frozen');
   assert.equal(await s5.locator('#s5-compare,.s5-comparison-table,.s5-alt-toggle,.s5-alt-unit').count(),0,'forbidden comparison or alternate unit reintroduced');
   assert.equal(await s5.locator('.s5-store-map').count(),2,'each store needs an icon-only map entry');
   assert.equal(await s5.locator('button.s5-store-photo').count(),2,'store photos must be clickable to open details');
   assert.equal(await s5.locator('.s5-store-open').count(),2,'store titles must be clickable');
   assert.equal((await s5.locator('.s5-store-open').allInnerTexts()).some(t=>t.includes('查看门店')),false,'avoid redundant view-store text');
   assert.equal(await s5.locator('.estore').count(),1,'E-storage service card missing');
   const estorePosition=await s5.locator('.estore').evaluate(el=>({
     afterStoreCards:!!(el.compareDocumentPosition(document.querySelector('.recommend-wrap'))&Node.DOCUMENT_POSITION_PRECEDING),
     beforeMoreUnits:!!(el.compareDocumentPosition(document.querySelector('.more-units'))&Node.DOCUMENT_POSITION_FOLLOWING)
   }));
   assert(estorePosition.afterStoreCards&&estorePosition.beforeMoreUnits,'E-storage must follow the two real stores');
   assert.match(await s5.locator('#capacity').innerText(),/3m³.*12个月/,'capacity and term must appear in one summary');
   assert.equal(await s5.locator('.term,#term-edit,#more-term').count(),0,'separate term section must be physically absent');
   assert.equal(await s5.locator('button#change-origin').count(),1,'whole location row must be interactive');
   assert.equal(await s5.locator('.s5-unit-terms .s5-unit-monthly').count(),2,'monthly price must be in same container as term rent');
   const payableTexts=await cards.locator('.s5-store-payable').allInnerTexts();
   const expectedPayables=await app.locator('#screen').evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core,s=c.state(),rows=b.s5Offers?.()||b.offers();
      return rows.slice(0,2).map(x=>c.amounts(x.ids,s.requirement.term_months).payable);
   });
   assert.equal(payableTexts.length,2,'both stores must disclose first payable');
   for(let i=0;i<2;i++)assert(payableTexts[i].includes(expectedPayables[i].toLocaleString('zh-CN')),'first payable mismatch '+i);
   const beforePrices=await s5.locator('.s5-unit-row:not([hidden]) .s5-unit-price').evaluateAll(nodes=>nodes.map(e=>{
     const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {value:e.innerText,clip:e.scrollWidth>e.clientWidth+1,font:parseFloat(s.fontSize),rect:{w:r.width,h:r.height}};
   }));
   assert(beforePrices.length>=2);
   assert(beforePrices.every(x=>x.font>=14&&!x.clip),'readable term prices should not be clipped');
   const controls=await s5.locator('#modify,#change-origin,.s5-store-open,.s5-store-address button,.s5-unit-row:not([hidden]) .s5-unit-price,.s5-unit-row:not([hidden]) .s5-unit-buy,.s5-store-payable').evaluateAll(elements=>{
    const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
    return elements.filter(visible).map(e=>({text:(e.innerText||e.getAttribute('aria-label')||'').trim(),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)}));
   });
   assert(controls.length>=10,'expected all important controls');
   assert(controls.every(c=>c.width>=44&&c.height>=44),'sub-44px interactive targets: '+JSON.stringify(controls.filter(c=>c.width<44||c.height<44)));
   assert((await s5.locator('html').evaluate(el=>el.scrollWidth))<=width+2,'horizontal overflow');
   await page.screenshot({path:path.join(out,'S5-two-store-'+width+'.png'),fullPage:false});
   await s5.locator('body').screenshot({path:path.join(out,'S5-EStore-third-'+width+'.png')});
   const unitPrices=await s5.locator('.s5-unit-row .s5-unit-price').allInnerTexts();
   assert.equal(unitPrices.length,2,'exactly one matching unit must be rendered for each store');
   const samePriceGroup=await s5.locator('.s5-unit-terms').evaluateAll(els=>els.every(el=>el.querySelector('.s5-unit-price')&&el.querySelector('.s5-unit-monthly')));
   assert(samePriceGroup,'term price and monthly average must share the same price container');
   const anonState=await app.locator('#screen').evaluate(()=>{
    const c=window.SIM_DEMO.core,s=c.state();return {authorized:c.authorized(),quote:!!s.quote,orders:s.orders.length};
   });
   assert.equal(anonState.authorized,false);
   assert.equal(anonState.quote,false);
   assert.equal(anonState.orders,0);
   cases.push({width,height,status:'PASS',firstCards:initial,prices:beforePrices,firstPayables:payableTexts,controls,estorePosition,anonState});
   console.log('UX_REBASE_03_VIEWPORT '+JSON.stringify({width,secondTop:Math.round(initial[1].rect.top),controls:controls.length,unitRows:unitPrices.length,estoreThird:true}));
   assert.deepEqual(errors,[],'browser JS error(s)');
  }finally{await context.close()}
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',kind:'OFFLINE_CHROMIUM_NOT_SSO_UAT',cases,reviewedRentDisplayCeiling:100000,formalProductionRentCapNotEnforced:true,mainMerged:false},null,2));
 console.log('RC2_UX_QUALITY_REBASE_03_PASS '+cases.length);
})().catch(err=>{console.error('RC2_UX_QUALITY_REBASE_03_FAIL '+(err.stack||err));process.exitCode=1});
