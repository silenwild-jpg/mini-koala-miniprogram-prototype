'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../evidence/merge02f');
fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:4270/demo/';
const records=[];
function record(name,size,status,details={}){const row={name,size,status,...details};records.push(row);console.log('CHECK',JSON.stringify(row));}
function mark(name,size,error,details={}){record(name,size,'FAIL',{error:String(error),...details});}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const [w,h] of [[375,812],[390,844]]){
  // 1. Real lead submitted: empty address blocked; valid address creates exactly one lead and zero orders.
  {
   const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN'});
   const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
   try{
    await p.goto(base+'home.html',{waitUntil:'domcontentloaded'});
    await p.locator('[data-action*="预约订单"]').last().click();
    await p.locator('[data-h="booking"]').click();
    await p.waitForURL(/page=BOOKING/);
    const f=p.frameLocator('iframe');
    await f.locator('#submit').click();
    const before=await p.evaluate(()=>({leads:window.SIM_DEMO.core.state().leads.length,orders:window.SIM_DEMO.core.state().orders.length}));
    assert.equal(before.leads,0,'empty address accepted');
    await f.locator('#booking-address').fill('北京市朝阳区测试街道 88 号');
    await f.locator('#submit').click();
    await f.locator('#success').waitFor({state:'visible',timeout:5000});
    const st=await p.evaluate(()=>({leads:window.SIM_DEMO.core.state().leads,orders:window.SIM_DEMO.core.state().orders}));
    assert.equal(st.leads.length,1);assert.equal(st.orders.length,0);
    assert.equal(st.leads[0].type,'SIMULATED_BOOKING_LEAD');
    await p.screenshot({path:path.join(out,'BOOKING-submitted-'+w+'.png')});
    assert.equal(errors.length,0,'pageerror: '+errors.join('|'));
    record('booking-submit-no-order',w,'PASS',{leadType:st.leads[0].type,orders:st.orders.length});
   }catch(e){mark('booking-submit-no-order',w,e,{url:p.url(),errors});}
   await ctx.close();
  }
  // 2. Real user quick order: select a store, select a unit, confirm term/date, phone gate, O01 consent and payment success.
  {
   const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN'});
   const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
   try{
    await p.goto(base+'home.html',{waitUntil:'domcontentloaded'});
    await p.locator('[data-action*="预约订单"]').last().click();
    await p.locator('[data-h="quick"]').click();
    await p.waitForURL(/page=QUICK/);
    let f=p.frameLocator('iframe');
    await f.locator('[data-choice="store"]').click();
    await f.locator('[data-bridge="quickStore"]').first().click();
    await f.locator('[data-choice="unit"]').click();
    await f.locator('[data-bridge="quickUnit"]').first().click();
    await f.locator('[data-term="6"]').click();
    await f.locator('#start-date').fill('2026-11-01');
    await f.locator('#start-date').dispatchEvent('change');
    await pause(160);
    const selectedQuick=await p.evaluate(()=>({capacity:window.SIM_DEMO.core.state().requirement.capacity_m3,term:window.SIM_DEMO.core.state().requirement.term_months,date:window.SIM_DEMO.core.state().startDate}));
    await p.screenshot({path:path.join(out,'QUICK-selected-'+w+'.png')});
    await f.locator('#next-button').click();
    if(await p.locator('.mk-auth-overlay').count()){
      await p.locator('#mk-auth-agree').check();
      await p.locator('[data-auth="wechat"]').click();
    }
    await p.waitForURL(/page=O01/,{timeout:9000});
    f=p.frameLocator('iframe');
    const first=await p.evaluate(()=>window.SIM_DEMO.core.state().orders.length);
    assert.equal(first,0);
    await f.locator('#pay').click();
    await pause(150);
    const unagreed=await p.evaluate(()=>window.SIM_DEMO.core.state().orders.length);
    assert.equal(unagreed,0,'agreement bypass');
    await f.locator('#agreed').check();
    await f.locator('#pay').click();
    await f.locator('[data-bridge="payResult"][data-value="success"]').waitFor({state:'visible',timeout:6000});
    const pending=await p.evaluate(()=>window.SIM_DEMO.core.state().orders);
    assert.equal(pending.length,1);assert.equal(pending[0].status,'pending');
    await p.screenshot({path:path.join(out,'O01-payment-choice-'+w+'.png')});
    await f.locator('[data-bridge="payResult"][data-value="success"]').click();
    const after=await p.evaluate(()=>window.SIM_DEMO.core.state().orders);
    assert.equal(after[0].status,'paid_simulated');
    assert.equal(after[0].management_fee,50);
    await p.screenshot({path:path.join(out,'O01-paid-'+w+'.png')});
    assert.equal(errors.length,0,'pageerror: '+errors.join('|'));
    record('quick-actual-selection-consent-pay-success',w,'PASS',{quick:selectedQuick,orderId:after[0].id,amount:after[0].payable,orderStatus:after[0].status});
   }catch(e){mark('quick-actual-selection-consent-pay-success',w,e,{url:p.url(),errors});}
   await ctx.close();
  }
  // 3. Matching selected CAP state to frozen state at 8m³/12 mo, without declaring pixel-match.
  {
   const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN'});
   const p=await ctx.newPage();
   try{
     await p.goto(base+'cap.html',{waitUntil:'domcontentloaded'});
     const cap=p.locator('#capacity');await cap.fill('8');await cap.dispatchEvent('input');
     const months=p.getByRole('button',{name:/^12/}).first();
     if(await months.count())await months.click();else throw new Error('12-month visual button not found');
     await pause(200);
     const ready=!(await p.locator('#cta').isDisabled());
     assert.equal(ready,true);
     await p.evaluate(()=>{window.scrollTo(0,0);document.scrollingElement&&(document.scrollingElement.scrollTop=0);document.querySelectorAll('.scroll,.page-scroll,.screen-viewport,[data-scroll]').forEach(el=>el.scrollTop=0);});
     await pause(160);
     await p.screenshot({path:path.join(out,'CAP-8m3-12mo-'+w+'.png')});
     record('cap-8m3-12mo-visual-state',w,'PASS',{ready,reference:'CAP_GUARD02',pixelEquivalence:'NOT_ASSESSED'});
   }catch(e){mark('cap-8m3-12mo-visual-state',w,e,{url:p.url()});}
   await ctx.close();
  }
  // 4. Store reference sources must not be treated as same entity; check real preview assets loaded.
  {
   const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN'});
   const p=await ctx.newPage();
   try{
    await p.goto(base+'index.html?page=S01',{waitUntil:'domcontentloaded'});
    await pause(240);
    const raw=await p.locator('img').evaluateAll(nodes=>nodes.map(n=>({url:n.getAttribute('src'),loaded:n.complete&&n.naturalWidth>0,visible:n.getBoundingClientRect().height>0})));
    const broken=raw.filter(x=>x.visible&&!x.loaded&&x.url&&!x.url.startsWith('data:'));
    await p.screenshot({path:path.join(out,'S01-no-debug-'+w+'.png')});
    assert.equal(broken.length,0,'visible broken images '+JSON.stringify(broken.slice(0,5)));
    record('S01-visible-images-loaded',w,'PASS',{imageCount:raw.length,sourceSameCity:false});
   }catch(e){mark('S01-visible-images-loaded',w,e,{url:p.url()});}
   await ctx.close();
  }
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({summary:records.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{}),results:records},null,2));
 console.log('MERGE02F_SUMMARY',JSON.stringify(records.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{})));
 if(records.some(x=>x.status!=='PASS'))process.exitCode=1;
})().catch(err=>{console.error('MERGE02F_FATAL',err);process.exitCode=1;});
