'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../evidence/merge02g');fs.mkdirSync(out,{recursive:true});
const root='http://127.0.0.1:4270/';
const report=[];function note(name,width,ok,more={}){const v={name,width,result:ok?'PASS':'FAIL',...more};report.push(v);console.log('CENTRAL_CASE',JSON.stringify(v));}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const [width,height] of [[375,812],[390,844]]){
  const ctx=await browser.newContext({viewport:{width,height},locale:'zh-CN'});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try {
   await page.goto(root+'index.html',{waitUntil:'domcontentloaded'});
   await page.locator('[data-integration="CENTRAL_DEMO_02G"]').click();
   await page.waitForURL(/central-review-02g.html/);
   const frame=page.frameLocator('#central-host');
   await frame.locator('[data-action*="估大小"]').first().waitFor({state:'visible'});
   const source=await page.locator('body').getAttribute('data-source');
   assert(source,'missing central contract fixture source');
   await frame.locator('.task-hotspots [data-action*="估大小"]').first().click();
   await frame.locator('#capacity').fill('3.5');
   await frame.locator('#capacity').dispatchEvent('input');
   await frame.getByRole('button',{name:/^6/}).first().click();
   await frame.locator('#cta').click();
   const child=frame.frameLocator('iframe');
   await child.locator('#main-buy').click();
   await frame.locator('.mk-auth-overlay').waitFor();
   await frame.locator('#mk-auth-agree').check();
   await frame.locator('[data-auth="wechat"]').click();
   await child.locator('#agreed').waitFor({state:'visible'});
   await child.locator('#start-date').fill('2026-11-01');
   await child.locator('#start-date').dispatchEvent('change');
   await child.locator('#agreed').check();
   await child.locator('#pay').click();
   await child.locator('[data-bridge="payResult"][data-value="success"]').waitFor();
   const pre=await frame.locator('body').evaluate(()=>({
    state:window.SIM_DEMO.core.state(),
    source:window.SIM_CENTRAL_CONTRACT_V1.VERSION
   }));
   assert.equal(pre.state.orders.length,1);
   assert.equal(pre.state.orders[0].status,'pending');
   assert.deepEqual(pre.state.quote.unit_ids,pre.state.orders[0].unit_ids);
   assert.equal(pre.state.orders[0].quote_id,pre.state.quote.id);
   assert.equal(pre.state.orders[0].payable,pre.state.quote.payable);
   assert.equal(pre.state.orders[0].management_fee,50);
   assert(pre.state.orders[0].store_id.startsWith('SIM_'));
   await page.screenshot({path:path.join(out,'02G-O01-snapshot-'+width+'.png')});
   await child.locator('[data-bridge="payResult"][data-value="success"]').click();
   const order=await frame.locator('body').evaluate(()=>window.SIM_DEMO.core.state().orders[0]);
   assert.equal(order.status,'paid_simulated');
   assert.equal(errors.length,0,errors.join(' | '));
   note('launcher-H01-CAP-S5-auth-O01-pay',width,true,{source,contract:pre.source,unit_ids:order.unit_ids,quote_id:order.quote_id,payable:order.payable});
  }catch(e){note('launcher-H01-CAP-S5-auth-O01-pay',width,false,{error:String(e),url:page.url(),errors});}
  await ctx.close();
  for(const [name,url,wantBlocked] of [
    ['MK_ID_DENIED','central-review-02g.html?page=S02&store=MK_BJ_2CDB7BEE',true],
    ['SIM_ID_ACCEPTED','central-review-02g.html?page=S02&store=SIM_BJ01',false],
    ['DIRECT_O01_DENIED','central-review-02g.html?page=O01',true]
  ]){
    const c=await browser.newContext({viewport:{width,height},locale:'zh-CN'});
    const p=await c.newPage();
    try{
     await p.goto(root+url,{waitUntil:'domcontentloaded'});
     await p.waitForTimeout(270);
     const errText=await p.locator('#central-error').isVisible();
     assert.equal(errText,wantBlocked,'incorrect route gate '+name);
     if(!wantBlocked)await p.frameLocator('#central-host').locator('.page-S02').waitFor({timeout:7000});
     note(name,width,true,{blocked:errText});
    }catch(e){note(name,width,false,{error:String(e)});}
    await c.close();
  }
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,'browser-result.json'),JSON.stringify({cases:report,summary:report.reduce((o,x)=>(o[x.result]=(o[x.result]||0)+1,o),{})},null,2));
 console.log('CENTRAL_SUMMARY',JSON.stringify(report.reduce((o,x)=>(o[x.result]=(o[x.result]||0)+1,o),{})));
 if(report.some(x=>x.result!=='PASS'))process.exitCode=1;
})().catch(e=>{console.error('CENTRAL_FATAL',e);process.exitCode=1});
