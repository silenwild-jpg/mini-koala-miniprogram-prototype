#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../app'),OUT=path.resolve(__dirname,'../release-evidence/mk-design-direction-02');
const SHA=process.env.GITHUB_SHA||'LOCAL_NOT_BOUND',PORT=4718;
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let f;try{f=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}).end(b);});});
(async()=>{
fs.mkdirSync(OUT,{recursive:true});await new Promise(ok=>server.listen(PORT,'127.0.0.1',ok));
let browser;const results=[],failures=[];
try{
browser=await chromium.launch({headless:true,args:['--no-sandbox']});
for(const [width,height] of [[375,812],[390,844]]){
const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
const p=await ctx.newPage(),errors=[],badAssets=[],url='http://127.0.0.1:'+PORT+'/design-exploration/mk-design-direction-01.html';
p.on('pageerror',e=>errors.push(e.message));
p.on('response',r=>{if(r.status()>=400)badAssets.push(r.status()+' '+r.url());});
p.on('requestfailed',r=>badAssets.push('FETCH '+r.url()));
await p.goto(url,{waitUntil:'domcontentloaded'});
await p.click('[data-width="'+width+'"]');
assert.equal(await p.locator('#device').evaluate(e=>Math.round(e.getBoundingClientRect().width)),width,'device width');
await p.click('[data-page="S01"]');
// Current user instruction outranks conflicting historical S01 variants.
// Search results display STORES, not embedded matched unit/cabin/term offers.
assert.equal(await p.locator('#viewS01 .unit-row').count(),0,'S01 must not show matching unit rows');
assert.equal(await p.locator('#viewS01 .store-row').count(),2,'S01 keeps two primary store rows');
const s01Copy=await p.locator('#viewS01').innerText();
assert(!/(匹配仓位|推荐仓位|仓号|查看匹配方案|整期租金)/.test(s01Copy),
  'S01 search results must not resurrect unit-specific information');
assert(s01Copy.includes('考拉E存'),'S01 permanent third E-storage slot retained');
await p.click('[data-chip="special"]');
assert.equal(await p.locator('#viewS01 .store-row:visible').count(),1,'special chip filter');
await p.click('[data-chip="special"]');
await p.locator('#store-search').fill('芍药居');
assert.equal(await p.locator('#viewS01 .store-row:visible').count(),1,'store text search');
await p.locator('#store-search').fill('');
await p.click('[data-page="S5"]');
await p.locator('#viewS5 [data-action="order"]').first().click();
assert.equal(await p.locator('#overlay.show').count(),1,'order boundary modal');
await p.keyboard.press('Escape');
assert.equal(await p.locator('#overlay.show').count(),0,'escape modal');
await p.click('[data-page="H01"]');
await p.locator('#viewH01 [data-action="goto-s01"]').first().click();
assert.equal(await p.locator('#viewS01:visible').count(),1,'home nearby navigation');
for(const v of ['a','b'])for(const target of ['H01','S01','S5']){
await p.goto(url,{waitUntil:'networkidle'});
await p.click('[data-width="'+width+'"]');await p.click('[data-variant="'+v+'"]');await p.click('[data-page="'+target+'"]');
await p.evaluate(async()=>{await Promise.all(Array.from(document.querySelectorAll('.phone-view:not([hidden]) img')).map(i=>i.decode().catch(()=>{})));});
const before=await p.evaluate(()=>({
deviceWidth:Math.round(document.getElementById('device').getBoundingClientRect().width),
phoneWidth:Math.round(document.getElementById('phone').getBoundingClientRect().width),
broken:[...document.querySelectorAll('.phone-view:not([hidden]) img')].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),
active:document.querySelector('.phone-view:not([hidden])').id
}));
assert.equal(before.deviceWidth,width,'selected width');assert.equal(before.phoneWidth,width,'inner width');
assert.equal(before.active,'view'+target,'selected page');
if(before.broken.length)failures.push({key:v+target+width,reason:'broken_images',details:before.broken});
const css='.lab,.meta-panel,.preview-label{display:none!important}body{background:white!important;overflow-x:hidden!important}.workspace{display:block!important;margin:0!important;padding:0!important;max-width:none!important}.mock-zone{justify-content:flex-start!important;width:100%!important}.device{width:'+width+'px!important;max-width:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}.phone-screen{height:auto!important;max-height:none!important;overflow:visible!important}.tabbar{position:relative!important;bottom:auto!important}';
await p.addStyleTag({content:css});
const m=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:innerWidth,phone:Math.round(document.getElementById('phone').getBoundingClientRect().width),visiblePrices:[...document.querySelectorAll('.phone-view:not([hidden]) .price')].filter(x=>x.getBoundingClientRect().height>0).length,
critical:[...document.querySelectorAll('.phone-view:not([hidden]) .store-row,.phone-view:not([hidden]) .rec-card,.phone-view:not([hidden]) .task,.phone-view:not([hidden]) .filter-bar')].map(e=>({name:e.className,left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right),sw:e.scrollWidth,cw:e.clientWidth}))}));
const overflow=m.critical.filter(x=>x.left< -1||x.right>width+1||x.sw>x.cw+3);
if(m.scroll>width+1||overflow.length)failures.push({key:v+target+width,reason:'horizontal_overflow',details:{scroll:m.scroll,overflow}});
const key=v.toUpperCase()+'-'+target+'-'+width;
await p.screenshot({path:path.join(OUT,key+'-first.png'),fullPage:false});
await p.screenshot({path:path.join(OUT,key+'-full.png'),fullPage:true});
results.push({key,width,height,variant:v,page:target,broken:before.broken,metrics:m,source_sha:SHA,first:key+'-first.png',full:key+'-full.png'});
console.log('CAPTURED',key,'width',m.phone,'overflow',overflow.length,'images',before.broken.length);
}
if(errors.length)failures.push({width,reason:'page_errors',details:errors});
if(badAssets.length)failures.push({width,reason:'failed_responses',details:[...new Set(badAssets)]});
await ctx.close();
}
fs.writeFileSync(path.join(OUT,'render-report.json'),JSON.stringify({sha:SHA,branch:process.env.GITHUB_REF_NAME||'LOCAL',results,failures},null,2));
const report=['# MK Design Direction 02 - Real Chromium screenshots','','Source SHA: '+SHA,'Branch: '+(process.env.GITHUB_REF_NAME||'LOCAL'),
'Viewport: 375x812 and 390x844. Each combination exports a first-screen and full-page PNG.',
'Screenshots: '+results.length*2,'Failures: '+failures.length,'','## Cases',
...results.map(x=>'- '+x.key+': '+x.first+' / '+x.full),
'','Scope: isolated visual direction explorer only. Not a test of the original business app.'].join('\n');
fs.writeFileSync(path.join(OUT,'README.md'),report);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report+'\n');
if(failures.length)throw Error('RENDER_QA_FAILED '+JSON.stringify(failures.map(x=>({key:x.key,reason:x.reason}))));
assert.equal(results.length,12,'expected exactly 12 combinations');
console.log('DESIGN_DIRECTION_02_BROWSER_PASS',SHA);
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error('DESIGN_DIRECTION_02_BROWSER_FAIL',e.stack||e);process.exitCode=1;});
