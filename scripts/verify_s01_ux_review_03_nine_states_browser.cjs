#!/usr/bin/env node
'use strict';
// S01-UX-REVIEW-03: 9 orthogonal demand/match/scope/stock/advisor states;
// capture *scrolled* compact-card visuals. Source: exact isolated RC2 candidate.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s01-ux-review-03');
const port=4583,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}
  catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
async function open(page){
  await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
  const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
  await s01.locator('#s01-search').waitFor({state:'visible'});
  await s01.locator('.store-card').first().waitFor({state:'attached'});
  return {app,s01};
}
async function state(app,scenario,setup){
  return app.locator('#screen').evaluate((_screen,{scenario,setup})=>{
    const S=window.SIM_DEMO,F=window.SIM_FIXTURES;
    S.s01R2Bridge.clearFilters();
    const known=F.scenarios.map(x=>x.id);
    if(!known.includes(scenario))throw Error('Invalid scenario: '+JSON.stringify({scenario,setup,known}));
    S.core.setScenario(scenario);
    let store=null;
    if(setup==='near'){
      store=F.stores.find(s=>s.city==='北京'&&s.status==='open'&&F.units.some(u=>u.store_id===s.id&&u.volume===12&&S.core.available(u)));
      if(!store)throw Error('No store with 12m³ near case');
      for(const u of F.units.filter(u=>u.store_id===store.id&&u.volume!==12&&S.core.available(u)))S.core.markUnavailable(u.id);
      S.core.setRequirement(14,6,true);
    }else if(setup==='stock'){
      const need=3.5;
      store=F.stores.find(s=>s.city==='北京'&&s.status==='open'&&F.units.some(u=>u.store_id===s.id&&u.volume>=need&&S.core.available(u)));
      if(!store)throw Error('No stock-change eligible store');
      for(const u of F.units.filter(u=>u.store_id===store.id&&S.core.available(u)))S.core.markUnavailable(u.id);
    }else if(setup==='advisor'){
      S.core.setRequirement(12,6,true);
    }else if(setup==='advisor-price'){
      S.core.setRequirement(3.5,60,true);
    }else if(setup==='expanded'){
      F.stores.filter(s=>s.city==='北京').forEach(s=>s.distance=Math.max(5,Number(s.distance)||5));
    }
    S.persist();S.navigate('S01',null,true);
    if(store)S.s01R2Bridge.search(store.name);
    return {selectedStore:store?.id||null};
  },{scenario,setup});
}
function requireFlag(actual,flag){assert.equal(actual.nineState[flag],true,'state flag '+flag+' not set');}
async function capture(page,filename){await page.screenshot({path:path.join(out,filename),fullPage:false});}
async function run(){
  fs.mkdirSync(out,{recursive:true});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const records=[];
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      let {app,s01}=await open(page);
      const initial=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
      assert(initial.stores.length>=4,'must reveal 3rd+ compact stores');
      for(const [i,store] of initial.stores.entries()){
        const card=s01.locator('.store-card').nth(i);
        assert.equal(await card.getAttribute('data-store-id'),store.id,'store ID mismatch');
        assert.equal(await card.getAttribute('data-presentation'),i<2?'expanded-two':'compact-direct');
        if(i>=2){
          assert.equal(await card.locator('.order:visible').count(),0,'third+ order action leaked');
          assert.equal(await card.locator('.units:visible').count(),0,'third+ expanded units leaked');
        }
      }
      await capture(page,'01-initial-'+width+'.png');
      const third=s01.locator('.store-card').nth(2);
      await third.scrollIntoViewIfNeeded();
      let box=await third.boundingBox();
      assert(box&&box.y<height-72&&box.y+box.height>0,'third compact row not visible after scroll');
      const thirdVisual=await third.evaluate(el=>{
        const pic=el.querySelector('.store-photo').getBoundingClientRect(),
          body=el.querySelector('.store-body').getBoundingClientRect(),
          card=el.getBoundingClientRect();
        return {cardW:card.width,cardH:card.height,picW:pic.width,picH:pic.height,bodyWidth:body.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,
          info:el.querySelector('.s01-compact-summary')?.innerText||'',photo:el.querySelector('.store-photo')?.getAttribute('src'),
          noVisibleUnits:getComputedStyle(el.querySelector('.units')).display==='none'};
      });
      assert(thirdVisual.picW>=82&&thirdVisual.picW<=99,'compact thumbnail mis-sized');
      assert(thirdVisual.cardH<=160,'compact row unexpectedly expanded');
      assert(thirdVisual.scrollWidth<=thirdVisual.clientWidth+3,'compact horizontal overflow');
      assert(thirdVisual.info.includes('查看门店'),'compact action hint missing');
      assert(thirdVisual.noVisibleUnits,'compact has visible unit rows');
      await capture(page,'02-third-card-'+width+'.png');
      const last=s01.locator('.store-card').last();await last.scrollIntoViewIfNeeded();
      await capture(page,'03-tail-cards-'+width+'.png');
      const targetId=await third.getAttribute('data-store-id');
      await third.click();await app.locator('#screen.page-S02').waitFor({state:'attached'});
      assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.state().storeId),targetId);
      assert.equal(await app.locator('#s01-r2-frame').count(),0,'compact click expanded instead of S02');
      const cases=[
        {code:'M0',scenario:'noDemand',flag:'browsing',setup:null},
        {code:'M1',scenario:'normal',flag:'exact',setup:null},
        {code:'M2',scenario:'combo',flag:'combination',setup:null},
        {code:'M3',scenario:'normal',flag:'near',setup:'near'},
        {code:'M5',scenario:'noMatch',flag:'noAdequateMatch',setup:null},
        {code:'M6',scenario:'noTerm',flag:'incomplete',setup:null},
        {code:'M7',scenario:'normal',flag:'stockChanged',setup:'stock'},
        {code:'M8a',scenario:'normal',flag:'advisorEligible',setup:'advisor'},
        {code:'M8b',scenario:'normal',flag:'advisorEligible',setup:'advisor-price'},
        {code:'M4',scenario:'normal',flag:'expanded',setup:'expanded'}
      ];
      for(const test of cases){
        const newPage=await ctx.newPage();
        newPage.on('pageerror',e=>errors.push(e.message));
        const ui=await open(newPage);
        const details=await state(ui.app,test.scenario,test.setup);
        const view=await ui.app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
        requireFlag(view,test.flag);
        const cardCount=await ui.s01.locator('.store-card').count();
        assert.equal(cardCount,view.stores.length,'state visual cards desynced from source');
        if(test.code==='M3'){
          const row=view.stores.find(s=>s.id===details.selectedStore);
          assert(row&&row.matchState==='near','missing near-capacity row');
          assert(row.units.every(u=>u.orderable===false&&u.action==='store'),'near unit must not order');
          assert.equal(await ui.s01.locator('.order').first().innerText(),'查看门店');
        }
        if(test.code==='M5')assert(await ui.s01.locator('#s01-citywide-fallback').isVisible(),'Estore not at top of all-city no-match');
        if(test.code==='M7'){
          const row=view.stores.find(s=>s.id===details.selectedStore);
          assert.equal(row.matchState,'soldout','stock changed but previous unit still available');
          assert(!row.units.length,'soldout shows active units');
          assert.equal(await ui.s01.locator('.store-card .order:visible').count(),0);
        }
        if(test.code==='M6')assert(view.stores.every(s=>s.units.every(u=>u.priceKind==='reference')),'unverified pending term shows formal quote');
        if(test.code==='M8b')assert(view.stores.some(s=>s.advisorEligible),'price-only advisor detection failed');
        if(test.code==='M4')assert(view.expandedSearch,'expanded scope flag missing');
        await capture(newPage,test.code+'-'+width+'.png');
        records.push({width,height,state:test.code,flag:test.flag,stores:view.stores.length,selectedStore:details.selectedStore,matchedStates:[...new Set(view.stores.map(s=>s.matchState))],result:'PASS'});
        await newPage.close();
      }
      assert.deepEqual(errors,[],'browser JS runtime error');
      const current=await page.evaluate(()=>({bodyWidth:document.documentElement.scrollWidth,screenWidth:innerWidth}));
      assert(current.bodyWidth<=current.screenWidth+2,'outer viewport overflow');
      records.push({width,height,thirdVisual,thirdToS02:targetId,errors:0,result:'PASS'});
      await ctx.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',records},null,2));
    console.log('S01_UX_REVIEW_03_NINE_STATES_PASS',JSON.stringify(records));
  }finally{await browser.close();server.close();}
}
run().catch(error=>{console.error('S01_UX_REVIEW_03_NINE_STATES_FAIL',error);server.close();process.exitCode=1;});
