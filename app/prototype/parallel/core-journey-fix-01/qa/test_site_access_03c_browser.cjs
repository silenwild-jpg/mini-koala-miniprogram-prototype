'use strict';
// SITE-ACCESS-03C: 375/390 exact staged publish package, real MK/SIM S5 click navigation.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root='http://127.0.0.1:4270/';
const output=path.resolve(__dirname,'../evidence/site-access-03c');
fs.mkdirSync(output,{recursive:true});
const cases=[];
function isPath(u,suffix){try{return new URL(u).pathname.endsWith(suffix);}catch{return false;}}
async function test(browser,viewport,catalog,source){
 const {width,height}=viewport;
 const context=await browser.newContext({viewport,locale:'zh-CN'});
 const page=await context.newPage();
 const badRequests=[],pageErrors=[];
 page.on('response',r=>{if(r.status()===404)badRequests.push(r.url());});
 page.on('pageerror',e=>pageErrors.push(String(e.message)));
 const outer=page.frameLocator('#central-host');
 const s5=outer.frameLocator('iframe#br04-frame');
 let afterClick='',afterReturn='',originalRequirement=null,afterRequirement=null;
 try{
   const response=await page.goto(root+'central-review-02g.html?catalog='+catalog+'&page=S5',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response.status(),200);
   await s5.locator('#modify').waitFor({state:'visible',timeout:18000});
   const prepared=await outer.locator('body').evaluate((_body,mode)=>{
     const b=window.SIM_DEMO;
     if(mode==='items') b.core.setEstimate({source:'known_capacity_in_items_flow',target_volume:3.5,term_months:6,term_confirmed:true});
     else b.core.setRequirement(3.5,6,true);
     b.persist();b.navigate('S5');
     return {requirement:b.core.state().requirement,fixture:b.core.fixture.sourceNamespace||'SIM'};
   },source);
   assert.equal(prepared.fixture,catalog.toUpperCase());
   originalRequirement=prepared.requirement;
   await s5.locator('#modify').waitFor({state:'visible',timeout:18000});
   await s5.locator('#modify').click();
   const suffix=source==='items'?'/demo/items.html':'/demo/cap.html';
   for(let i=0;i<70;i++){
     const found=page.frames().find(f=>isPath(f.url(),suffix));
     if(found){afterClick=found.url();break;}
     await page.waitForTimeout(200);
   }
   assert.ok(afterClick,'did not navigate to central '+suffix+'; actual='+JSON.stringify(page.frames().map(f=>f.url())));
   assert.ok(!badRequests.some(u=>u.includes('/br04/s5/cap.html')||u.includes('/br04/s5/items.html')),'iframe-local incorrect path 404');
   const saved=await page.evaluate(()=>({returnTo:sessionStorage.getItem('mk_estimate_return_v4'),itemsReturn:sessionStorage.getItem('mk_items_back_v1')}));
   assert.ok(saved.returnTo?.includes('index.html?page=S5'),'missing S5 return context '+JSON.stringify(saved));
   if(source==='items'){
     assert.equal(saved.itemsReturn,saved.returnTo);
   }else{
     await outer.locator('#capacity').waitFor({state:'visible',timeout:15000});
     await outer.locator('#capacity').fill('3.5');
     await outer.locator('#capacity').dispatchEvent('input');
     await outer.getByRole('button',{name:/^6/}).first().click();
     await outer.locator('#cta').click();
     for(let i=0;i<70;i++){
       const ready=await outer.locator('body').evaluate(()=>{
         const b=window.SIM_DEMO;
         return b&&document.querySelector('iframe#br04-frame')&&b.core.state().requirement.capacity_m3===3.5&&b.core.state().requirement.term_months===6;
       }).catch(()=>false);
       if(ready){afterReturn='S5';break;}
       await page.waitForTimeout(200);
     }
     assert.equal(afterReturn,'S5','CAP did not return to S5 while preserving requirement');
     afterRequirement=await outer.locator('body').evaluate(()=>window.SIM_DEMO.core.state().requirement);
     assert.equal(afterRequirement.capacity_m3,3.5);
     assert.equal(afterRequirement.term_months,6);
     await s5.locator('#main-buy').waitFor({state:'visible',timeout:12000});
     const recs=await outer.locator('body').evaluate(()=>window.SIM_DEMO.offers().length);
     assert.ok(recs>0,'S5 recommendations empty after return');
     await page.screenshot({path:path.join(output,'S5-return-'+catalog+'-'+width+'x'+height+'.png')});
   }
   assert.equal(pageErrors.length,0,'page errors: '+pageErrors.join(' | '));
   assert.ok(!badRequests.some(u=>u.includes('/br04/s5/cap.html')||u.includes('/br04/s5/items.html')));
   const r={width,height,catalog,source,status:'PASS',afterClick,afterReturn,originalRequirement,afterRequirement,errors:[]};
   cases.push(r);console.log('SITE_ACCESS_03C_CASE',JSON.stringify(r));
 }catch(e){
   const r={width,height,catalog,source,status:'FAIL',afterClick,afterReturn,originalRequirement,afterRequirement,pageUrls:page.frames().map(f=>f.url()),badRequests,pageErrors,error:String(e.stack||e)};
   cases.push(r);console.log('SITE_ACCESS_03C_CASE',JSON.stringify(r));
 }finally{await context.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
   for(const viewport of [{width:375,height:812},{width:390,height:844}])
     for(const catalog of ['mk','sim'])
       for(const source of ['cap','items'])await test(browser,viewport,catalog,source);
 }finally{await browser.close();}
 const counts={PASS:cases.filter(x=>x.status==='PASS').length,FAIL:cases.filter(x=>x.status==='FAIL').length};
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({task:'SITE-ACCESS-03C',environment:'GITHUB_ACTIONS_ISOLATED_STAGED_PUBLISH_NOT_LIVE_NETLIFY',counts,cases},null,2));
 console.log('SITE_ACCESS_03C_SUMMARY',JSON.stringify(counts));
 if(counts.FAIL)process.exitCode=1;
})().catch(e=>{console.error('SITE_ACCESS_03C_UNHANDLED',e);process.exitCode=1;});
