#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../app'),output=path.resolve(__dirname,'../release-evidence/s02-central-integration-01');
fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}).end(b))});
(async()=>{
await new Promise(r=>server.listen(4758,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const scenarios=[['browse',null],['matched',0.5],['near',9],['nomatch',200],['combo',12],['soldout','stock']];
const rows=[];
try{
for(const [width,height] of [[375,812],[390,844]]){
const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
for(const [name,capacity] of scenarios){
const page=await context.newPage(),errors=[],missing=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://127.0.0.1'))missing.push(r.url())});
const checks={};let failure='';
try{
await page.goto('http://127.0.0.1:4758/prototype/parallel/core-journey-fix-01/demo/index.html?page=S02&store=SIM_BJ01',{waitUntil:'load',timeout:30000});
await page.waitForTimeout(250);
if(capacity!==null){
await page.evaluate(({capacity,name})=>{
 const app=window.SIM_DEMO;
 if(name==='soldout'||name==='near'){
  const units=app.core.fixture.units.filter(u=>u.store_id===app.state().storeId);
  for(const u of units){if(name==='near'&&Number(u.volume)>=7)continue;u.available_count=0;u.stock=0;u.available=false;u.status='soldout'}
  if(name==='near')app.core.setRequirement(capacity,12,true);
 }else app.core.setRequirement(capacity,12,true);
 app.navigate('S02',app.state().storeId);
},{capacity,name});
await page.waitForTimeout(180);
}
checks.activeS02=await page.locator('.screen.page-S02').count()===1;
checks.hours=/^存取时间：(24小时|09:00-21:00|08:00-23:00)$/.test((await page.locator('.s02-hours').innerText()).trim());
checks.demand=await page.locator('.s02-demand').isVisible();
checks.inventory=await page.locator('#s02Inventory').isVisible();
checks.state=await page.locator('#s02Inventory').getAttribute('data-s02-status')===name;
if(name==='nomatch')checks.noUnusableListing=await page.locator('.s02-no-match').isVisible()&&await page.locator('#s02Inventory .unit-row').count()===0;
if(name==='combo')checks.splitVisual=await page.locator('.s02-combo-pics img').count()===2;
checks.unitPhoto=['soldout','nomatch','combo'].includes(name)||await page.locator('.unit-img').first().evaluate(el=>el.complete&&el.naturalWidth>0).catch(()=>false);
checks.styleLoaded=await page.locator('.s02-hot').first().evaluate(el=>getComputedStyle(el).backgroundColor!=='rgba(0, 0, 0, 0)').catch(()=>name==='soldout'||name==='nomatch'||name==='near'||name==='combo');
checks.noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
checks.noDuplicateOldBooking=await page.locator('.booking').count()===0;
await page.screenshot({path:path.join(output,name+'-'+width+'-top.png')});
const scroll=page.locator('#scroll');
if(await scroll.count()){
 await scroll.evaluate(e=>e.scrollTop=480);await page.waitForTimeout(140);
 await page.screenshot({path:path.join(output,name+'-'+width+'-middle.png')});
 await scroll.evaluate(e=>e.scrollTop=e.scrollHeight);await page.waitForTimeout(140);
 await page.screenshot({path:path.join(output,name+'-'+width+'-bottom.png')});
}
await page.locator('[data-action="detailTab"][data-value="交通路线"]').click();
checks.routeTab=await page.locator('#s02MapSlot').isVisible();
checks.mapHeight=(await page.locator('#s02MapSlot').boundingBox()).height>=220;
checks.travelModes=await page.locator('.s02-travel-modes button').count()===4;
await page.locator('[data-action="s02TravelMode"][data-value="walk"]').click();
checks.travelSwitch=await page.locator('.s02-travel-modes button.active').getAttribute('data-value')==='walk';
await page.screenshot({path:path.join(output,name+'-'+width+'-route.png')});
await page.locator('[data-action="detailTab"][data-value="服务设施"]').click();
checks.serviceReturn=await page.locator('.s02-services').isVisible();
}catch(e){failure=String(e.stack||e)}
rows.push({name,width,checks,errors,missing,failure});await page.close();
}await context.close();
}
}finally{
 await browser.close();await new Promise(r=>server.close(r));
 const failed=rows.filter(r=>r.failure||r.errors.length||r.missing.length||Object.values(r.checks).some(v=>!v));
 const result={pass:!failed.length,rows};fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({pass:result.pass,cases:rows.length,failed},null,2));
 if(failed.length)process.exitCode=1;
}
})().catch(e=>{console.error(e);process.exitCode=1});
