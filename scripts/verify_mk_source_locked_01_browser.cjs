#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../app');
const OUT=path.resolve(__dirname,'../release-evidence/mk-source-locked-01');
const PORT=4721,HOST='http://127.0.0.1:'+PORT;
const MIME={'.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
let p;try{p=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,HOST).pathname));}catch(e){res.writeHead(400).end();return;}
if(!p.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end('missing');return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'}).end(b);});
});
(async()=>{
fs.mkdirSync(OUT,{recursive:true});await new Promise(ok=>server.listen(PORT,HOST.split('//')[1].split(':')[0],ok));
let browser;
try{
browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:1200,height:920},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
const p=await ctx.newPage(),errors=[],result=[],foldFailures=[],foldObservations=[];
p.on('pageerror',e=>errors.push(e.message));
await p.goto(HOST+'/design-exploration/mk-design-direction-source-locked-01.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>document.getElementById('status').textContent.includes('原版已载入'),{timeout:25000});
const readS01=()=>p.evaluate(()=>{
const app=window.MK_SOURCE_LOCKED.getApp(),doc=window.MK_SOURCE_LOCKED.getS01Frame();
if(!app||!doc)return null;
const cards=[...doc.querySelectorAll('.store-card[data-store-id]')].slice(0,2);
return {appReady:!!app,matched:!!app.s01R2Bridge?.snapshot()?.matched,
 cards:cards.map(c=>({id:c.dataset.storeId,address:c.querySelector('.address-copy')?.textContent||'',addressTitle:c.querySelector('.address-copy')?.title||'',
  unitCount:[...c.querySelectorAll('.unit')].filter(u=>!u.hidden).length,
  unitContent:[...c.querySelectorAll('.unit')].filter(u=>!u.hidden).map(u=>u.innerText).join('|'),
  visibleContent:c.innerText,
  layout:(()=>{
   const address=c.querySelector('.address-copy'),price=c.querySelector('.unit-action-row .price'),
    order=c.querySelector('.unit-action-row .order'),desc=c.querySelector('.unit-desc');
   const pa=price?.getBoundingClientRect(),ba=order?.getBoundingClientRect();
   return {addressDisplay:address?getComputedStyle(address).display:'',
     addressWhiteSpace:address?getComputedStyle(address).whiteSpace:'',
     addressClientHeight:address?.clientHeight||0,addressScrollHeight:address?.scrollHeight||0,
     priceRight:pa?.right||0,orderLeft:ba?.left||0,orderHeight:ba?.height||0,
     descriptionClientHeight:desc?.clientHeight||0,descriptionScrollHeight:desc?.scrollHeight||0};
  })()
 })),
 fixtureAddresses:cards.map(c=>app.core.fixture.stores.find(s=>s.id===c.dataset.storeId)?.address||'')}
});
for(const width of [375,390]){
await p.locator('[data-width="'+width+'"]').click();
const inner=await p.locator('#source').evaluate(e=>Math.round(e.getBoundingClientRect().width));
assert.equal(inner,width,'actual source iframe must be '+width+'px');
await p.waitForFunction(()=>window.MK_SOURCE_LOCKED.getS01Frame()!==null);
let baseline=await readS01();
assert(baseline?.matched,'original S01 matched state is required');
assert.equal(baseline.cards.length,2,'S01 first two original store cards');
for(let k=0;k<2;k++){
const c=baseline.cards[k];
assert(c.address&&c.address===baseline.fixtureAddresses[k], 'address must match unabridged original store fixture: '+c.id);
assert.equal(c.addressTitle,c.address,'title must preserve full address');
assert(c.unitCount>0,'must retain current matched unit offer '+c.id);
assert(!c.visibleContent.includes('匹配仓位'),'do not add phrase 匹配仓位');
assert(!c.visibleContent.includes('6个月示例'),'do not add phrase 6个月示例');
assert(!c.visibleContent.includes('到店导航'),'do not invent navigation copy');
assert.equal(c.layout.addressWhiteSpace,'normal','full original address must wrap rather than truncate');
assert(c.layout.addressClientHeight>=17,'detailed address must have visible height');
assert(c.layout.addressScrollHeight<=c.layout.addressClientHeight+2,'detailed address must not be clipped');
assert(c.layout.orderHeight>=47,'existing order button must stay 48px high');
assert(c.layout.priceRight<=c.layout.orderLeft+2,'total price must not overlap the order button');
assert(c.layout.descriptionScrollHeight<=c.layout.descriptionClientHeight+2,'unit usage copy must not be clipped');
}
// V0.3 candidate visual contract: validates COMPUTED values in the actual same-source S01 frame.
const palette=await p.evaluate(()=>{
 const d=window.MK_SOURCE_LOCKED.getS01Frame();
 const style=selector=>{
  const e=d.querySelector(selector);
  if(!e)throw Error('Missing candidate visual selector '+selector);
  const s=getComputedStyle(e);
  return {bg:s.backgroundColor,color:s.color,border:s.borderBottomColor,fontSize:s.fontSize};
 };
 const root=getComputedStyle(d.documentElement);
 return {
  vars:['--s01-r-ink','--s01-r-muted','--s01-r-green','--s01-r-hair','--s01-r-surface','--s01-r-price'].map(n=>[n,root.getPropertyValue(n).trim()]),
  stage:style('.stage'),canvas:style('.canvas'),stores:style('.stores'),
  context:style('.s01-context'),quick:style('.s01-quick'),
  expanded:style('.store-card[data-card-kind="expanded"]'),
  name:style('.store-card[data-card-kind="expanded"] .store-body h2'),
  address:style('.store-card[data-card-kind="expanded"] .address-copy'),
  capacity:style('.store-card[data-card-kind="expanded"] .capacity'),
  price:style('.store-card[data-card-kind="expanded"] .price[data-price-kind="term"] strong'),
  order:style('.store-card[data-card-kind="expanded"] .order')
 };
});
const WHITE='rgb(255, 255, 255)',BRAND='rgb(0, 108, 84)',INK='rgb(32, 37, 34)',
 MUTED='rgb(92, 98, 95)',PRICE='rgb(166, 70, 18)';
for(const field of ['stage','canvas','stores','context','quick','expanded'])
 assert.equal(palette[field].bg,WHITE,'V0.3 white page background: '+field);
assert.equal(palette.name.color,INK,'V0.3 text-primary on store title');
assert.equal(palette.capacity.color,INK,'V0.3 text-primary on capacity');
assert.equal(palette.address.color,MUTED,'V0.3 secondary text on full address');
assert.equal(palette.price.color,PRICE,'V0.3 proposed candidate key price (NOT USER SIGNED)');
assert.equal(palette.order.bg,BRAND,'V0.3 proposed candidate primary button green');
result.push({width,page:'S01_V03_COMPUTED',palette});
// Check that the second visible CTA is not hidden behind the fixed bottom nav
// in the user's initial 375/390 screenshot, even if DOM text and prices are valid.
const fold=await p.evaluate(()=>{
 const shell=document.getElementById('source').contentDocument;
 const nav=shell?.querySelector('.bottom-nav');
 const innerFrame=shell?.querySelector('#s01-r2-frame');
 const cardDoc=innerFrame?.contentDocument;
 const buttons=[...(cardDoc?.querySelectorAll('.store-card[data-card-kind="expanded"] .unit-action-row .order')||[])];
 if(!nav||!innerFrame||buttons.length<2)return null;
 const frameRect=innerFrame.getBoundingClientRect();
 return {navTop:nav.getBoundingClientRect().top,
  secondCTAEnd:frameRect.top+buttons[1].getBoundingClientRect().bottom,
  firstCTAEnd:frameRect.top+buttons[0].getBoundingClientRect().bottom};
});
assert(fold,'bottom-nav and both matched CTAs are required');
// Screen 1 does NOT have to contain both complete cards. Preserve readable
// text rather than force a layout to squeeze two CTAs above the fixed tab bar.
foldObservations.push({width,fold,secondInitiallyAboveBar:fold.secondCTAEnd+3<=fold.navTop});
const reachable=await p.evaluate(()=>{
 const shell=document.getElementById('source').contentDocument;
 const nav=shell?.querySelector('.bottom-nav'),frame=shell?.querySelector('#s01-r2-frame');
 const d=frame?.contentDocument;
 const btn=d?.querySelectorAll('.store-card[data-card-kind="expanded"] .unit-action-row .order')[1];
 if(!nav||!frame||!d||!btn)return {error:'missing frame, button or nav'};
 const scrolling=d.scrollingElement||d.documentElement;
 const initial={scroll:scrolling.scrollTop,scrollHeight:scrolling.scrollHeight,clientHeight:scrolling.clientHeight};
 // Test the native scrolling behavior; do not hide or move the fixed nav.
 scrolling.scrollTop=Math.max(0,scrolling.scrollHeight-scrolling.clientHeight);
 const scrollAfter=scrolling.scrollTop;
 const btnRect=btn.getBoundingClientRect(),frameRect=frame.getBoundingClientRect(),navRect=nav.getBoundingClientRect();
 const top=frameRect.top+btnRect.top,bottom=frameRect.top+btnRect.bottom;
 const result={top,bottom,navTop:navRect.top,scrollAfter,initial,insideFrame:btnRect.top>=-2&&btnRect.bottom<=frameRect.height+2};
 scrolling.scrollTop=initial.scroll;
 return result;
});
if(reachable.error||!reachable.insideFrame||reachable.bottom>reachable.navTop+2||reachable.top<0)foldFailures.push({width,reachable});
result.push({width,page:'S01_SCROLL_REACHABILITY',reachable,fold});
for(const variant of ['A','B']){
 await p.locator('[data-variant="'+variant+'"]').click();
 const snap=await readS01();
 assert.deepEqual(snap.cards.map(c=>({id:c.id,address:c.address,unit:c.unitContent,copy:c.visibleContent})),
 baseline.cards.map(c=>({id:c.id,address:c.address,unit:c.unitContent,copy:c.visibleContent})),
 'changing visual direction must not change ANY store text or unit values');
 const image='S01-'+variant+'-'+width+'.png';
 await p.locator('#device').screenshot({path:path.join(OUT,image)});
 result.push({width,variant,page:'S01',screenshot:image,cards:snap.cards.map(c=>({id:c.id,address:c.address,matched_units:c.unitCount}))});
}
// S01 browse-state regression: no new matching copy, existing third E-storage,
// and original fourth+ compact store cards must remain.
await p.evaluate(()=>{
 const app=window.MK_SOURCE_LOCKED.getApp();
 app.core.setScenario('noDemand');app.navigate('S01');
});
await p.waitForFunction(()=>{
 const doc=window.MK_SOURCE_LOCKED.getS01Frame();
 return doc?.documentElement?.dataset.matchMode==='browse';
},{timeout:15000});
const browse=await p.evaluate(()=>{
 const doc=window.MK_SOURCE_LOCKED.getS01Frame();
 const nodes=[...doc.querySelector('.stores').children];
 const compact=nodes.filter(n=>n.matches('.s01-compact-store'));
 return {
  matched:doc.documentElement.dataset.matchMode,
  compactCount:compact.length,
  eStoreRank:nodes.findIndex(n=>n.matches('.s01-estore-card'))+1,
  matchedCards:nodes.filter(n=>n.matches('[data-card-kind="expanded"]')).length,
  explicitUnitRows:compact.reduce((n,c)=>n+c.querySelectorAll('.unit').length,0),
  addresses:compact.slice(0,2).map(n=>n.querySelector('.address-copy')?.textContent||''),
  publicPriceColors:compact.slice(0,2).map(n=>getComputedStyle(n.querySelector('.s01-compact-side strong')).color)
 };
});
assert.equal(browse.matched,'browse','no-demand browsing state');
assert(browse.compactCount>=2,'browse list should show compact stores');
assert.equal(browse.eStoreRank,3,'E-storage remains fixed third');
assert.equal(browse.matchedCards,0,'browse must not show matched-card layout');
assert.equal(browse.explicitUnitRows,0,'browse must not manufacture unit offers');
assert.deepEqual(browse.publicPriceColors,['rgb(166, 70, 18)','rgb(166, 70, 18)'],
 'V0.3 proposed browse store prices use same price accent as matched total');
const browseFile='S01-BROWSE-'+width+'.png';
await p.locator('#device').screenshot({path:path.join(OUT,browseFile)});
result.push({width,page:'S01_BROWSE',screenshot:browseFile,browse});
await p.evaluate(()=>{
 const app=window.MK_SOURCE_LOCKED.getApp();
 app.core.setScenario('promoSpecial');app.navigate('S01');
});
await p.waitForFunction(()=>window.MK_SOURCE_LOCKED.getS01Frame()?.documentElement?.dataset.matchMode==='matched');
}
fs.writeFileSync(path.join(OUT,'source-lock-report.json'),JSON.stringify({sha:process.env.GITHUB_SHA,results:result,errors,foldFailures,foldObservations},null,2));
assert.deepEqual(errors,[],'no browser errors');
assert.equal(foldFailures.length,0,'second original CTA unreachable after normal scrolling: '+JSON.stringify(foldFailures));
console.log('SOURCE_LOCKED_S01_PASS',process.env.GITHUB_SHA,result.length);
await ctx.close();
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error('SOURCE_LOCKED_S01_FAIL',e.stack||e);process.exitCode=1;});
