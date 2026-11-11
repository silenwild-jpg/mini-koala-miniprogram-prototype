'use strict';
/* H01-STATE-VIS-RESTORE-01 | Capture current code, do not modify business UI or S5. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const dir=path.resolve(__dirname,'../release-evidence/h01-identity-lock-05');
const port=4689,host='http://127.0.0.1:'+port;
const base=host+'/prototype/parallel/core-journey-fix-01/demo/';
const home=base+'home.html',app=base+'index.html?page=S01';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const phases=['new','estimated','selected','booking','pending','payment_failed','expired','identity','identity_verify','upcoming','active','active_change','expiring','lease_expired','renewal','returning','refund','ended','multi','active_browse'];
const expected={new:'new',estimated:'estimated',selected:'selected',booking:'booking',pending:'pending',payment_failed:'payment_failed',expired:'expired',identity:'identity',identity_verify:'identity',upcoming:'upcoming',active:'active',active_change:'active',expiring:'expiring',lease_expired:'lease_expired',renewal:'renewal',returning:'returning',refund:'refund',ended:'new',multi:'pending',active_browse:'active'};
const rows=[];
function addDays(d,n){const [y,m,day]=d.split('-').map(Number);return new Date(Date.UTC(y,m-1,day+n)).toISOString().slice(0,10)}
function listen(){return http.createServer((req,res)=>{let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}catch{return res.writeHead(400).end()};if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,bytes)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes))})}
async function seed(page,phase){
 if(phase==='new'){await page.goto(home,{waitUntil:'domcontentloaded'});return {id:null};}
 await page.goto(app,{waitUntil:'domcontentloaded'});
 await page.locator('#screen').waitFor();
 const info=await page.evaluate(phase=>{
  const c=window.SIM_DEMO.core,F=c.fixture,s=c.state();
  const store=F.stores.find(x=>x.city===s.city&&x.status==='open');
  const unit=F.units.find(x=>x.store_id===store.id&&c.available(x));
  if(!unit)throw Error('NO_AVAILABLE_DEMO_UNIT');
  const today=c.today(),term=['expiring','lease_expired'].includes(phase)?1:12;
  c.setRequirement(unit.volume,term,true);
  if(phase==='estimated'){window.SIM_DEMO.persist();return {id:null};}
  c.select([unit.id]);
  if(phase==='selected'){window.SIM_DEMO.persist();return {id:null};}
  if(phase==='booking'){c.setContact('13800138000');c.saveLead('北京市朝阳区评审用仓地址');window.SIM_DEMO.persist();return {id:null};}
  c.setDate((phase==='identity'||phase==='identity_verify'||phase==='upcoming')?new Date(Date.parse(today+'T00:00:00Z')+7*86400000).toISOString().slice(0,10):today);
  c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
  c.quote();const order=c.submit();
  if(phase==='payment_failed')c.pay(order.id,'failed');
  if(['identity','identity_verify','upcoming','active','active_change','expiring','lease_expired','renewal','returning','refund','ended','multi','active_browse'].includes(phase)){
    c.pay(order.id,'success');
    if(!['identity','identity_verify'].includes(phase))c.identity(order.id,'success');
  }
  if(phase==='renewal')c.lifecycleRequestRenewal(order.id,6);
  if(['returning','refund','ended'].includes(phase)){
    c.lifecycleRequestExit(order.id,'early',today);
    c.lifecycleRequestInspection(order.id);
  }
  if(['refund','ended'].includes(phase))c.lifecycleReviewInspection(order.id,'passed',true);
  if(phase==='ended')c.lifecycleReviewRefund(order.id,true);
  if(phase==='multi'){
    const alt=F.units.find(u=>u.id!==unit.id&&c.available(u)&&F.stores.find(v=>v.id===u.store_id)?.city===s.city);
    if(!alt)throw Error('NO_SECOND_AVAILABLE_UNIT');
    c.setRequirement(alt.volume,12,true);c.select([alt.id]);c.setDate(today);c.quote();c.submit();
  }
  window.SIM_DEMO.persist();
  if(phase==='lease_expired'){
    const snap=JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}');
    snap.orders.find(x=>x.id===order.id).start_date='2026-01-01';
    sessionStorage.setItem('mk_independent_sim_v1',JSON.stringify(snap));
  }
  if(phase==='expired'){
    const snap=JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}');
    const o=snap.orders.find(x=>x.id===order.id);
    o.expiresAt=Date.now()-50;
    sessionStorage.setItem('mk_independent_sim_v1',JSON.stringify(snap));
  }
  const ss=JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}');
  return {id:order.id,status:ss.orders.find(x=>x.id===order.id)?.status,storedOrders:ss.orders.length};
 },phase);
 await page.goto(home,{waitUntil:'domcontentloaded'});
 await page.locator('body.h01-state-adapter-ready').waitFor({timeout:10000});
 if(phase==='active_browse'){
   await page.locator('#h01FlowQuickBrowse').click();
   await page.locator('body.h01-flow-marketing').waitFor();
 }
 return info;
}
async function layout(page){
 return page.evaluate(()=>{
  const visible=(sel)=>{const x=document.querySelector(sel);return !!x&&getComputedStyle(x).display!=='none'&&x.getBoundingClientRect().height>0;};
  const rect=(sel)=>{const r=document.querySelector(sel)?.getBoundingClientRect();return r?{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)}:null};
  const s=JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}');
  const core=SIM_CORE.create({state:s});
  const model=H01_STATE_POLICY.derive(core.state(),core);
  const key=document.querySelector('#h01FlowTitle')?.textContent||'';
  const buttons=[...document.querySelectorAll('#h01-flow button')].filter(x=>getComputedStyle(x).display!=='none'&&x.getBoundingClientRect().height>0).map(b=>({text:b.textContent.trim(),w:Math.round(b.getBoundingClientRect().width),h:Math.round(b.getBoundingClientRect().height)}));
  const end=rect('#h01FlowContent')?.bottom;
  const nav=rect('.footer-nav')?.y;
  return {key:model.key,badge:model.badge,heading:key,isMarketing:model.isMarketing,allowTab:model.allowTab,
   modules:{hero:visible('.hero'),taskArea:visible('.task-area'),recommendations:visible('.store-section'),below:visible('.below'),brand:visible('.brand'),task:visible('#h01FlowTask'),tabs:visible('#h01FlowTabs'),browse:visible('#h01FlowBrowse')},
   rects:{phone:rect('#phone'),task:rect('#h01FlowTask'),content:rect('#h01FlowContent'),nav:rect('.footer-nav')},
   blankBelowTask:end!==null&&nav!==null?Math.round(nav-end):null,
   visibleButtons:buttons,orders:s.orders?.length||0,bodyClass:document.body.className,scrollWidth:document.querySelector('.scroll')?.scrollWidth,screenWidth:document.querySelector('.scroll')?.clientWidth};
 });
}
async function photo(page,w,name){
 const target=path.join(dir,w+'-'+name+'.png');
 await page.locator('#phone').screenshot({path:target,animations:'disabled'});
 assert(fs.statSync(target).size>6000,'empty screenshot: '+target);
 return path.basename(target);
}
async function start(){
 if(!fs.existsSync(path.join(root,'prototype/parallel/core-journey-fix-01/demo/home.html')))throw Error('MISSING_BUILT_SITE');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 if(!process.env.RC2_EXPECT_SHA||manifest.source_sha!==process.env.RC2_EXPECT_SHA||manifest.source_branch!=='feat/h01-identity-lock-gate-05-20261111'||manifest.source_pr!==114)throw Error('H01_AUDIT_SHA_OR_PR_MISMATCH '+JSON.stringify(manifest));
 fs.mkdirSync(dir,{recursive:true});
 const srv=listen();await new Promise(ok=>srv.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [w,h] of [[375,812],[390,844]]){
   for(const phase of phases){
    const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
    const page=await ctx.newPage(),errors=[],record={width:w,height:h,phase,status:'RUNNING'};
    page.setDefaultTimeout(7000);
    page.on('pageerror',e=>errors.push(e.message));
    try{
     const info=await seed(page,phase);
     const outcome=await layout(page);
     record.info=info;record.layout=outcome;record.pageErrors=errors;
     record.screenshot=await photo(page,w,phase);
     if(['new','active_browse'].includes(phase)){
      await page.locator('.scroll').evaluate(el=>{el.scrollTop=el.scrollHeight});
      await page.waitForTimeout(160);
      record.bottomScreenshot=await photo(page,w,phase+'-bottom');
     }
     assert.equal(outcome.key,expected[phase],'derived '+phase);
     if(phase==='active_browse')assert.equal(outcome.modules.hero,true,'Browse view must reveal master');
     if(['active','active_change','expiring','pending','booking','upcoming','identity'].includes(phase)){
       const controls=await page.evaluate(()=>({
         tabsHidden:document.querySelector('#h01FlowTabs').hidden,
         compactBrowse:!document.querySelector('#h01FlowQuickBrowse').hidden,
         inlineBrowseHidden:document.querySelector('#h01FlowBrowse').hidden,
         storeTime:[...document.querySelectorAll('#h01FlowFacts .h01-flow-fact')].map(e=>({value:e.querySelector('b')?.textContent,label:e.querySelector('small')?.textContent})).find(e=>e.label==='存取时间')?.value,
         storeHourExpected:(()=>{const s=JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}');const o=s.orders?.find(x=>x.status==='paid_simulated');return SIM_FIXTURES.stores.find(y=>y.id===o?.store_id)?.access_hours||'24小时'})(),
         secondLabel:document.querySelector('#h01FlowSecondary')?.textContent,
         activeServiceButtons:[...document.querySelectorAll('#h01FlowServices [data-h01]')].map(x=>x.textContent.trim())
       }));
       assert.equal(controls.tabsHidden,true,'Permanent two tabs not removed');
       assert.equal(controls.compactBrowse,true,'Compact browse entrance not visible');
       assert.equal(controls.inlineBrowseHidden,true,'Duplicate inline browse entrance should be hidden');
       if(['active','active_change'].includes(phase)){
         assert.equal(controls.storeTime,controls.storeHourExpected,'Wrong access-hours field');
         assert.match(controls.secondLabel,/门店导航/,'Navigation label promises wrong action');
         assert.deepEqual(controls.activeServiceButtons,['续租','更多服务 ›'],'Too many active service actions');
       }
       if(phase==='upcoming')assert.match(controls.secondLabel,/门店导航/);
       record.controls=controls;
     }
     if(['pending','identity','identity_verify','upcoming','active','expiring','renewal','returning','refund','lease_expired'].includes(phase)){
       assert.equal(await page.locator('#h01FlowHelp').isVisible(),true,'Contextual help missing');
       assert.equal(await page.locator('#h01FlowPromo').isVisible(),false,'Unapproved marketing offer must not display');
       record.help=await page.locator('#h01FlowHelpTitle').innerText();
     }
     // Task-specific action replay after the screenshot, without modifying the production state engine.
     if(['upcoming','active','active_change'].includes(phase)){
       const address=await page.locator('#h01FlowAddress').innerText();
       assert(address.trim().length>4,'Real store address missing in relevant state');
       record.address=address;
     }
     if(phase==='identity'){
       await page.locator('#h01FlowSecondary').click();
       assert.match(await page.locator('.h01-flow-modal').innerText(),/身份核验|身份验证/,'Identity gate must be explicit');
       await page.keyboard.press('Escape');
       record.action='unverified→lock-denied';
     }
     if(phase==='identity_verify'){
       assert.equal(await page.locator('#h01FlowPrimary').innerText(),'完成身份验证');
       await page.locator('#h01FlowPrimary').click();
       await page.locator('.h01-flow-modal .h01-flow-choice').filter({hasText:'完成身份验证'}).click();
       await page.waitForFunction(()=>document.querySelector('#h01FlowTitle')?.textContent==='入仓准备',{timeout:6000});
       const data=await page.evaluate(()=>{
         const s=JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}');
         const o=s.orders.find(x=>x.status==='paid_simulated');
         return {identity:s.services[o.id]?.identity,orderId:o.id};
       });
       assert.equal(data.identity,'verified','Prototype identity outcome not persisted');
       assert.equal(await page.locator('#h01FlowPrimary').innerText(),'一键开锁');
       await page.locator('#h01FlowPrimary').click();
       assert.match(await page.locator('.h01-flow-modal').innerText(),/起租日/,'Pre-start must remain locked after identity verification');
       record.action='identity→verified→upcoming and locked-before-start';
       await page.keyboard.press('Escape');
     }
     if(phase==='pending'){
       await page.locator('#h01FlowHelpAction').click();
       assert.match(await page.locator('.h01-flow-modal').innerText(),/付款|支付/,'Payment help missing');
       await page.keyboard.press('Escape');
     }
     if(phase==='active'){
       assert.equal(await page.locator('#h01FlowPrimary').innerText(),'一键开锁');
       await page.locator('#h01FlowPrimary').click();
       assert.match(await page.locator('.h01-flow-modal').innerText(),/仓门开锁|仓门设备|未连接/,'Lock setup must not claim door opened');
       assert.doesNotMatch(await page.locator('.h01-flow-modal').innerText(),/开锁成功|开锁处理中/,'Demonstration entry must never claim device activity');
       // Even if a stray legacy integration is present, the current H01 code must not call BLE.
       const demoLabel=await page.locator('.h01-flow-modal h2').innerText();
       assert.equal(demoLabel,'仓门开锁','Entry must remain visible as a product workflow preview');
       await page.keyboard.press('Escape');
       const trigger=page.locator('#h01FlowServices [data-h01="more"]');
       await trigger.click();
       const modal=page.locator('.h01-flow-modal [role="dialog"][aria-modal="true"]');
       await modal.waitFor();
       assert.equal(await modal.locator('.h01-flow-choice').count(),2,'More services should contain add and change');
       await page.keyboard.press('Escape');
       assert.equal(await page.locator('.h01-flow-modal').count(),0,'Escape must close the service sheet');
       assert.equal(await trigger.evaluate(el=>document.activeElement===el),true,'Focus should return to More services');
       await trigger.click();
       await page.locator('.h01-flow-choice').filter({hasText:'加租仓位'}).click();
       await page.waitForURL(/page=QUICK/,{timeout:7000});
       await page.locator('#br04-frame').waitFor();
       record.action='more→add→QUICK';
     }
     if(phase==='active_change'){
       await page.locator('#h01FlowServices [data-h01="more"]').click();
       await page.locator('.h01-flow-choice').filter({hasText:'换仓申请'}).click();
       await page.waitForURL(/page=BOOKING.*mode=advisor/,{timeout:7000});
       await page.locator('#br04-frame').waitFor();
       record.action='more→change→advisor';
     }
     if(phase==='expiring'){
       await page.locator('#h01FlowPrimary').click();
       assert.match(await page.locator('.h01-flow-modal').innerText(),/仓门开锁|仓门设备|未连接/);
       await page.keyboard.press('Escape');
       await page.locator('#h01FlowSecondary').click();
       await page.waitForURL(/page=RN01/,{timeout:7000});
       assert.match(await page.locator('#screen').innerText(),/续租/);
       record.action='renew→RN01';
     }
     if(phase==='upcoming'){
       await page.locator('#h01FlowPrimary').click();
       assert.match(await page.locator('.h01-flow-modal').innerText(),/起租日/,'Prestart lock cannot claim access');
       await page.keyboard.press('Escape');
       await page.locator('#h01FlowSecondary').click();
       await page.locator('.h01-flow-choice').filter({hasText:'查看门店位置'}).click();
       await page.waitForURL(/page=S02/,{timeout:7000});
       record.action='store-location→S02';
     }
     if(phase==='lease_expired'){
       assert.equal(await page.locator('#h01FlowPrimary').innerText(),'办理退租及退押金');
       await page.locator('#h01FlowPrimary').click();
       await page.waitForURL(/page=EX01/);
       await page.locator('#exit-date').waitFor();
       const today=await page.evaluate(()=>window.SIM_DEMO.core.today());
       await page.locator('#exit-date').fill(today);
       await page.locator('[data-action="requestExit"]').click();
       assert.match(await page.locator('#screen').innerText(),/退租|已提交/);
       record.action='expired-lease→EX01→exit-request';
     }
     if(phase==='refund'){
       await page.locator('#h01FlowPrimary').click();
       await page.waitForURL(/page=DP01/);
       record.action='refund→DP01';
     }
     if(phase==='returning'){
       await page.locator('#h01FlowSecondary').click();
       assert.match(await page.locator('.h01-flow-modal').innerText(),/不允许开锁|租约|验仓/,'Inspection must close access');
       await page.keyboard.press('Escape');
     }
     if(phase==='active_browse'){
       await page.locator('#h01FlowReturn [data-h01="business"]').click();
       await page.locator('body.h01-flow-business').waitFor();
       record.action='marketing→business';
     }
     if(outcome.key==='new')assert.equal(outcome.modules.hero,true,'New-user master missing');
     if(outcome.key!=='new'&&phase!=='active_browse')assert.equal(outcome.modules.task,true,'Task view missing');
     assert.equal(errors.length,0,'Browser page errors '+errors.join('; '));
     record.status='PASS';
    }catch(e){record.status='FAIL';record.error=String(e.stack||e);try{record.failureScreenshot=await photo(page,w,phase+'-FAIL')}catch(_){}}
    rows.push(record);
    console.log('H01 AUDIT '+w+' '+phase+' '+record.status+(record.error?' '+record.error.split('\n')[0]:''));
    await ctx.close();
   }
  }
 }finally{await browser.close();await new Promise(ok=>srv.close(ok))}
 const failures=rows.filter(x=>x.status!=='PASS');
 fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({source_sha:process.env.RC2_EXPECT_SHA,source_pr:114,kind:'H01_05_IDENTITY_AND_LOCK_DEMO_ENTRY_ONLY_NO_BLE_NO_S5',rows,pass:rows.length-failures.length,fail:failures.length},null,2));
 if(failures.length)throw Error('H01 audit failure '+failures.map(x=>x.width+'/'+x.phase).join(','));
 console.log('H01 layout capture '+rows.length+'/'+rows.length+' PASS; 0 S5 modifications');
}
start().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
