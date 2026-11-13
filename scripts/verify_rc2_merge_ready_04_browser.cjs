#!/usr/bin/env node
'use strict';
// RC2-MERGE-READY-04: isolated checkout, booking and QUICK screenshot evidence.
// This script DOES NOT change app code or contact live services.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/rc2-merge-ready-04');
const host='http://127.0.0.1:4884',prefix='/index.html?page=';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{return res.writeHead(400).end();}
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,buf)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(buf));
});
const report={head_sha:process.env.GITHUB_SHA||'',runtime_source:process.env.GITHUB_SHA||'',mode:'WEB_PROTOTYPE_ONLY',rule:'QUICK_CAPACITY_FROM_SELECTED_UNIT_TERM_MANUAL_BOOKING_OPTIONAL',results:[],blockers:[]};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(4884,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const shot=async(name)=>page.screenshot({path:path.join(out,width+'-'+name+'.png'),animations:'disabled'});
   const open=async(which)=>{
    await page.goto(host+prefix+which+'&s01_r2=1',{waitUntil:'domcontentloaded'});
    const child=page.frameLocator('#br04-frame');
    await child.locator('body.bridge-ready').waitFor({timeout:16000});
    return child;
   };
   const record=(flow,state,status,detail={})=>report.results.push({width,height,flow,state,status,...detail});
   const section=async(name,fn)=>{
    try{await fn();}catch(e){
     const message=String(e.stack||e).slice(0,1800);
     report.blockers.push({width,flow:name,error:message});
     try{await shot(name+'-ERROR');}catch{}
    }
   };
   await section('01-BOOKING',async()=>{
    const child=await open('BOOKING');
    assert.equal(await child.locator('#booking-address').getAttribute('required'),'');
    assert.equal(await child.locator('#reserve-contact').getAttribute('required'),'');
    await shot('01-BOOKING-empty');
    const expectedShortcuts=['尽快','明天','近一周','暂不确定'];
    const shortcutButtons=child.locator('.term-pills [data-term]');
    assert.deepEqual((await shortcutButtons.allTextContents()).map(x=>x.trim()),expectedShortcuts,'BOOKING quick time choices must match latest rule');
    for(const label of expectedShortcuts){
      const button=child.locator('.term-pills [data-term="'+label+'"]');
      await button.click();
      assert.equal(await button.getAttribute('aria-pressed'),'true','selected shortcut aria state '+label);
      assert.equal(await child.locator('.term-pills [aria-pressed="true"]').count(),1,'exactly one shortcut is active');
      const value=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_br04_ui_v2')||'{}').reserve?.reserve?.start_hint);
      assert.equal(value,label,'BOOKING preference persisted: '+label);
    }
    await child.locator('.term-pills [data-term="明天"]').click();
    await shot('01b-BOOKING-tomorrow-selected');
    await child.locator('#booking-address').fill('北京市朝阳区青年路甲5号院');
    await child.locator('#reserveForm button[type="submit"]').click();
    await child.locator('#toast:not([hidden])').waitFor({timeout:5000});
    const error=await child.locator('#toast').innerText();
    assert.match(error,/联系电话/);
    await shot('02-BOOKING-phone-required');
    await child.locator('#reserve-contact').fill('13800138000');
    await child.locator('#reserveForm button[type="submit"]').click();
    await child.locator('#success:not([hidden])').waitFor({timeout:7000});
    const saved=await page.evaluate(()=>window.SIM_DEMO.core.state().leads.at(-1));
    assert.equal(saved.phone,'13800138000');
    assert.equal(saved.status,'saved_locally');
    assert.equal(saved.start_hint,'明天','Relative booking preference must be stored verbatim');
    assert.equal(saved.preferred_date,undefined,'Selecting tomorrow shortcut must not invent an exact date');
    assert.equal(saved.capacity_m3,null,'BOOKING capacity is optional');
    assert.equal(saved.term_months,null,'BOOKING term is optional');
    await shot('03-BOOKING-saved-locally');
    record('BOOKING','empty/error/saved','PASS',{phone_and_address_required:true,only_local:true});
   });
   await section('02-QUICK',async()=>{
    const child=await open('QUICK');
    const initiallyEmpty=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement.capacity_m3===null);
    assert(initiallyEmpty,'QUICK cold entry expected no capacity');
    await shot('04-QUICK-cold');
    await child.locator('[data-term="12"]').click();
    await child.locator('#toast:not([hidden])').waitFor();
    assert.match(await child.locator('#toast').innerText(),/容量/,'Term must not be confirmed before a unit derives capacity');
    await shot('05-QUICK-before-select');
    assert.equal(await child.locator('[data-choice="capacity"]').count(),0,'No redundant mandatory capacity picker');
    await child.locator('[data-choice="store"]').click();
    await child.locator('#modal [data-bridge="quickStore"]').first().waitFor();
    await child.locator('#modal [data-bridge="quickStore"]').first().click();
    await child.locator('[data-choice="unit"]').click();
    const firstOption=child.locator('#modal [data-bridge="quickUnit"]').first();
    await firstOption.waitFor();
    const firstUnitId=await firstOption.getAttribute('data-value');
    await firstOption.click();
    assert.equal(await child.locator('#toast').isVisible(),false,'Stale capacity warning must disappear after selecting a valid unit');
    const demand=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
    const offeredVolume=await page.evaluate(ids=>{
      const core=window.SIM_DEMO.core;
      return ids.split(',').reduce((n,id)=>n+core.fixture.units.find(u=>u.id===id).volume,0);
    },firstUnitId);
    assert.equal(demand.capacity_m3,Number(offeredVolume.toFixed(2)),'Capacity must derive from selected unit');
    assert.equal(demand.term_confirmed,false,'Unit selection must not auto-confirm term');
    await shot('06-QUICK-capacity-auto-from-unit');
    await child.locator('[data-term="12"]').click();
    assert.equal(await child.locator('#toast').isVisible(),false,'Stale capacity warning must stay hidden after successful term selection');
    let term=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
    assert.equal(term.capacity_m3,demand.capacity_m3);
    assert.equal(term.term_confirmed,true);
    assert.equal(term.term_months,12);
    await shot('07-QUICK-term-explicitly-selected');
    await child.locator('[data-choice="unit"]').click();
    const secondOption=child.locator('#modal [data-bridge="quickUnit"]').nth(1);
    if(await child.locator('#modal [data-bridge="quickUnit"]').count()>1){
      const secondUnitId=await secondOption.getAttribute('data-value');
      await secondOption.click();
      term=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
      const secondVolume=await page.evaluate(ids=>{
        const core=window.SIM_DEMO.core;
        return ids.split(',').reduce((n,id)=>n+core.fixture.units.find(u=>u.id===id).volume,0);
      },secondUnitId);
      assert.equal(term.capacity_m3,Number(secondVolume.toFixed(2)),'Changing an automatically selected unit must update capacity');
      assert.equal(term.term_months,12,'Explicit term must survive unit change');
      assert.equal(term.term_confirmed,true);
    }else await child.locator('#modal-close').click();
    await shot('08-QUICK-unit-change');
    const date=await page.evaluate(()=>window.SIM_DEMO.core.today());
    await child.locator('#start-date').fill(date);
    await page.evaluate(()=>{
     const b=window.SIM_DEMO;b.core.requestPhone();b.core.resolvePhone('success',{phone:'13800138000'});b.persist();
    });
    await child.locator('#next-button').click();
    await page.waitForURL(/page=O01/,{timeout:10000});
    await child.locator('body.bridge-ready').waitFor();
    assert.match(await child.locator('#rent').innerText(),/¥/,'O01 must inherit confirmed capacity+term');
    await shot('09-QUICK-to-O01');
    record('QUICK','cold store + unit-derived capacity + explicit term + date -> O01','PASS',{capacity:term.capacity_m3,term:term.term_months});
   });
   await section('03-O01',async()=>{
    await page.goto(host+prefix+'S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.SIM_DEMO);
    const selected=await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;
      const unit=c.fixture.units.find(u=>u.status==='available'&&u.volume>=3&&c.fixture.stores.some(s=>s.id===u.store_id&&s.city===c.state().city&&s.status==='open'));
      if(!unit)throw Error('NO_AVAILABLE_UNIT');
      if(!c.authorized()){
        c.requestPhone();
        c.resolvePhone('success',{phone:'13800138000'});
      }
      c.setRequirement(unit.volume,12,true);
      c.select([unit.id]);
      c.setDate(c.today());
      b.persist();
      b.navigate('O01');
      return {unit:unit.id,volume:unit.volume};
    });
    const child=page.frameLocator('#br04-frame');
    await child.locator('body.bridge-ready').waitFor({timeout:16000});
    const total=await child.locator('#total').innerText();
    assert.match(total,/¥/);
    await shot('07-O01-confirmed-top');
    await child.locator('#scrollpane').evaluate(el=>el.scrollTop=el.scrollHeight);
    await wait(120);
    await shot('08-O01-confirmed-bottom');
    await child.locator('#pay').click();
    await child.locator('#toast:not([hidden])').waitFor();
    assert.match(await child.locator('#toast').innerText(),/协议/);
    await shot('09-O01-agreement-guard');
    await child.locator('#agreed').check({force:true});
    await child.locator('#pay').click();
    await child.locator('#scrim:not([hidden])').waitFor({timeout:9000});
    const orders=await page.evaluate(()=>window.SIM_DEMO.core.state().orders);
    assert.equal(orders.at(-1).status,'pending');
    assert.equal(orders.at(-1).management_fee,50);
    await shot('10-O01-payment-pending');
    record('O01','selected/fees/agreement/payment','PASS',{unit:selected.unit,firstPayable:total,legal_source:'placeholder_prelaunch_hold',order:orders.at(-1).id});
   });
    await section('04-QUICK-EXPLICIT-DEMAND-STORE-CITY',async()=>{
     await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;
      c.setCity('北京');c.setRequirement(3.5,12,true);c.clearSelection();
      sessionStorage.removeItem('mk_br04_ui_v2');b.persist();
     });
     let child=await open('QUICK');
     const stores=await page.evaluate(()=>{
      const c=window.SIM_DEMO.core;
      return c.fixture.stores.filter(s=>s.city==='北京'&&s.status==='open'&&c.matchingUnits(s.id).length).map(s=>s.id).slice(0,2);
     });
     assert.equal(stores.length,2,'Need two Beijing stores with units matching explicit 3.5m3 demand');
     await child.locator('[data-choice="store"]').click();
     await child.locator('#modal [data-bridge="quickStore"][data-value="'+stores[0]+'"]').click();
     await child.locator('[data-choice="unit"]').click();
     await child.locator('#modal [data-bridge="quickUnit"]').first().click();
     let demand=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
     assert.equal(demand.capacity_m3,3.5);assert.equal(demand.term_months,12);assert.equal(demand.term_confirmed,true);
     let ui=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_br04_ui_v2')||'{}').quick);
     assert.equal(ui.ids.length,1);
     await shot('10-QUICK-explicit-demand-first-store');
     await child.locator('[data-choice="store"]').click();
     await child.locator('#modal [data-bridge="quickStore"][data-value="'+stores[1]+'"]').click();
     ui=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_br04_ui_v2')||'{}').quick);
     assert.equal(ui.ids.length,0,'Changing store must clear the previous selected unit');
     demand=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
     assert.equal(demand.capacity_m3,3.5);assert.equal(demand.term_months,12);assert.equal(demand.term_confirmed,true);
     await child.locator('[data-choice="unit"]').click();
     await child.locator('#modal [data-bridge="quickUnit"]').first().click();
     demand=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
     assert.equal(demand.capacity_m3,3.5);assert.equal(demand.term_months,12);assert.equal(demand.term_confirmed,true);
     await shot('11-QUICK-explicit-demand-store-switch');
     await page.evaluate(()=>{const b=window.SIM_DEMO;b.core.setCity('上海');b.persist();});
     child=await open('QUICK');
     ui=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_br04_ui_v2')||'{}').quick);
     demand=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
     assert.equal(ui.storeId,null,'City switch must clear stale store selection');
     assert.deepEqual(ui.ids,[],'City switch must clear stale unit selection');
     assert.equal(demand.capacity_m3,3.5);assert.equal(demand.term_months,12);assert.equal(demand.term_confirmed,true);
     const shanghaiStore=await page.evaluate(()=>{
      const c=window.SIM_DEMO.core;
      return c.fixture.stores.find(s=>s.city==='上海'&&s.status==='open'&&c.matchingUnits(s.id).length)?.id||null;
     });
     assert.ok(shanghaiStore,'Need a Shanghai store with units matching the preserved demand');
     await child.locator('[data-choice="store"]').click();
     await child.locator('#modal [data-bridge="quickStore"][data-value="'+shanghaiStore+'"]').click();
     await child.locator('[data-choice="unit"]').click();
     await child.locator('#modal [data-bridge="quickUnit"]').first().click();
     demand=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
     assert.equal(demand.capacity_m3,3.5);assert.equal(demand.term_months,12);assert.equal(demand.term_confirmed,true);
     await shot('12-QUICK-explicit-demand-city-switch');
     record('QUICK','explicit CAP/ITEMS-style capacity+term preserved through store and city changes','PASS',{capacity:3.5,term:12,from:'北京',to:'上海',storeSwitchClearedUnit:true,citySwitchClearedStore:true});
    });
    await section('05-QUICK-COMBO-TO-O01',async()=>{
     await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;
      c.setCity('北京');c.setRequirement(9,null,false);c.clearSelection();
      sessionStorage.removeItem('mk_br04_ui_v2');b.persist();
     });
     const child=await open('QUICK');
     const storeId=await page.evaluate(()=>{
      const c=window.SIM_DEMO.core;
      return c.fixture.stores.find(s=>s.city==='北京'&&s.status==='open'&&c.combinations(s.id).length)?.id||null;
     });
     assert.ok(storeId,'No Beijing store offers a valid two-unit combination for 9m3');
     await child.locator('[data-choice="store"]').click();
     await child.locator('#modal [data-bridge="quickStore"][data-value="'+storeId+'"]').click();
     await child.locator('[data-choice="unit"]').click();
     const comboValue=await child.locator('#modal [data-bridge="quickUnit"]').evaluateAll(els=>els.map(e=>e.getAttribute('data-value')).find(v=>v&&v.includes(','))||null);
     assert.ok(comboValue,'QUICK must expose a two-unit combination for the explicit capacity');
     await child.locator('#modal [data-bridge="quickUnit"][data-value="'+comboValue+'"]').click();
     let selected=await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core,ui=JSON.parse(sessionStorage.getItem('mk_br04_ui_v2')||'{}').quick;
      return {requirement:c.state().requirement,ids:ui.ids,volume:ui.ids.reduce((n,id)=>n+c.fixture.units.find(u=>u.id===id).volume,0)};
     });
     assert.equal(selected.ids.length,2);assert.equal(selected.requirement.capacity_m3,9);
     assert.equal(selected.requirement.term_confirmed,false);assert.ok(selected.volume>=9);
     await shot('13-QUICK-combo-selected');
     await child.locator('[data-term="12"]').click();
     const date=await page.evaluate(()=>window.SIM_DEMO.core.today());
     await child.locator('#start-date').fill(date);
     await page.evaluate(()=>{const b=window.SIM_DEMO;b.core.requestPhone();b.core.resolvePhone('success',{phone:'13800138000'});b.persist();});
     await child.locator('#next-button').click();
     await page.waitForURL(/page=O01/,{timeout:10000});
     await child.locator('body.bridge-ready').waitFor();
     selected=await page.evaluate(()=>{
      const c=window.SIM_DEMO.core.state();
      return {ids:c.selected,capacity:c.requirement.capacity_m3,term:c.requirement.term_months,confirmed:c.requirement.term_confirmed,valid:window.SIM_DEMO.core.selectionValid(c.selected)};
     });
     assert.equal(selected.ids.length,2);assert.equal(selected.capacity,9);assert.equal(selected.term,12);
     assert.equal(selected.confirmed,true);assert.equal(selected.valid,true);
     assert.match(await child.locator('#rent').innerText(),/¥/);
     await shot('14-QUICK-combo-to-O01');
     record('QUICK','explicit capacity → two-unit combination → O01','PASS',{capacity:selected.capacity,term:selected.term,selectedUnits:selected.ids.length,store:storeId});
    });
   if(errors.length)report.blockers.push({width,flow:'browser_runtime',severity:'JS_ERROR',errors});
   await context.close();
  }
 }finally{
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();await new Promise(done=>server.close(done));
 }
 const unexpected=report.blockers.length>0;
 console.log('RC2_MERGE_READY_04',JSON.stringify({screenshots:fs.readdirSync(out).filter(n=>n.endsWith('.png')).length,blocks:report.blockers.length,flows:report.results}));
 if(unexpected){console.error('RC2_MERGE_READY_04_HOLD',JSON.stringify(report.blockers));process.exitCode=1;}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;server.close();});
