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
const p=await ctx.newPage(),errors=[],result=[];
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
  visibleContent:c.innerText})),
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
}
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
}
assert.deepEqual(errors,[],'no browser errors');
fs.writeFileSync(path.join(OUT,'source-lock-report.json'),JSON.stringify({sha:process.env.GITHUB_SHA,results:result,errors},null,2));
console.log('SOURCE_LOCKED_S01_PASS',process.env.GITHUB_SHA,result.length);
await ctx.close();
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error('SOURCE_LOCKED_S01_FAIL',e.stack||e);process.exitCode=1;});
