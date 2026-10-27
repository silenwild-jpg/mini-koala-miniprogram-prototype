'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../evidence/merge02d');
fs.mkdirSync(out,{recursive:true});
const freezeSources=path.resolve(__dirname,'../evidence/freeze-recovery/source');
const comparisonSourceDir=path.join(out,'approved-source');
fs.mkdirSync(comparisonSourceDir,{recursive:true});
for(const filename of [
  'H01_VIS11J.png','CAP_375_GUARD02.png','CAP_390_GUARD02.png',
  'S01_375_VIS07.png','S01_390_VIS07.png','S02_375_VIS07.png','S02_390_VIS07.png',
  'S5_source_crop.png','QUICK_source_crop.png','BR04_4pages_handoff.png','ITEMS_390_8states.png'
]){
 const src=path.join(freezeSources,filename);
 if(fs.existsSync(src))fs.copyFileSync(src,path.join(comparisonSourceDir,filename));
 else console.warn('REFERENCE_MISSING',filename);
}
const base='http://127.0.0.1:4270/demo/';
const results=[];
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN'});
      const page=await ctx.newPage();
      const pageErrors=[];
      page.on('pageerror',e=>pageErrors.push(String(e)));
      const cases=[
        ['H01','home.html'],
        ['CAP','cap.html'],
        ['ITEMS','items.html'],
        ['S01','index.html?page=S01'],
        ['S02','index.html?page=S02&store=SIM_BJ01'],
        ['S5-empty','index.html?page=S5'],
        ['QUICK','index.html?page=QUICK'],
        ['BOOKING','index.html?page=BOOKING']
      ];
      for(const [key,url] of cases){
        try{
          pageErrors.length=0;
          const response=await page.goto(base+url,{waitUntil:'domcontentloaded',timeout:25000});
          await page.waitForTimeout(500);
          const status=response?.status(),title=await page.title(),parentText=await page.locator('body').innerText({timeout:8000});
          const frame=page.locator('iframe').first();
          const frameText=await page.locator('iframe').count()?await frame.contentFrame().locator('body').innerText({timeout:8000}):'';
          const body=parentText+'\n'+frameText;
          const shot=key+'-'+width+'.png';
          await page.screenshot({path:path.join(out,shot),fullPage:false});
          const row={case:key,size:width+'x'+height,status,title,bodyChars:body.length,errors:[...pageErrors],screenshot:shot};
          if(key==='S01'){
            row.storeCount=await page.locator('.store-row').count();
            row.expandedCount=await page.locator('.store-row.is-expanded').count();
            row.priceVisible=body.includes('参考价')||body.includes('月租');
            row.runtimeReady=await page.evaluate(()=>!!window.SIM_DEMO);
          }
          if(key==='S02'){
            row.reviewTabCount=await page.getByRole('tab',{name:'用户评价'}).count();
            row.reviewEntranceCount=await page.locator('.detail-count').count();
            row.orderButtonCount=await page.locator('[data-action="choose"]').count();
          }
          if(key==='S5-empty')row.hasIframe=await page.locator('iframe').count();
          row.result=status===200&&body.length>30&&!pageErrors.length?'PASS':'FAIL';
          if(key==='S02'&&(row.reviewTabCount||row.reviewEntranceCount))row.result='FAIL';
          results.push(row);console.log('VISIT',JSON.stringify(row));
        }catch(e){
          const row={case:key,size:width+'x'+height,result:'FAIL',error:String(e),pageErrors:[...pageErrors]};
          results.push(row);console.error('VISIT_FAIL',JSON.stringify(row));
        }
      }
      // Demand state, price, S5 rendering and order authorization guard
      try{
        pageErrors.length=0;
        await page.goto(base+'index.html?page=S01',{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>window.SIM_DEMO&&window.SIM_DEMO.core);
        await page.evaluate(()=>{
          window.SIM_DEMO.core.setScenario('normal');
          window.SIM_DEMO.core.setRequirement(3.5,6,true);
          window.SIM_DEMO.persist();
        });
        await page.reload({waitUntil:'domcontentloaded'});
        await page.waitForTimeout(450);
        const count=await page.locator('[data-action="choose"]:not([disabled])').count();
        const row={case:'S01-S5-O01',size:width+'x'+height,availableBuyButtons:count};
        await page.screenshot({path:path.join(out,'S01-demand-'+width+'.png')});
        await page.goto(base+'index.html?page=S5',{waitUntil:'domcontentloaded'});
        await page.waitForTimeout(650);
        row.s5Iframe=await page.locator('iframe').count();
        row.s5Text=await page.locator('iframe').first().contentFrame().locator('body').innerText().then(t=>t.slice(0,160));
        await page.screenshot({path:path.join(out,'S5-demand-'+width+'.png')});
        await page.goto(base+'index.html?page=S01',{waitUntil:'domcontentloaded'});
        await page.waitForTimeout(300);
        if(count){
          await page.locator('[data-action="choose"]:not([disabled])').first().click();
          row.phoneGateShown=await page.locator('.mk-auth-overlay').count()>0;
          await page.screenshot({path:path.join(out,'AUTH-gate-'+width+'.png')});
          row.referenceNoOrderWithoutVerification=await page.evaluate(()=>window.SIM_DEMO.core.state().orders.length===0);
          if(row.phoneGateShown){
            await page.locator('.mk-auth-close').click();
            row.cancelledStillNoOrder=await page.evaluate(()=>window.SIM_DEMO.core.state().orders.length===0);
            await page.locator('[data-action="choose"]:not([disabled])').first().click();
            await page.locator('#mk-auth-agree').check();
            await page.locator('[data-auth="wechat"]').click();
            await page.waitForTimeout(550);
            const verified=await page.evaluate(()=>({auth:window.SIM_DEMO.core.authorized(),account:!!window.SIM_DEMO.core.state().account}));
            row.phoneVerified=verified.auth&&verified.account;
            row.orderPage=await page.evaluate(()=>new URLSearchParams(location.search).get('page'));
            row.orderFrame=await page.locator('iframe').count();
            await page.screenshot({path:path.join(out,'O01-after-auth-'+width+'.png')});
          }
        }
        row.pageErrors=[...pageErrors];
        row.result=count>0&&row.s5Iframe===1&&row.phoneGateShown===true&&row.referenceNoOrderWithoutVerification&&row.cancelledStillNoOrder&&row.phoneVerified&&row.orderPage==='O01'&&!pageErrors.length?'PASS':'FAIL';
        results.push(row);console.log('JOURNEY',JSON.stringify(row));
      }catch(e){
        const row={case:'S01-S5-O01',size:width+'x'+height,result:'FAIL',error:String(e),pageErrors:[...pageErrors]};
        results.push(row);console.error('JOURNEY_FAIL',JSON.stringify(row));
      }
      await ctx.close();
    }
  }finally{await browser.close();}
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({timestamp:new Date().toISOString(),cases:results},null,2));
  console.log('RESULT_COUNTS',JSON.stringify(results.reduce((acc,x)=>(acc[x.result]=(acc[x.result]||0)+1,acc),{})));
  if(results.some(x=>x.result!=='PASS'))process.exitCode=1;
})().catch(e=>{console.error('FATAL',e);process.exitCode=1});
