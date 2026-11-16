'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const APP_ROOT=path.resolve(__dirname,'../app');
const OUT=path.resolve(__dirname,'../release-evidence/01c-retest-02');
const PORT=Number(process.env.RETEST_PORT||4718),BASE='http://127.0.0.1:'+PORT;
const DEMO='prototype/parallel/core-journey-fix-01/demo/',UNIT_ID='SIM_BJ01_U04',STORE_ID='SIM_BJ01';
const VIEWPORTS=[{width:375,height:812},{width:390,height:844}];
const CASES=[
{id:'H-T26-CAM',group:'H',action:'T26',scenario:'promoCampaignGift'},
{id:'H-T26-SALES',group:'H',action:'T26',scenario:'promoSalesGiftApproved'},
{id:'H-T27-CAM',group:'H',action:'T27',scenario:'promoCampaignGift'},
{id:'H-T27-SALES',group:'H',action:'T27',scenario:'promoSalesGiftApproved'},
{id:'H-T28-CAM',group:'H',action:'T28',scenario:'promoCampaignGift'},
{id:'H-T28-SALES',group:'H',action:'T28',scenario:'promoSalesGiftApproved'},
{id:'H-T29-CAM',group:'H',action:'T29',scenario:'promoCampaignGift'},
{id:'H-T29-SALES',group:'H',action:'T29',scenario:'promoSalesGiftApproved'},
{id:'H-T30-CAM',group:'H',action:'T30',scenario:'promoCampaignGift'},
{id:'H-T30-SALES',group:'H',action:'T30',scenario:'promoSalesGiftApproved'},
{id:'G1-01',group:'G1',action:'favorites'},
{id:'G1-02',group:'G1',action:'coupons'},
{id:'G1-03',group:'G1',action:'transport'},
{id:'G1-04',group:'G1',action:'phone'},
{id:'G1-05',group:'G1',action:'region'},
{id:'G1-06',group:'G1',action:'capacity'},
{id:'G1-07',group:'G1',action:'result'}
];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
function mkdirs(){for(const d of ['shots','traces','snapshots','logs','results'])fs.mkdirSync(path.join(OUT,d),{recursive:true});}
function safeName(v){return String(v).replace(/[^a-zA-Z0-9_-]+/g,'-');}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cell(v){const s=Array.isArray(v)?v.join(' | '):String(v??'');return '"'+s.replace(/"/g,'""')+'"';}
function createServer(){return http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,BASE).pathname);}catch{res.writeHead(400).end('bad request');return;}const file=path.resolve(APP_ROOT,'.'+pathname);if(file!==APP_ROOT&&!file.startsWith(APP_ROOT+path.sep)){res.writeHead(403).end('forbidden');return;}fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream'});res.end(bytes);});});}
const waitReal=ms=>new Promise(r=>setTimeout(r,ms));
async function runOne(browser,spec,viewport){
 const vn=String(viewport.width),rec={case_id:spec.id,group:spec.group,action:spec.action,scenario:spec.scenario||'',viewport:vn,width:viewport.width,height:viewport.height,status:'PASS',assertions:[],notes:[],screenshots:[],snapshots:[],page_errors:[],console_errors:[],trace_path:null,started_at:new Date().toISOString()};
 const context=await browser.newContext({viewport,deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'}),page=await context.newPage();
 if(spec.action==='T29')await page.clock.install({time:new Date('2026-11-16T10:00:00+08:00')});
 page.on('pageerror',e=>rec.page_errors.push(String(e?.message||e)));
 page.on('console',m=>{if(m.type()==='error')rec.console_errors.push(m.text());});
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 const check=(name,ok,expected,actual,detail)=>{const x={name,status:ok?'PASS':'FAIL',expected:expected===undefined?true:expected,actual:actual===undefined?Boolean(ok):actual};if(detail)x.detail=detail;rec.assertions.push(x);if(!ok)rec.status='FAIL';};
 const notInScope=(name,detail)=>rec.assertions.push({name,status:'NOT_IN_SCOPE',detail});
 const note=value=>rec.notes.push(String(value));
 async function shot(label){const name=safeName(spec.id)+'-'+vn+'-'+String(rec.screenshots.length+1).padStart(2,'0')+'-'+safeName(label)+'.png';await page.screenshot({path:path.join(OUT,'shots',name),fullPage:true,animations:'disabled'});rec.screenshots.push('shots/'+name);}
 function frameBySuffix(suffix){return page.frames().find(f=>{try{return new URL(f.url()).pathname.endsWith(suffix);}catch{return false;}});}
 async function waitFrame(suffix,predicate){for(let i=0;i<120;i++){const f=frameBySuffix(suffix);if(f){try{if(!predicate||await f.evaluate(predicate))return f;}catch{}}await waitReal(100);}throw Error('FRAME_NOT_READY:'+suffix);}
 const indexFrame=()=>waitFrame('/demo/index.html',()=>!!window.SIM_DEMO);
 const accountFrame=()=>waitFrame('/demo/account.html',()=>!!document.getElementById('content'));
 async function openCentral(pageName){await page.goto(BASE+'/central-review-02g.html?catalog=sim&page='+encodeURIComponent(pageName),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(document.getElementById('central-host')?.getAttribute('src'))||document.getElementById('central-error')?.style.display==='block');return indexFrame();}
 const o01=()=>page.frameLocator('#central-host').frameLocator('#br04-frame');
 async function snapshot(label){let data={label,at:new Date().toISOString(),unavailable:true};const f=frameBySuffix('/demo/index.html');if(f){try{data=await f.evaluate(()=>{const b=window.SIM_DEMO,c=b?.core;if(!c)return {url:location.href,unavailable:true};const s=c.state(),o=s.orders[s.orders.length-1],g=(s.giftTerms||[]).find(x=>['GIFT-C1','GIFT-S2'].includes(x.id))||null;return {url:location.href,scenario:s.scenario,requirement:s.requirement,quote:s.quote?{id:s.quote.id,expiresAt:s.quote.expiresAt}:null,order:o?{id:o.id,status:o.status,quote_id:o.quote_id,unit_ids:o.unit_ids,expiresAt:o.expiresAt,gift_terms:o.benefit_snapshot?.gift_terms||[]}:null,gift:g?{id:g.id,status:g.status,quote_id:g.quote_id,order_id:g.order_id,approval_id:g.approval_id}:null,stock:o?.unit_ids?.map(id=>({id,status:s.stock[id]||null}))||[],auth:s.auth};});}catch(e){data={label,error:String(e)};}}const name=safeName(spec.id)+'-'+vn+'-'+String(rec.snapshots.length+1).padStart(2,'0')+'-'+safeName(label)+'.json';fs.writeFileSync(path.join(OUT,'snapshots',name),JSON.stringify(data,null,2));rec.snapshots.push('snapshots/'+name);return data;}
 async function seedGiftAndOpenStore(){const app=await openCentral('S01');await app.evaluate(({scenario})=>{const b=window.SIM_DEMO,c=b.core;c.setScenario(scenario);c.requestPhone();c.resolvePhone('success',{phone:'13800000000'});c.setDate(c.today());b.persist();b.navigate('S02','SIM_BJ01');},{scenario:spec.scenario});await app.locator('#screen [data-action="choose"][data-value="'+UNIT_ID+'"]').waitFor({state:'visible',timeout:20000});await shot('s02-before-unit-selection');await app.locator('#screen [data-action="choose"][data-value="'+UNIT_ID+'"]').click();await o01().locator('#period').waitFor({state:'visible',timeout:20000});await snapshot('o01-ready');return app;}
 async function createPendingOrder(){const checkout=o01();await checkout.locator('#agreed').check();await checkout.locator('#pay').click();await checkout.locator('#scrim').waitFor({state:'visible',timeout:12000});const app=await indexFrame();const info=await app.evaluate(()=>{const s=window.SIM_DEMO.core.state(),o=s.orders[s.orders.length-1];return {order_id:o?.id||null,order_status:o?.status||null,quote_id:o?.quote_id||null,current_quote_id:s.quote?.id||null,gift_status:s.giftTerms?.[0]?.status||null,gift_order_id:s.giftTerms?.[0]?.order_id||null,gift_snapshot_count:o?.benefit_snapshot?.gift_terms?.length||0};});await snapshot('pending-order-created');return info;}
 async function stateAfter(action,orderId){const app=await indexFrame();return app.evaluate(({action,orderId})=>{const b=window.SIM_DEMO,c=b.core;let error=null;if(action==='cancel'){try{c.cancelOrder(orderId);}catch(e){error=e?.message||String(e);}}b.persist();const s=c.state(),o=s.orders.find(x=>x.id===orderId),g=s.giftTerms?.[0]||null;return {error,order_status:o?.status||null,quote_id:s.quote?.id||null,gift_status:g?.status||null,gift_order_id:g?.order_id||null,stock_status:o?.unit_ids?.map(id=>s.stock[id]||null)||[],order_gift_count:o?.benefit_snapshot?.gift_terms?.length||0,granted_count:(s.giftTerms||[]).filter(x=>x.status==='GRANTED').length};},{action,orderId});}
 async function reselectAndCreate(){const app=await indexFrame();await app.evaluate(()=>window.SIM_DEMO.navigate('S02','SIM_BJ01'));await app.locator('#screen [data-action="choose"][data-value="'+UNIT_ID+'"]').waitFor({state:'visible',timeout:15000});await app.locator('#screen [data-action="choose"][data-value="'+UNIT_ID+'"]').click();await o01().locator('#period').waitFor({state:'visible',timeout:15000});return createPendingOrder();}
 async function closeO01Sheet(){try{const c=o01().locator('#close-sheet');if(await c.isVisible())await c.click();}catch{}}
 async function runH(){
  const app=await seedGiftAndOpenStore(),checkout=o01();
  if(spec.action==='T26'){
   const initial=await checkout.locator('#gift-term-row').evaluate(el=>({hidden:el.hidden,display:getComputedStyle(el).display,text:el.textContent,label:el.querySelector('span')?.textContent?.trim()})).catch(()=>null);
   check('T26_INITIAL_GIFT_ROW_PRESENT',Boolean(initial),true,initial);
   if(initial)check('T26_INITIAL_GIFT_ROW_LABEL',initial.label==='赠送租期','赠送租期',initial.label);
   await checkout.locator('#period').click();await checkout.locator('[data-bridge="term"][data-value="3"]').click();await checkout.locator('#gift-term-row').waitFor({state:'attached',timeout:5000});
   const below=await checkout.locator('#gift-term-row').evaluate(el=>({hidden:el.hidden,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,text:el.textContent,label:el.querySelector('span')?.textContent?.trim()}));
   await shot('term-reduced-to-3-months');await snapshot('term-3-months');
   check('T26_GIFT_ROW_HIDDEN_BELOW_MIN',below.hidden&&below.display==='none',{hidden:true,display:'none'},{hidden:below.hidden,display:below.display});
   check('T26_GIFT_TEXT_NOT_VISIBLE_BELOW_MIN',below.display==='none'&&!below.text.includes('赠送1个月'),'no visible gift-term text',{display:below.display,text:below.text});
   check('T26_GIFT_ROW_LABEL_STAYS_GIFT',below.label==='赠送租期','赠送租期',below.label);
   await checkout.locator('#period').click();await checkout.locator('[data-bridge="term"][data-value="6"]').click();
   const restored=await checkout.locator('#gift-term-row').evaluate(el=>({hidden:el.hidden,display:getComputedStyle(el).display,text:el.textContent,label:el.querySelector('span')?.textContent?.trim()})).catch(()=>null);
   await shot('term-restored-to-6-months');await snapshot('term-6-months');
   check('T26_GIFT_ROW_RESTORES_AT_MIN',Boolean(restored)&&!restored.hidden&&restored.display!=='none','visible gift row',restored);
   if(restored)check('T26_GIFT_ROW_LABEL_RESTORED',restored.label==='赠送租期','赠送租期',restored.label);
   const created=await createPendingOrder();check('T26_ORDER_CREATED',created.order_status==='pending','pending',created.order_status);
   check('T26_GIFT_LOCKED_ONCE',created.gift_status==='LOCKED_TO_ORDER'&&created.gift_snapshot_count===1,{status:'LOCKED_TO_ORDER',snapshot_count:1},{status:created.gift_status,snapshot_count:created.gift_snapshot_count});
   await shot('order-created-with-gift');return;
  }
  const created=await createPendingOrder();
  check(spec.action+'_ORDER_CREATED',created.order_status==='pending','pending',created.order_status);
  check(spec.action+'_GIFT_LOCKED_TO_FIRST_ORDER',created.gift_status==='LOCKED_TO_ORDER'&&created.gift_snapshot_count===1,{status:'LOCKED_TO_ORDER',snapshot_count:1},{status:created.gift_status,snapshot_count:created.gift_snapshot_count});
  if(spec.action==='T27'){
   const after=await stateAfter('cancel',created.order_id);await snapshot('t27-after-controlled-terminal-transition');await shot('t27-after-controlled-terminal-transition');
   check('X01_T27_RELEASE_ERROR',after.error==='APPROVAL_METADATA_REQUIRED','APPROVAL_METADATA_REQUIRED captured',after.error);
   check('X01_T27_ORDER_TERMINATED',after.order_status==='cancelled','cancelled',after.order_status);
   check('X01_T27_QUOTE_INVALIDATED',after.quote_id===null,null,after.quote_id);
   check('X01_T27_GIFT_RELEASED',after.gift_status==='APPROVED','APPROVED',after.gift_status);
   check('X01_T27_OLD_ORDER_LINK_CLEARED',after.gift_order_id===null,null,after.gift_order_id);
   await closeO01Sheet();const next=await reselectAndCreate();
   check('T27_NEW_ORDER_CREATED',next.order_status==='pending','pending',next.order_status);
   check('T27_NEW_QUOTE_ID',Boolean(next.quote_id)&&next.quote_id!==created.quote_id,'new quote ID',next.quote_id);
   check('T27_GIFT_REATTACHED_TO_NEW_ORDER',next.gift_status==='LOCKED_TO_ORDER'&&next.gift_order_id!==created.order_id&&next.gift_snapshot_count===1,'gift locked to second order once',{status:next.gift_status,order_id:next.gift_order_id,snapshot_count:next.gift_snapshot_count});
   await shot('t27-new-order-after-requote');await snapshot('t27-new-order-after-requote');return;
  }
  if(spec.action==='T28'){
   await app.evaluate(({orderId})=>window.SIM_DEMO.openOrder(orderId),{orderId:created.order_id});await app.locator('#screen .mk-order-details').waitFor({state:'visible',timeout:10000});
   const text=await app.locator('#screen .mk-order-details').innerText(),buttons=await app.locator('#screen [data-action="cancelOrder"], #screen [data-action="confirmCancel"]').count();
   await shot('t28-ordinary-user-order-detail');
   check('X03_T28_ORDINARY_CANCEL_ENTRY',buttons>0||text.includes('取消待支付订单'),'ordinary-user cancel action available',{buttons,text});
   const after=await stateAfter('cancel',created.order_id);await snapshot('t28-after-controlled-cancel-diagnostic');
   check('X01_T28_RELEASE_ERROR',after.error==='APPROVAL_METADATA_REQUIRED','APPROVAL_METADATA_REQUIRED captured',after.error);
   check('X01_T28_ORDER_TERMINATED',after.order_status==='cancelled','cancelled',after.order_status);
   check('X01_T28_QUOTE_INVALIDATED',after.quote_id===null,null,after.quote_id);
   check('X01_T28_GIFT_RELEASED',after.gift_status==='APPROVED','APPROVED',after.gift_status);
   await shot('t28-after-controlled-cancel-diagnostic');const next=await reselectAndCreate();
   check('T28_NEW_ORDER_CREATED',next.order_status==='pending','pending',next.order_status);
   check('T28_GIFT_REATTACHED',next.gift_status==='LOCKED_TO_ORDER'&&next.gift_order_id!==created.order_id&&next.gift_snapshot_count===1,'gift attached to new order once',{status:next.gift_status,order_id:next.gift_order_id,snapshot_count:next.gift_snapshot_count});
   await shot('t28-reorder');await snapshot('t28-reorder');return;
  }
  if(spec.action==='T29'){
   await page.clock.fastForward(3*60*60*1000+2000);await waitReal(300);
   const after=await stateAfter('none',created.order_id);await snapshot('t29-after-native-expiry-sweep');await shot('t29-after-native-expiry-sweep');
   check('T29_ORDER_EXPIRED_BY_PAGE_SWEEP',after.order_status==='expired','expired',after.order_status);
   check('T29_INVENTORY_RELEASED',after.stock_status.length>0&&after.stock_status.every(x=>x==='available'),'all selected stock available',after.stock_status);
   check('X01_T29_QUOTE_INVALIDATED',after.quote_id===null,null,after.quote_id);
   check('X01_T29_GIFT_RELEASED',after.gift_status==='APPROVED','APPROVED',after.gift_status);
   check('X01_T29_OLD_ORDER_LINK_CLEARED',after.gift_order_id===null,null,after.gift_order_id);
   check('T29_NATIVE_EXCEPTION_CAPTURED',rec.page_errors.some(x=>x.includes('APPROVAL_METADATA_REQUIRED')),'APPROVAL_METADATA_REQUIRED in pageerror',rec.page_errors);
   await closeO01Sheet();const next=await reselectAndCreate();
   check('T29_NEW_ORDER_CREATED',next.order_status==='pending','pending',next.order_status);
   check('T29_GIFT_REATTACHED',next.gift_status==='LOCKED_TO_ORDER'&&next.gift_order_id!==created.order_id&&next.gift_snapshot_count===1,'gift attached to new order once',{status:next.gift_status,order_id:next.gift_order_id,snapshot_count:next.gift_snapshot_count});
   await shot('t29-reorder');await snapshot('t29-reorder');return;
  }
  if(spec.action==='T30'){
   await checkout.locator('[data-bridge="payResult"][data-value="failed"]').click();await waitReal(150);
   const after=await stateAfter('none',created.order_id);await snapshot('t30-after-payment-failure');await shot('t30-after-payment-failure');
   check('T30_FAILED_ORDER_STATUS',after.order_status==='payment_failed','payment_failed',after.order_status);
   check('T30_INVENTORY_RELEASED',after.stock_status.length>0&&after.stock_status.every(x=>x==='available'),'all selected stock available',after.stock_status);
   check('X01_T30_QUOTE_INVALIDATED',after.quote_id===null,null,after.quote_id);
   check('X01_T30_GIFT_RELEASED',after.gift_status==='APPROVED','APPROVED',after.gift_status);
   await closeO01Sheet();const next=await reselectAndCreate();check('T30_RETRY_ORDER_CREATED',next.order_status==='pending','pending',next.order_status);
   await o01().locator('[data-bridge="payResult"][data-value="success"]').click();await waitReal(150);
   const appAfter=await indexFrame(),paid=await appAfter.evaluate(()=>{const s=window.SIM_DEMO.core.state(),o=s.orders[s.orders.length-1];return {order_status:o?.status||null,gift_status:s.giftTerms?.[0]?.status||null,granted_count:(s.giftTerms||[]).filter(x=>x.status==='GRANTED').length,gift_order_id:s.giftTerms?.[0]?.order_id||null};});
   check('T30_RETRY_PAYMENT_SUCCEEDED',paid.order_status==='paid_simulated','paid_simulated',paid.order_status);
   check('T30_GIFT_GRANTED_EXACTLY_ONCE',paid.gift_status==='GRANTED'&&paid.granted_count===1,{status:'GRANTED',count:1},{status:paid.gift_status,count:paid.granted_count,order_id:paid.gift_order_id});
   await shot('t30-retry-payment-success');await snapshot('t30-retry-payment-success');
  }
 }
 async function runG1(){
  if(spec.action==='favorites'){
   await page.addInitScript(()=>sessionStorage.setItem('mk_visual_align_ui_v1',JSON.stringify({storeFavorites:['SIM_BJ01'],favorites:['SIM_BJ01_U04']})));
   const app=await openCentral('M01');await app.locator('#screen [data-action="m01View"][data-value="favorites"]').click();
   const current=await app.locator('#screen .m01-subcontent').innerText();
   const expectedFavorite=await app.evaluate(()=>{const f=window.SIM_DEMO.core.fixture;return {store:f.stores.find(s=>s.id==='SIM_BJ01')?.name||'',unit:f.units.find(u=>u.id==='SIM_BJ01_U04')?.demo_cabin_no||''};});
   check('G1_01_NORMAL_ENTRY',Boolean(expectedFavorite.store)&&current.includes(expectedFavorite.store),'M01 favorites shows the seeded store',{expectedFavorite,current});await shot('g1-01-m01-favorites');
   const before=await app.evaluate(()=>sessionStorage.getItem('mk_visual_align_ui_v1'));
   await app.goto(BASE+'/'+DEMO+'account.html?view=favorites');let old=await accountFrame();
   const oldText=await old.locator('#content').innerText(),linkCount=await old.locator('a[href*="page=S02&store=SIM_BJ01"]').count();
   check('G1_01_LEGACY_LINK',oldText.includes('收藏的门店与仓位')&&linkCount>0,'legacy favorites view resolves same saved store',{oldText,linkCount});
   const after=await old.evaluate(()=>sessionStorage.getItem('mk_visual_align_ui_v1'));
   check('G1_01_SHARED_DATA_SOURCE',before===after,'same mk_visual_align_ui_v1 data',after);await shot('g1-01-legacy-favorites');
   await old.locator('a[href*="page=S02&store=SIM_BJ01"]').first().click();const storeFrame=await indexFrame();
   check('G1_01_RETURN_TARGET',new URL(storeFrame.url()).searchParams.get('page')==='S02'&&new URL(storeFrame.url()).searchParams.get('store')===STORE_ID,'page=S02&store=SIM_BJ01',storeFrame.url());
   await shot('g1-01-store-return');
   const noPage=await storeFrame.evaluate(async()=>(await fetch('favorites.html')).status);
   check('G1_01_NO_INDEPENDENT_FAVORITES_PAGE',noPage===404,404,noPage);
   await page.goto(BASE+'/central-review-02g.html?catalog=sim&page=FAVORITES',{waitUntil:'domcontentloaded'});await page.locator('#central-error').waitFor({state:'visible',timeout:10000});
   check('G1_01_NO_FORMAL_FAVORITES_ROUTE',await page.locator('#central-host').count()===0,'central route rejects FAVORITES',await page.locator('#central-host').count());await shot('g1-01-formal-route-rejected');return;
  }
  if(spec.action==='coupons'){
   const app=await openCentral('M01');await app.evaluate(()=>{const b=window.SIM_DEMO,c=b.core;c.setScenario('promoCampaignGift');c.claimCoupons();b.persist();b.navigate('M01');});
   await app.locator('#screen [data-action="m01View"][data-value="coupons"]').click();const unified=await app.locator('#screen .m01-subcontent').innerText();
   check('G1_02_UNIFIED_VIEW_INCLUDES_GIFT',unified.includes('赠送1个月'),'gift term shown in unified view',unified);
   check('G1_02_UNIFIED_VIEW_INCLUDES_COUPONS',unified.includes('新客租仓券'),'coupon shown in unified view',unified);await shot('g1-02-unified-benefits');
   await app.goto(BASE+'/'+DEMO+'account.html?view=coupons');const old=await accountFrame(),oldText=await old.locator('#content').innerText();
   check('G1_02_LEGACY_COUPON_VIEW',oldText.includes('新客租仓券')&&!oldText.includes('赠送1个月')&&!oldText.includes('基础搬运权益'),'legacy view remains coupon-only',oldText);await shot('g1-02-legacy-coupons');
   const route=await page.evaluate(()=>{try{window.SIM_CENTRAL_CONTRACT_V1.route(window.SIM_FIXTURES,{page:'COUPONS'});return 'ACCEPTED';}catch(e){return e.message;}});
   check('G1_02_NO_FORMAL_COUPONS_ROUTE',route==='ROUTE_UNKNOWN','ROUTE_UNKNOWN',route);
   note('X-05: legacy coupon-only view and unified benefits view have different scopes; recorded as compatibility difference, not data loss.');await shot('g1-02-route-scope');return;
  }
  if(spec.action==='transport'){
   const app=await openCentral('M01');await app.goto(BASE+'/'+DEMO+'account.html?view=transport');let account=await accountFrame();
   const emptyText=await account.locator('#content').innerText();check('G1_03_EMPTY_STATE',emptyText.includes('暂无已付款订单'),'empty paid-order state',emptyText);await shot('g1-03-no-paid-order');
   await account.goto(BASE+'/'+DEMO+'index.html?page=M01');const index=await indexFrame();
   const orderId=await index.evaluate(()=>{const b=window.SIM_DEMO,c=b.core;c.setScenario('normal');c.requestPhone();c.resolvePhone('success',{phone:'13800000000'});c.setStore('SIM_BJ01');c.setDate(c.today());const u=c.matchingUnits('SIM_BJ01')[0];if(!u)throw Error('NO_PAID_ORDER_FIXTURE_UNIT');c.select([u.id]);c.quote();const o=c.submit();c.pay(o.id,'success');b.persist();return o.id;});
   await snapshot('g1-03-paid-order-fixture');await account.goto(BASE+'/'+DEMO+'account.html?view=transport');account=await accountFrame();
   const text=await account.locator('#content').innerText(),link=account.locator('a[href*="view=transport&id="]').first();
   check('G1_03_REQUIRES_PAID_ORDER_SELECTION',text.includes('选择关联订单')&&await link.count()>0,'select a paid order before transport form',text);await shot('g1-03-select-paid-order');
   await link.click();account=await accountFrame();await account.locator('#transport-address').fill('北京市朝阳区安贞西里 3 区 12 号楼');
   const tomorrow=await account.evaluate(()=>{const d=new Date(Date.now()+8*60*60*1000);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);});
   await account.locator('#transport-date').fill(tomorrow);await account.locator('button[data-act="transport"]').click();
   const stored=await account.evaluate(({orderId})=>{const s=JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}');return s.services?.[orderId]?.transport?.at(-1)||null;},{orderId});
   check('G1_03_TRANSPORT_SAVED',Boolean(stored)&&stored.status==='awaiting_advisor',{status:'awaiting_advisor'},stored);await shot('g1-03-transport-saved');
   notInScope('G1_03B_FORMAL_ROUTE','运输需求依附已付款订单 account 子视图，不是16项正式中央路由；不计入正式路由 PASS。');
   await page.goto(BASE+'/central-review-02g.html?catalog=sim&page=TRANSPORT',{waitUntil:'domcontentloaded'});await page.locator('#central-error').waitFor({state:'visible',timeout:10000});
   check('G1_03_NO_STANDALONE_TRANSPORT_ROUTE',await page.locator('#central-host').count()===0,'standalone route rejected',await page.locator('#central-host').count());return;
  }
  if(spec.action==='phone'){
   await page.goto(BASE+'/central-review-02g.html?catalog=sim&page=O01',{waitUntil:'domcontentloaded'});await page.locator('#central-error').waitFor({state:'visible',timeout:10000});
   const cold=await page.locator('#central-error').innerText();
   check('G1_04_COLD_O01_ROUTE_GUARD',cold.includes('请先选择仓位')&&await page.locator('#central-host').count()===0,'cold O01 blocked by route guard',cold);
   const oldNodes=await page.locator('.mk-auth-overlay, .mk-auth-sheet, .phone-auth-layer, #phone-auth-layer').count();
   check('G1_04_NO_CENTRAL_OLD_PHONE_LAYER',oldNodes===0,0,oldNodes);await shot('g1-04-cold-o01-blocked');
   const app=await openCentral('S01'),unitId=await app.evaluate(()=>{const b=window.SIM_DEMO,c=b.core;c.setScenario('normal');c.setDate(c.today());b.persist();return c.matchingUnits('SIM_BJ01')[0]?.id||null;});
   await app.evaluate(()=>window.SIM_DEMO.navigate('S02','SIM_BJ01'));
   await app.locator('#screen [data-action="choose"][data-value="'+unitId+'"]').click();
   await app.locator('.mk-auth-overlay .mk-auth-sheet').waitFor({state:'visible',timeout:10000});
   const appNodes=await app.locator('.mk-auth-overlay .mk-auth-sheet').count(),centralNodes=await page.locator('.mk-auth-overlay .mk-auth-sheet').count();
   check('G1_04_SINGLE_APP_AUTH_COMPONENT',appNodes===1,1,appNodes);check('G1_04_NO_DUPLICATE_CENTRAL_AUTH',centralNodes===0,0,centralNodes);await shot('g1-04-app-auth-sheet');return;
  }
  if(spec.action==='region'||spec.action==='capacity'){
   await page.addInitScript(({value})=>sessionStorage.setItem('mk_s01_r2_filters_v1',JSON.stringify(value)),{
    value:spec.action==='region'?{region:'朝阳区',capacity:'all',maxKm:null,services:[],quick:[],visibleLimit:10}:{region:'all',capacity:'5-10',maxKm:null,services:[],quick:[],visibleLimit:10}
   });
   const app=await openCentral('S01'),filters=await app.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_s01_r2_filters_v1')||'{}')),key=spec.action;
   const n=spec.action==='region'?'5':'6';
   check('G1_0'+n+'_PERSISTED_FILTER_RESET',filters[key]==='all',key+'=all',filters[key]);
   const s01=page.frameLocator('#central-host').frameLocator('#s01-r2-frame');await s01.locator('body').waitFor({state:'visible',timeout:15000});
   const controls=await s01.locator('body').evaluate(body=>({actionValues:[...body.querySelectorAll('[data-action]')].map(x=>x.getAttribute('data-action')),storeCount:body.querySelectorAll('[data-store-id], .store-card').length}));
   const forbidden=controls.actionValues.filter(x=>/region|capacity/i.test(x||''));
   check('G1_0'+n+'_NO_FILTER_TRIGGER',forbidden.length===0,'no region/capacity trigger',forbidden);
   check('G1_0'+n+'_LIST_REMAINS_RENDERED',controls.storeCount>0,'unfiltered store list remains visible',controls.storeCount);await shot('g1-'+spec.id.toLowerCase()+'-s01');
   const oldRoute=await page.evaluate(({routeName})=>{try{window.SIM_CENTRAL_CONTRACT_V1.route(window.SIM_FIXTURES,{page:routeName});return 'ACCEPTED';}catch(e){return e.message;}},{routeName:spec.action==='region'?'S01R2REGION':'S01R2CAPACITY'});
   check('G1_0'+n+'_OLD_ROUTE_REJECTED',oldRoute==='ROUTE_UNKNOWN','ROUTE_UNKNOWN',oldRoute);
   note('PASS means retired filter state is reset and no trigger remains; it does not mean the filter feature is implemented.');return;
  }
  if(spec.action==='result'){
   await page.goto(BASE+'/central-review-02g.html?catalog=sim&page=RESULT',{waitUntil:'domcontentloaded'});await page.locator('#central-error').waitFor({state:'visible',timeout:10000});
   check('G1_07_CENTRAL_RESULT_ROUTE_REJECTED',await page.locator('#central-host').count()===0,'central RESULT rejected',await page.locator('#central-host').count());
   const stats=await page.evaluate(()=>{const routes=['H01','CAP','ITEMS','S01','S02','S5','BOOKING','QUICK','O01','M01','O03','OH01','RN01','EX01','DP01','IV01'],c=window.SIM_CENTRAL_CONTRACT_V1,f=window.SIM_FIXTURES;const accepted=routes.filter(page=>{try{c.route(f,{page,hasEligibleOrderContext:page==='O01'});return true;}catch{return false;}});let result='ACCEPTED';try{c.route(f,{page:'RESULT'});}catch(e){result=e.message;}return {formal_count:accepted.length,accepted,result};});
   check('G1_07_FORMAL_ROUTE_COUNT_16',stats.formal_count===16,16,stats.formal_count);check('G1_07_RESULT_ROUTE_UNKNOWN',stats.result==='ROUTE_UNKNOWN','ROUTE_UNKNOWN',stats.result);await shot('g1-07-central-route-rejected');
   await page.goto(BASE+'/'+DEMO+'index.html?page=RESULT',{waitUntil:'domcontentloaded'});await page.locator('#screen').waitFor({state:'visible',timeout:15000});
   const text=await page.locator('#screen').innerText(),pay=await page.locator('#screen [data-action*="pay"], #screen button[id*="pay"]').count();
   check('G1_07_LEGACY_EMPTY_RESULT_RENDERED',text.includes('处理结果')&&text.includes('暂无可查看的提交记录'),'empty legacy result page',text);
   check('G1_07_NO_PAYMENT_ACTION',pay===0,0,pay);await shot('g1-07-legacy-result');
   await page.locator('#screen [data-action="go"][data-value="S01"]').click();await page.waitForFunction(()=>new URL(location.href).searchParams.get('page')==='S01');
   check('G1_07_RETURN_TO_STORE',new URL(page.url()).searchParams.get('page')==='S01','page=S01',page.url());await shot('g1-07-return-to-store');return;
  }
 }
 try{mkdirs();if(spec.group==='H')await runH();else await runG1();}
 catch(error){rec.execution_error=String(error?.stack||error);if(rec.status!=='FAIL')rec.status='BLOCKED';}
 finally{
  rec.finished_at=new Date().toISOString();rec.page_errors=[...new Set(rec.page_errors)];rec.console_errors=[...new Set(rec.console_errors)];
  const trace=safeName(spec.id)+'-'+vn+'.zip';
  try{await context.tracing.stop({path:path.join(OUT,'traces',trace)});rec.trace_path='traces/'+trace;}
  catch(e){rec.trace_error=String(e);if(rec.status==='PASS')rec.status='BLOCKED';}
  fs.writeFileSync(path.join(OUT,'logs',safeName(spec.id)+'-'+vn+'.json'),JSON.stringify(rec,null,2));
  await context.close();
 }
 return rec;
}
function reports(results,baseline){
 const counts={PASS:0,FAIL:0,BLOCKED:0};for(const r of results)counts[r.status]=(counts[r.status]||0)+1;
 const summary={suite:'01C-RETEST-02',baseline_sha:baseline,branch:process.env.GITHUB_REF_NAME||'local',generated_at:new Date().toISOString(),expected_runs:34,actual_runs:results.length,logical_cases:CASES.length,viewports:VIEWPORTS.map(x=>x.width),counts,cases:results.map(r=>({case_id:r.case_id,group:r.group,viewport:r.viewport,status:r.status,failed_assertions:r.assertions.filter(x=>x.status==='FAIL').map(x=>x.name),trace_path:r.trace_path,screenshots:r.screenshots}))};
 fs.writeFileSync(path.join(OUT,'results','RETEST_SUMMARY.json'),JSON.stringify(summary,null,2));
 const heads=['case_id','group','scenario','viewport','status','failed_assertions','trace_path','screenshots','started_at','finished_at'];
 fs.writeFileSync(path.join(OUT,'results','RETEST_RUNS.csv'),[heads.join(',')].concat(results.map(r=>heads.map(k=>cell(k==='failed_assertions'?r.assertions.filter(x=>x.status==='FAIL').map(x=>x.name):k==='screenshots'?r.screenshots:r[k])).join(','))).join('\n'));
 const sections=results.map(r=>{const fails=r.assertions.filter(x=>x.status==='FAIL'),assertions=r.assertions.map(a=>'<tr><td>'+esc(a.status)+'</td><td>'+esc(a.name)+'</td><td>'+esc(JSON.stringify(a.expected))+'</td><td>'+esc(JSON.stringify(a.actual))+'</td></tr>').join(''),shots=r.screenshots.map(x=>'<a href="'+esc(x)+'">'+esc(path.basename(x))+'</a>').join(' · '),trace=r.trace_path?'<a href="'+esc(r.trace_path)+'">Playwright Trace</a>':'无';return '<section class="case"><h2>'+esc(r.case_id)+' · '+esc(r.viewport)+'px · <b class="'+esc(r.status.toLowerCase())+'">'+esc(r.status)+'</b></h2><p>场景：'+esc(r.scenario||'不适用')+'；失败断言：'+fails.length+'；'+trace+'</p><p>'+shots+'</p>'+(r.execution_error?'<pre>'+esc(r.execution_error)+'</pre>':'')+'<table><thead><tr><th>结果</th><th>断言</th><th>预期</th><th>实际</th></tr></thead><tbody>'+assertions+'</tbody></table></section>';}).join('');
 const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>01C RETEST 02</title><style>body{font:14px/1.65 system-ui,sans-serif;margin:24px;color:#20312b}h1{font-size:24px}h2{font-size:18px;margin:0}.summary{display:flex;gap:18px;flex-wrap:wrap;margin:16px 0}.summary b{font-size:22px}.case{border-top:1px solid #dfe7e2;padding:18px 0}.pass{color:#16764f}.fail{color:#b42318}.blocked{color:#9a6700}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #e3e9e5;padding:6px;text-align:left;vertical-align:top}pre{white-space:pre-wrap;background:#f5f7f6;padding:10px}a{color:#087d59}</style><body><h1>01C-RETEST-02｜正式回归测试报告</h1><p>基线 SHA：'+esc(baseline)+'</p><div class="summary"><span>运行数 <b>'+summary.actual_runs+'</b></span><span>PASS <b class="pass">'+counts.PASS+'</b></span><span>FAIL <b class="fail">'+counts.FAIL+'</b></span><span>BLOCKED <b class="blocked">'+counts.BLOCKED+'</b></span></div><p>只记录当前基线行为；失败项不自动修复，不代表部署或上线准入。</p>'+sections+'</body></html>';
 fs.writeFileSync(path.join(OUT,'01C_RETEST_02_REPORT.html'),html);return summary;
}
(async()=>{
 mkdirs();const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(PORT,'127.0.0.1',resolve);});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),results=[],baseline=process.env.RETEST_BASELINE_SHA||'f2fccf9301a54f00be9ab089a6426fae8f848242';
 try{for(const spec of CASES)for(const viewport of VIEWPORTS){process.stdout.write('START '+spec.id+' @'+viewport.width+'\n');const r=await runOne(browser,spec,viewport);results.push(r);const failed=r.assertions.filter(x=>x.status==='FAIL').map(x=>({name:x.name,expected:x.expected,actual:x.actual}));process.stdout.write('DONE '+spec.id+' @'+viewport.width+' '+r.status+' failures='+failed.length+(failed.length?' detail='+JSON.stringify(failed).slice(0,1800):'')+(r.execution_error?' execution_error='+JSON.stringify(r.execution_error).slice(0,1200):'')+'\n');}}
 finally{await browser.close();await new Promise(r=>server.close(r));}
 const summary=reports(results,baseline);process.stdout.write('01C-RETEST-02 SUMMARY '+JSON.stringify(summary.counts)+' runs='+summary.actual_runs+'\n');
 if(summary.actual_runs!==34||summary.counts.BLOCKED>0||summary.counts.FAIL>0)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
