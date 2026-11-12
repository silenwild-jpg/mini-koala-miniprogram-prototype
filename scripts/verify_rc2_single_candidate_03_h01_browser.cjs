'use strict';
/* H01-STATE-VIS-RESTORE-01 | Capture current code, do not modify business UI or S5. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const dir=path.resolve(__dirname,'../release-evidence/rc2-single-candidate-03-h01');
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
  // Date-stable seed: successful orders are placed for today's valid date first,
  // then the *test-only persisted snapshot* is shifted earlier to represent a
  // lease that has already started. No production date validation is modified.
  let overrideState=null;
  if(['active','active_change','expiring','renewal','returning','refund','ended','active_browse'].includes(phase)){
    const snapshot=c.state();
    const o=snapshot.orders.find(x=>x.id===order.id);
    const offset=phase==='expiring'?18:4;
    o.start_date=new Date(Date.parse(today+'T00:00:00Z')-offset*86400000).toISOString().slice(0,10);
    const rental=window.SIM_CORE.create({state:snapshot});
    if(phase==='renewal')rental.lifecycleRequestRenewal(order.id,6);
    if(['returning','refund','ended'].includes(phase)){
      rental.lifecycleRequestExit(order.id,'early',rental.today());
      rental.lifecycleRequestInspection(order.id);
    }
    if(['refund','ended'].includes(phase))rental.lifecycleReviewInspection(order.id,'passed',true);
    if(phase==='ended')rental.lifecycleReviewRefund(order.id,true);
    overrideState=rental.state();
  }
  if(phase==='multi'){
    const alt=F.units.find(u=>u.id!==unit.id&&c.available(u)&&F.stores.find(v=>v.id===u.store_id)?.city===s.city);
    if(!alt)throw Error('NO_SECOND_AVAILABLE_UNIT');
    c.setRequirement(alt.volume,12,true);c.select([alt.id]);c.setDate(today);c.quote();c.submit();
  }
  window.SIM_DEMO.persist();
  if(overrideState)sessionStorage.setItem('mk_independent_sim_v1',JSON.stringify(overrideState));
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
 if(!process.env.RC2_EXPECT_SHA||manifest.source_sha!==process.env.RC2_EXPECT_SHA||manifest.source_branch!==process.env.RC2_EXPECT_BRANCH||manifest.source_pr!==Number(process.env.RC2_EXPECT_SOURCE_PR||'141'))throw Error('H01_AUDIT_SHA_OR_PR_MISMATCH '+JSON.stringify(manifest));
 fs.mkdirSync(dir,{recursive:true});
 const srv=listen();await new Promise(ok=>srv.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,channel:process.env.H01_BROWSER_CHANNEL||'chrome',args:['--no-sandbox']});
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
     assert.equal(await page.locator('#h01StageProgress,#h01Scene,#h01FlowContext').count(),0,'Rejected H01 A/C DOM must not exist in original baseline');
     // A/C variant: only payment progress or an ID-matched pre-entry/active photo.
     const shouldProgress=false; // Rejected A: progress UI MUST NOT be present in original baseline.
     const shouldScene=false; // Rejected C: no environment image in original baseline.
     if(shouldScene){
       await page.locator('#h01Scene').waitFor({state:'visible'});
       await page.waitForFunction(()=>{
         const im=document.querySelector('#h01SceneImage');
         return im?.complete&&im.naturalWidth>0&&im.naturalHeight>0;
       },null,{timeout:6000});
     }
     if(shouldProgress||shouldScene||(!outcome.isMarketing&&phase!=='active_browse')){
       const variant=await page.evaluate(()=>{
         const rect=q=>{const e=document.querySelector(q);if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width};};
         const photo=document.querySelector('#h01SceneImage');
         const s=JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}');
         const o=s.orders?.at(-1),store=SIM_FIXTURES.stores.find(x=>x.id===o?.store_id);
         return {
           progressVisible:!!document.querySelector('#h01StageProgress')?.offsetHeight,
           sceneVisible:!!document.querySelector('#h01Scene')?.offsetHeight,
           imageUrl:photo?.getAttribute('src')||'',
           imageLoaded:!!(photo?.complete&&photo.naturalWidth>0),
           expectedImage:store?.photoDetail||null,
           photoStore:document.querySelector('#h01FlowContext')?.dataset.photoStore||'',
           expectedPhotoStore:store?.id||'',
           photoFocus:photo?getComputedStyle(photo).objectPosition:null,
           context:rect('#h01FlowContext'),task:rect('#h01FlowTask'),
           nav:rect('.footer-nav'),help:rect('#h01FlowHelp'),
           viewportWidth:window.innerWidth,scrollWidth:document.querySelector('#phone')?.scrollWidth
         };
       });
       assert.equal(variant.progressVisible,shouldProgress,'A progress variant visibility');
       assert.equal(variant.sceneVisible,shouldScene,'C photo variant visibility');
       assert(variant.scrollWidth<=w+1,'Horizontal overflow in task view');
       if(shouldScene){
         const sceneHoursVisible=await page.locator('#h01SceneHours').isVisible();
       assert.equal(sceneHoursVisible,phase==='upcoming',
         'Active access hours must not be repeated above the store image');
       assert(variant.imageLoaded,'Curated photo not loaded');
         assert(variant.expectedImage&&variant.imageUrl.endsWith(variant.expectedImage),'Store ID to photo mapping mismatch');
         assert.equal(variant.photoStore,variant.expectedPhotoStore,'Photo focal CSS scoped to wrong store');
         if(variant.photoStore==='SIM_BJ01')assert.equal(variant.photoFocus,'50% 74%',
           'Known A001 label must be excluded with the store-specific focal crop');
         assert(variant.context?.bottom<variant.nav?.top-8,'Store photo content overlaps bottom nav');
       }
       if(shouldProgress)assert(variant.context?.bottom<variant.nav?.top-8,'Payment progress overlaps bottom nav');
       if(phase==='active')assert(variant.help?.bottom<variant.nav?.top-16,
         'Active help content must keep at least 16px above the bottom nav');
       record.variant=variant;
     }
     // Validate real fallback CJK glyphs and collect visible text clipping on the exact screenshot SHA.
     // Font installation is confined to the GitHub runner; never bundle font files.
     const cjk=await page.evaluate(()=>{
       const canvas=document.createElement('canvas');canvas.width=160;canvas.height=55;
       const ctx=canvas.getContext('2d'), samples={};
       for(const ch of ['仓','中','考','测',String.fromCharCode(0xE000)]){
         ctx.clearRect(0,0,160,55);ctx.fillStyle='#000';ctx.font='30px sans-serif';ctx.fillText(ch,5,38);
         const d=ctx.getImageData(0,0,160,55).data;let hash=0,pixels=0;
         for(let k=3;k<d.length;k+=4)if(d[k]){pixels++;hash=(Math.imul(hash,31)+Math.floor(k/4)%173)|0;}
         samples[ch]={hash,pixels};
       }
       const selectors=['#h01FlowKicker','#h01FlowTitle','#h01FlowHelpTitle','#h01FlowPrimary','#h01FlowSecondary','#h01FlowFacts .h01-flow-fact b'];
       const boxes=selectors.flatMap(sel=>[...document.querySelectorAll(sel)].filter(el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden').map(el=>{
         const s=getComputedStyle(el),r=el.getBoundingClientRect();
         return {selector:sel,text:el.textContent.trim().slice(0,42),width:Math.round(r.width),
           scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflow:s.textOverflow,
           clipped:el.scrollWidth>el.clientWidth+2};
       }));
       return {samples,distinct:new Set(Object.values(samples).map(x=>x.hash)).size,boxes};
     });
     record.cjk=cjk;
     assert.equal(cjk.distinct,5,'Missing real Chinese glyphs (tofu font fallback)');
     assert(Object.values(cjk.samples).every(x=>x.pixels>60),'Chinese glyph sample unexpectedly empty');
     assert.deepEqual(cjk.boxes.filter(x=>x.clipped&&x.overflow!=='ellipsis'),[],
       'H01 visible Chinese task label/button clipped without ellipsis');
     // Buttons must be measured on the H01 task BEFORE scenario actions navigate to O03/S02/QUICK/other pages.
     if(outcome.key!=='new'&&phase!=='active_browse'){
       const primaryHeight=await page.locator('#h01FlowPrimary').evaluate(el=>el.getBoundingClientRect().height);
       assert(primaryHeight>=47.5,'H01 primary button must meet the 48px design baseline');
       const secondaryVisible=await page.locator('#h01FlowSecondary').isVisible();
       const secondaryHeight=secondaryVisible
         ?await page.locator('#h01FlowSecondary').evaluate(el=>el.getBoundingClientRect().height):null;
       if(secondaryVisible)assert(secondaryHeight>=47.5,'H01 secondary button must meet the 48px design baseline');
       record.ctaSizes={primary:primaryHeight,secondary:secondaryHeight};
     }
     record.screenshot=await photo(page,w,phase);
     // An initial viewport is not the whole page. Verify that CJK-wrapped help can
     // be scrolled completely above the fixed nav, and preserve the actual bottom screenshot.
     if(['pending','upcoming','active','active_change'].includes(phase)){
       await page.locator('.scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
       await page.waitForTimeout(120);
       const tailSafety=await page.evaluate(()=>{
         const rect=sel=>{const e=document.querySelector(sel);return e?.getBoundingClientRect()||null;};
         const help=rect('#h01FlowHelp'),nav=rect('.footer-nav'),scroll=document.querySelector('.scroll');
         return {helpBottom:help?.bottom??null,navTop:nav?.top??null,
           scrollTop:scroll?.scrollTop??null,scrollHeight:scroll?.scrollHeight??null,
           clientHeight:scroll?.clientHeight??null};
       });
       if(tailSafety.helpBottom!==null&&tailSafety.navTop!==null)
         assert(tailSafety.helpBottom<=tailSafety.navTop-15,
           'Task help must be reachable at least 16px above fixed nav after scroll');
       record.bottomSafety=tailSafety;
       record.bottomScreenshot=await photo(page,w,phase+'-bottom');
     }
     if(['new','active_browse'].includes(phase)){
      await page.locator('.scroll').evaluate(el=>{el.scrollTop=el.scrollHeight});
      await page.waitForTimeout(160);
      record.bottomScreenshot=await photo(page,w,phase+'-bottom');
     }
     assert.equal(outcome.key,expected[phase],'derived '+phase);
     if(!['new','ended','active_browse'].includes(phase)){
       const captions={
         estimated:'找仓进度',selected:'找仓进度',booking:'用仓预约',
         pending:'当前订单',multi:'当前订单',
         payment_failed:'订单状态',expired:'订单状态',
         identity:'入仓服务',identity_verify:'入仓服务',upcoming:'入仓服务',
         active:'我的仓位',active_change:'我的仓位',expiring:'我的仓位',renewal:'我的仓位',
         returning:'退租服务',lease_expired:'退租服务',refund:'押金服务'
       };
       const caption=await page.locator('#h01FlowKicker').innerText();
       assert.equal(caption,captions[phase],phase+' status-specific kicker is not correct');
       const shortcutVisible=await page.locator('#h01FlowQuickBrowse').isVisible();
       assert.equal(shortcutVisible,['active','active_change','expiring','renewal'].includes(phase),
         'Unnecessary browse shortcut in '+phase);
       record.caption=caption;record.browseShortcutVisible=shortcutVisible;
       // There should be exactly one contextual help area and never an unapproved promotion.
       assert.equal(await page.locator('#h01FlowHelp').count(),1);
       assert.equal(await page.locator('#h01FlowPromo').isVisible(),false);
     }
     if(phase==='active_browse')assert.equal(outcome.modules.hero,true,'Browse view must reveal master');
     if(['active','active_change','expiring','renewal','pending','booking','upcoming','identity'].includes(phase)){
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
       assert.equal(controls.compactBrowse,['active','active_change','expiring','renewal'].includes(phase),'Browse shortcut should appear only for users with ongoing rental service');
       assert.equal(controls.inlineBrowseHidden,true,'Duplicate inline browse entrance should be hidden');
       if(['active','active_change'].includes(phase)){
         assert.equal(controls.storeTime,controls.storeHourExpected,'Wrong access-hours field');
         assert.match(controls.secondLabel,/门店导航/,'Navigation label promises wrong action');
         assert.deepEqual(controls.activeServiceButtons,['续租','更多服务 ›'],'Too many active service actions');
       }
       if(phase==='upcoming')assert.match(controls.secondLabel,/一键开锁/);
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
       assert.equal(await page.locator('#h01FlowPrimary').innerText(),'门店导航');
       assert.equal(await page.locator('#h01FlowSecondary').innerText(),'一键开锁');
       await page.locator('#h01FlowSecondary').click();
       assert.match(await page.locator('.h01-flow-modal').innerText(),/起租日/,'Pre-start must remain locked after identity verification');
       record.action='identity→verified→upcoming and locked-before-start';
       await page.keyboard.press('Escape');
     }
     if(phase==='pending'){
       await page.locator('#h01FlowHelpAction').click();
       assert.match(await page.locator('.h01-flow-modal').innerText(),/付款|支付/,'Payment help missing');
       await page.keyboard.press('Escape');
       // O03 is backed by a lifecycle summary; must resolve the same original order expiry by ID.
       const before=await page.evaluate(id=>{
         const s=JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}');
         return s.orders.find(o=>o.id===id)?.expiresAt;
       },info.id);
       assert(Number.isFinite(before),'The original pending order expiry is missing');
       await page.locator('#h01FlowSecondary').click();
       await page.waitForURL(/page=O03/,{timeout:7000});
       await page.locator('#mk-order-countdown').waitFor({state:'visible',timeout:7000});
       const countdown=await page.locator('#mk-order-countdown').innerText();
       assert.match(countdown,/^\d{2}:\d{2}:\d{2}$/,'O03 payment countdown must render HH:MM:SS');
       const after=await page.evaluate(id=>{
         const s=JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}');
         return s.orders.find(o=>o.id===id)?.expiresAt;
       },info.id);
       assert.equal(after,before,'O03 must not refresh or replace the original deadline');
       // The O03 page has #screen rather than H01's #phone: capture the actual document.
       const firstSec=countdown.split(':').reduce((sum,part)=>sum*60+Number(part),0);
       await page.waitForTimeout(1350);
       const later=await page.locator('#mk-order-countdown').innerText();
       const laterSec=later.split(':').reduce((sum,part)=>sum*60+Number(part),0);
       assert(laterSec<firstSec,'O03 countdown did not tick while on detail page');
       assert.deepEqual(errors,[],'O03 browser runtime errors');
       record.action='pending H01 -> O03 countdown ticks without extending original deadline';
       const file=w+'-pending-O03-clock.png';
       await page.screenshot({path:path.join(dir,file),animations:'disabled'});
       assert(fs.statSync(path.join(dir,file)).size>6000,'O03 screenshot empty');
       record.orderDetailScreenshot=file;
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
       assert.equal(await page.locator('#h01FlowPrimary').innerText(),'门店导航');
       assert.equal(await page.locator('#h01FlowSecondary').innerText(),'一键开锁');
       await page.locator('#h01FlowSecondary').click();
       assert.match(await page.locator('.h01-flow-modal').innerText(),/起租日/,'Prestart lock cannot claim access');
       await page.keyboard.press('Escape');
       await page.locator('#h01FlowPrimary').click();
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
     if(phase==='new'){
       const cards=page.locator('.task-area .task-card');
       assert.equal(await cards.count(),2,'Marketing H01 must retain exactly two main task cards');
       assert.match(await cards.first().innerText(),/找附近门店/);
       assert.match(await cards.nth(1).innerText(),/估大小算价格/);
       const navBooking=page.locator('.footer-nav button[aria-label="预约订单"]');
       await navBooking.click();
       const menu=page.locator('.demo12-overlay');
       await menu.waitFor({state:'visible'});
       assert.equal(await menu.locator('[data-h="booking"]').count(),1,'Reserve option missing');
       assert.equal(await menu.locator('[data-h="quick"]').count(),1,'Quick-order option missing');
       record.orderMenuScreenshot=await photo(page,w,'new-order-menu');
       await menu.locator('[data-h="quick"]').click();
       await page.waitForURL(/page=QUICK/,{timeout:7000});
       record.action='H01 bottom nav → order menu → QUICK';
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
 fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify({source_sha:process.env.RC2_EXPECT_SHA,source_pr:Number(process.env.RC2_EXPECT_SOURCE_PR||'141'),kind:'H01_BASELINE_VIS_CHECK_01_20_STATES_2_WIDTHS_NO_AC',rows,pass:rows.length-failures.length,fail:failures.length},null,2));
  if(failures.length)throw Error('H01 audit failure '+failures.map(x=>x.width+'/'+x.phase).join(','));
 console.log('H01 layout capture '+rows.length+'/'+rows.length+' PASS; 0 S5 modifications');
}
start().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
