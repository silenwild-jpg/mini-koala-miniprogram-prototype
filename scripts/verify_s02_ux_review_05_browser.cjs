#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../app'),out=path.resolve(__dirname,'../release-evidence/s02-ux-review-05');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname))}catch{res.writeHead(400).end();return}
if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
fs.readFile(file,(err,data)=>err?res.writeHead(404).end('Missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));});
const cases=[['browse','browse',5],['matched','matched',4.8],['near_match','matched',3.1],['no_match','nomatch',80],['combo','matched',15],['sold_out','matched',4.8]];
(async()=>{
await new Promise(r=>server.listen(4785,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),rows=[];
try{
for(const [width,height] of [[375,812],[390,844]]){
const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
for(const [name,state,target] of cases){
const page=await ctx.newPage(),errors=[],requests=[],checks={};
page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(r.url().startsWith('http://127.0.0.1'))requests.push(r.url())});
const args=new URLSearchParams({store:'jianguo',state,target:String(target),searchOriginKey:'guomao',fromS01State:state==='browse'?'browse':'estimated'});
if(state!=='browse')args.set('term','6');if(name==='sold_out')args.set('inventoryStatus','soldout');
const url='http://127.0.0.1:4785/prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html?'+args;
let failure='';
try{
await page.goto(url,{waitUntil:'load',timeout:30000});await page.waitForTimeout(500);
checks.store=await page.locator('.store-title').count()===1;
checks.hours=/^存取时间：(24小时|09:00-21:00|08:00-23:00)$/.test(await page.locator('#s02AccessHours').innerText());
checks.estimate=name!=='browse'||await page.locator('#browseEstimator').isVisible();
checks.inventory=await page.locator('#inventorySection').isVisible();
checks.noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
checks.noReview=!(await page.locator('.review').isVisible());
await page.screenshot({path:path.join(out,name+'-'+width+'-main.png'),fullPage:true});
await page.locator('#s02RouteTab').click();
checks.map=await page.locator('#s02MapContainer').isVisible();
checks.mapHeight=(await page.locator('#s02MapContainer').boundingBox()).height>=220;
checks.fourModes=await page.locator('[data-route-mode]').count()===4;
for(const mode of ['transit','drive','walk','bike'])await page.locator('[data-route-mode="'+mode+'"]').click();
checks.mode=await page.locator('[data-route-mode="bike"]').evaluate(e=>e.classList.contains('active'));
await page.screenshot({path:path.join(out,name+'-'+width+'-route.png'),fullPage:true});
await page.locator('#s02ServiceTab').click();checks.service=await page.locator('#s02ServicePanel').isVisible();
if(name==='sold_out')checks.soldout=await page.locator('.unit-cta:not([disabled])').count()===0;
if(name==='matched'){
const btn=page.locator('.unit-cta:not([disabled])').first();
if(await btn.count()){await btn.click();await page.waitForTimeout(250);checks.checkout=page.url().includes('mini_storage_order_o01')||await page.locator('#requirementSheet').evaluate(e=>e.classList.contains('show'));}
else checks.checkout=false;
}
}catch(e){failure=String(e.stack||e)}
rows.push({width,name,checks,errors,requests,failure,url:page.url()});await page.close();
}await ctx.close();
}
}finally{
await browser.close();await new Promise(r=>server.close(r));
const fails=rows.filter(r=>r.failure||r.errors.length||r.requests.length||Object.values(r.checks).some(v=>!v));
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({pass:!fails.length,rows},null,2));
console.log(JSON.stringify({pass:!fails.length,checked:rows.length,failures:fails},null,2));
if(fails.length)process.exitCode=1;
}
})().catch(e=>{console.error(e);process.exitCode=1});
