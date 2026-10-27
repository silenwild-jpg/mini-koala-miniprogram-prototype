'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../evidence/merge02i');
fs.mkdirSync(out,{recursive:true});
const root='http://127.0.0.1:4270/';
const records=[];
async function run(title,w,task){
 try{const detail=await task();const x={case:title,width:w,result:'PASS',...detail};records.push(x);console.log('ADMISSION_CASE',JSON.stringify(x));}
 catch(e){const x={case:title,width:w,result:'FAIL',error:String(e)};records.push(x);console.error('ADMISSION_CASE',JSON.stringify(x));}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const [w,h] of [[375,812],[390,844]]){
  await run('home-review-clean-and-debug-recoverable',w,async()=>{
   const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN'});
   try{
    const p=await ctx.newPage();
    await p.goto(root+'central-review-02g.html',{waitUntil:'domcontentloaded'});
    const host=p.frameLocator('#central-host');
    await host.locator('.task-hotspots [data-action*="估大小"]').first().waitFor({state:'visible'});
    assert.equal(await host.locator('details.toolbar').isHidden(),true,'debug toolbar leaked onto frozen H01');
    await p.screenshot({path:path.join(out,'H01-clean-'+w+'.png')});
    await p.goto(root+'prototype/parallel/core-journey-fix-01/demo/home.html?debug=1',{waitUntil:'domcontentloaded'});
    assert.equal(await p.locator('details.toolbar').isVisible(),true,'debug toolbar cannot be reopened');
    return {defaultClean:true,debugToggle:true};
   }finally{await ctx.close();}
  });
  await run('E-store-empty-city-advisor-contact-lead-only',w,async()=>{
   const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN'});
   try{
    const p=await ctx.newPage();const frameErrors=[];p.on('pageerror',e=>frameErrors.push(String(e)));
    await p.goto(root+'central-review-02g.html?page=S01',{waitUntil:'domcontentloaded'});
    const host=p.frameLocator('#central-host');
    await host.locator('body').evaluate(()=>{
     const a=window.SIM_DEMO;a.core.setScenario('emptyCity');a.persist();a.navigate('S5');
    });
    const br04=host.frameLocator('iframe');
    await br04.locator('#artboard[data-match="none"]').waitFor({timeout:7000});
    assert.equal(await br04.locator('#open-estore').isVisible(),true,'missing E-store when city has no eligible stores');
    await p.screenshot({path:path.join(out,'S5-empty-estore-'+w+'.png')});
    await br04.locator('#open-estore').click();
    await br04.locator('[data-bridge="estoreBooking"]').click();
    await br04.locator('#reserveForm').waitFor({state:'attached',timeout:7000});
    const advisorDiagnostics=await br04.locator('body').evaluate(()=>{
      const form=document.querySelector('#reserveForm'),success=document.querySelector('#success');
      return {formHidden:form?.hidden,successHidden:success?.hidden,formDisplay:form?getComputedStyle(form).display:null,
        className:document.body.className,bridgeReady:document.body.classList.contains('bridge-ready'),
        title:document.title,mode:document.body.dataset.page,
        parentHref:parent.location.href,storedAdvisor:sessionStorage.getItem('mk_advisor_context_v3')};
    });
    if(advisorDiagnostics.formHidden||advisorDiagnostics.formDisplay==='none')throw Error('Advisor form did not enter input state '+JSON.stringify(advisorDiagnostics));
    await p.waitForTimeout(400);
    if(!(await br04.locator('#reserveForm').isVisible()))throw Error('Advisor page not fully initialized '+JSON.stringify({advisorDiagnostics,frameErrors}));
    assert.equal(await br04.locator('#booking-address').getAttribute('required'),null,'advisor erroneously requires storage address');
    assert.notEqual(await br04.locator('#reserve-contact').getAttribute('required'),null,'advisor phone must be required');
    await br04.locator('#reserve-contact').fill('13800000000');
    await br04.locator('#submit').click();
    await br04.locator('#success').waitFor({state:'visible',timeout:6000});
    const state=await host.locator('body').evaluate(()=>window.SIM_DEMO.core.state());
    const last=state.leads.at(-1);
    assert.equal(last?.type,'ADVISOR_CONSULTATION');
    assert.equal(last?.phone,'13800000000');
    assert.equal(last?.address,'');
    assert.equal(state.orders.length,0,'E-store advice created rental order');
    assert.equal(last?.service_source,'estore');
    await p.screenshot({path:path.join(out,'Estore-advisor-lead-'+w+'.png')});
    return {city:state.city,noMatch:true,leadType:last.type,orders:state.orders.length,contactRequired:true};
   }finally{await ctx.close();}
  });
  await run('quick-pay-cancel-resume-and-failure-releases-unit',w,async()=>{
   const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN'});
   try{
    const p=await ctx.newPage();
    await p.goto(root+'central-review-02g.html?page=QUICK',{waitUntil:'domcontentloaded'});
    const host=p.frameLocator('#central-host'),br04=host.frameLocator('iframe');
    await br04.locator('[data-choice="store"]').click();
    await br04.locator('[data-bridge="quickStore"]').first().click();
    await br04.locator('[data-choice="unit"]').click();
    await br04.locator('[data-bridge="quickUnit"]').first().click();
    await br04.locator('[data-term="6"]').click();
    await br04.locator('#start-date').fill('2026-11-01');
    await br04.locator('#start-date').dispatchEvent('change');
    await br04.locator('#next-button').click();
    await host.locator('.mk-auth-overlay').waitFor({state:'visible'});
    await host.locator('#mk-auth-agree').check();
    await host.locator('[data-auth="wechat"]').click();
    await br04.locator('#agreed').waitFor({state:'visible'});
    await br04.locator('#agreed').check();
    await br04.locator('#pay').click();
    await br04.locator('[data-bridge="cancelPay"]').click();
    const pending=await host.locator('body').evaluate(()=>window.SIM_DEMO.core.state().orders);
    assert.equal(pending.length,1);
    assert.equal(pending[0].status,'pending','cancel button should retain pending snapshot');
    await br04.locator('#pay').click();
    await br04.locator('[data-bridge="payResult"][data-value="failed"]').click();
    const failed=await host.locator('body').evaluate(()=>window.SIM_DEMO.core.state());
    assert.equal(failed.orders[0].status,'payment_failed');
    for(const id of failed.orders[0].unit_ids)assert.notEqual(failed.stock[id],'reserved','failed payment left inventory reserved');
    assert.equal(failed.orders[0].quote_id,pending[0].quote_id);
    await p.screenshot({path:path.join(out,'O01-pay-failed-'+w+'.png')});
    return {quoteId:failed.orders[0].quote_id,status:failed.orders[0].status,inventoryReleased:true};
   }finally{await ctx.close();}
  });
  await run('branch01-02-03-04-central-page-entry-presence',w,async()=>{
   const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN'});
   try{
    const p=await ctx.newPage(),routes=[
     ['H01','home.html'],['CAP','cap.html'],['ITEMS','items.html'],
     ['S01','index.html?page=S01'],['S02','index.html?page=S02&store=SIM_BJ01'],
     ['S5','index.html?page=S5'],['BOOKING','index.html?page=BOOKING'],
     ['QUICK','index.html?page=QUICK']
    ];
    const results=[];
    for(const [key,u] of routes){
     const res=await p.goto(root+'prototype/parallel/core-journey-fix-01/demo/'+u,{waitUntil:'domcontentloaded'});
     const markup=await p.locator('body').innerHTML();
     const hasFrame=await p.locator('iframe').count()>0;
     if(hasFrame)await p.frameLocator('iframe').locator('body').waitFor({state:'attached'});
     assert.equal(res.status(),200,key+' HTTP unavailable');
     assert(markup.length>50,key+' absent DOM');
     if(hasFrame)assert((await p.locator('iframe').getAttribute('src'))?.length>0,key+' empty frame source');
     results.push(key);
    }
    return {reachablePages:results,br04Count:4};
   }finally{await ctx.close();}
  });
 }
 }finally{await browser.close();}
 const counts=records.reduce((a,x)=>(a[x.result]=(a[x.result]||0)+1,a),{});
 fs.writeFileSync(path.join(out,'admission-results.json'),JSON.stringify({counts,records},null,2));
 console.log('ADMISSION_SUMMARY',JSON.stringify(counts));
 if(counts.FAIL)process.exitCode=1;
})().catch(e=>{console.error('ADMISSION_FATAL',e);process.exitCode=1});
