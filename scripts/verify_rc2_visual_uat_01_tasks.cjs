#!/usr/bin/env node
'use strict';
/**
 * RC2-VISUAL-UAT-01 scripted task replay (not live-user UAT).
 * Inspectable user actions on same built candidate SHA, both 375 and 390.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const output=path.resolve(__dirname,'../release-evidence/rc2-visual-uat-01');
const host='http://127.0.0.1:4597';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let pathname;try{pathname=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end('bad path');return;}
 if(!pathname.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(pathname,(err,data)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(pathname)]||'application/octet-stream'}).end(data));
});
const widths=[[375,812],[390,844]];
async function entry(browser,width,height,pageName){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('console',msg=>{if(msg.type()==='error'&&!/favicon/i.test(msg.text()))errors.push(msg.text());});
 await page.goto(host+'/central-review-02g.html?catalog=sim&page='+pageName+'&s01_r2=1',{waitUntil:'domcontentloaded'});
 const app=page.frameLocator('#central-host');await app.locator('#screen').waitFor();
 return {context,page,app,errors};
}
const rect=locator=>locator.evaluate(el=>({height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width,
 text:el.innerText}));
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 await new Promise(resolve=>server.listen(4597,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
 for(const [width,height] of widths){
  // Task A: find nearby stores, search with no results, recover, enter a store, return to list.
  {
   const {context,page,app,errors}=await entry(browser,width,height,'S01');
   let list=app.frameLocator('#s01-r2-frame');
   await list.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
   assert.equal(await app.locator('.bottom-nav .bottom-item').count(),4);
   assert.equal(await list.locator('.nav-back').count(),0,'primary S01 must not add back arrow');
   await list.locator('#s01-search').fill('此门店名称绝不存在XYZ');
   await list.getByText('未找到匹配门店',{exact:false}).first().waitFor({timeout:5000});
   await page.screenshot({path:path.join(output,'task-A-no-result-'+width+'.png'),fullPage:true});
   list=app.frameLocator('#s01-r2-frame');
   await list.locator('#s01-search').fill('');
   await list.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
   const firstId=await list.locator('.store-card[data-card-kind="expanded"]').first().getAttribute('data-store-id');
   await list.locator('.store-card[data-card-kind="expanded"]').first().locator('h2').click();
   await app.locator('#screen.page-S02').waitFor();
   const current=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().storeId);
   assert.equal(current,firstId,'chosen store must stay identical');
   const buy=await rect(app.locator('.unit-row[data-unit] .order-button:not([disabled])').first());
   assert(buy.height>=44,'S02 main select must be at least 44px '+JSON.stringify(buy));
   await page.screenshot({path:path.join(output,'task-A-store-detail-'+width+'.png'),fullPage:true});
   await app.locator('.hero .back-button').click();
   await app.locator('#screen.page-S01').waitFor();
   assert.equal(await app.locator('.bottom-nav .bottom-item.active').count(),1);
   assert.deepEqual(errors,[]);
   results.push({task:'A-discover-search-empty-recover-store-back',width,status:'PASS',storeId:firstId,s02BuyHeight:buy.height});
   await context.close();
  }
  // Task B: booking must reject missing phone/address, then persist one follow-up lead locally.
  {
   const {context,page,app,errors}=await entry(browser,width,height,'BOOKING');
   const book=app.frameLocator('#br04-frame');
   await book.locator('#reserve-contact').waitFor();
   const leadCount=()=>app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().leads.length);
   const start=await leadCount();
   await book.locator('#submit').click();
   assert.equal(await leadCount(),start,'blank booking created lead');
   await book.locator('#booking-address').fill('北京市朝阳区建国路88号');
   await book.locator('#submit').click();
   assert.equal(await leadCount(),start,'address-only booking created lead');
   await page.screenshot({path:path.join(output,'task-B-missing-phone-'+width+'.png'),fullPage:true});
   await book.locator('#reserve-contact').fill('13800138000');
   await book.locator('#submit').click();
   await book.locator('#success').waitFor({state:'visible',timeout:5000});
   assert.equal(await book.locator('#toast').isVisible(),false,'stale validation error must disappear on successful lead receipt');
   const info=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().leads.at(-1));
   assert.equal(info.address,'北京市朝阳区建国路88号');
   assert.equal(info.phone,'13800138000');
   assert.equal(info.status,'saved_locally','do not falsely claim delivered to CRM');
   assert.equal(await leadCount(),start+1,'must not duplicate lead');
   const receipt=await book.locator('#success').innerText();
   assert.match(receipt,/尚未发送给顾问/);
   await page.screenshot({path:path.join(output,'task-B-local-receipt-'+width+'.png'),fullPage:true});
   assert.deepEqual(errors,[]);
   results.push({task:'B-booking-both-required-local-receipt',width,status:'PASS',leadStatus:info.status,leadId:info.id});
   await context.close();
  }
  // Task C: known capacity→S5, verify ordering/whole term price and prominent touch areas;
  // remain deliberately unauthenticated, never create a signed order by looking at prices.
  {
   const {context,page,app,errors}=await entry(browser,width,height,'S01');
   await app.locator('#screen').evaluate(()=>{
     window.SIM_DEMO.core.setRequirement(3,12,true);
     window.SIM_DEMO.navigate('S5');
   });
   await app.locator('#screen.page-S5').waitFor();
   const s5=app.frameLocator('#br04-frame');
   await s5.locator('.s5-store-card[data-rank="0"]:not([hidden]) .s5-unit-buy').first().waitFor();
   const caps=await s5.locator('#capacity').innerText();
   assert.match(caps,/3\s*m³/);
   const buttons=await s5.locator('.s5-store-card:not([hidden]) .s5-unit-buy').evaluateAll(elements=>
     elements.map(el=>({height:el.getBoundingClientRect().height,label:el.innerText})));
   assert(buttons.length>=1&&buttons.every(b=>b.height>=44),'S5 touch targets below 44px: '+JSON.stringify(buttons));
   const prices=await s5.locator('.s5-store-card:not([hidden]) .s5-unit-price').evaluateAll(elements=>
     elements.map(el=>({text:el.innerText,height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize),clipped:el.scrollWidth>el.clientWidth+1})));
   assert(prices.length>0&&prices.every(x=>x.font>=14&&!x.clipped),'S5 price unreadable: '+JSON.stringify(prices));
   const core=await app.locator('#screen').evaluate(()=>({authorized:window.SIM_DEMO.core.authorized(),orders:window.SIM_DEMO.core.state().orders.length}));
   assert.equal(core.authorized,false);assert.equal(core.orders,0);
   const ratio=await s5.locator('html').evaluate(el=>({scroll:el.scrollWidth,viewport:window.innerWidth}));
   assert(ratio.scroll<=width+3,'S5 horizontal overflow: '+JSON.stringify(ratio));
   await page.screenshot({path:path.join(output,'task-C-s5-known-capacity-'+width+'.png'),fullPage:true});
   assert.deepEqual(errors,[]);
   results.push({task:'C-capacity-to-S5-readable-price-no-auth-bypass',width,status:'PASS',buttons,prices,core});
   await context.close();
  }
 }
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({status:'PASS',kind:'SCRIPTED_TASK_REPLAY_NOT_LIVE_USERS',runCount:results.length,results},null,2));
 console.log('RC2_VISUAL_UAT_01_SCRIPTED_TASK_REPLAY_PASS '+JSON.stringify(results));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error('RC2_VISUAL_UAT_01_SCRIPTED_TASK_REPLAY_FAIL',err.stack||err);process.exitCode=1;});
