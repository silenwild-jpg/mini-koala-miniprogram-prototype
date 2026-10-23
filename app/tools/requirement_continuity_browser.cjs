const fs=require('fs'),path=require('path'),assert=require('assert/strict'),S=require('./vis_bg01_support.cjs');
const args=Object.fromEntries(process.argv.slice(2).reduce((r,v,i,a)=>v.startsWith('--')?[...r,[v.slice(2),a[i+1]]]:r,[]));
const root=path.resolve(args.root),out=path.resolve(args.out),results=[];let rt,p,context,logs;
const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_requirement_current')||'{}'));
async function go(file){await p.goto(new URL(file,rt.base).href);await S.settle(p)}
async function click(sel){await p.locator(sel).first().click();await S.settle(p)}
async function snap(name){await p.screenshot({path:path.join(out,name+'.png')});return {url:p.url(),requirement:await read()}}
async function check(name,fn){try{const details=await fn();results.push({name,status:'PASS',details})}catch(e){results.push({name,status:'FAIL',error:String(e),url:p.url(),requirement:await read()});await snap('failure-'+results.length)}console.log(results.at(-1).status+' '+name);if(results.at(-1).status==='FAIL')console.log(results.at(-1).error);fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(results,null,2))}
(async()=>{rt=await S.start(root,out);try{
 ({page:p,context,logs}=await rt.page(390,844));p.setDefaultTimeout(30000);
 await go(S.files.hub);await click('#resetAll');await go(S.files.home+'?loc=precise&searchOriginKey=guomao');
 await click('#estimateBtn');await click('#s2 .scene[data-id="moving"]');await click('#s3 .amount-card');await p.locator('#s5').waitFor({state:'visible'});await click('#termChips [data-term-quick="6"]');
 const estimate=await snap('01-first-estimate');
 await check('S5 completion immediately persists demand',async()=>{const r=await read();assert(r.target_volume>0);assert.equal(r.term_months,6);assert.equal(r.scene,'moving');return r});
 // Use the real recommendation to persist in the old baseline as well, then return home.
 await click('#r113PlanCards .rplan');await p.waitForURL(u=>u.pathname.includes('unit_detail_u01')||u.pathname.includes('store_detail_s02'));
 const seeded=await read();assert(seeded.target_volume>0);await snap('02-recommended-selection');
 await go(S.files.home);
 await click('#storeLink');await check('H01 nearby-store entry inherits demand',async()=>{const q=new URL(p.url()).searchParams;assert.equal(q.get('state'),'estimated');assert.equal(Number(q.get('target')),Number(seeded.target_volume.toFixed(1)));assert.equal(q.get('term'),'6');return await snap('03-nearby-inherited')});
 await click('#tabFind');await check('S01 bottom Find resumes S5 without recollecting',async()=>{assert(await p.locator('#s5').isVisible());assert.equal((await read()).scene,'moving');return await snap('04-bottom-find')});
 await go(S.files.home);await click('#estimateBtn');await check('H01 estimator entry resumes the last confirmed demand',async()=>{assert(await p.locator('#s5').isVisible());assert.equal((await read()).term_months,6);return await snap('05-home-resume')});
 if(args.phase!=='baseline')await extended();
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({root,browser:rt.browser.version(),viewport:[390,844],results,logs,estimate,source:'real HTTP navigation and UI actions; no storage injection'},null,2));
 console.log(JSON.stringify({pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length}));
}finally{if(context)await context.close();if(rt)await rt.stop()}})().catch(e=>{console.error(e);process.exitCode=1});
async function extended(){
 const original=await read();
 await check('a stale new-user homepage URL still retains confirmed demand',async()=>{await go(S.files.home+'?state=new&loc=precise');assert.notEqual(new URL(p.url()).searchParams.get('state'),'new');await click('#estimateBtn');assert(await p.locator('#s5').isVisible());assert.equal((await read()).target_volume,original.target_volume);return await read()});
 await check('S5 resume retains item constraints, range and identity',async()=>{const r=await read();assert.equal(r.customer_type,'personal');assert.equal(r.scene,'moving');assert(r.item_constraints.length>0);assert(r.min_volume>0&&r.max_volume>r.min_volume);return r});
 await go(S.files.home);await click('#storeLink');
 await check('S01 to S02 to U01 inherits the same requirement',async()=>{
  await click('#storeList .store[data-id]');assert(p.url().includes('store_detail_s02'));const st=new URL(p.url()).searchParams;assert.equal(st.get('term'),'6');assert.equal(st.get('fromS01State'),'estimated');
  await click('#unitList .unit-card:not([data-soldout="1"]):not([data-under-min="1"])');assert(p.url().includes('unit_detail_u01'));
  const q=new URL(p.url()).searchParams;assert.equal(q.get('term'),'6');assert.equal(Number(q.get('target')),Number(original.target_volume.toFixed(1)));assert.equal((await read()).scene,'moving');return await snap('06-unit-inherited');
 });
 await check('U01 changing term persists and both parent pages inherit it',async()=>{
  await click('#termDetails summary');await click('[data-quick="3"]');assert.equal((await read()).term_months,3);await click('#back');assert.equal(new URL(p.url()).searchParams.get('term'),'3');
  await click('#backBtn');assert(p.url().includes('store_list_s01'));assert.equal(new URL(p.url()).searchParams.get('term'),'3');return await snap('07-parent-term-updated');
 });
 await check('S01 confirmed capacity edit survives S5 return',async()=>{
  const before=await read();await click('#editDemand');await click('#sizePlus');await click('#applyRequirement');const edited=await read();assert(edited.target_volume>before.target_volume);
  await click('#tabFind');assert(await p.locator('#s5').isVisible());const r=await read();assert.equal(r.target_volume,edited.target_volume);assert.equal(r.term_months,3);assert.equal(r.min_volume,edited.min_volume);assert.equal(r.max_volume,edited.max_volume);assert.equal(r.scene,'moving');assert.deepEqual(r.item_constraints,edited.item_constraints);assert((await p.locator('#usageRange').innerText()).includes(Number(r.max_volume.toFixed(1))+'m³'));return await snap('08-edited-demand-resumed');
 });
 await check('S02 confirmed demand edit replaces stale S5 snapshot',async()=>{
  await go(S.files.home);await click('#storeLink');await click('#storeList .store[data-id]');await click('#editDemand');await click('#sizePlus');await click('#applyRequirement');const edited=await read();
  await go(S.files.est+'?entry=resume_usage');assert(await p.locator('#s5').isVisible());const r=await read();assert.equal(r.target_volume,edited.target_volume);assert.equal(r.min_volume,edited.min_volume);assert.equal(r.max_volume,edited.max_volume);assert.equal(r.term_months,3);return await snap('09-store-edit-resumed');
 });
 await check('list sort, filters, loaded count and scroll survive U01 return',async()=>{
  await go(S.files.est+'?entry=resume_usage');await p.locator('#usageCapacityInput').fill('2.3');await p.locator('#usageCapacityInput').press('Tab');await S.settle(p);
  await go(S.files.s01+'?sort=distance&distance=any&services=&loaded=16&scroll=160');await click('#storeList .store[data-id="MK_BJ_2CDB7BEE"]');
  const before=new URL(p.url()).searchParams;const keys=['sort','distance','services','loaded','scroll'];const expected=Object.fromEntries(keys.map(k=>[k,before.get(k)]));
  await click('#unitList .unit-card:not([data-soldout="1"]):not([data-under-min="1"])');await click('#back');await click('#backBtn');
  const q=new URL(p.url()).searchParams;for(const k of keys)assert.equal(q.get(k),expected[k],k);return {expected,...await snap('10-list-context-return')};
 });
 await check('location and travel changes inherit across both tab entries',async()=>{
  await go(S.files.s01);await click('#travelBtn');await click('#travelSheet [data-travel="bike"]');await click('#locationBar');await click('#locationSheet [data-location="wangjing"]');
  const r=await read();assert.equal(r.travel_mode,'bike');assert.equal(r.search_origin_key,'wangjing');await click('#tabHome');await click('#storeLink');
  const q=new URL(p.url()).searchParams;assert.equal(q.get('travel'),'bike');assert.equal(q.get('searchOriginKey'),'wangjing');await click('#tabFind');const after=await read();assert.equal(after.travel_mode,'bike');assert.equal(after.search_origin_key,'wangjing');return await snap('11-location-travel');
 });
 await check('brand and mine side routes do not erase demand',async()=>{
  const before=await read();await go(S.files.home);await click('#brandTrustLink');await p.goBack();await S.settle(p);await click('#navMine');
  const after=await read();for(const k of ['target_volume','term_months','scene','customer_type','travel_mode','search_origin_key'])assert.equal(after[k],before[k],k);return after;
 });
 await check('clearing the chosen term remains unselected after navigation',async()=>{
  await go(S.files.est+'?entry=resume_usage');await click('#termChips .other-term-toggle');await p.locator('#termChips .other-term-input').fill('');await p.locator('#termChips .other-term-input').press('Tab');await S.settle(p);
  assert.equal(Number((await read()).term_months),0);await go(S.files.home);await click('#estimateBtn');assert(await p.locator('#s5').isVisible());assert.equal(Number((await read()).term_months),0);assert.equal(await p.locator('#usageStoreListBtn').isVisible(),false);return await snap('12-term-unselected');
 });
 await check('explicit known-size entry prefills capacity and permits deliberate replacement',async()=>{
  const prior=await read();await go(S.files.est+'?entry=known');assert(await p.locator('#s7').isVisible());assert.equal(Number(await p.locator('#knownInput').inputValue()),prior.target_volume);
  await p.locator('#knownInput').fill('5');await click('#knownTermChips [data-term-quick="6"]');
  await click('#knownCustomerChips [data-id="personal"]');await click('#knownModeList [data-id="atleast"]');await click('#knownNextBtn');
  const r=await read();assert.equal(r.target_volume,5);assert.equal(r.size_mode,'atleast');assert.equal(r.min_volume,5);assert.equal(Number(r.max_volume),0);return r;
 });
 await check('known-size lower-bound meaning survives bottom Find and S5',async()=>{
  await click('#tabFind');const r=await read();assert.equal(r.size_mode,'atleast');assert.equal(r.min_volume,5);assert.equal(Number(r.max_volume),0);assert((await p.locator('#usageRange').innerText()).includes('至少'));return await snap('13-known-bound-resume');
 });
 await check('explicit reset clears demand and a new visitor receives browse mode',async()=>{
  await go(S.files.hub);await click('#resetAll');assert(!Number((await read()).target_volume));await go(S.files.home+'?loc=precise');await click('#storeLink');assert.equal(new URL(p.url()).searchParams.get('state'),'browse');return await snap('14-reset-new-visitor');
 });
 await check('unfinished estimator draft restores without becoming confirmed demand',async()=>{
  await go(S.files.home+'?loc=precise');await click('#estimateBtn');await click('#s2 .scene[data-id="moving"]');await go(S.files.home+'?loc=precise');await click('#estimateBtn');
  assert(await p.locator('#s3').isVisible());assert(!Number((await read()).target_volume));return await snap('15-draft-restored');
 });
 await check('quote keeps its frozen demand after browsing changes the current estimate',async()=>{
  await go(S.files.hub);await click('#resetAll');await go(S.files.home+'?loc=precise');await click('#estimateBtn');await click('#s2 .scene[data-id="moving"]');await click('#s3 .amount-card');await p.locator('#s5').waitFor({state:'visible'});await click('#termChips [data-term-quick="6"]');
  await click('#r113PlanCards .rplan');await click('#saveQuote');await click('#save');await p.waitForURL(u=>u.pathname.includes('home_H01'));
  const quote=await p.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_quote_current')));assert(quote.requirement_snapshot);const oldTarget=quote.requirement_snapshot.target_volume;
  await click('#estimateBtn');await click('#capacityPlus');assert((await read()).target_volume>oldTarget);await go(S.files.home);await click('#homeViewQuote');
  const still=await p.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_quote_current')));assert.equal(still.requirement_snapshot.target_volume,oldTarget);assert.equal(new URL(p.url()).searchParams.get('term'),'6');return await snap('16-frozen-quote');
 });
 await check('quote to order to local payment retains confirmed demand and amounts',async()=>{
  const quote=await p.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_quote_current')));await click('#edit');assert(p.url().includes('order_o01'));
  await p.locator('#agreeContract').check();await click('#pay');if(await p.locator('#phoneAuthAllow').isVisible().catch(()=>false))await click('#phoneAuthAllow');await p.waitForURL(u=>u.pathname.includes('order_o02'));
  const order=await p.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_order_current')));assert.equal(order.term_months,quote.term_months);assert.equal(order.requirement_snapshot.target_volume,quote.requirement_snapshot.target_volume);assert.equal(order.total_price,quote.total_price);assert.equal(order.management_fee,quote.management_fee);assert.equal(order.status,'PAID');
  await click('#secondaryBtn');assert(p.url().includes('order_o03'));return {order,...await snap('17-confirmed-order')};
 });
 await check('enterprise form prefills confirmed capacity and duration',async()=>{
  const before=await read();await go(S.files.home);await click('#bizAdvisor');assert.equal(Number(await p.locator('#sizeInput').inputValue()),before.target_volume);assert.equal(Number(await p.locator('#termInput').inputValue()),before.term_months);
  await p.locator('#company').fill('演示物资组');await p.locator('#notes').fill('需求继承测试');await click('#browse');assert(await p.locator('#s5').isVisible());const r=await read();assert.equal(r.customer_type,'enterprise');assert.equal(r.target_volume,before.target_volume);assert.equal(r.term_months,before.term_months);assert.equal(r.company,'演示物资组');return await snap('18-enterprise-inherited');
 });
 await check('enterprise demand survives list and recommendation browsing',async()=>{
  const before=await read();await go(S.files.home);await click('#storeLink');assert.equal(new URL(p.url()).searchParams.get('customer'),'enterprise');await click('#tabFind');const r=await read();assert.equal(r.company,before.company);assert.equal(r.notes,before.notes);assert.equal(r.customer_type,'enterprise');return r;
 });
 await check('explicit AI demo result changes capacity but inherits duration and location',async()=>{
  const before=await read();await go('mini_storage_ai_result_ai02_v1_demo_patch.html');await click('#stores');const r=await read();assert.equal(r.target_volume,2.5);assert.equal(r.term_months,before.term_months);assert.equal(r.travel_mode,before.travel_mode);assert.equal(r.customer_type,before.customer_type);return await snap('19-ai-result-inherited');
 });
 await check('viewing appointment side branch preserves the current requirement',async()=>{
  await click('#tabFind');await click('#r113PlanCards .rplan');const before=await read();assert(p.url().includes('unit_detail_u01'));await click('#advisorBtn');await click('#helpViewing');assert(p.url().includes('viewing_v01'));await click('#confirm');assert(p.url().includes('viewing_v02'));
  const r=await read();for(const k of ['target_volume','term_months','customer_type','scene','search_origin_key'])assert.equal(r[k],before[k],k);return await snap('20-viewing-branch');
 });
 await check('browser Back restores the latest duration on the preceding S5 page',async()=>{
  await go(S.files.est+'?entry=resume_usage');await click('#r113PlanCards .rplan');await click('#termDetails summary');await click('[data-quick="3"]');await p.goBack();await S.settle(p);assert(await p.locator('#s5').isVisible());assert.equal((await read()).term_months,3);assert.equal(await p.locator('#termChips [data-term-quick="3"]').getAttribute('class'),'term-choice active');return await snap('21-browser-back-latest');
 });
}
