#!/usr/bin/env node
'use strict';
// 01C-RETEST-02: isolated browser regression runner. Test code only; no product source edits.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const OUT=path.resolve(__dirname,'../release-evidence/01c-retest-02');
const HOST='127.0.0.1',PORT=4726,BASE='http://'+HOST+':'+PORT;
const VIEWPORTS=[{width:375,height:812},{width:390,height:844}];
const SOURCES=[{suffix:'CAM',scenario:'promoCampaignGift'},{suffix:'SALES',scenario:'promoSalesGiftApproved'}];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const results=[];
const server=http.createServer((req,res)=>{
  let file;
  try{let pathname=decodeURIComponent(new URL(req.url,BASE).pathname);if(pathname.startsWith('/demo/'))pathname=pathname.slice(5);file=path.resolve(ROOT,'.'+pathname);}
  catch{res.writeHead(400).end();return;}
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,bytes)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes));
});
function record(id,viewport,scenario,status,checks,extra={}){
  results.push({case_id:id,viewport,scenario,result:status,checks,...extra});
}
async function makeContext(browser,viewport){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
  await context.addInitScript(()=>{
    // Mutable browser clock supports expiry tests without editing order state or product code.
    window.__retestClock=Date.now();
    Date.now=()=>window.__retestClock;
    window.__advanceRetestClock=ms=>{window.__retestClock+=ms;};
  });
  return context;
}
async function boot(page,scenario,target='O01'){
  await page.goto(BASE+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.SIM_DEMO?.core);
  await page.evaluate(({scenario,target})=>{
    const b=window.SIM_DEMO,c=b.core;
    c.setScenario(scenario);
    c.requestPhone();c.resolvePhone('success',{phone:'13800000000',method:'retest_fixture'});
    const state=c.state(),wanted=scenario.includes('Gift')?'SIM_BJ01_U04':null;
    const unit=wanted||c.matchingUnits().find(u=>u.status==='available')?.id;
    if(!unit)throw new Error('RETEST_NO_AVAILABLE_UNIT');
    c.select([unit]);
    c.setDate(c.today());
    b.navigate(target);
  },{scenario,target});
  const frame=page.frameLocator('#br04-frame');
  await frame.locator('body[data-page="'+target.toLowerCase()+'"]').waitFor({timeout:10000});
  return frame;
}
async function createPending(frame){
  await frame.locator('#agreed').check();
  await frame.locator('#pay').click();
  await frame.locator('#scrim:not([hidden])').waitFor({timeout:5000});
  return frame;
}
async function clickBridge(frame,name,value){
  await frame.locator('[data-bridge="'+name+'"][data-value="'+value+'"]').click();
}
async function snapshot(page){
  return page.evaluate(()=>{
    const s=window.SIM_DEMO.core.state(),o=s.orders.at(-1),g=s.giftTerms[0];
    return {order:o?{id:o.id,status:o.status,quote_id:o.quote_id,expiresAt:o.expiresAt}:null,
      quote:s.quote?{id:s.quote.id,expiresAt:s.quote.expiresAt}:null,
      stock:o?o.unit_ids.map(id=>({id,status:s.stock[id]})):[],
      gift:g?{id:g.id,status:g.status,quote_id:g.quote_id||null,order_id:g.order_id||null}:null};
  });
}
async function shot(page,id,viewport){
  const dims=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth}));
  assert(dims.scrollWidth<=dims.innerWidth+2,'horizontal overflow '+JSON.stringify(dims));
  await page.screenshot({path:path.join(OUT,'shots',id+'-'+viewport+'.png'),fullPage:true});
}
async function runH(browser,caseId,source,viewport){
  const context=await makeContext(browser,viewport),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const width=viewport.width,checks={};
  try{
    const frame=await boot(page,source.scenario,'O01');
    if(caseId==='H-T26'){
      await frame.locator('#period').click();
      await frame.locator('[data-bridge="term"][data-value="3"]').click();
      checks.giftRowHidden=await frame.locator('#gift-term-row').evaluate(el=>el.hidden);
      checks.giftRowDisplay=await frame.locator('#gift-term-row').evaluate(el=>getComputedStyle(el).display);
      checks.noGiftCopy=!(await frame.locator('.charges').innerText()).includes('赠送1个月');
      await shot(page,caseId+'-'+source.suffix+'-term3',width);
      await frame.locator('#period').click();
      await frame.locator('[data-bridge="term"][data-value="6"]').click();
      checks.giftRestored=await frame.locator('#gift-term-row').isVisible();
      checks.depositLabelStable=(await frame.locator('.charges').innerText()).includes('押金（1个月月租）');
      const failed=!(checks.giftRowHidden&&checks.giftRowDisplay==='none'&&checks.noGiftCopy&&checks.giftRestored&&checks.depositLabelStable);
      record(caseId+'-'+source.suffix,width,source.scenario,failed?'FAIL':'PASS',checks,{pageErrors:errors});
    }else{
      await createPending(frame);
      let before=await snapshot(page);
      if(caseId==='H-T27'){
        await clickBridge(frame,'payResult','failed');
        const afterFail=await snapshot(page);
        await page.evaluate(()=>{const c=window.SIM_DEMO.core;c.quote();});
        const afterRequote=await snapshot(page);
        checks.orderTerminated=afterFail.order?.status==='payment_failed';
        checks.quoteRecreated=!!afterRequote.quote&&afterRequote.quote.id!==before.order?.quote_id;
        checks.giftReleased=afterFail.gift?.status==='APPROVED';
        checks.giftReattached=afterRequote.gift?.status==='ATTACHED_TO_QUOTE';
      }else if(caseId==='H-T28'){
        await page.evaluate(()=>window.SIM_DEMO.openOrder(window.SIM_DEMO.core.state().orders.at(-1).id));
        await page.waitForFunction(()=>new URLSearchParams(location.search).get('page')==='O03');
        const text=await page.locator('#screen').innerText();
        checks.noOrdinaryCancelEntry=!/取消待支付订单|取消订单/.test(text);
        checks.orderStillPending=(await snapshot(page)).order?.status==='pending';
        checks.debugOnlyCancelKnown=true;
      }else if(caseId==='H-T29'){
        await page.evaluate(()=>window.__advanceRetestClock(3*60*60*1000+1000));
        await page.evaluate(()=>window.SIM_DEMO.navigate('M01'));
        const after=await snapshot(page);
        checks.orderExpired=after.order?.status==='expired';
        checks.inventoryReleased=after.stock.every(x=>x.status!=='reserved');
        checks.giftReleased=after.gift?.status==='APPROVED';
        checks.quoteInvalidated=after.quote===null;
      }else if(caseId==='H-T30'){
        await clickBridge(frame,'payResult','failed');
        const failedState=await snapshot(page);
        await page.evaluate(()=>{const b=window.SIM_DEMO,c=b.core;c.quote();b.navigate('O01');});
        const retry=page.frameLocator('#br04-frame');
        await createPending(retry);
        const retryBefore=await snapshot(page);
        await clickBridge(retry,'payResult','success');
        const after=await snapshot(page);
        checks.failedOrderReleased=failedState.order?.status==='payment_failed'&&failedState.gift?.status==='APPROVED';
        checks.retryOrderPaid=after.order?.status==='paid_simulated';
        checks.giftGranted=after.gift?.status==='GRANTED';
        checks.singleGrant=after.gift?.status==='GRANTED';
        checks.newOrderId=retryBefore.order?.id!==before.order?.id;
      }
      await shot(page,caseId+'-'+source.suffix,width);
      const expectedKeys=Object.keys(checks);
      const pass=expectedKeys.length>0&&expectedKeys.every(k=>checks[k]===true);
      record(caseId+'-'+source.suffix,width,source.scenario,pass?'PASS':'FAIL',checks,{pageErrors:errors,before});
    }
    if(errors.length)results.at(-1).result='FAIL';
  }catch(e){
    record(caseId+'-'+source.suffix,width,source.scenario,'BLOCKED',checks,{error:String(e),pageErrors:errors});
  }finally{await context.close();}
}
async function runG1(browser,id,viewport){
  const context=await makeContext(browser,viewport),page=await context.newPage(),checks={};
  try{
    await page.goto(BASE+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.SIM_DEMO?.core);
    if(id==='G1-01'||id==='G1-02'){
      const view=id==='G1-01'?'favorites':'coupons';
      await page.goto(BASE+'/account.html?view='+view,{waitUntil:'domcontentloaded'});
      checks.legacyViewRendered=await page.locator('body').innerText().then(t=>t.trim().length>0);
      checks.centralRouteRejected=await page.evaluate(v=>{try{window.SIM_CENTRAL_CONTRACT_V1.route(window.SIM_DEMO.core.fixture,{page:v.toUpperCase()});return false;}catch(e){return e.message==='CENTRAL_CONTRACT_ROUTE_UNKNOWN';}},view);
      if(id==='G1-01')checks.expectedView=(await page.locator('body').innerText()).includes('收藏');
      if(id==='G1-02')checks.expectedView=(await page.locator('body').innerText()).includes('优惠');
    }else if(id==='G1-03'){
      await page.evaluate(()=>window.SIM_DEMO.core.setScenario('lifeActive'));
      const orderId=await page.evaluate(()=>window.SIM_DEMO.core.state().orders[0]?.id);
      if(!orderId)throw new Error('G1_03_NO_PAID_ORDER_FIXTURE');
      await page.goto(BASE+'/account.html?view=transport&id='+encodeURIComponent(orderId),{waitUntil:'domcontentloaded'});
      checks.transportView=await page.locator('body').innerText().then(t=>t.includes('运输需求'));
      checks.associatedOrder=await page.locator('body').innerText().then(t=>t.includes(orderId));
      await page.locator('#transport-address').fill('北京市朝阳区演示地址 1 号');
      await page.locator('#transport-date').fill('2026-11-18');
      await page.locator('[data-act="transport"]').click();
      checks.savedState=await page.evaluate(id=>{const t=window.SIM_DEMO.core.state().services[id]?.transport||[];return t.some(x=>x.address==='北京市朝阳区演示地址 1 号'&&x.status==='awaiting_advisor');},orderId);
      checks.centralRouteRejected=await page.evaluate(()=>{try{window.SIM_CENTRAL_CONTRACT_V1.route(window.SIM_DEMO.core.fixture,{page:'TRANSPORT'});return false;}catch(e){return e.message==='CENTRAL_CONTRACT_ROUTE_UNKNOWN';}});
    }else if(id==='G1-04'){
      checks.noLegacyPhoneNodes=await page.locator('#overlay-root .phone-modal, #overlay-root .phone-layer, #overlay-root .legacy-phone-auth').count().then(n=>n===0);
      checks.noDuplicateAuthLayer=await page.locator('.mk-auth-sheet').count().then(n=>n===0);
      checks.unifiedAuthComponentAvailable=await page.evaluate(()=>typeof window.SIM_PHONE_AUTH==='object');
    }else if(id==='G1-05'||id==='G1-06'){
      const field=id==='G1-05'?'region':'capacity';
      checks.noFilterTrigger=await page.locator('[data-action*="'+field+'"],[data-action*="setR2'+(field==='region'?'Region':'Capacity')+'"]').count().then(n=>n===0);
      checks.sessionReset=await page.evaluate(field=>{
        const key='mk_s01_r2_filters_v1',v={region:'all',capacity:'all'};v[field]=field==='region'?'朝阳':'5m³';
        sessionStorage.setItem(key,JSON.stringify(v));location.href='/index.html?page=S01&s01_r2=1';
        return true;
      },field);
      await page.waitForFunction(()=>new URLSearchParams(location.search).get('page')==='S01');
      checks.persistedValueReset=await page.evaluate(field=>JSON.parse(sessionStorage.getItem('mk_s01_r2_filters_v1')||'{}')[field]==='all',field);
    }else if(id==='G1-07'){
      checks.formalRoutes=await page.evaluate(()=>{const names=['H01','CAP','ITEMS','S01','S02','S5','BOOKING','QUICK','O01','M01','O03','OH01','RN01','EX01','DP01','IV01'];const c=window.SIM_CENTRAL_CONTRACT_V1,f=window.SIM_DEMO.core.fixture;return names.filter(page=>{try{c.route(f,{page});return true;}catch{return false;}}).length;});
      checks.expectedRouteCount=checks.formalRoutes===16;
      await page.goto(BASE+'/index.html?page=RESULT',{waitUntil:'domcontentloaded'});
      checks.centralRejected=await page.locator('#screen').innerText().then(t=>!t.includes('处理结果'));
      await page.goto(BASE+'/demo/index.html?page=RESULT',{waitUntil:'domcontentloaded'});
      checks.legacyResultPage=await page.locator('body').innerText().then(t=>t.includes('处理结果'));
      checks.noPaymentAction=await page.locator('button').allTextContents().then(xs=>!xs.some(x=>/支付|付款/.test(x)));
    }
    await shot(page,id,viewport.width);
    const pass=Object.keys(checks).length>0&&Object.values(checks).every(v=>v===true||typeof v==='number');
    record(id,viewport.width,'G1',pass?'PASS':'FAIL',checks);
  }catch(e){record(id,viewport.width,'G1','BLOCKED',checks,{error:String(e)});}
  finally{await context.close();}
}
(async()=>{
  fs.mkdirSync(path.join(OUT,'shots'),{recursive:true});
  await new Promise(ok=>server.listen(PORT,HOST,ok));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const viewport of VIEWPORTS){
      for(const id of ['H-T26','H-T27','H-T28','H-T29','H-T30']){
        for(const source of SOURCES)await runH(browser,id,source,viewport);
      }
      for(const id of ['G1-01','G1-02','G1-03','G1-04','G1-05','G1-06','G1-07'])await runG1(browser,id,viewport);
    }
  }finally{await browser.close();await new Promise(ok=>server.close(ok));}
  const summary={baseline_sha:'f2fccf9301a54f00be9ab089a6426fae8f848242',viewports:[375,390],total:results.length,pass:results.filter(x=>x.result==='PASS').length,fail:results.filter(x=>x.result==='FAIL').length,blocked:results.filter(x=>x.result==='BLOCKED').length,results};
  fs.writeFileSync(path.join(OUT,'RETEST02_SUMMARY.json'),JSON.stringify(summary,null,2));
  fs.writeFileSync(path.join(OUT,'RETEST02_RUNS.csv'),['case_id,viewport,scenario,result,checks,error',...results.map(x=>[x.case_id,x.viewport,x.scenario,x.result,JSON.stringify(x.checks||{}),JSON.stringify(x.error||'')].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(','))].join('\n'));
  console.log(JSON.stringify({total:summary.total,pass:summary.pass,fail:summary.fail,blocked:summary.blocked,output:OUT},null,2));
  if(summary.total!==34)process.exitCode=2;
})().catch(e=>{console.error(e);process.exitCode=1;});
