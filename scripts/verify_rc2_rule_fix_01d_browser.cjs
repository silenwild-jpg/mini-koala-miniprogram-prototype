#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),port=4374,base='http://127.0.0.1:'+port,dir=path.resolve(__dirname,'../release-evidence/rc2-fix-01d');
fs.mkdirSync(dir,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));
 if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403).end();return;}
 fs.readFile(target,(err,b)=>{if(err){res.writeHead(404).end('missing');return;}res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'}).end(b);});
});
const dims=[[375,812],[390,844]],out=[];
async function start(ctx,mode='S01'){const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error'&&!/favicon/.test(e.text()))errors.push(e.text());});
 await page.goto(base+'/central-review-02g.html?catalog=sim&page='+mode);const app=page.frameLocator('#central-host');await app.locator('#screen').waitFor();return {page,app,errors};}
async function phone(app,expectDenied=false){
 const overlay=app.locator('.mk-auth-overlay');await overlay.waitFor();
 if(expectDenied){assert.equal(await app.locator('.page-O01').count(),0);await overlay.locator('button[data-auth="close"]').click();await overlay.waitFor({state:'detached'});return;}
 await overlay.locator('#mk-auth-agree').check();
 await overlay.locator('button[data-auth="wechat"]').click();
 await overlay.waitFor({state:'detached'});
}
async function fromStore(app){
 await app.locator('.store-entry[data-store]').first().click();
 await app.locator('#screen.page-S02').waitFor();
 await app.locator('.order-button[data-action="choose"]:not([disabled])').first().click();
 if(await app.locator('button[data-action="setTerm"][data-value="6"]').count())await app.locator('button[data-action="setTerm"][data-value="6"]').click();
}
async function orderReady(app){await app.locator('#screen.page-O01').waitFor();let o=app.frameLocator('#br04-frame');await o.locator('#pay').waitFor();
 const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
 if(await o.locator('#start-date:not([disabled])').count())await o.locator('#start-date').fill(day);
 await o.locator('#agreed').check();
 await o.locator('#pay').click();await o.locator('button[data-bridge="payResult"][data-value="success"]').waitFor();return o;
}
async function finish(app,o,status){
 await o.locator('button[data-bridge="payResult"][data-value="'+status+'"]').click();
 await o.locator('button[data-bridge="orderDetail"]').click();
 await app.locator('#screen.page-O03').waitFor();
 return app.locator('#screen').innerText();
}
async function verifyRouteRemoved(app){
 const deny=await app.locator('#screen').evaluate(()=>{const c=window.SIM_CENTRAL_CONTRACT_V1,f=window.SIM_FIXTURES;return ['U01','Q01'].map(page=>{try{c.route(f,{page});return false;}catch(e){return /ROUTE_UNKNOWN/.test(String(e.message));}});});
 assert.deepEqual(deny,[true,true]);
}
async function layout(app,width){const info=await app.locator('#screen').evaluate(()=>({body:document.documentElement.scrollWidth,screen:document.querySelector('#screen')?.scrollWidth}));assert(info.body<=width+4,'horizontal body overflow: '+JSON.stringify(info));}
(async()=>{
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of dims){
   // Primary route: real S01 click -> S02 click -> term -> phone refusal -> reattempt -> O01 -> pay -> O03 -> aftercare
   {const ctx=await browser.newContext({viewport:{width,height}});const {page,app,errors}=await start(ctx,'H01');
    await app.locator('.task-card.primary').click();await app.locator('#screen.page-S01').waitFor();
    await verifyRouteRemoved(app);
    await fromStore(app);await phone(app,true);
    assert.equal(await app.locator('#screen.page-S02').count(),1,'phone refusal must not enter O01');
    assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().orders.length),0);
    await app.locator('.order-button[data-action="choose"]:not([disabled])').first().click();
    await phone(app);
    const o=await orderReady(app);const body=await finish(app,o,'success');
    assert(body.includes('paid_simulated'),'O03 did not show paid order');
    const state=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state());
    assert.equal(state.orders.length,1);assert.equal(state.orders[0].status,'paid_simulated');assert.equal(state.services[state.orders[0].id].deposit,'held');
    await app.locator('button[data-value="RN01"]').click();await app.locator('#renew-months').waitFor();
    const orderId=state.orders[0].id;
    await page.goto(base+'/central-review-02g.html?catalog=sim&page=O03');const af=page.frameLocator('#central-host');await af.getByText(orderId).first().waitFor();
    await verifyRouteRemoved(af);
    await page.goto(base+'/central-review-02g.html?catalog=sim&page=H01');
    let home=page.frameLocator('#central-host');
    await home.locator('.lifecycle-home-task a').first().click();
    await home.locator('#screen.page-O03').waitFor();await home.getByText(orderId).first().waitFor();
    await page.goto(base+'/central-review-02g.html?catalog=sim&page=H01');
    home=page.frameLocator('#central-host');
    await home.locator('[data-action="我的 → 个人中心"]').click();
    await home.locator('#screen.page-M01').waitFor();await home.getByText(orderId).first().waitFor();
    await layout(home,width);await page.screenshot({path:path.join(dir,'s01-success-'+width+'.png'),fullPage:true});
    assert.deepEqual(errors,[]);out.push({size:width,case:'H01-S01-payment-aftercare',result:'PASS',orderId});await ctx.close();}
   // Failure case: payment failure must persist failure record and release inventory, but not unlock RN01
   {const ctx=await browser.newContext({viewport:{width,height}});const {page,app,errors}=await start(ctx);
    await fromStore(app);await phone(app);const o=await orderReady(app);const body=await finish(app,o,'failed');
    assert(body.includes('payment_failed'));assert.equal(await app.locator('button[data-value="RN01"]').count(),0);
    const state=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state());
    assert.equal(state.orders.at(-1).status,'payment_failed');
    assert(!state.services[state.orders.at(-1).id]);
    await layout(app,width);await page.screenshot({path:path.join(dir,'s01-failure-'+width+'.png'),fullPage:true});
    assert.deepEqual(errors,[]);out.push({size:width,case:'S01-payment-failure',result:'PASS'});await ctx.close();}
   // Cancel and restore pending: no second order, no successful transaction before completion.
   {const ctx=await browser.newContext({viewport:{width,height}});const {page,app,errors}=await start(ctx);
    await fromStore(app);await phone(app);let o=await orderReady(app);
    await o.locator('button[data-bridge="cancelPay"]').click();
    let st=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state());
    assert.equal(st.orders.length,1);assert.equal(st.orders[0].status,'pending');assert(!st.services[st.orders[0].id]);
    const pendingId=st.orders[0].id;
    await page.goto(base+'/central-review-02g.html?catalog=sim&page=M01');
    let f=page.frameLocator('#central-host');
    await f.locator('button[data-action="orderDetail"][data-value="'+pendingId+'"]').click();
    await f.locator('button[data-action="resumeOrder"]').click();
    await f.locator('#screen.page-O01').waitFor();
    o=f.frameLocator('#br04-frame');
    assert.equal(await o.locator('#agreed').isChecked(),false,'agreement should require fresh affirmative consent');
    await o.locator('#pay').click();assert.equal(await o.locator('button[data-bridge="payResult"][data-value="success"]').count(),0);
    await o.locator('#agreed').check();await o.locator('#pay').click();
    await o.locator('button[data-bridge="payResult"][data-value="success"]').click();
    await o.locator('button[data-bridge="orderDetail"]').click();await f.locator('#screen.page-O03').waitFor();
    st=await f.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state());
    assert.equal(st.orders.length,1);assert.equal(st.orders[0].id,pendingId);assert.equal(st.orders[0].status,'paid_simulated');
    await layout(f,width);assert.deepEqual(errors,[]);out.push({size:width,case:'cancel-resume-no-duplicate',result:'PASS'});await ctx.close();}
   // S5 with stored requirement: exercise visible recommendation and order click; CAP implementation is audited separately.
   {const ctx=await browser.newContext({viewport:{width,height}});const {page,app,errors}=await start(ctx,'S01');
    await app.locator('#screen').evaluate(()=>{window.SIM_DEMO.core.setRequirement(3,6,true);window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S5');});
    await app.locator('#screen.page-S5').waitFor();const s5=app.frameLocator('#br04-frame');
    await s5.locator('#main-buy').click();await phone(app);
    const o=await orderReady(app);await finish(app,o,'success');
    await app.locator('button[data-value="DP01"]').waitFor();
    await layout(app,width);await page.screenshot({path:path.join(dir,'s5-recommendation-'+width+'.png'),fullPage:true});
    assert.deepEqual(errors,[]);out.push({size:width,case:'S5-prefilled-to-O03',result:'PASS'});await ctx.close();}
  }
  fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify({result:'PASS',cases:out,scope:'isolated PR; S5 capacity preseeded; not deployed RC2'},null,2));
  console.log('RC2_RULE_FIX_01D_E2E_PASS',JSON.stringify(out));
 }finally{await browser.close();}
})().catch(e=>{console.error('RC2_RULE_FIX_01D_E2E_FAILURE',e);process.exitCode=1;}).finally(()=>server.close());
