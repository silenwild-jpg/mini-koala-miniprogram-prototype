#!/usr/bin/env node
'use strict';
// VIS-SYSTEM-04B: read-only computed-style audit of one exact-SHA isolated build.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/vis-system-04b');
const host='http://127.0.0.1:4717',demo=host+'/prototype/parallel/core-journey-fix-01/demo/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let f;try{f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(f,(e,b)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}).end(b));
});
const colors={promotion:'rgb(166, 87, 30)',service:'rgb(83, 110, 94)',attribute:'rgb(101, 115, 108)',rent:'rgb(10, 123, 89)'};
const tags=async(loc,field)=>loc.evaluateAll((items,field)=>items.filter(x=>x.getClientRects().length).map(el=>{
 const c=getComputedStyle(el),r=el.getBoundingClientRect(),parent=el.parentElement.getBoundingClientRect();
 const value=el.dataset[field]||'attribute';
 return {label:el.textContent.trim(),kind:value==='promo'?'promotion':value==='feature'?'attribute':value,fontSize:c.fontSize,color:c.color,
  bg:c.backgroundColor,height:r.height,right:r.right,parentRight:parent.right};
}),field);
function verifyTags(rows,page,max,min=1){
 assert(rows.length>=min&&rows.length<=max,page+' tag count='+rows.length);
 for(const tag of rows){
  assert.equal(tag.fontSize,'11px',page+' '+tag.label+' font');
  assert.equal(tag.color,colors[tag.kind],page+' '+tag.label+' tone');
  assert(tag.height>=18,page+' tag height');
  assert(tag.right<=tag.parentRight+1.5,page+' clipped '+tag.label);
 }
}
async function rent(loc,page){
 assert(await loc.count()>0,page+' rent missing');
 const x=await loc.first().evaluate(el=>({text:el.textContent.trim(),color:getComputedStyle(el).color}));
 assert.equal(x.color,colors.rent,page+' rent color');
 assert(/^¥[\d,]+/.test(x.text),page+' noninteger rent');
 return x;
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 assert.equal(manifest.source_sha,process.env.GITHUB_SHA);assert.equal(manifest.source_pr,119);
 assert.equal(manifest.source_branch,'isolate/vis-system-04b-20261111');
 await new Promise(ok=>server.listen(4717,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const results=[];
 try{for(const [w,h] of [[375,812],[390,844]]){
  const row={width:w,height:h,source_sha:manifest.source_sha,status:'FAIL',pages:{}};
  const hctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1}),home=await hctx.newPage();
  const herr=[];home.on('pageerror',e=>herr.push(e.message));
  try{
   await home.goto(demo+'home.html',{waitUntil:'domcontentloaded'});
   await home.locator('#storeRail .store-card').first().waitFor();
   const items=await tags(home.locator('#storeRail .store-card.featured .mk-store-tag'),'tagType');
   verifyTags(items,'H01',2);
   const p=await home.locator('#storeRail .store-card.featured .store-price b').evaluate(el=>({text:el.textContent.trim(),color:getComputedStyle(el).color}));
   assert(/^¥[\d,]+$/.test(p.text),'H01 reference integer');
   assert.notEqual(p.color,colors.rent,'H01 public price is not selected contractual rent');
   assert.deepEqual(herr,[],'H01 page errors');
   row.pages.H01={tags:items,publicPrice:p};
   await home.locator('#phone').screenshot({path:path.join(out,'H01-'+w+'.png')});
  }finally{await hctx.close();}
  const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
   await app.locator('#screen').evaluate(()=>{
    const b=window.SIM_DEMO;b.core.setCity('北京');b.core.setRequirement(3,12,true);b.persist();b.navigate('S01');
   });
   await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
   const s01tags=await tags(s01.locator('.store-card[data-card-kind="expanded"]').first().locator('.store-tags .mk-store-tag'),'tagType');
   verifyTags(s01tags,'S01',3);
   const discount=await s01.locator('.store-card[data-card-kind="expanded"] .s01-term-discount:not([hidden])').first().evaluate(el=>({text:el.textContent.trim(),color:getComputedStyle(el).color}));
   assert.equal(discount.color,colors.promotion,'S01 discount should be orange');
   const s01rent=await rent(s01.locator('.store-card[data-card-kind="expanded"] .unit-action-row .price[data-price-kind="term"] strong'),'S01');
   row.pages.S01={tags:s01tags,discount,rent:s01rent};
   await page.screenshot({path:path.join(out,'S01-'+w+'.png')});
   const store=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot().stores[0].id);
   await app.locator('#screen').evaluate((_,id)=>window.SIM_DEMO.openStore(id,'S01'),store);
   await app.locator('#screen.page-S02').waitFor();
   const s02tags=await tags(app.locator('.s02-service-summary .s02-tag'),'tagKind');
   verifyTags(s02tags,'S02',5,4);
   assert.equal(new Set(s02tags.map(x=>x.label)).size,s02tags.length,'S02 duplicate labels');
   const s02rent=await rent(app.locator('.page-S02 .unit-price .br03-price-main'),'S02');
   assert.equal(await app.locator('.s02-call-400').count(),1,'S02 phone entry');
   row.pages.S02={tags:s02tags,rent:s02rent};
   await page.screenshot({path:path.join(out,'S02-'+w+'.png')});
   await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('S5'));
   const s5=app.frameLocator('#br04-frame');
   await s5.locator('body[data-page=s5].bridge-ready').waitFor();
   const s5tags=await tags(s5.locator('.s5-store-card[data-rank="0"] .s5-store-services .mk-store-tag'),'tagType');
   verifyTags(s5tags,'S5',2);
   const s5rent=await rent(s5.locator('.s5-store-card[data-rank="0"] .s5-unit-price'),'S5');
   const cta=await s5.locator('.s5-store-card[data-rank="0"] .s5-unit-buy').first().evaluate(el=>el.getBoundingClientRect().height);
   assert(cta>=47.5,'S5 48px CTA');
   row.pages.S5={tags:s5tags,rent:s5rent,ctaHeight:cta};
   await page.screenshot({path:path.join(out,'S5-'+w+'.png')});
   assert.deepEqual(errors,[],'cross-page script errors');row.status='PASS';
  }catch(e){row.error=String(e.stack||e);await page.screenshot({path:path.join(out,'FAIL-'+w+'.png')}).catch(()=>{});}
  finally{results.push(row);await ctx.close();}
 }}finally{await browser.close();await new Promise(ok=>server.close(ok));}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({source_sha:manifest.source_sha,source_pr:119,colors,results},null,2));
 assert(results.every(r=>r.status==='PASS'),results.filter(r=>r.status!=='PASS').map(r=>r.width+': '+r.error).join('\n'));
 console.log('VIS-SYSTEM-04B 375/390 computed tone PASS '+JSON.stringify(results.map(r=>({width:r.width,counts:Object.fromEntries(Object.entries(r.pages).map(x=>[x[0],x[1].tags.length]))}))));
})().catch(e=>{console.error('VIS-SYSTEM-04B ERROR',e.stack||e);process.exitCode=1});
