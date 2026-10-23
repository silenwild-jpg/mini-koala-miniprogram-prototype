const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');

const file='space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html';
const out=path.resolve('outputs/acceptance_fix_runtime/screens');fs.mkdirSync(out,{recursive:true});
let fontCss='';
(async()=>{
 const http=require('node:http');const root=process.cwd();const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
 const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://capture').pathname));if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(b);});});await new Promise(resolve=>server.listen(4187,'127.0.0.1',resolve));
 const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),headless:true,args:['--disable-dev-shm-usage']});



 const baseURL='http://127.0.0.1:4187/prototype/';const logs=[];
 const F=JSON.parse(fs.readFileSync('qa/acceptance_fix_page_map.json','utf8'));
 let ctx,p,errs;
 async function fresh(seed='new'){if(ctx)await ctx.close();ctx=await browser.newContext({viewport:{width:375,height:812},timezoneId:'Asia/Shanghai'});p=await ctx.newPage();p.setDefaultTimeout(8000);await p.clock.install({time:new Date('2026-10-08T03:00:00Z')});errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(baseURL+'index.html');await p.addScriptTag({url:baseURL+'mini_storage_demo_fixture_v2.js'});await p.evaluate(s=>window.MINI_KOALA_DEMO_V2.seed(s),seed);}
 async function goto(key,query=''){await p.goto(baseURL+F[key]+(query?'?'+query:''),{waitUntil:'networkidle'});}
 async function snap(id){if(fontCss)await p.addStyleTag({content:fontCss});await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,id+'.png')});return {screenshot:id+'.png',url:p.url(),text:await p.locator('body').innerText(),errors:errs.slice()};}
 async function test(name,fn){try{await fn();}catch(e){logs.push({name,result:'blocked',message:e.message,errors:errs});console.log('BLOCKED '+name+' '+e.message.slice(0,130));}fs.writeFileSync('outputs/acceptance_fix_runtime/results.json',JSON.stringify(logs,null,2));console.log('Checked '+name);}
 const canon='store=MK_BJ_2CDB7BEE&unit=BJ0112S01A009&sizeOption=MK_BJ_2CDB7BEE__4.72&target=4.8&min=4.3&max=5.5&term=6';

 const originalFresh=fresh;
 let currentWidth=375;
 fresh=async function(seed='new'){await originalFresh(seed);await p.setViewportSize({width:currentWidth,height:currentWidth===375?812:844})};
 async function pass(name,data={}){assert.equal(errs.length,0,errs.join(';'));logs.push({name,result:'passed',width:currentWidth,...data});}
 for(const width of [375,390]){currentWidth=width;
 await test('F01_long_item_standard_flow_'+width,async()=>{
  await fresh();await goto('EST','scene=moving&term=6');await p.locator('#startBlank').click();await p.locator('#s4.active').waitFor();await p.locator('#estCustomToggle').click();
  for(const [id,v] of [['estCustomName','长画框'],['estLength','600'],['estWidth','20'],['estHeight','20']])await p.locator('#'+id).fill(v);
  await p.locator('#estCustomSave').click();await p.locator('#toUsageBtn').click();await p.locator('#s5.active').waitFor();assert.equal(await p.locator('#dimensionRecommendationNote').count(),0);
  await p.locator('#usageChooseBtn').click();const req=await p.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_requirement_current')));assert.deepEqual(req.item_constraints[0].dimensions_cm,[600,20,20]);
  await p.locator('#s9.active').waitFor();assert.doesNotMatch(await p.locator('body').innerText(),/尺寸待确认/);await p.locator('#unitCards [data-unit-index]').first().click();await p.locator('#storeDetailBtn').click();await p.waitForURL('**/mini_storage_unit_detail**');
  assert.equal(await p.locator('#dimensionFitCheck').count(),0);assert.doesNotMatch(await p.locator('body').innerText(),/尺寸待确认|先核对大件尺寸/);
  const shot=await snap('F01_long_dimensions_'+width);await p.locator('#confirm').click();await p.waitForURL('**/mini_storage_order_o01**');assert.equal(await p.locator('#dimensionFitCheck').count(),0);assert.doesNotMatch(await p.locator('body').innerText(),/尺寸待确认/);
  await p.locator('#agreeContract').check();await p.locator('#pay').click();assert.equal(await p.locator('#phoneAuthSheet').evaluate(el=>el.classList.contains('show')),true);
  await goto('EST','entry=resume_item_check&term=6');await p.locator('#s4.active').waitFor();assert.match(await p.locator('#estExtraList').innerText(),/600×20×20cm/);await p.getByRole('button',{name:'修改尺寸',exact:true}).click();await p.locator('#estLength').fill('120');await p.locator('#estLong').uncheck();await p.locator('#estCustomSave').click();assert.match(await p.locator('#estExtraList').innerText(),/120×20×20cm/);
  await pass('F01_long_item_standard_flow_'+width,{requirement:req,shot});
 });
 await test('F02_draft_cancel_and_commit_'+width,async()=>{
  await fresh('estimated');await goto('S01','state=estimated&target=4.8&min=4.3&max=5.5&term=6');const before=await p.locator('#demandSummary').innerText();
  await p.locator('#editDemand').click();await p.locator('#sizePlus').click();await p.locator('#requirementSheet').click({position:{x:10,y:10}});assert.equal(await p.locator('#demandSummary').innerText(),before);
  await p.locator('#editDemand').click();await p.locator('#sizePlus').click();await p.locator('#applyRequirement').click();const committed=await p.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_requirement_current')));assert.equal(committed.target_volume,5.3);
  await goto('S02','state=matched&'+canon);const b=await p.locator('#demandSummary').innerText();await p.locator('#editDemand').click();await p.locator('#termPlus').click();await p.keyboard.press('Escape');assert.equal(await p.locator('#demandSummary').innerText(),b);
  await p.locator('#editDemand').click();await p.locator('#termPlus').click();await p.locator('#applyRequirement').click();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_requirement_current')).term_months),7);
  await pass('F02_draft_cancel_and_commit_'+width,{before,committed,shot:await snap('F02_demand_committed_'+width)});
 });
 await test('F03_capacity_monotonic_'+width,async()=>{
  await fresh('estimated');await goto('S01','state=nomatch&target=60&term=6');await p.locator('#editDemand').click();await p.locator('#sizePlus').click();assert.equal(await p.locator('#sizeValue').innerText(),'60.5m³');const shot=await snap('F03_capacity_'+width);
  await goto('S01','state=nomatch&target=200&term=6');await p.locator('#editDemand').click();await p.waitForTimeout(80);assert.equal(await p.locator('#sizePlus').isDisabled(),true);await pass('F03_capacity_monotonic_'+width,{shot});
 });
 await test('F04_arrival_fields_'+width,async()=>{
  await fresh('active');await goto('A01','orderNo=O-DEMO-ACTIVE');const text=await p.locator('body').innerText();assert(!text.includes('undefined'));for(const id of ['entry','parking','freight'])assert((await p.locator('#'+id).innerText()).length>0);
  await p.locator('#entry').scrollIntoViewIfNeeded();await pass('F04_arrival_fields_'+width,{shot:await snap('F04_arrival_'+width)});
 });
 await test('F05_inventory_recovery_'+width,async()=>{
  await fresh('estimated');await goto('O01',canon+'&review=1&simulatePayment=INVENTORY_CHANGED');await p.locator('#agreeContract').check();await p.locator('#pay').click();if(await p.locator('#phoneAuthAllow').isVisible())await p.locator('#phoneAuthAllow').click();await p.waitForURL('**/mini_storage_order_o02**');await p.locator('#primaryBtn').click();await p.waitForURL('**/mini_storage_store_detail**');
  const url=new URL(p.url());assert.equal(url.searchParams.get('store'),'MK_BJ_2CDB7BEE');assert.equal(url.searchParams.get('target'),'4.8');assert.match(await p.locator('body').innerText(),/惠新西街店/);await pass('F05_inventory_recovery_'+width,{url:p.url(),shot:await snap('F05_recovered_store_'+width)});
 });
 await test('F06_invoice_validation_and_idempotency_'+width,async()=>{
  await fresh('active');await goto('IV01','orderNo=O-DEMO-ACTIVE');await p.locator('#titleInput').fill('测试个人');await p.locator('#email').fill('not-an-email');await p.locator('#submitInvoice').click();assert.equal(await p.evaluate(()=>window.MINI_STORAGE_REPO_V242.getInvoices().length),0);const shot=await snap('F06_invalid_email_'+width);
  await p.locator('#email').fill('demo@example.com');await p.locator('#submitInvoice').click();await p.locator('#submitInvoice').click();assert.equal(await p.evaluate(()=>window.MINI_STORAGE_REPO_V242.getInvoices().length),1);await pass('F06_invoice_validation_and_idempotency_'+width,{shot});
 });
 await test('F07_exit_date_'+width,async()=>{
  await fresh('ending');await goto('EX01','orderNo=O-DEMO-ENDING&review=1');await p.locator('#targetDate').fill('2020-01-01');await p.locator('#submitReturn').click();assert.equal(await p.evaluate(()=>window.MINI_STORAGE_REPO_V242.getReturns().length),0);const shot=await snap('F07_date_rejected_'+width);
  await p.locator('#targetDate').fill('2026-10-18');await p.locator('#submitReturn').click();assert.equal(await p.evaluate(()=>window.MINI_STORAGE_REPO_V242.getReturns().length),1);await pass('F07_exit_date_'+width,{shot});
 });
 await test('F08_business_phone_'+width,async()=>{
  await fresh();await goto('B2B01');await p.locator('#phone').fill('123');await p.locator('#submit').click();assert.equal(await p.evaluate(()=>localStorage.getItem('mini_storage_b2b_lead_current')),null);const shot=await snap('F08_phone_rejected_'+width);
  await p.locator('#phone').fill('13800138000');await p.locator('#submit').click();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_b2b_lead_current')).status),'SALES_FOLLOWUP_DEMO');await pass('F08_business_phone_'+width,{shot});
 });
 await test('F09_transport_status_'+width,async()=>{
  await fresh('active');await p.evaluate(()=>{const k='mini_storage_order_current',o=JSON.parse(localStorage.getItem(k));const next={...o,transport_promo_status:'ELIGIBLE',transport_right_status:'PENDING_BOOKING'};localStorage.setItem(k,JSON.stringify(next));localStorage.setItem('mini_storage_order_history_v242',JSON.stringify([next]))});await goto('M01');await p.locator('#myTransport').click();await p.waitForURL('**/mini_storage_transport_status**');assert.match(await p.locator('#orderNo').innerText(),/O-DEMO-ACTIVE/);assert(!((await p.locator('body').innerText()).includes('已退休')));await pass('F09_transport_status_'+width,{shot:await snap('F09_transport_'+width)});
 });
 await test('F10_F11_typography_touch_'+width,async()=>{
  await fresh('estimated');await goto('U01',canon);await p.locator('#couponChangeV1').waitFor();const metrics=await p.evaluate(()=>Object.fromEntries(['couponChangeV1','saveQuote','simulatedSpecNote','termPriceHint','miniSupportLauncher'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return [id,{height:r.height,font:parseFloat(getComputedStyle(e).fontSize),right:r.right}]})));
  assert(metrics.couponChangeV1.height>=44);assert(metrics.saveQuote.height>=44);assert(metrics.simulatedSpecNote.font>=12);assert(metrics.miniSupportLauncher.right<=width);const shot=await snap('F10_U01_'+width);await goto('S02',canon+'&state=matched');const heights=await p.evaluate(()=>Object.fromEntries(['.hero .gallery-tabs button','.unit-cta','#bookStoreViewing'].map(sel=>[sel,document.querySelector(sel).getBoundingClientRect().height])));for(const height of Object.values(heights))assert(height>=44,JSON.stringify(heights));await goto('B2B01');assert(await p.locator('#sizeChips .chip').first().evaluate(e=>e.getBoundingClientRect().height)>=44);await pass('F10_F11_typography_touch_'+width,{metrics,heights,shot});
 });
 await test('F12_modal_keyboard_'+width,async()=>{
  await fresh();await goto('S01','state=browse');await p.locator('#filterBtn').click();await p.locator('#filterSheet [role=dialog]').waitFor();const pill=p.locator('#filterSheet .pill').first();await pill.focus();const was=await pill.evaluate(e=>e.classList.contains('active'));await p.keyboard.press('Enter');assert.equal(await pill.evaluate(e=>e.classList.contains('active')),!was);await p.locator('#filterSheet button').last().focus();await p.keyboard.press('Tab');assert(await p.evaluate(()=>document.querySelector('#filterSheet').contains(document.activeElement)));await p.keyboard.press('Escape');assert(!await p.locator('#filterSheet').evaluate(e=>e.classList.contains('show')));assert.equal(await p.evaluate(()=>document.activeElement.id),'filterBtn');await pass('F12_modal_keyboard_'+width);
 });
 }
 if(ctx)await ctx.close();await browser.close();server.close();console.log('COMPLETE '+logs.filter(x=>x.result==='passed').length+' passed; '+logs.filter(x=>x.result!=='passed').length+' failed');
 if(logs.some(x=>x.result!=='passed'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
