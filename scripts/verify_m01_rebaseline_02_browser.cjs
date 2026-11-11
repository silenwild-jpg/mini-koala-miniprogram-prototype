#!/usr/bin/env node
'use strict';
// M01-REBASELINE-02: scoped Chromium evidence for prototype lifecycle and visual continuity.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/m01-rebaseline-02');
const host='http://127.0.0.1:4692';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let f;try{f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(f,(err,b)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}).end(b));
});
const records=[];
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(4692,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   async function shot(name){await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});}
   async function home(){await page.evaluate(()=>{window.M01_REBASELINE_01.setView('home');window.SIM_DEMO.navigate('M01')});await page.locator('.m01-task').waitFor();}
   function setup(){return page.evaluate(()=>{
     const c=window.SIM_DEMO.core,b=window.SIM_DEMO;
     c.setScenario('normal');c.setRequirement(3,12,true);
     c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
     const units=c.matchingUnits().filter(u=>u.volume>=3);if(units.length<2)throw Error('NEED_TWO_AVAILABLE_UNITS');
     const place=(index,paid,identity,future)=>{
       const u=units[index];c.setRequirement(3,12,true);c.select([u.id]);
       const today=c.today(),date=future?new Date(Date.parse(today+'T00:00:00Z')+7*86400000).toISOString().slice(0,10):today;
       c.setDate(date);c.quote();const o=c.submit();
       if(paid){c.pay(o.id,'success');if(identity)c.identity(o.id,'success');}
       return o.id;
     };
     return {core:c,bridge:b,place};
   });}
   try{
    await page.goto(host+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
    await page.locator('.m01-task').waitFor();
    await shot('M01-empty');
    await page.locator('.m01-row[data-value="account"]').first().click();
    await page.locator('a[href="account.html?view=profile"]').click();
    await page.waitForURL(/account\.html\?view=profile/);
    await page.locator('.account-profile-lines').waitFor();
    assert.equal(await page.locator('text=内部预览设置').count(),0,'no debug controls in normal profile');
    assert.equal(await page.locator('.account-header a').count(),1,'one back control on account subpage');
    assert.match(await page.locator('#page-title').innerText(),/个人信息/);
    await shot('M01-profile');
    await page.locator('.account-header a').click();
    await page.waitForURL(/index\.html\?page=M01/);
    await page.locator('.m01-task').waitFor();
    const multi=await page.evaluate(()=>{
      const c=window.SIM_DEMO.core,b=window.SIM_DEMO;
      try{
       c.setScenario('normal');c.setRequirement(3,12,true);c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
       const units=c.matchingUnits().filter(u=>u.volume>=3);if(units.length<2)throw Error('NEED_TWO_AVAILABLE_UNITS');
       const create=(u,paid)=>{
         c.setRequirement(3,12,true);c.select([u.id]);c.setDate(c.today());c.quote();const o=c.submit();
         if(paid){c.pay(o.id,'success');c.identity(o.id,'success');}return o;
       };
       const paid=create(units[0],true),pending=create(units.find(u=>u.id!==units[0].id),false);
       b.persist();b.navigate('M01');return {paidId:paid.id,pendingId:pending.id};
      }catch(e){return {error:e.message};}
    });
    assert(!multi.error,'could not prepare multi-order state: '+multi.error);
    assert.match(await page.locator('.m01-task').innerText(),/正在用仓/,'active order takes priority over pending');
    await shot('M01-multi-order-active');
    await page.locator('.m01-row[data-value="orders"]').click();
    assert.equal(await page.locator('.mk-order-list-row').count(),2,'both paid and pending orders visible');
    await page.locator('.m01-back').click();
    await page.locator('.m01-row[data-value="services"]').click();
    assert.equal(await page.locator('.m01-service-item').count(),1,'paid order only in after-sale actions');
    await page.locator('.m01-service-item [data-action="m01Order"]').click();
    assert.match(await page.locator('.mk-order-section').first().innerText(),/用仓信息/);
    const buttons=await page.locator('.mk-order-action-grid button').allInnerTexts();
    assert(buttons.includes('入仓指引')&&buttons.includes('续租')&&buttons.includes('退租/到期'),'active paid order actionable services');
    await shot('M01-O03-active');
    await page.locator('.mk-order-action-grid [data-value="RN01"]').click();
    await page.locator('.m02-service-summary').waitFor();
    assert.match(await page.locator('.m02-service-summary').innerText(),/累计租期/);
    assert.equal(await page.locator('#renew-months').inputValue(),'','no undisclosed renewal-month default');
    await shot('M01-RN01');
    await page.evaluate(()=>window.SIM_DEMO.navigate('EX01'));
    await page.locator('.m02-service-summary').waitFor();await shot('M01-EX01');
    await page.evaluate(()=>window.SIM_DEMO.navigate('DP01'));
    await page.locator('.m02-service-summary').waitFor();assert.match(await page.locator('.m02-deposit').innerText(),/订单押金/);await shot('M01-DP01');
    await page.evaluate(()=>window.SIM_DEMO.navigate('IV01'));
    await page.locator('.m02-service-summary').waitFor();await shot('M01-IV01');
    await home();
    const renewal=await page.evaluate(id=>{
      const c=window.SIM_DEMO.core,b=window.SIM_DEMO;try{c.lifecycleRequestRenewal(id,3);b.persist();b.navigate('M01');return {ok:true};}catch(e){return {error:e.message};}
    },multi.paidId);
    assert(!renewal.error,'renewal state failed '+renewal.error);
    assert.match(await page.locator('.m01-task').innerText(),/续租申请处理中/);
    await shot('M01-renewal-progress');
    // Separate fresh scenario: future start, identity required -> then upcoming -> access guidance.
    const future=await page.evaluate(()=>{
      const c=window.SIM_DEMO.core,b=window.SIM_DEMO;
      try{
        c.setScenario('normal');c.setRequirement(3,12,true);c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
        const u=c.matchingUnits().find(u=>u.volume>=3);c.select([u.id]);
        const day=new Date(Date.parse(c.today()+'T00:00:00Z')+7*86400000).toISOString().slice(0,10);
        c.setDate(day);c.quote();const o=c.submit();c.pay(o.id,'success');b.persist();b.navigate('M01');return {id:o.id};
      }catch(e){return {error:e.message};}
    });
    assert(!future.error,'future use case failed '+future.error);
    assert.match(await page.locator('.m01-task').innerText(),/待身份验证/);
    await page.locator('.m01-task .m01-primary-button').click();
    await page.waitForURL(/account\.html\?view=identity/);
    assert.match(await page.locator('#page-title').innerText(),/身份验证/);
    await shot('M01-identity-child');
    await page.locator('.account-header a').click();
    await page.waitForURL(/index\.html\?page=M01/);
    await page.locator('.m01-task').waitFor();
    await page.evaluate(id=>{const b=window.SIM_DEMO;b.core.identity(id,'success');b.persist();b.navigate('M01');},future.id);
    assert.match(await page.locator('.m01-task').innerText(),/待起租/);
    await page.locator('.m01-task .m01-primary-button').click();
    await page.waitForURL(/account\.html\?view=access/);
    assert.match(await page.locator('.service-state').innerText(),/尚未到起租时间/);
    assert.equal(await page.locator('button[data-act="enter"]').count(),0,'no access before start');
    await shot('M01-access-child');
    await page.locator('.account-header a').click();
    await page.waitForURL(/index\.html\?page=M01/);
    await page.locator('.m01-task').waitFor();
    // Separate termination sequence: exiting -> awaiting inspection -> refund pending -> refunded.
    const termination=await page.evaluate(()=>{
      const c=window.SIM_DEMO.core,b=window.SIM_DEMO;
      try{
        c.setScenario('normal');c.setRequirement(3,12,true);c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
        const u=c.matchingUnits().find(u=>u.volume>=3);c.select([u.id]);c.setDate(c.today());c.quote();const o=c.submit();
        c.pay(o.id,'success');c.identity(o.id,'success');
        c.lifecycleRequestExit(o.id,'expiry',c.today());c.lifecycleRequestInspection(o.id);
        b.persist();b.navigate('M01');return {id:o.id};
      }catch(e){return {error:e.message};}
    });
    assert(!termination.error,'exit demo failed '+termination.error);
    assert.match(await page.locator('.m01-task').innerText(),/退租处理中/);
    await shot('M01-returning');
    await page.evaluate(id=>{const b=window.SIM_DEMO;b.core.lifecycleReviewInspection(id,'passed',true);b.persist();b.navigate('M01');},termination.id);
    assert.match(await page.locator('.m01-task').innerText(),/押金处理中/);
    await shot('M01-refund-pending');
    await page.evaluate(id=>{const b=window.SIM_DEMO;b.core.lifecycleReviewRefund(id,true);b.persist();b.navigate('M01');},termination.id);
    assert.match(await page.locator('.m01-task').innerText(),/历史用仓记录/,'refunded orders no longer masquerade as active');
    await shot('M01-ended-history');
    const geom=await page.evaluate(()=>{
      const width=document.documentElement.scrollWidth;
      const actions=[...document.querySelectorAll('.m01-surface button')].filter(x=>x.getBoundingClientRect().height>0).map(x=>({label:x.innerText,box:x.getBoundingClientRect().toJSON()}));
      return {width,actions};
    });
    assert(geom.width<=width+2,'horizontal overflow '+geom.width+' at '+width);
    assert(geom.actions.every(x=>x.box.width>=44&&x.box.height>=44),'undersized M01 control');
    assert.deepEqual(errors,[],'runtime JS errors');
    records.push({width,height,multiOrder:multi,orderServices:true,renewal:true,identityAccess:true,exitRefund:true,overflow:false,errors:0});
   }finally{await context.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(records,null,2));
  console.log('M01-REBASELINE-02 Chromium PASS',JSON.stringify(records));
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e);process.exitCode=1;});
