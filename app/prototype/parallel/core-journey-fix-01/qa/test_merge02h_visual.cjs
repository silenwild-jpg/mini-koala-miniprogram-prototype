'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../evidence/merge02h');
fs.mkdirSync(out,{recursive:true});
const root='http://127.0.0.1:4270/central-review-02g.html?page=S01';
const outcomes=[];
function check(name,width,fn){try{const r=fn();return r;}catch(e){outcomes.push({case:name,width,result:'FAIL',error:String(e)});console.log('VISUAL_CASE',JSON.stringify(outcomes.at(-1)));return null;}}
async function step(name,width,fun){
 try{const meta=await fun();const result={case:name,width,result:'PASS',...meta};outcomes.push(result);console.log('VISUAL_CASE',JSON.stringify(result));return meta;}
 catch(e){const result={case:name,width,result:'FAIL',error:String(e)};outcomes.push(result);console.log('VISUAL_CASE',JSON.stringify(result));return null;}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const [width,height] of [[375,812],[390,844]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN'});
  const p=await ctx.newPage(),frame=p.frameLocator('#central-host'),errors=[];
  p.on('pageerror',e=>errors.push(String(e)));
  await p.goto(root,{waitUntil:'domcontentloaded'});
  const prep=await step('prepare-same-state',width,async()=>{
    await frame.locator('.store-row').first().waitFor();
    const result=await frame.locator('body').evaluate(()=>{
      const app=window.SIM_DEMO;
      app.core.setRequirement(3.5,6,true);
      app.persist();
      app.navigate('S01');
      return {requirement:app.core.state().requirement,source:app.core.fixture.version};
    });
    assert.equal(result.requirement.capacity_m3,3.5);
    assert.equal(result.requirement.term_months,6);
    return result;
  });
  if(!prep){await ctx.close();continue;}
  const offer=await frame.locator('body').evaluate(()=>{
    const a=window.SIM_DEMO.offers()[0],f=window.SIM_DEMO.core.fixture;
    return a&&{store:a.store.id,name:a.store.name,ids:a.ids,volume:a.volume,city:a.store.city,
      previewStoreIds:Array.from(document.querySelectorAll('.store-row')).slice(0,2).map(n=>n.dataset.storeId),
      distanceVerified:f.distanceVerified,quote:window.SIM_DEMO.core.amounts(a.ids,6).rent_total};
  });
  await step('S01-linked-capacity-6months',width,async()=>{
    assert(offer?.ids?.length,'no candidate match');
    const first=await frame.locator('.store-row').first().getAttribute('data-store-id');
    assert.equal(first,offer.store,'S01 first and S5 first candidate differ');
    const expanded=await frame.locator('.store-row.is-expanded').count();
    assert.equal(expanded,2,'S01 default two stores should expand');
    const row=frame.locator('.store-row[data-store-id="'+offer.store+'"]');
    assert(await row.count(),'recommended store missing');
    assert(await row.locator('.store-previews .unit-preview').count()>0,'matched unit preview absent');
    assert.equal(offer.distanceVerified,false);
    const labels=await frame.locator('.store-distance').first().innerText();
    assert(labels.includes('待定位'),'unverified distance shown as verified');
    await p.screenshot({path:path.join(out,'S01-3.5m3-6mo-'+width+'.png')});
    return {store:offer.store,unitIds:offer.ids,expanded,city:offer.city,quotedForCheck:offer.quote,verifiedDistance:false};
  });
  await step('S02-same-store-units',width,async()=>{
    await frame.locator('.store-row[data-store-id="'+offer.store+'"] [data-store]').first().click();
    await frame.locator('.detail-name').waitFor({timeout:6000});
    const st=await frame.locator('body').evaluate(()=>{
      const s=window.SIM_DEMO.core.state();
      return {storeId:s.storeId,requirement:s.requirement,city:s.city,ids:Array.from(document.querySelectorAll('.unit-row[data-unit]')).map(x=>x.dataset.unit)};
    });
    assert.equal(st.storeId,offer.store);
    assert.equal(st.requirement.capacity_m3,3.5);
    assert.equal(st.requirement.term_months,6);
    for(const id of offer.ids)assert(st.ids.includes(id),'S02 missing S01/S5 candidate '+id);
    assert.equal(await frame.locator('[role="tab"][data-value="用户评价"]').count(),0);
    await p.screenshot({path:path.join(out,'S02-3.5m3-6mo-'+width+'.png')});
    return {store:st.storeId,candidateUnitIds:offer.ids,selectedTerm:st.requirement.term_months};
  });
  await step('S5-matching-recommendation',width,async()=>{
    await frame.locator('body').evaluate(()=>window.SIM_DEMO.navigate('S5'));
    const s5=frame.frameLocator('iframe');
    const title=s5.locator('.major-unit h3');
    await title.waitFor({state:'visible',timeout:8000});
    const [txt,cap,sub]=await Promise.all([title.innerText(),s5.locator('#capacity').innerText(),s5.locator('.rec-heading h2').innerText()]);
    assert(txt.includes(offer.name),'S5 first store mismatch '+txt+' != '+offer.name);
    assert(txt.includes(String(offer.volume)),'S5 first unit volume mismatch');
    assert(cap.includes('3.5'),'S5 capacity lost');
    assert(sub.includes('2'),'S5 two-candidate layout lost');
    const v=await frame.locator('body').evaluate(()=>({state:window.SIM_DEMO.core.state(),recommended:window.SIM_DEMO.offers().slice(0,2).map(x=>({store:x.store.id,unitIds:x.ids}))}));
    assert.equal(v.state.requirement.term_months,6);
    assert.deepEqual(v.recommended[0].unitIds,offer.ids);
    await p.screenshot({path:path.join(out,'S5-3.5m3-6mo-'+width+'.png')});
    return {store:offer.store,unitIds:offer.ids,s5first:txt,city:v.state.city,count:v.recommended.length};
  });
  await step('no-horizontal-overflow-and-source-hygiene',width,async()=>{
    const shell=await frame.locator('body').evaluate(()=>({
      viewport:window.innerWidth,bodyScroll:document.body.scrollWidth,rootScroll:document.documentElement.scrollWidth,
      unwantedReview:!!document.querySelector('[data-value="用户评价"]'),
      source:window.SIM_CENTRAL_CONTRACT_V1.VERSION,
      fixture:window.SIM_DEMO.core.fixture.version
    }));
    assert(shell.bodyScroll<=shell.viewport+2,'horizontal clipped page');
    assert(shell.rootScroll<=shell.viewport+2,'root horizontal overflow');
    assert.equal(shell.source,'CENTRAL_DEMO_02G_SIM_SOURCE_1');
    assert.equal(errors.length,0,errors.join(' | '));
    return shell;
  });
  await ctx.close();
 }}finally{await browser.close();}
 const summary=outcomes.reduce((o,r)=>(o[r.result]=(o[r.result]||0)+1,o),{});
 fs.writeFileSync(path.join(out,'visual-results.json'),JSON.stringify({summary,outcomes,approval:'NOT_SIGNED_VISUALLY'},null,2));
 console.log('VISUAL_SUMMARY',JSON.stringify(summary));
 if(outcomes.some(x=>x.result==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error('VISUAL_FATAL',String(e));process.exitCode=1;});
