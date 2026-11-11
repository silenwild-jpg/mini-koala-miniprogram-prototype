#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo'),out=path.resolve(__dirname,'../release-evidence/h01-m01-contract-01');
const host='http://127.0.0.1:4696',mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let f;try{f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(f,(e,b)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}).end(b));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4696,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),report=[];
 try{
  for(const width of [375,390]){
   const context=await browser.newContext({viewport:{width,height:width===375?812:844},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   async function mine(){await page.goto(host+'/index.html?page=M01',{waitUntil:'domcontentloaded'});await page.locator('.m01-task').waitFor();}
   async function snap(name){await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});}
   try{
    await mine();
    assert.match(await page.locator('.m01-task').innerText(),/找一个合适的仓位/);
    await snap('01-M01-new');
    const p=await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;try{
       c.setScenario('normal');c.setRequirement(3,12,true);c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
       const u=c.matchingUnits().find(x=>x.volume>=3);c.select([u.id]);c.setDate(c.today());c.quote();
       const o=c.submit();b.persist();b.navigate('M01');const t=window.H01_STATE_POLICY.derive(c.state(),c);
       return {id:o.id,expiry:o.expiresAt,created:o.createdAt,key:t.key,keys:t.tasks.map(x=>x.key)};
      }catch(e){return {error:e.message};}
    });
    assert(!p.error,'pending setup '+p.error);
    assert.equal(p.expiry-p.created,10800000,'3h order TTL must be shared');assert.equal(p.key,'pending');
    assert(p.keys.includes('pending'));
    assert.match(await page.locator('.m01-task').innerText(),/订单待支付/);
    assert.match(await page.locator('.m01-pay-clock').innerText(),/^\d{2}:\d{2}:\d{2}$/);
    await snap('02-M01-pending');
    await page.goto(host+'/home.html',{waitUntil:'domcontentloaded'});
    await page.locator('#h01FlowPrimary').waitFor();
    assert.match(await page.locator('#h01FlowContent').innerText(),/订单待支付/);
    await snap('03-H01-pending');
    await mine();
    await page.evaluate(()=>{const b=window.SIM_DEMO;b.core.setCity('上海');b.persist();b.navigate('M01');});
    assert.equal(await page.evaluate(()=>window.SIM_DEMO.core.state().selected.length),0);
    await page.locator('.m01-task [data-action="m01ContinuePay"]').click();
    await page.locator('#br04-frame').waitFor();
    assert.match(await page.locator('#br04-frame').getAttribute('src'),/o01/);
    const restored=await page.evaluate(id=>{const s=window.SIM_DEMO.core.state(),o=s.orders.find(x=>x.id===id);return {status:o.status,expiry:o.expiresAt,selected:s.selected,units:o.unit_ids,orders:s.orders.length};},p.id);
    assert.equal(restored.status,'pending');assert.equal(restored.expiry,p.expiry);assert.deepEqual(restored.selected,restored.units);
    assert.equal(restored.orders,1,'payment resume must not create another order');
    await page.evaluate(()=>window.SIM_DEMO.navigate('M01'));
    await page.locator('.m01-task').waitFor();
    await page.evaluate(id=>{const b=window.SIM_DEMO;b.core.pay(id,'failed');b.persist();b.navigate('M01');},p.id);
    assert.match(await page.locator('.m01-task').innerText(),/支付失败/);
    await page.locator('.m01-task [data-action="m01RestartOrder"]').click();
    await page.locator('#br04-frame').waitFor();
    const afterFailure=await page.evaluate(id=>{const s=window.SIM_DEMO.core.state();return {status:s.orders[0].status,length:s.orders.length};},p.id);
    assert.equal(afterFailure.status,'payment_failed');assert.equal(afterFailure.length,1);
    await snap('04-M01-reorder');
    const multi=await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;try{
       c.setScenario('normal');c.setRequirement(3,12,true);c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
       const u=c.matchingUnits().filter(x=>x.volume>=3);if(u.length<2)throw Error('NEED_TWO_UNITS');
       const create=(x,paid)=>{c.setRequirement(3,12,true);c.select([x.id]);c.setDate(c.today());c.quote();const o=c.submit();if(paid){c.pay(o.id,'success');c.identity(o.id,'success');}return o;};
       const o1=create(u[0],true),o2=create(u.find(x=>x.id!==u[0].id),false);b.persist();b.navigate('M01');
       const t=window.H01_STATE_POLICY.derive(c.state(),c);return {key:t.key,orderId:t.orderId,pendingId:o2.id,keys:t.tasks.map(x=>x.key)};
      }catch(e){return {error:e.message};}
    });
    assert(!multi.error,'multi setup '+multi.error);
    assert.equal(multi.key,'pending');assert.equal(multi.orderId,multi.pendingId);assert(multi.keys.includes('active'));
    assert.match(await page.locator('.m01-task').innerText(),/订单待支付/);
    await snap('05-M01-multiple');
    await page.goto(host+'/home.html',{waitUntil:'domcontentloaded'});
    assert.match(await page.locator('#h01FlowContent').innerText(),/订单待支付/,'H01/M01 different priority');
    await snap('06-H01-multiple');
    await mine();
    const identity=await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;try{
       c.setScenario('normal');c.setRequirement(3,12,true);c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
       const u=c.matchingUnits().find(x=>x.volume>=3);c.select([u.id]);c.setDate(c.today());c.quote();
       const o=c.submit();c.pay(o.id,'success');b.persist();b.navigate('M01');
       return {id:o.id,key:window.H01_STATE_POLICY.derive(c.state(),c).key};
      }catch(e){return {error:e.message};}
    });
    assert(!identity.error);assert.equal(identity.key,'identity');
    await page.locator('.m01-task [data-action="m01Identity"]').click();
    await page.waitForURL(/account\.html\?view=identity/);
    assert.equal(await page.getByText('KOALA-LOCAL').count(),0,'fake door code must be absent');
    await snap('07-M01-identity');
    await page.locator('.account-header a').click();
    await page.waitForURL(/index\.html\?page=M01/);
    await page.locator('.m01-task').waitFor();
    const refund=await page.evaluate(id=>{
      const b=window.SIM_DEMO,c=b.core;try{
       c.identity(id,'success');c.lifecycleRequestExit(id,'expiry',c.today());c.lifecycleRequestInspection(id);c.lifecycleReviewInspection(id,'passed',true);
       b.persist();b.navigate('M01');return {key:window.H01_STATE_POLICY.derive(c.state(),c).key};
      }catch(e){return {error:e.message};}
    },identity.id);
    assert(!refund.error,'refund setup '+refund.error);assert.equal(refund.key,'refund');
    assert.match(await page.locator('.m01-task').innerText(),/押金处理中/);
    await snap('08-M01-refund');
    await page.evaluate(id=>{const b=window.SIM_DEMO;b.core.lifecycleReviewRefund(id,true);b.persist();b.navigate('M01');},identity.id);
    assert.equal(await page.evaluate(()=>window.H01_STATE_POLICY.derive(window.SIM_DEMO.core.state(),window.SIM_DEMO.core).key),'new');
    assert.match(await page.locator('.m01-task').innerText(),/查看以往的用仓订单/);
    await snap('09-M01-ended');
    const geom=await page.evaluate(()=>({w:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('.m01-surface button')].filter(x=>x.getBoundingClientRect().height>0).map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}))}));
    assert(geom.w<=width+2,'horizontal overflow at '+width);
    assert(geom.buttons.every(x=>x.w>=44&&x.h>=44),'M01 small touch target');
    assert.deepEqual(errors,[],'browser JS errors');
    report.push({width,threeHour:true,sharedTask:true,sameOrderRecovery:true,multiOrder:true,paymentFailureNewIntent:true,identity:true,refund:true,ended:true,overflow:false,jsErrors:0});
   }finally{await context.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
  console.log('H01-M01-CONTRACT-01 PASS',JSON.stringify(report));
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(err=>{console.error(err);process.exitCode=1;});
