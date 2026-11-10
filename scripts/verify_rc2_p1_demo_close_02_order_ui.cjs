#!/usr/bin/env node
'use strict';
// RC2-P1-DEMO-CLOSE-02: actual O01 UI operations, isolated same PR#97 app tree.
// Test setup intentionally uses the real core API for prerequisites; payment, agreement,
// cancel/reopen, success, failure and navigation operate by rendered UI.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-p1-demo-close-02');
const host='http://127.0.0.1:4610';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let name;try{name=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!name.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(name,(err,body)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream'}).end(body));
});
const results=[],failures=[];
async function run(browser,width,height,scenario){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
  const app=page.frameLocator('#central-host');
  await app.locator('#screen.page-S01').waitFor();
  const setup=await app.locator('#screen').evaluate(()=>{
   const B=window.SIM_DEMO,c=B.core;
   c.setRequirement(3,12,true);
   const u=c.matchingUnits().find(x=>x.volume>=3);
   if(!u)throw Error('NO_MATCHING_UNIT');
   c.select([u.id]);
   c.requestPhone();
   c.resolvePhone('success',{phone:'13800138000',method:'local_fixture'});
   c.setDate(c.today());
   B.persist();B.navigate('O01');
   return {unitId:u.id,storeId:u.store_id,date:c.today()};
  });
  await app.locator('#screen.page-O01').waitFor();
  const order=app.frameLocator('#br04-frame');
  await order.locator('body.bridge-ready').waitFor({timeout:12000});
  assert.match(await order.locator('#pay').innerText(),/确认订单/);
  assert.match(await order.locator('.payment-note').innerText(),/不会实际扣款或锁定仓位/);
  const amount=(await order.locator('#total').innerText()).trim();
  assert.match(amount,/^¥[0-9,]+/,'no full payable amount');
  const dims=await order.locator('html').evaluate(el=>({scroll:el.scrollWidth,viewport:innerWidth}));
  assert(dims.scroll<=width+2,'horizontal overflow');
  await page.screenshot({path:path.join(out,scenario+'-O01-before-'+width+'.png'),fullPage:false});
  // Real O01 confirm order click must not accept absent agreement.
  await order.locator('#pay').click();
  await order.locator('#toast:not([hidden])').waitFor();
  assert.match(await order.locator('#toast').innerText(),/勾选服务协议/);
  assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().orders.length),0,'created order without agreement');
  await order.locator('#agreed').check();
  assert.equal(await order.locator('#toast').isVisible(),false,'agreement error toast must clear when consent is corrected');
  await order.locator('#pay').click();
  await order.locator('#scrim:not([hidden])').waitFor();
  assert.equal(await order.locator('#toast').isVisible(),false,'old validation toast overlaps payment sheet');
  assert.match(await order.locator('#sheet-title').innerText(),/支付流程/);
  assert.match(await order.locator('#sheet-content').innerText(),/不发生实际扣款或锁仓/);
  const current=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().orders.at(-1));
  assert.equal(current.status,'pending');
  assert.equal(current.kind,'SIMULATED_ORDER');
  assert.equal(current.store_id,setup.storeId);
  assert(current.unit_ids.includes(setup.unitId));
  const pendingId=current.id;
  await page.screenshot({path:path.join(out,scenario+'-payment-sheet-'+width+'.png'),fullPage:false});
  if(scenario==='cancel-resume'){
    await order.locator('[data-bridge="cancelPay"]').click();
    assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().orders.at(-1).status),'pending');
    await order.locator('#pay').click();
    await order.locator('#scrim:not([hidden])').waitFor();
    assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().orders.length),1,'resume duplicated pending order');
    await order.locator('[data-bridge="payResult"][data-value="success"]').click();
  } else if(scenario==='success'){
    await order.locator('[data-bridge="payResult"][data-value="success"]').click();
  } else if(scenario==='failure'){
    await order.locator('[data-bridge="payResult"][data-value="failed"]').click();
  }else throw Error('unknown scenario');
  const after=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().orders.at(-1));
  assert.equal(after.id,pendingId);
  assert.equal(after.status,scenario==='failure'?'payment_failed':'paid_simulated');
  await order.locator('#scrim:not([hidden])').waitFor();
  const notice=(await order.locator('#sheet-content').innerText()).trim();
  const heading=(await order.locator('#sheet-title').innerText()).trim();
  assert.equal(await order.locator('#toast').isVisible(),false,'stale toast overlaps outcome sheet');
  assert(!/SIM_ORDER_|模拟支付成功|模拟支付失败/.test(heading+' '+notice),'internal order ID or ambiguous paid result leaked into customer UI');
  assert.match(notice,/未发生真实扣款/,'must clearly distinguish real settlement from local experience');
  assert.match(heading,scenario==='failure'?/支付流程未完成/:/支付流程已完成/);
  await page.screenshot({path:path.join(out,scenario+'-outcome-'+width+'.png'),fullPage:false});
  const record={scenario,width,height,status:'PASS',date:setup.date,storeId:setup.storeId,unitId:setup.unitId,amount,beforeStatus:current.status,afterStatus:after.status,notice,errors};
  assert.deepEqual(errors,[],'page errors');
  results.push(record);
 }catch(err){
  failures.push({scenario,width,message:String(err.stack||err).slice(0,2600)});
  try{await page.screenshot({path:path.join(out,'FAIL-'+scenario+'-'+width+'.png'),fullPage:false});}catch{}
 }finally{await ctx.close()}
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4610,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]])for(const scenario of ['success','failure','cancel-resume'])await run(browser,width,height,scenario);
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
 const outcome={status:failures.length?'FAIL':'PASS',kind:'ISOLATED_BROWSER_SIMULATED_PAYMENT_NOT_WECHAT',cases:results.length,failures,results,sourceAppCommit:'449098dd28dc02a0eec65ebb5a5f0ba685c9fe73',humanUatSignedOff:false,netlifyUpdated:false};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(outcome,null,2));
 console.log('RC2_P1_DEMO_CLOSE_02_ORDER_UI '+JSON.stringify({status:outcome.status,cases:results.length,failures:failures.length,scenarios:results.map(x=>({width:x.width,scenario:x.scenario,status:x.afterStatus}))}));
 if(failures.length){failures.forEach(f=>console.error('RC2_P1_DEMO_CLOSE_02_FAILED '+JSON.stringify(f)));process.exitCode=1}
})().catch(err=>{console.error('RC2_P1_DEMO_CLOSE_02_ABORT',err.stack||err);process.exitCode=1});
