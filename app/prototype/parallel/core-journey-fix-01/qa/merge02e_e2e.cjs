'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../evidence/merge02e');
fs.mkdirSync(out,{recursive:true});
const root='http://127.0.0.1:4270/demo/';
const results=[];
function pass(name,width,data){results.push({name,width,status:'PASS',...data});console.log('PASS_CASE',JSON.stringify(results.at(-1)));}
function fail(name,width,e,extra={}){results.push({name,width,status:'FAIL',reason:String(e),...extra});console.error('FAIL_CASE',JSON.stringify(results.at(-1)));}
const containsUrl=(page,s)=>page.url().includes(s);
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const [width,height] of [[375,812],[390,844]]){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(root+'index.html?page=S01',{waitUntil:'domcontentloaded'});
  const clean=await page.locator('.demo-settings').isVisible().then(x=>!x);
  const authClean=await page.locator('.mk-auth-settings').isVisible().then(x=>!x);
  const shell=await page.locator('.app-shell').boundingBox();
  const body=await page.locator('body').innerText();
  await page.screenshot({path:path.join(out,'S01-clean-'+width+'.png')});
  if(!clean||!authClean||Math.abs((shell?.height||0)-height)>1)throw Error('Review controls visible or shell is not viewport height: '+JSON.stringify({clean,authClean,shell}));
  if(!body.includes('门店'))throw Error('S01 no store content');
  pass('S01-clean',width,{shellHeight:shell?.height});
  await page.goto(root+'index.html?page=S01&debug=1',{waitUntil:'domcontentloaded'});
  const debugOn=await page.locator('.demo-settings').isVisible();
  const authDebugOn=await page.locator('.mk-auth-settings').isVisible();
  if(!debugOn||!authDebugOn)throw Error('QA debug must remain recoverable '+JSON.stringify({debugOn,authDebugOn}));
  pass('debug-isolation',width,{debugOn,authDebugOn});
 }catch(e){fail('review-control-isolation',width,e);}
 // New visitor home -> nearby stores -> store detail -> start order
 try{
  await page.goto(root+'home.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(300);
  await page.locator('.task-hotspots [data-action*="附近门店"]').first().click();
  await page.waitForURL('**/index.html?page=S01',{timeout:7500});
  const firstStore=page.locator('[data-store]').first();
  await firstStore.click();
  await page.waitForURL(/page=S02/, {timeout:7500});
  await page.waitForTimeout(350);
  if(await page.getByRole('tab',{name:'用户评价'}).count()>0)throw Error('S02 review tab reappeared');
  const order=page.locator('.unit-row .order-button:not([disabled])').first();
  const cnt=await order.count();
  if(!cnt)throw Error('No available S02 purchase button');
  await page.screenshot({path:path.join(out,'S02-clicked-'+width+'.png')});
  await order.click();await page.waitForTimeout(320);
  const auth=await page.locator('.mk-auth-overlay').count()>0;
  const termModal=await page.locator('.control-sheet').count()>0;
  const isO01=containsUrl(page,'page=O01');
  if(!auth&&!termModal&&!isO01)throw Error('No purchase guard after clicking order');
  pass('H01-click-S01-S02-order-intent',width,{purchaseGuard:{auth,termModal,isO01}});
 }catch(e){fail('H01-click-S01-S02-order-intent',width,e,{url:page.url()});}
 // Fresh visitor home -> CAP, enter target and choose term via actual UI
 try{
  await page.goto(root+'home.html',{waitUntil:'domcontentloaded'});
  await page.locator('.task-hotspots [data-action*="估大小"]').first().click();
  await page.waitForURL('**/cap.html',{timeout:8000});
  const input=page.locator('#capacity');
  if(!await input.count())throw Error('CAP capacity not found');
  await input.fill('3.5'); await input.dispatchEvent('input');await page.waitForTimeout(300);
  const termControls=await page.locator('button,[role="button"]').evaluateAll(ns=>ns.filter(n=>/6\s*个?月/.test(n.innerText||n.getAttribute('aria-label')||'')).map(n=>({text:n.innerText.slice(0,40),outer:n.outerHTML.slice(0,230)})).slice(0,8));
  const choice=page.getByRole('button',{name:/^6\s*个?月$/}).first();
  if(await choice.count()){await choice.click();}
  else {
    const opts=page.locator('button').filter({hasText:/6\s*个?月/});
    if(await opts.count())await opts.first().click();else throw Error('Cannot select 6 months via visible control: '+JSON.stringify(termControls));
  }
  await page.waitForTimeout(300);
  const cta=page.locator('#cta');const disabled=await cta.isDisabled();
  if(disabled)throw Error('CAP CTA disabled after 3.5/6 months '+JSON.stringify({termControls,month:(await page.locator('#cta').innerText())}));
  await page.screenshot({path:path.join(out,'CAP-selected-'+width+'.png')});
  await cta.click();
  await page.waitForURL(/page=S5/, {timeout:10000});
  await page.waitForTimeout(600);
  const state=await page.evaluate(()=>({requirement:window.SIM_DEMO?.core.state().requirement}));
  const frame=page.frameLocator('iframe');
  const text=await frame.locator('body').innerText();
  if(state.requirement?.capacity_m3!==3.5||state.requirement?.term_months!==6||!text.includes('3.5'))throw Error('CAP->S5 context lost '+JSON.stringify({state,text:text.slice(0,180)}));
  await page.screenshot({path:path.join(out,'S5-actual-click-'+width+'.png')});
  const mainBuy=frame.locator('#main-buy');
  await mainBuy.click();
  await page.locator('.mk-auth-overlay').waitFor({timeout:7000});
  const deniedOrderCount=await page.evaluate(()=>window.SIM_DEMO.core.state().orders.length);
  await page.locator('.mk-auth-close').click();
  if(deniedOrderCount!==0||containsUrl(page,'page=O01'))throw Error('Anonymous order gate bypassed');
  await mainBuy.click();
  await page.locator('#mk-auth-agree').check();
  await page.locator('[data-auth="wechat"]').click();
  await page.waitForURL(/page=O01/,{timeout:8000});
  await page.waitForTimeout(350);
  const orderState=await page.evaluate(()=>({authorized:window.SIM_DEMO.core.authorized(),selected:window.SIM_DEMO.core.state().selected,requirement:window.SIM_DEMO.core.state().requirement}));
  const orderText=await page.frameLocator('iframe').locator('body').innerText();
  if(!orderState.authorized||!orderState.selected.length||!orderText.includes('首次'))throw Error('Verified actual CAP flow did not reach priced O01 '+JSON.stringify({orderState,orderText:orderText.slice(0,300)}));
  await page.screenshot({path:path.join(out,'O01-from-CAP-click-'+width+'.png')});
  pass('H01-click-CAP-enter-term-S5-O01',width,{demand:state.requirement,authorized:orderState.authorized,selectedIds:orderState.selected,orderHasPayable:orderText.includes('首次')});
 }catch(e){fail('H01-click-CAP-enter-term-S5',width,e,{url:page.url()});}
 // New visitor home -> booking and quick order select panels
 for(const [key,action,urlPart] of [['BOOKING','booking','page=BOOKING'],['QUICK','quick','page=QUICK']]){
  try{
   await page.goto(root+'home.html',{waitUntil:'domcontentloaded'});
   await page.locator('[data-action*="预约订单"]').last().click();
   await page.locator('[data-h="'+action+'"]').click();
   await page.waitForURL(u=>u.href.includes(urlPart),{timeout:8000});
   const frame=page.frameLocator('iframe');
   const text=(await frame.locator('body').innerText({timeout:7500})).slice(0,500);
   if(text.length<80)throw Error('BR04 content absent');
   await page.screenshot({path:path.join(out,key+'-actual-click-'+width+'.png')});
   pass('H01-click-'+key,width,{iframeContent:true});
  }catch(e){fail('H01-click-'+key,width,e,{url:page.url()});}
 }
 // Matched CAP capacity and term for layout comparison with signed 8m³ / 12-month reference.
 try {
  await page.goto(root+'cap.html',{waitUntil:'domcontentloaded'});
  await page.locator('#capacity').fill('8');
  await page.locator('#capacity').dispatchEvent('input');
  const select12=page.getByRole('button',{name:/^12/}).first();
  if(await select12.count())await select12.click();
  else await page.locator('button').filter({hasText:'12个月'}).first().click();
  await page.waitForTimeout(280);
  const enabled=!(await page.locator('#cta').isDisabled());
  if(!enabled)throw Error('8m3/12m CTA disabled');
  await page.screenshot({path:path.join(out,'CAP-8m3-12months-'+width+'.png')});
  pass('CAP-8m3-12mo-reference-state',width,{capacity:8,term:12});
 } catch(e) {fail('CAP-8m3-12mo-reference-state',width,e,{url:page.url()});}
 await ctx.close();
}}finally{await browser.close();}
fs.writeFileSync(path.join(out,'e2e-results.json'),JSON.stringify({cases:results,summary:results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})},null,2));
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error('FATAL_E2E',e);process.exitCode=1});
