'use strict';
const {chromium}=require('playwright'), fs=require('node:fs'), path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../evidence/merge02k');
fs.mkdirSync(out,{recursive:true});
const root='http://127.0.0.1:4270/central-review-02g.html?catalog=mk&page=S01';
const cities=['北京','上海','深圳','杭州','广州'];
const records=[];
async function caseRun(title,city,w,callback){
 try{const data=await callback(),row={case:title,city,width:w,status:'PASS',...data};records.push(row);console.log('VISUAL_GATE_CASE',JSON.stringify(row));}
 catch(err){const row={case:title,city,width:w,status:'FAIL',error:String(err)};records.push(row);console.log('VISUAL_GATE_CASE',JSON.stringify(row));}
}
function assertHorizontal(doc){const viewport=doc.defaultView.innerWidth;const width=Math.max(doc.documentElement.scrollWidth,doc.body.scrollWidth);if(width>viewport+3)throw Error('horizontal overflow '+width+' > '+viewport);}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const [w,h] of [[375,812],[390,844]]){
  for(const city of cities){
   await caseRun('MK-S01-S02-S5-same-city-provenance',city,w,async()=>{
    const context=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN'});
    const page=await context.newPage(),frame=page.frameLocator('#central-host'),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    try{
      await page.goto(root,{waitUntil:'domcontentloaded'});
      await frame.locator('.store-row').first().waitFor({timeout:9000});
      const prepared=await frame.locator('body').evaluate((_el,c)=>{
       const app=window.SIM_DEMO,core=app.core;core.setCity(c);core.setRequirement(3.5,6,true);app.persist();app.navigate('S01');
       return {city:core.state().city,stores:core.fixture.stores.filter(x=>x.city===c).length};
      },city);
      assert.equal(prepared.city,city);assert(prepared.stores>0);
      await frame.locator('.store-row').first().waitFor({timeout:9000});
      const info=await frame.locator('body').evaluate(()=>{
       const doc=document,F=window.SIM_DEMO.core.fixture;
       const rows=[...doc.querySelectorAll('.store-row')],ids=rows.map(x=>x.dataset.storeId);
       const images=[...doc.querySelectorAll('.store-row img.store-photo')].map(i=>({alt:i.alt,loaded:i.complete&&i.naturalWidth>0}));
       return {ids,images,badRating:!![...doc.querySelectorAll('.store-row .rating')].find(x=>x.textContent.trim()==='0.0'),
         distanceText:doc.querySelector('.store-distance')?.textContent,unitSource:F.unitIdentityType,
         root:doc.documentElement.scrollWidth,viewport:window.innerWidth};
      });
      assert(info.ids.every(x=>x.startsWith('MK_')),'found cross-source store');
      assert.equal(info.badRating,false,'no rating should be invented');
      assert(info.images.every(x=>x.loaded&&x.alt.includes('示意')),'store photos missing provenance or not loaded');
      assert(info.distanceText.includes('待定位'),'distance falsely verified');
      assert(info.root<=info.viewport+3,'S01 clips horizontally');
      await page.screenshot({path:path.join(out,'MK-S01-'+city+'-'+w+'.png')});
      const first=info.ids[0];
      await frame.locator('.store-row[data-store-id="'+first+'"] [data-store]').first().click();
      await frame.locator('.detail-name').waitFor({timeout:7000});
      const detail=await frame.locator('body').evaluate(()=>{
       const F=window.SIM_DEMO.core.fixture,s=window.SIM_DEMO.core.state();
       return {store:s.storeId,unitIds:[...document.querySelectorAll('.unit-row[data-unit]')].map(x=>x.dataset.unit),
         dimensions:[...document.querySelectorAll('.unit-spec')].slice(0,3).map(x=>x.textContent),
         hasReviews:!!document.querySelector('[role="tab"][data-value="用户评价"]'),
         root:document.documentElement.scrollWidth,viewport:window.innerWidth};
      });
      assert.equal(detail.store,first);
      assert(detail.unitIds.every(x=>x.startsWith(first+'__')),'size option cross-store');
      assert(detail.dimensions.every(x=>x.includes('待门店确认')),'invented physical dimensions');
      assert.equal(detail.hasReviews,false);
      assert(detail.root<=detail.viewport+3,'S02 clips horizontally');
      await page.screenshot({path:path.join(out,'MK-S02-'+city+'-'+w+'.png')});
      await frame.locator('body').evaluate(()=>window.SIM_DEMO.navigate('S5'));
      const s5=frame.frameLocator('iframe');
      await s5.locator('#artboard').waitFor({timeout:9000});
      const state=await frame.locator('body').evaluate(()=>({city:window.SIM_DEMO.core.state().city,
         c:window.SIM_DEMO.offers(),base:window.SIM_DEMO.core.fixture.units.length}));
      assert.equal(state.city,city);
      const s5info=await s5.locator('body').evaluate(()=>{
       const f=document.querySelector('#artboard'),normal=f.dataset.match==='normal';
       return {normal,tags:[...document.querySelectorAll('.unit-tags span')].map(e=>e.textContent),
        root:document.documentElement.scrollWidth,viewport:window.innerWidth,
        text:document.body.innerText.slice(0,300)};
      });
      if(state.c.length){
       assert.equal(s5info.normal,true,'missing recommendation');
       assert(s5info.tags.includes('仓型选项'),'MK source called physical unit');
       assert(!s5info.tags.includes('实体门'),'unverified actual door shown');
      }else assert.equal(s5info.normal,false,'fake candidate without matching units');
      assert(s5info.root<=s5info.viewport+3,'S5 clips horizontally');
      await page.screenshot({path:path.join(out,'MK-S5-'+city+'-'+w+'.png')});
      assert.equal(errors.length,0,'page JS errors '+errors.join('|'));
      return {store:first,options:detail.unitIds.length,match:state.c.length>0,cityStores:prepared.stores,sourceLabelsCorrect:true};
    }finally{await context.close()}
   });
  }
  await caseRun('MK-vs-SIM-unchanged-badges','北京',w,async()=>{
   const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN'});
   const p=await ctx.newPage();
   try{
    await p.goto('http://127.0.0.1:4270/central-review-02g.html?catalog=sim&page=S01',{waitUntil:'domcontentloaded'});
    const f=p.frameLocator('#central-host');await f.locator('.store-row').first().waitFor();
    const catalog=await f.locator('body').evaluate(()=>({ns:window.SIM_DEMO.core.fixture.sourceNamespace||'SIM',ids:[...document.querySelectorAll('.store-row')].map(e=>e.dataset.storeId)}));
    assert.equal(catalog.ns,'SIM');assert(catalog.ids.every(x=>x.startsWith('SIM_')));
    return {preserved:true};
   }finally{await ctx.close();}
  });
 }
 }finally{await browser.close()}
 const summary=records.reduce((m,r)=>(m[r.status]=(m[r.status]||0)+1,m),{});
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({summary,records,visualApproval:'NOT_SIGNED_OFF'},null,2));
 console.log('VISUAL_GATE_SUMMARY',JSON.stringify(summary));
 if(summary.FAIL)process.exitCode=1;
})().catch(e=>{console.log('VISUAL_GATE_FATAL',String(e));process.exitCode=1});
