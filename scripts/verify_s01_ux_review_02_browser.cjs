#!/usr/bin/env node
'use strict';
/* S01-UX-REVIEW-02: third-plus compact cards, direct S02, and match/price
   status tests against the exact isolated release build. NO DEPLOY. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s01-ux-review-02');
const port=4581,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;
  try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}
  catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>error?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
const acceptedStates=new Set(['browse','exact','combo','near','none','soldout']);
async function open(page){
  await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
  const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
  await s01.locator('#s01-search').waitFor({state:'visible'});
  await s01.locator('.s01-result-summary').getByText(/共/).waitFor();
  return {app,s01};
}
async function run(){
  fs.mkdirSync(out,{recursive:true});
  await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const rows=[];
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      const page=await ctx.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      const {app,s01}=await open(page);
      const cards=s01.locator('.store-card');
      assert(await cards.count()>=3,'full store discovery unexpectedly truncated');
      assert.equal(await cards.nth(0).getAttribute('data-presentation'),'expanded-two');
      assert.equal(await cards.nth(1).getAttribute('data-presentation'),'expanded-two');
      const count=await cards.count();
      for(let index=2;index<count;index++){
        const card=cards.nth(index);
        assert.equal(await card.getAttribute('data-presentation'),'compact-direct','third-plus card must be compact');
        assert(await card.evaluate(el=>getComputedStyle(el).display==='grid'),'third-plus layout not compact');
        assert.equal(await card.locator('.order:visible').count(),0,'third-plus contains visible order CTA');
        assert.equal(await card.locator('.s01-compact-summary:visible').count(),1,'compact summary missing');
        assert.equal(await card.locator('.s01-compact-summary').getAttribute('hidden'),null);
        const thumb=await card.locator('.store-photo').boundingBox();
        assert(thumb&&thumb.width>=82&&thumb.width<=99,'compact photo is not thumbnail sized');
      }
      const full=await cards.first().locator('.units').isVisible();
      assert(full,'first store must show its available unit previews');
      const frameSafety=await app.locator('#screen').evaluate(el=>{
        const frame=el.querySelector('#s01-r2-frame'),nav=el.querySelector('.bottom-nav');
        return {frameBottom:frame?.getBoundingClientRect().bottom,navTop:nav?.getBoundingClientRect().top,width:document.documentElement.scrollWidth,windowWidth:innerWidth};
      });
      assert(frameSafety.frameBottom<=frameSafety.navTop+2,'bottom navigation overlaps store list');
      assert(frameSafety.width<=frameSafety.windowWidth+2,'horizontal overflow');
      await page.screenshot({path:path.join(out,'S01-compact-'+width+'.png'),fullPage:true});
      // Third and later must go directly to S02, never toggle/expand in S01.
      const storeId=await cards.nth(2).getAttribute('data-store-id');
      await cards.nth(2).click();
      await app.locator('#screen.page-S02').waitFor({state:'attached'});
      assert.equal(await app.locator('#s01-r2-frame').count(),0,'compact row did not leave S01');
      const selected=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.state().storeId);
      assert.equal(selected,storeId,'compact row changed or dropped store id');
      // New page gives a clean state for each scenario; the UI does not mutate
      // canonical fixture inventory or pre-authorize quotes.
      const states=[];
      for(const scenario of ['noDemand','normal','combo','noMatch']){
        const scenarioPage=await ctx.newPage();
        scenarioPage.on('pageerror',e=>errors.push(e.message));
        const {app:scenarioApp,s01:scenarioS01}=await open(scenarioPage);
        await scenarioApp.locator('#scenario').selectOption(scenario);
        await scenarioS01.locator('.store-card').first().waitFor({state:'attached'});
        const snapshot=await scenarioApp.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
        assert(snapshot.stores.length>=1,'scenario has no store candidates at all');
        for(const [i,store] of snapshot.stores.entries()){
          assert(acceptedStates.has(store.matchState),'unknown match state: '+store.matchState);
          if(i>=2)assert.equal(await scenarioS01.locator('.store-card').nth(i).getAttribute('data-presentation'),'compact-direct');
          if(store.matchState==='near')assert(store.units.every(u=>u.action==='store'&&u.orderable===false),'capacity-shortfall enables direct order');
          if(store.matchState==='combo')assert.equal(store.units.length,0,'combo must go through S02 for multi-unit checkout');
          if(store.matchState==='soldout')assert.equal(store.units.length,0,'sold-out store shows a rentable unit');
          if(store.matchState==='exact'||store.matchState==='browse')assert(store.units.every(u=>u.orderable),'eligible unit incorrectly blocked');
        }
        states.push({scenario,visible:snapshot.stores.length,types:[...new Set(snapshot.stores.map(s=>s.matchState))]});
        if(scenario==='noMatch')assert(snapshot.stores.some(s=>s.matchState==='none'||s.matchState==='soldout'),'no-match rendered as exact');
        await scenarioPage.close();
      }
      // Empty-search recovery must restore the same activity page with its nav.
      const emptyPage=await ctx.newPage(),{s01:emptyS01}=await open(emptyPage);
      await emptyS01.locator('#s01-search').fill('没有这家门店XYZ');
      assert.equal(await emptyS01.locator('.store-card').count(),0);
      assert.equal(await emptyS01.locator('.s01-empty-action').count(),3);
      await emptyS01.locator('.s01-empty-action').first().click();
      assert(await emptyS01.locator('.store-card').count()>2,'clear-filters failed to recover stores');
      await emptyPage.close();
      assert.deepEqual(errors,[],'page runtime errors');
      rows.push({width,height,storeCount:count,thirdToS02:storeId,states,frameSafety,errors:errors.length});
      await ctx.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',rows},null,2));
    console.log('S01_UX_REVIEW_02_PASS',JSON.stringify(rows));
  }finally{await browser.close();server.close();}
}
run().catch(error=>{console.error('S01_UX_REVIEW_02_FAIL',error);server.close();process.exitCode=1;});
