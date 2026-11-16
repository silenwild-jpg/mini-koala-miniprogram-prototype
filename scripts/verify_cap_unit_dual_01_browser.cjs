#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app'),host='http://127.0.0.1:4743';
const output=path.resolve(__dirname,'../release-evidence/cap-unit-dual-01');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;
  try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}
  catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,bytes)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes));
});
async function startApp(page){
  await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(document.getElementById('central-host')?.contentWindow?.SIM_DEMO?.core?.requirementReady),null,{timeout:20000});
  return page.frameLocator('#central-host');
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(4743,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const results=[];
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      const row={width,height,status:'FAIL',checks:[]};
      try{
        const app=await startApp(page);
        const browse=app.frameLocator('#s01-r2-frame');
        await browse.locator('.s01-context-text').waitFor();
        assert.match(await browse.locator('.s01-context-text').innerText(),/不确定用多大仓/);
        row.checks.push('S01 Browse unchanged');
        await app.locator('#screen').evaluate(()=>{
          const b=window.SIM_DEMO;b.core.setCity('北京');b.core.setRequirement(3,12,true);b.persist();b.navigate('S5');
        });
        const s5=app.frameLocator('#br04-frame');
        await s5.locator('body.bridge-ready').waitFor({timeout:20000});
        await s5.locator('#modify').click();
        await page.waitForFunction(()=>Array.from(document.querySelectorAll('iframe')).some(f=>{
          try{return f.contentWindow?.location.pathname.endsWith('/cap.html');}catch{return false;}
        }),null,{timeout:20000});
        const capFrame=page.frames().find(f=>/\/cap\.html(?:\?|$)/.test(f.url()));
        assert(capFrame,'CAP frame did not open');
        const switcher=capFrame.locator('.cap-unit-picker');
        await switcher.waitFor({timeout:15000});
        assert.equal(await switcher.inputValue(),'m3','m³ remains default');
        // This page opens from a previously confirmed 3m³ demand. Switching
        // units must preserve equivalent values and the selected 12-month term.
        await switcher.selectOption('m2');
        const areaInput=capFrame.locator('#capacity-area');
        assert.equal(await areaInput.inputValue(),'1.2','3m³ converts exactly to 1.2㎡');
        await switcher.selectOption('m3');
        assert.equal(await capFrame.locator('#capacity').inputValue(),'3','first round-trip preserves original volume');
        await switcher.selectOption('m2');
        assert.equal(await areaInput.inputValue(),'1.2','second toggle restores equivalent area');
        assert(await areaInput.isVisible(),'m² input visible');
        await areaInput.fill('2');
        const canonical=await capFrame.locator('#capacity').inputValue();
        assert.equal(canonical,'5','2㎡ converts to 5m³');
        await switcher.selectOption('m3');
        assert.equal(await capFrame.locator('#capacity').inputValue(),'5','2㎡ to m³ preserves 5m³');
        await switcher.selectOption('m2');
        assert.equal(await areaInput.inputValue(),'2','back to m² preserves input without re-entry');
        assert(!await capFrame.locator('#capacity').isVisible(),'m³ input hidden while area mode');
        assert.equal(await areaInput.getAttribute('type'),'text','area uses frozen plus/minus not browser spinners');
        assert(await capFrame.locator('#unit').isHidden(),'legacy fixed m³ label hidden');
        await switcher.selectOption('m3');
        await capFrame.locator('#capacity').fill('3.33');
        await switcher.selectOption('m2');
        assert.equal(await areaInput.inputValue(),'','unrepresentable cubic size must not be silently rounded');
        const savedDraft=await capFrame.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_cap_draft_v3')||'{}'));
        assert.equal(savedDraft.preservedCubicDraft,'3.33','draft stores exact cubic value for return');
        await capFrame.goto(capFrame.url(),{waitUntil:'domcontentloaded'});
        await capFrame.locator('.cap-unit-picker').waitFor({timeout:12000});
        assert.equal(await capFrame.locator('.cap-unit-picker').inputValue(),'m2','pending area mode restored');
        await switcher.selectOption('m3');
        assert.equal(await capFrame.locator('#capacity').inputValue(),'3.33','nonrepresentable cubic size survives draft reload');
        await switcher.selectOption('m2');
        await areaInput.fill('1.23');
        assert.equal(await capFrame.locator('#capacity').inputValue(),'','invalid area cannot become a matching volume');
        await areaInput.fill('2');
        // The existing m³ step controls change canonical capacity. Keep the area
        // presentation in sync rather than unexpectedly switching the user's mode.
        await capFrame.evaluate(()=>{
          document.getElementById('capacity').value='5.5';
          document.querySelector('.inputwrap')?.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        });
        await capFrame.waitForFunction(()=>document.getElementById('capacity-area').value==='2.2',{timeout:2000});
        assert.equal(await switcher.inputValue(),'m2','area mode preserved on step');
        await capFrame.getByRole('button',{name:/8m³/}).first().click();
        await capFrame.waitForFunction(()=>document.querySelector('.cap-unit-picker')?.value==='m3',{timeout:2000});
        assert.equal(await capFrame.locator('#capacity').inputValue(),'8','cubic preset sets cubic volume');
        await switcher.selectOption('m2');
        await areaInput.fill('2');
        row.checks.push('CAP ㎡ switch, invalid input, stepper, preset and conversion');
        await capFrame.locator('body').screenshot({path:path.join(output,'CAP-2sqm-'+width+'.png')});
        // Return editing an already confirmed demand: preserve the existing lease term.
        await capFrame.locator('#cta').click();
        await s5.locator('body.bridge-ready').waitFor({timeout:20000});
        const req=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().requirement);
        assert.equal(req.capacity_m3,5);
        assert.equal(req.term_months,12);
        assert.equal(req.term_confirmed,true);
        assert.equal(req.input_unit,'m2');
        assert.equal(req.input_value,2);
        assert.equal(req.conversion_basis,'STANDARD_HEIGHT_ESTIMATE','pre-unit area must remain an estimate');
        row.checks.push('CAP → S5 with both required fields');
        const capText=await s5.locator('#capacity').innerText();
        assert.match(capText,/2㎡/);assert.match(capText,/约5m³/,'S5 must identify standard-height estimated cubic capacity');
        await page.screenshot({path:path.join(output,'S5-area-'+width+'.png')});
        await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('S01'));
        const s01=app.frameLocator('#s01-r2-frame');
        await s01.locator('.s01-context-text').waitFor({timeout:15000});
        const s01Demand=await s01.locator('.s01-context-text').innerText();
        assert.match(s01Demand,/2㎡/);assert.match(s01Demand,/约5m³/);assert.match(s01Demand,/12个月/);
        row.checks.push('S01 retains original area input');
        await page.screenshot({path:path.join(output,'S01-area-'+width+'.png')});
        await app.locator('#screen').evaluate(()=>{
          const m=window.SIM_DEMO,s=m.core.fixture.stores.find(x=>x.city===m.state().city&&x.status==='open'&&m.core.matchingUnits(x.id).length);
          if(!s)throw Error('NO_MATCH_STORE');
          m.openStore(s.id,'S01');
        });
        await app.locator('#screen.page-S02').waitFor({timeout:15000});
        const s02Text=await app.locator('.s02-demand-text').innerText();
        assert.match(s02Text,/2㎡/);assert.match(s02Text,/约5m³/);
        const geo=await app.locator('.unit-spec').allInnerTexts();
        assert(geo.some(x=>/约\d+(?:\.\d+)?㎡/.test(x)),'S02 has known dimension-derived area');
        row.checks.push('S02 demand and known unit dimensions');
        const pricing=await app.locator('#screen').evaluate(()=>{
          const c=window.SIM_DEMO.core,F=c.fixture;
          const u=F.units.find(x=>x.volume>=5&&c.available(x));
          const price=c.amounts([u.id],12);
          return {input:c.state().requirement,price,unit:u.id};
        });
        assert(pricing.price.rent_total>0);
        row.checks.push('pricing uses canonical m³ only');
        await page.screenshot({path:path.join(output,'S02-area-'+width+'.png')});
        assert.deepEqual(errors,[],'No browser JavaScript errors');
        row.status='PASS';
      }catch(e){
        row.error=String(e.stack||e);
        await page.screenshot({path:path.join(output,'FAIL-'+width+'.png')}).catch(()=>{});
      }finally{results.push(row);await context.close();}
      console.log('CAP_UNIT_DUAL_BROWSER '+JSON.stringify(row));
    }
    const success=results.every(x=>x.status==='PASS');
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({status:success?'PASS':'FAIL',sha:process.env.GITHUB_SHA||'',results},null,2));
    if(!success)process.exitCode=1;
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error('CAP_UNIT_DUAL_BROWSER_ERROR',e.stack||e);process.exitCode=1;});
