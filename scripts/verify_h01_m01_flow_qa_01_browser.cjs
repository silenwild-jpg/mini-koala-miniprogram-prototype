#!/usr/bin/env node
'use strict';
// H01-M01 cross-page navigation/lease QA on one exact candidate SHA; demo data only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo'),out=path.resolve(__dirname,'../release-evidence/h01-m01-flow-qa-01');
const host='http://127.0.0.1:4698';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let filename;try{filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(filename,(err,data)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream'}).end(data));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(4698,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROME_PATH?{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}:{})});
 const results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const shot=async name=>page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});
   const waitM01=async()=>page.locator('.m01-profile').waitFor();
   const orderParam=()=>new URL(page.url()).searchParams.get('order');
   try{
    await page.goto(host+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
    await waitM01();
    const setup=await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;
      try{
       c.setScenario('normal');
       c.setRequirement(3,12,true);
       c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
       const available=c.matchingUnits().filter(x=>x.volume>=3);
       if(available.length<2)throw Error('NEED_TWO_AVAILABLE_UNITS');
       function makePaid(u){
        c.setRequirement(3,12,true);c.select([u.id]);c.setDate(c.today());c.quote();
        const o=c.submit();c.pay(o.id,'success');c.identity(o.id,'success');return o;
       }
       const a=makePaid(available[0]),remaining=c.matchingUnits().filter(x=>x.id!==available[0].id);
       if(!remaining.length)throw Error('SECOND_UNIT_UNAVAILABLE');
       const second=makePaid(remaining[0]);
       b.persist();b.navigate('M01');
       return {a:a.id,b:second.id,storeA:a.store_id,storeB:second.store_id};
      }catch(err){return {error:err.message};}
    });
    assert(!setup.error,'setup failed '+setup.error);
    await page.locator('.m01-asset-row').first().waitFor();
    assert.equal(await page.locator('.m01-asset-row').count(),2);
    assert.equal(await page.locator('.m01-task').count(),0,'active asset not a duplicate task');
    await shot('01-M01-two-active');
    const first=page.locator('.m01-asset-row[data-value="'+setup.a+'"]');
    await first.click();await page.locator('.mk-order-details').waitFor();
    assert.equal(orderParam(),setup.a,'O03 A URL must retain A');
    const o03TextA=await page.locator('.mk-order-details').innerText();
    assert(o03TextA.includes('KL')&&o03TextA.includes('订单号'));
    await shot('02-O03-order-A');
    await page.locator('.mk-order-details [data-action="go"][data-value="RN01"]').click();
    await page.locator('.m02-service-summary').waitFor();
    assert.equal(orderParam(),setup.a,'RN01 A URL must retain A');
    assert.match(await page.locator('.m02-service-summary').innerText(),/累计租期/);
    await shot('03-RN01-order-A');
    await page.locator('.back-button[data-value="O03"]').click();
    await page.locator('.mk-order-details').waitFor();assert.equal(orderParam(),setup.a);
    // Persist A at top before navigating away; B will deliberately use a different scroll position.
    await page.evaluate(()=>{const e=document.querySelector('#scroll');if(e)e.scrollTop=0;});
    await page.locator('.back-button[data-value="M01"]').click();
    await waitM01();
    await page.locator('.m01-asset-row[data-value="'+setup.b+'"]').click();
    await page.locator('.mk-order-details').waitFor();assert.equal(orderParam(),setup.b);
    await shot('04-O03-order-B');
    await page.locator('.mk-order-details [data-action="go"][data-value="IV01"]').click();
    await page.locator('.m02-service-summary').waitFor();
    assert.equal(orderParam(),setup.b,'IV01 must retain the order B ID');
    await shot('04b-IV01-order-B');
    await page.goBack({waitUntil:'domcontentloaded'});
    await page.locator('.mk-order-details').waitFor();
    assert.equal(orderParam(),setup.b,'invoice back to order B');
    await page.evaluate(()=>{const e=document.querySelector('#scroll');if(e)e.scrollTop=e.scrollHeight;});
    await page.locator('.mk-order-details [data-action="go"][data-value="DP01"]').click();
    await page.locator('.m02-service-summary').waitFor();assert.equal(orderParam(),setup.b);
    await shot('05-DP01-order-B');
    await page.goBack({waitUntil:'domcontentloaded'});await page.locator('.mk-order-details').waitFor();
    assert.equal(orderParam(),setup.b,'browser back DP01→O03 B');
    await page.goBack({waitUntil:'domcontentloaded'});await waitM01();
    await page.goBack({waitUntil:'domcontentloaded'});await page.locator('.mk-order-details').waitFor();
    assert.equal(orderParam(),setup.a,'browser back must restore previous A and not show B');
    const restoredA=await page.evaluate(()=>document.querySelector('#scroll')?.scrollTop||0);
    assert(restoredA<=10,'O03 A must not inherit order B scroll position, got '+restoredA);
    await shot('06-browser-back-O03-A');
    await page.goForward({waitUntil:'domcontentloaded'});await waitM01();
    await page.goForward({waitUntil:'domcontentloaded'});await page.locator('.mk-order-details').waitFor();
    assert.equal(orderParam(),setup.b,'browser forward must restore original B');
    await page.goto(host+'/home.html',{waitUntil:'domcontentloaded'});
    await page.locator('#h01FlowPrimary').waitFor();
    assert.match(await page.locator('#h01FlowContent').innerText(),/我的在租仓位/);
    await shot('07-H01-active');
    await page.locator('[data-h01="allorders"]').click();
    await page.waitForURL(/index\.html\?page=M01/);await waitM01();
    assert.equal(await page.locator('.m01-asset-row').count(),2,'home→M01 same two leases');
    const returning=await page.evaluate(id=>{
      const b=window.SIM_DEMO,c=b.core;
      try{c.lifecycleRequestExit(id,'early',c.today());b.persist();b.navigate('M01');
       return {lease:c.lifecycleView(id).lease_status,key:window.H01_STATE_POLICY.derive(c.state(),c).key};
      }catch(e){return {error:e.message};}
    },setup.a);
    assert(!returning.error,'exit setup: '+returning.error);
    assert.equal(returning.key,'returning');
    await page.locator('.m01-task').waitFor();
    assert.match(await page.locator('.m01-task').innerText(),/退租处理中/);
    await shot('08-M01-returning');
    await page.locator('.m01-task [data-action="m01Service"][data-value$="|EX01"]').click();
    await page.locator('.m02-service-summary').waitFor();
    assert.equal(orderParam(),setup.a,'EX01 must use returning A, not the other active B');
    await shot('09-EX01-order-A');
    const inspected=await page.evaluate(id=>{
      const b=window.SIM_DEMO,c=b.core;
      try{c.lifecycleRequestInspection(id);c.lifecycleReviewInspection(id,'passed',true);
        b.persist();b.navigate('M01');return {key:window.H01_STATE_POLICY.derive(c.state(),c).key};}
      catch(e){return {error:e.message};}
    },setup.a);
    assert(!inspected.error,'inspection setup: '+inspected.error);
    assert.equal(inspected.key,'refund');
    assert.equal(await page.locator('.m01-asset-row').count(),1,'ended refund must not be counted active');
    await page.locator('.m01-task [data-action="m01Service"][data-value$="|DP01"]').click();
    await page.locator('.m02-service-summary').waitFor();
    assert.equal(orderParam(),setup.a,'DP01 pending refund remains on A');
    await shot('10-DP01-refund-A');
    await page.evaluate(id=>{
      const b=window.SIM_DEMO;b.core.lifecycleReviewRefund(id,true);b.persist();b.navigate('M01');
    },setup.a);
    await waitM01();
    assert.equal(await page.locator('.m01-task').count(),0,'regular B active has no redundant task hero');
    assert.equal(await page.locator('.m01-asset-row').count(),1,'only B remains in active assets');
    await shot('11-M01-refunded-A-active-B');
    await page.goto(host+'/index.html?page=RN01&order=UNKNOWN_ORDER',{waitUntil:'domcontentloaded'});
    assert.match(await page.locator('#screen').innerText(),/没有可办理租后服务的订单/,'unknown ID must not open B');
    await shot('12-invalid-order-no-fallback');
    const geometry=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert(geometry.width<=width+2,'horizontal overflow');
    assert.deepEqual(errors,[],'browser JavaScript errors');
    results.push({width,height,multiOrders:true,backForwardExactOrder:true,renewalA:true,depositB:true,exitA:true,refundA:true,invalidOrderBlocked:true,overflow:false,jsErrors:0});
   }finally{await context.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  console.log('H01-M01-FLOW-QA-01 Chromium PASS',JSON.stringify(results));
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(err=>{console.error(err);process.exitCode=1;});
