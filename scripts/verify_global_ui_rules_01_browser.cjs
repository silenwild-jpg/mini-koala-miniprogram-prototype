#!/usr/bin/env node
'use strict';
// GLOBAL-UI-RULES-01 | exact isolated branch, native 375/390, no deployment.
// Business source of truth: integer yuan by truncation, one ordered tag source,
// same capacity text regardless of page. Retail/inventory are demo fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/global-ui-rules-01');
const host='http://127.0.0.1:4661';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}
 catch{res.writeHead(400).end();return}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,b)=>e?res.writeHead(404).end('missing'):
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b));
});
const report=[];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(4661,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
    await s01.locator('.store-card.s01-compact').first().waitFor();
    const data=await app.locator('#screen').evaluate(()=>{
      const B=window.SIM_DEMO,F=B.core.fixture,p=B.presentation,c=B.core;
      let totalChecks=0;
      const failures=[];
      for(const u of F.units){
        for(let m=1;m<=60;m++){
          const a=c.amounts([u.id],m);
          const rule=F.pricing.termRules.find(v=>m>=v.min&&m<=v.max);
          const actual=Math.trunc((c.state().prices[u.id]??u.base_month)*rule.factor);
          if(!Number.isInteger(a.rent_total)||!Number.isInteger(a.monthly_average)||
            !Number.isInteger(a.deposit)||!Number.isInteger(a.payable)||
            a.monthly_average!==actual||a.rent_total!==actual*m||a.deposit!==actual)
            failures.push({unit:u.id,m,actual,amount:a});
          totalChecks++;
        }
      }
      const labels=F.stores.map(s=>({
        id:s.id,tags:p.tags(s,5),home:p.tags(s,2),list:p.tags(s,3),
        typed:p.tags(s,5).map(t=>t.type)
      }));
      const termSample=F.units.find(u=>u.status==='available');
      const factorCheck={
        cubic:p.cubicReference(F.stores.find(s=>s.id===termSample.store_id)),
        money:p.money(250.9)
      };
      B.core.setRequirement(3,12,true);B.persist();B.navigate('S01');
      return {totalChecks,failures:failures.slice(0,3),labels,termSample:termSample.id,factorCheck};
    });
    assert.equal(data.failures.length,0,'source core does not return integer rent/deposit/payable');
    assert(data.totalChecks>=100,'insufficient pricing combinations');
    assert.equal(data.factorCheck.money,'¥250');
    for(const e of data.labels){
      assert(e.tags.length<=5);
      assert.deepEqual(e.tags.slice(0,2),e.home);
      assert.deepEqual(e.tags.slice(0,3),e.list);
      assert(!e.tags.some((x,i)=>x.type==='promotion'&&i!==0));
      const tags=e.tags.map(t=>t.type);
      assert(!tags.includes('service')||tags.lastIndexOf('service')<=tags.indexOf('attribute')||!tags.includes('attribute'));
    }
    await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
    const view=await app.locator('#screen').evaluate(()=>{
      const b=window.SIM_DEMO,s=b.s01R2Bridge.snapshot();
      return s.stores.slice(0,2).map(x=>({
        id:x.id,expected:b.presentation.tags(b.core.fixture.stores.find(y=>y.id===x.id),3),
        services:x.services.slice(0,3),types:x.tagTypes.slice(0,3),
        use:x.units[0]?.usage,volume:x.units[0]?.volume
      }));
    });
    const cardTags=await s01.locator('.store-card[data-card-kind="expanded"]').evaluateAll(rows=>rows.map(el=>({
      tags:[...el.querySelectorAll('.store-tags .mk-store-tag:not([hidden])')].map(t=>({
        label:t.textContent,type:t.dataset.tagType,
        border:getComputedStyle(t).borderColor,color:getComputedStyle(t).color
      })),
      use:el.querySelector('.unit-desc')?.textContent,
      price:el.querySelector('.price strong')?.textContent,
      breakdown:el.querySelector('.price-secondary')?.textContent
    })));
    for(let i=0;i<2;i++){
      assert.deepEqual(cardTags[i].tags.map(t=>({label:t.label,type:t.type})),view[i].expected);
      assert.equal(cardTags[i].use,view[i].use);
      assert.match(cardTags[i].price,/^¥[\d,]+$/);
      assert.match(cardTags[i].breakdown,/^¥[\d,]+\/月 × 12个月$/);
      assert(!cardTags[i].breakdown.includes('月均'));
      assert(cardTags[i].tags[0].type!=='promotion'||cardTags[i].tags[0].border!==cardTags[i].tags.at(-1).border);
    }
    await page.screenshot({path:path.join(out,'S01-integer-tags-'+width+'.png')});
    // S02 must expose same first five tag labels/types and same capacity copy.
    const first=view[0];
    await app.locator('#screen').evaluate((_,id)=>window.SIM_DEMO.openStore(id,'S01'),first.id);
    await app.locator('#screen.page-S02').waitFor();
    const s02Tags=await app.locator('.mk-s02-store-tags .mk-store-tag').evaluateAll(nodes=>nodes.map(e=>({label:e.textContent,type:e.dataset.tagType})));
    const expectedS02=data.labels.find(x=>x.id===first.id).tags.slice(0,5);
    assert.deepEqual(s02Tags,expectedS02);
    await page.screenshot({path:path.join(out,'S02-integer-tags-'+width+'.png')});
    // S5 renders from the exact same presentation tags, with only the count limited to two.
    await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('S5'));
    await app.locator('#screen.page-S5').waitFor();
    const s5=app.frameLocator('#br04-frame');
    await s5.locator('.s5-store-card').first().waitFor();
    const s5Tags=await s5.locator('.s5-store-card .s5-store-services').evaluateAll(nodes=>nodes.map(node=>[...node.querySelectorAll('.mk-store-tag')].map(t=>({label:t.textContent,type:t.dataset.tagType}))));
    const s5Offers=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s5Offers().slice(0,2).map(r=>r.store.id));
    for(let i=0;i<2;i++){
      const expected=data.labels.find(x=>x.id===s5Offers[i])?.home;
      assert(expected,'S5 store missing from fixture');
      assert.deepEqual(s5Tags[i],expected,'S5 tag order differs from H01/S01');
    }
    const s5Formulas=await s5.locator('.s5-unit-row:not([hidden]) .s5-unit-monthly').evaluateAll(nodes=>nodes.map(el=>({
      text:el.textContent.trim(),
      fits:el.scrollWidth<=el.clientWidth+1,
      display:getComputedStyle(el).display
    })));
    assert.equal(s5Formulas.length,2);
    assert(s5Formulas.every(x=>/^¥[\\d,]+\\/月 × 12个月$/.test(x.text)&&x.fits&&x.display!=='none'),
      'S5 monthly rent × term is truncated or hidden: '+JSON.stringify(s5Formulas));
    await page.screenshot({path:path.join(out,'S5-integer-tags-'+width+'.png')});
    await page.goto(host+'/prototype/parallel/core-journey-fix-01/demo/home.html',{waitUntil:'domcontentloaded'});
    await page.locator('#storeRail .store-card').first().waitFor();
    const home=await page.locator('#storeRail .store-card').evaluateAll(cards=>cards.map(el=>({
      id:el.dataset.simStore,tags:[...el.querySelectorAll('.store-tags .mk-store-tag')].map(x=>({label:x.textContent,type:x.dataset.tagType}))
    })));
    for(const h of home){
      const expected=data.labels.find(x=>x.id===h.id)?.home;
      assert(expected,'home store missing '+h.id);assert.deepEqual(h.tags,expected,'H01 tag source differs from S01');
    }
    await page.screenshot({path:path.join(out,'H01-integer-tags-'+width+'.png')});
    assert.deepEqual(errors,[],'browser errors: '+errors.join(';'));
    report.push({width,height,status:'PASS',priceCombinations:data.totalChecks,storeCount:data.labels.length,
      s01:view,s02Tags,s5Offers,s5Tags,home,errorCount:errors.length});
   }catch(e){await page.screenshot({path:path.join(out,'error-'+width+'.png')}).catch(()=>{});throw e}
   finally{await ctx.close()}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({
    status:'PASS',source:'PR99-branch',offlineChromium:true,merged:false,deployed:false,
    businessRule:'integer CNY by truncation, no monthly average UI copy',
    cases:report
  },null,2));
  console.log('GLOBAL_UI_RULES_01_PASS '+JSON.stringify(report.map(x=>({width:x.width,priceCombinations:x.priceCombinations,storeCount:x.storeCount}))));
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',error:e.stack||String(e)},null,2));
 console.error('GLOBAL_UI_RULES_01_FAIL '+(e.stack||e));process.exitCode=1;
});
