#!/usr/bin/env node
'use strict';
// S02 browsing without a confirmed term is not an S5-compatible demand.
// The 12-month public unit reference must not imply a user-confirmed term.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app'),host='http://127.0.0.1:4736';
const out=path.resolve(__dirname,'../release-evidence/rc2-s02-term-state-01');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;
  try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}
  catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,bytes)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes));
});
async function openStore(page){
  await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
  const app=page.frameLocator('#central-host');
  await app.locator('#screen').waitFor();
  await app.locator('#screen').evaluate(()=>{
    const m=window.SIM_DEMO,s=m.core.fixture.stores.find(s=>s.city===m.state().city&&s.status==='open');
    if(!s)throw Error('NO_OPEN_CITY_STORE');
    m.openStore(s.id,'S01');
  });
  await app.locator('#screen.page-S02').waitFor();
  await app.locator('.s02-demand').waitFor();
  return app;
}
async function snapshot(app){
  return await app.locator('#screen').evaluate(screen=>{
    const demand=screen.querySelector('.s02-demand'),inventory=screen.querySelector('#s02Inventory');
    const prices=[...screen.querySelectorAll('.unit-row[data-unit] .br03-price')].map(el=>({
      kind:el.dataset.priceKind,term:el.dataset.referenceTerm||null,
      value:(el.querySelector('strong')?.textContent||'').trim(),
      suffix:(el.querySelector('.br03-reference')?.textContent||'').trim(),
      full:(el.textContent||'').trim()
    }));
    return {status:demand?.dataset.demandState,summary:demand?.innerText.trim(),
      action:demand?.querySelector('a')?.textContent.trim(),
      situation:inventory?.dataset.s02Status||null,
      requirement:window.SIM_DEMO.state().requirement,
      ready:window.SIM_DEMO.core.requirementReady(),
      prices,compare:screen.querySelectorAll('[data-compare],.compare-float').length,
      overflow:screen.scrollWidth>screen.clientWidth+1};
  });
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  await new Promise(resolve=>server.listen(4736,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const results=[];
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      try{
        const app=await openStore(page);
        const browse=await snapshot(app);
        assert.equal(browse.status,'browse');
        assert.equal(browse.situation,'browse');
        assert.match(browse.summary,/不确定用多大仓？\s*立即估算/);
        assert.equal(browse.ready,false);
        assert(browse.prices.length>0,'Public warehouse reference prices missing');
        assert(browse.prices.every(p=>p.kind==='unit_month'&&p.term==='12'&&p.suffix==='/月 · 12个月参考'),'Public unit prices must be qualified as reference');
        assert(!browse.overflow&&browse.compare===0);
        await page.screenshot({path:path.join(out,'S02-browse-'+width+'.png')});
        await app.locator('#screen').evaluate(()=>{
          const m=window.SIM_DEMO;m.core.setRequirement(3,null,false);m.navigate('S02',m.state().storeId);
        });
        const capacity=await snapshot(app);
        assert.equal(capacity.status,'capacity-only');
        assert.equal(capacity.situation,'browse','Incomplete demand cannot be tagged matched');
        assert.equal(capacity.ready,false);
        assert.match(capacity.summary,/已选容量：3m³ · 租期待确认\s*确认租期/);
        assert.equal(capacity.action,'确认租期');
        assert(capacity.prices.length>0&&capacity.prices.every(p=>p.kind==='unit_month'&&p.suffix.endsWith('个月参考')));
        assert(!capacity.overflow&&capacity.compare===0);
        await page.screenshot({path:path.join(out,'S02-capacity-only-'+width+'.png')});
        await app.locator('#screen').evaluate(()=>{
          const m=window.SIM_DEMO;m.core.setRequirement(3,12,true);m.navigate('S02',m.state().storeId);
        });
        const confirmed=await snapshot(app);
        assert.equal(confirmed.status,'confirmed');
        assert.equal(confirmed.situation,'matched');
        assert.equal(confirmed.ready,true);
        assert.match(confirmed.summary,/已选需求：3m³ · 12个月\s*修改需求/);
        assert(confirmed.prices.length>0&&confirmed.prices.every(p=>p.kind==='term'));
        assert(!confirmed.overflow&&confirmed.compare===0);
        await page.screenshot({path:path.join(out,'S02-confirmed-'+width+'.png')});
        // A partial requirement is not a binding order; the existing lease-term gate remains.
        await app.locator('#screen').evaluate(()=>{
          const m=window.SIM_DEMO;m.core.setRequirement(3,null,false);m.navigate('S02',m.state().storeId);
        });
        const buy=app.locator('.unit-row[data-unit] .order-button[data-action="choose"]');
        assert(await buy.count()>0,'No available unit with capacity to test order gate');
        await buy.first().click();
        await app.locator('#screen.page-S02').waitFor();
        const gated=await app.locator('#screen').innerText();
        assert.match(gated,/请选择租期/,'Term must be requested before ordering');
        assert(!await app.locator('#screen.page-O01').count(),'Incomplete demand entered O01');
        assert.deepEqual(errors,[],'Page errors in S02 flow');
        await page.screenshot({path:path.join(out,'S02-order-term-gate-'+width+'.png')});
        results.push({width,height,status:'PASS',browse,capacity,confirmed,orderTermGate:'PASS',pageErrors:errors});
        console.log('RC2_S02_TERM_STATE_PASS '+JSON.stringify({width,browse:browse.status,capacity:capacity.status,complete:confirmed.status,orderTermGate:'PASS'}));
      }catch(err){
        await page.screenshot({path:path.join(out,'FAIL-'+width+'.png')}).catch(()=>{});
        throw err;
      }finally{await context.close();}
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',source_sha:process.env.GITHUB_SHA||'',results},null,2));
    console.log('RC2_S02_TERM_STATE_01_375_390_PASS');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error('RC2_S02_TERM_STATE_01_FAIL',e.stack||e);process.exitCode=1;});
