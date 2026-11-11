#!/usr/bin/env node
'use strict';
// S01-STATE-PRICE-03 | source-identical 375/390 browser QA; no deployment.
// Product contract: no implicit lease term; committed demand requires both fields;
// browse=all flat store rows; match=two single-unit offers with clear rent math.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s01-state-price-03');
const host='http://127.0.0.1:4637';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}
  catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>err?res.writeHead(404).end('missing'):
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
const cases=[];
const fmt=n=>'¥'+Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4637,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const entry=host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1';
   try{
    await page.goto(entry,{waitUntil:'domcontentloaded'});
    const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
    await s01.locator('.store-card[data-card-kind="compact"]').first().waitFor();
    await s01.locator('link[href*="s01-vis-decision-02.css"]').waitFor({state:'attached'});
    const initial=await app.locator('#screen').evaluate(()=>{
      const b=window.SIM_DEMO;return {requirement:b.core.state().requirement,ready:b.core.requirementReady(),view:b.s01R2Bridge.snapshot()};
    });
    assert.equal(initial.ready,false,'fresh S01 must not assume a lease term');
    assert.equal(initial.requirement.term_months,null,'default selected months must be null');
    assert.equal(initial.view.matched,false);
    const listing=await s01.locator('.stores').evaluate(el=>{
      const entries=[...el.children].filter(x=>x.matches('.store-card,.s01-estore-card'));
      return entries.map(x=>({
        kind:x.dataset.cardKind,rank:Number(x.dataset.cardRank),
        units:x.querySelectorAll('.unit').length,
        photo:(()=>{const r=x.querySelector('img')?.getBoundingClientRect();return r?{w:r.width,h:r.height}:null})(),
        publicPrice:x.querySelector('.s01-compact-side strong')?.textContent||null,
        id:x.dataset.storeId||null
      }));
    });
    assert.deepEqual(listing.slice(0,4).map(x=>x.kind),['compact','compact','estore','compact']);
    assert.deepEqual(listing.slice(0,4).map(x=>x.rank),[1,2,3,4]);
    assert(listing.filter(x=>x.kind==='compact').every(x=>x.units===0),'unconfirmed demand exposes a unit');
    assert(listing.filter(x=>x.kind==='compact').every(x=>x.photo.w>=86&&x.photo.w<=90),'all compact photo widths must be 88px');
    assert.equal(await s01.locator('.store-card[data-card-kind="expanded"]').count(),0);
    assert.equal(await s01.locator('.s01-estore-card').count(),1);
    assert(initial.view.stores.slice(0,2).every((x,i)=>listing[i].publicPrice===x.publicCubicPrice),'H01/S01 public unit-rate source mismatched');
    assert.equal(await s01.locator('html').evaluate(el=>el.scrollWidth-innerWidth)<=2,true,'browse horizontal overflow');
    await page.screenshot({path:path.join(out,'S01-browse-'+width+'.png'),fullPage:false});
    // In browse mode a public price sort remains anonymous and uses public cubic rates.
    await s01.locator('.filter').first().click();
    await s01.locator('[data-sort="price"]').click();
    let snap=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
    assert.equal(snap.matched,false);assert.equal(snap.filterLabels[0],'价格优先');
    assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.authorized()),false);
    const publicRates=snap.stores.map(x=>Number(String(x.publicCubicPrice||'').replace(/[^\d.]/g,''))).filter(Number.isFinite);
    assert(publicRates.every((x,i)=>i===0||publicRates[i-1]<=x),'public price sort changed basis');
    await page.screenshot({path:path.join(out,'S01-browse-price-'+width+'.png'),fullPage:false});
    await s01.locator('body').evaluate(()=>window.scrollTo(0,280));
    const sticky=await s01.locator('.s01-filter-anchor').evaluate(el=>({position:getComputedStyle(el).position,y:el.getBoundingClientRect().top,scrollY:window.scrollY}));
    assert.equal(sticky.position,'sticky');assert(sticky.scrollY>100&&Math.abs(sticky.y)<=2,'sticky filter failed');
    await s01.locator('.filter').first().click();
    await s01.locator('#s01-inline-panel').waitFor({state:'visible'});
    await page.screenshot({path:path.join(out,'S01-browse-sticky-'+width+'.png'),fullPage:false});
    await s01.locator('#s01-search').fill('绝无此门店S01STATE03');
    await s01.locator('.s01-empty-state').waitFor({state:'visible'});
    assert.equal(await s01.locator('.s01-estore-card').count(),1);
    assert.equal(await s01.locator('[data-s01-advisor]').count(),1);
    assert.equal(await s01.locator('[data-s01-clear]').count(),1);
    await page.screenshot({path:path.join(out,'S01-browse-empty-'+width+'.png'),fullPage:false});
    await s01.locator('[data-s01-clear]').click();
    await s01.locator('.store-card[data-card-kind="compact"]').first().waitFor();
    assert.equal(await s01.locator('.s01-empty-state').count(),0);
    // The core may hold incomplete internal drafts, but must not consider one
    // field sufficient for a committed requirement or a matching UI.
    const draftChecks=await app.locator('#screen').evaluate(()=>{
      const core=window.SIM_DEMO.core;
      core.setRequirement(null,null,false);
      let termOnlyError=null;
      try{core.setRequirement(null,6,true);}catch(e){termOnlyError=e.message;}
      let setTermWithoutCap=null;
      try{core.setTerm(6);}catch(e){setTermWithoutCap=e.message;}
      core.setRequirement(3,null,false);
      const partial=core.requirementReady();
      window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S01');
      return {termOnlyError,setTermWithoutCap,partial};
    });
    assert.deepEqual(draftChecks,{termOnlyError:'SELECT_CAPACITY',setTermWithoutCap:'SELECT_CAPACITY',partial:false});
    await s01.locator('.store-card[data-card-kind="compact"]').first().waitFor();
    assert.equal(await s01.locator('.store-card[data-card-kind="expanded"]').count(),0,'draft must not expose matched warehouse');
    assert.match(await s01.locator('.s01-context-text').innerText(),/不确定用多大仓/);
    const prices=[];
    // Explicitly chosen legal terms at both limits. No 12-month assumption.
    for(const months of [1,60]){
      await app.locator('#screen').evaluate((_,months)=>{
        const b=window.SIM_DEMO;b.core.setRequirement(3,months,true);b.persist();b.navigate('S01');
      },months);
      await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
      snap=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
      assert.equal(snap.matched,true);assert.equal(snap.termMonths,months);
      assert.equal(await s01.locator('.store-card[data-card-kind="expanded"]').count(),2);
      assert.equal(await s01.locator('.s01-estore-card').count(),1);
      assert.equal(await s01.locator('.store-card[data-card-kind="compact"]').count()>=1,true,'no compact store #4+');
      assert.equal(await s01.locator('.store-cubic-price:visible').count(),0,'matched state still shows cubic rate');
      const cards=await s01.locator('.store-card[data-card-kind="expanded"]').evaluateAll(elements=>elements.map(el=>({
        id:el.dataset.storeId,
        unitRows:[...el.querySelectorAll('.unit')].filter(x=>!x.hidden).map(x=>({
          id:x.dataset.unitId,
          price:x.querySelector('.price strong')?.textContent,
          suffix:x.querySelector('.price > span')?.textContent,
          breakdown:x.querySelector('.price-secondary')?.textContent,
          label:x.querySelector('.price')?.getAttribute('aria-label'),
          ctaHeight:x.querySelector('.order')?.getBoundingClientRect().height
        }))
      })));
      for(const card of cards){
        assert.equal(card.unitRows.length,1,'one matched unit per first two stores');
        const unit=card.unitRows[0],offer=snap.stores.find(x=>x.id===card.id)?.units[0];
        assert(offer,'matched bridge offer missing');
        assert.equal(unit.price,offer.price);
        assert.equal(unit.suffix,'','remove duplicate price labels');
        assert.equal(unit.breakdown,offer.secondary);
        assert.match(unit.breakdown,new RegExp('\\/月 × '+months+'个月'));
        assert.doesNotMatch(unit.breakdown,/月均约|整期租金/);
        assert.match(unit.label,/整期租金/);
        assert(unit.ctaHeight>=48);
        const arithmetic=await app.locator('#screen').evaluate((_,id)=>{
          const b=window.SIM_DEMO,months=b.core.state().requirement.term_months,a=b.core.amounts([id],months);
          return {rent:a.rent_total,monthly:a.monthly_average,months};
        },unit.id);
        assert.equal(unit.price,fmt(arithmetic.rent));
        assert.equal(unit.breakdown,fmt(arithmetic.monthly)+'/月 × '+months+'个月');
        assert(Math.abs(arithmetic.rent-arithmetic.monthly*months)<.011,'monthly × term not equal displayed total');
        prices.push({months,id:unit.id,rent:unit.price,breakdown:unit.breakdown});
      }
      assert(await s01.locator('html').evaluate(el=>el.scrollWidth-innerWidth)<=2,'matched horizontal overflow');
      await page.screenshot({path:path.join(out,'S01-matched-'+months+'m-'+width+'.png'),fullPage:false});
    }
    assert.deepEqual(errors,[],'JS runtime errors');
    cases.push({width,height,mode:'browse+matched',status:'PASS',browse:listing.slice(0,4),draftChecks,prices,sticky,errors:errors.length});
    await context.close();
   }catch(e){await page.screenshot({path:path.join(out,'error-'+width+'.png')}).catch(()=>{});throw e;}
  }
  // Fresh capacity page: selected lease term must be null; user chooses 1–60.
  const capCtx=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:1});
  try{
    const cap=await capCtx.newPage(),capErrors=[];cap.on('pageerror',e=>capErrors.push(e.message));
    await cap.goto(host+'/prototype/parallel/core-journey-fix-01/demo/cap.html',{waitUntil:'domcontentloaded'});
    await cap.locator('body[data-journey-ready="true"]').waitFor();
    assert.equal(await cap.locator('[data-month].on').count(),0,'CAP auto-selected a month');
    assert.match(await cap.locator('#summary').innerText(),/租期待选/);
    await cap.locator('#quick button[data-v="3"]').click();
    await cap.locator('#cta').click();
    assert.equal(new URL(cap.url()).pathname.endsWith('/cap.html'),true,'CAP submitted without a selected term');
    await cap.locator('button[data-month="1"]').click();
    await cap.locator('#cta').click();
    await cap.waitForURL(/index\.html\?page=S5/,{timeout:15000});
    const r=await cap.evaluate(()=>window.SIM_DEMO.core.state().requirement);
    assert.equal(r.capacity_m3,3);assert.equal(r.term_months,1);assert.equal(r.term_confirmed,true);
    assert.deepEqual(capErrors,[]);
    cases.push({width:375,mode:'CAP-explicit-month',status:'PASS',selected:r});
  }finally{await capCtx.close();}
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',isolatedChromium:true,liveDeployed:false,
    merged:false,humanVisualSigned:false,cases},null,2));
  console.log('S01_STATE_PRICE_03_PASS '+JSON.stringify(cases.map(x=>({width:x.width,mode:x.mode,prices:x.prices?.length}))));
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',error:e.stack||String(e)},null,2));
 console.error('S01_STATE_PRICE_03_FAIL '+(e.stack||e));process.exitCode=1;
});
