#!/usr/bin/env node
'use strict';
/**
 * RC2-UAT-USER-01 independent scripted observational audit.
 * NOT actual humans, NOT Netlify SSO session, NOT WeChat API, NOT real CRM.
 * Runs against identical app Git tree pinned by UAT deploy.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-uat-user-01');
const host='http://127.0.0.1:4603';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}
 catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
const sizes=[[375,812],[390,844]];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(4603,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const records=[],findings=[];
 async function visit(width,height,key,fn){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('console',msg=>{if(msg.type()==='error'&&!/favicon/i.test(msg.text()))errors.push(msg.text());});
  const app=page.frameLocator('#central-host');
  try{
   const data=await fn({page,app,context,errors});
   assert.deepEqual(errors,[],'unexpected console or JS exceptions');
   records.push({test:key,width,status:'PASS',...data});
  }catch(err){
   records.push({test:key,width,status:'FAIL',error:String(err.stack||err).slice(0,2500)});
   try{await page.screenshot({path:path.join(out,'failure-'+key+'-'+width+'.png'),fullPage:true})}catch{}
  }finally{await context.close();}
 }
 try{
  for(const [width,height] of sizes){
   await visit(width,height,'A-s01-architecture-filter-recovery',async({page,app})=>{
    await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    const list=app.frameLocator('#s01-r2-frame');
    await list.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
    assert.equal(await list.locator('.store-card[data-card-kind="expanded"]').count(),2,'exactly 2 expanded recommendation cards');
    const allCards=await list.locator('.stores > article').evaluateAll(els=>els.map(el=>({kind:el.dataset.cardKind||'',className:el.className})));
    assert(allCards.length>=3,'store + E-store cards must exist');
    assert.equal(allCards[2].kind,'estore','third card must be E-storage operating position');
    assert(allCards.slice(3).every(c=>c.className.includes('s01-compact')),'fourth+ stores must be compact');
    const filters=await list.locator('.filters .filter').allInnerTexts();
    assert.deepEqual(filters.map(x=>x.trim()),['排序','距离','服务']);
    assert.equal(await list.locator('.nav-back').count(),0,'do not add top-level back button');
    assert.equal(await app.locator('.bottom-nav .bottom-item').count(),4,'top-level S01 needs tabbar');
    const semantics=await list.locator('.filters .filter').evaluateAll(els=>els.map(e=>({tag:e.tagName.toLowerCase(),role:e.getAttribute('role'),tabindex:e.getAttribute('tabindex')})));
    if(semantics.some(x=>x.tag!=='button'&&x.role!=='button'&&x.tabindex===null))
      findings.push({type:'ACCESSIBILITY-REVIEW',width,location:'S01 three filters',evidence:semantics,priority:'P2',recommendation:'Use native buttons with keyboard focus and accessible expanded state'});
    await list.locator('.filters .filter').first().click();
    const panelVisible=await list.locator('#s01-inline-panel').isVisible();
    assert(panelVisible,'sort filter must open options panel');
    await list.locator('#s01-search').fill('绝不存在的测试门店XYZ');
    await list.getByText('未找到匹配门店',{exact:false}).first().waitFor();
    await list.locator('#s01-search').fill('');
    await list.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
    assert((await list.locator('html').evaluate(el=>el.scrollWidth))<=width+2,'horizontal overflow');
    await page.screenshot({path:path.join(out,'A-S01-'+width+'.png'),fullPage:false});
    return {totalArticles:allCards.length,types:allCards.map(x=>x.kind),filters,sortPanelOpened:panelVisible};
   });

   await visit(width,height,'B-detail-price-back',async({page,app})=>{
    await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    const list=app.frameLocator('#s01-r2-frame');
    await list.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
    const id=await list.locator('.store-card[data-card-kind="expanded"]').first().getAttribute('data-store-id');
    await list.locator('.store-card[data-card-kind="expanded"]').first().locator('h2').click();
    await app.locator('#screen.page-S02').waitFor();
    assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().storeId),id);
    const cta=await app.locator('.unit-row[data-unit] .order-button:not([disabled])').first().evaluate(el=>el.getBoundingClientRect().height);
    assert(cta>=44,'S02 order button touch target below minimum');
    await app.locator('.hero .back-button').click();
    await app.locator('#screen.page-S01').waitFor();
    await page.screenshot({path:path.join(out,'B-S01-return-'+width+'.png'),fullPage:false});
    return {storeId:id,ctaHeight:cta,returned:true};
   });

   await visit(width,height,'C-s5-capacity-first-and-amounts',async({page,app})=>{
    await page.goto(host+'/central-review-02g.html?catalog=sim&page=S5',{waitUntil:'domcontentloaded'});
    let s5=app.frameLocator('#br04-frame');
    await s5.locator('body.bridge-ready').waitFor();
    assert.equal(await s5.locator('#artboard').getAttribute('data-requires-capacity'),'true');
    assert.equal(await s5.locator('.term').isVisible(),false);
    await app.locator('#screen').evaluate(()=>{window.SIM_DEMO.core.setRequirement(3,12,true);window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S5');});
    s5=app.frameLocator('#br04-frame');
    await s5.locator('.s5-store-card[data-rank="0"]:not([hidden]) .s5-unit-buy').first().waitFor();
    assert.match(await s5.locator('#capacity').innerText(),/3\s*m³/);
    const prices=await s5.locator('.s5-store-card:not([hidden]) .s5-unit-price').evaluateAll(els=>els.map(el=>({text:el.textContent.trim(),font:parseFloat(getComputedStyle(el).fontSize),clipped:el.scrollWidth>el.clientWidth+1})));
    assert(prices.length>=1&&prices.every(x=>!x.clipped&&x.font>=14),'S5 price clipped or unreadably small');
    const ctas=await s5.locator('.s5-store-card:not([hidden]) .s5-unit-buy').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
    assert(ctas.every(h=>h>=44),'S5 order touch target too small');
    assert((await s5.locator('html').evaluate(el=>el.scrollWidth))<=width+3,'S5 horizontal overflow');
    const orders=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().orders.length);
    assert.equal(orders,0,'mere quote browsing creates an order');
    await page.screenshot({path:path.join(out,'C-S5-'+width+'.png'),fullPage:false});
    return {capacity:'3m³',months:12,prices,ctaHeights:ctas,orders};
   });

   await visit(width,height,'D-booking-validation-and-receipt',async({page,app})=>{
    await page.goto(host+'/central-review-02g.html?catalog=sim&page=BOOKING',{waitUntil:'domcontentloaded'});
    const form=app.frameLocator('#br04-frame');
    await form.locator('#reserve-contact').waitFor();
    const count=()=>app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().leads.length);
    const start=await count();
    await form.locator('#submit').click();
    assert.equal(await count(),start);
    await form.locator('#booking-address').fill('北京市朝阳区青年路18号');
    await form.locator('#submit').click();
    assert.equal(await count(),start);
    await form.locator('#reserve-contact').fill('13800138000');
    await form.locator('#submit').click();
    await form.locator('#success').waitFor({state:'visible',timeout:5000});
    const lead=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().leads.at(-1));
    assert.equal(lead.status,'saved_locally');
    assert.equal(lead.phone,'13800138000');
    assert.equal(await count(),start+1);
    assert.equal(await form.locator('#toast').isVisible(),false,'obsolete error toast still visible after success');
    await page.screenshot({path:path.join(out,'D-booking-'+width+'.png'),fullPage:false});
    return {storedLocally:true,crmDelivered:false,leadsAdded:1};
   });

   await visit(width,height,'E-cold-order-must-be-blocked',async({page,app})=>{
    await page.goto(host+'/central-review-02g.html?catalog=sim&page=O01&store=SIM_BJ01&unit=BAD_ID',{waitUntil:'domcontentloaded'});
    await page.locator('#central-error').waitFor({state:'visible'});
    assert.match(await page.locator('#central-error').innerText(),/请先选择仓位/);
    const frame=await page.locator('#central-host').count();
    assert.equal(frame,0,'unauthorized order page iframe must not be mounted');
    await page.screenshot({path:path.join(out,'E-cold-O01-'+width+'.png'),fullPage:false});
    return {guarded:true,orderCreated:false};
   });
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 const failed=records.filter(r=>r.status!=='PASS');
 const summary={status:failed.length?'FAIL':'PASS',auditType:'SCRIPTED_BROWSER_NOT_HUMAN',isLiveNetlify:false,approvedAppTree:'6f96d6dc95c0669aa571e260ff18d0ca097cc3cf',cases:records.length,passed:records.length-failed.length,failed:failed.length,findings,records,realUsersTested:0,crmVerified:false,wechatVerified:false,visualSignoff:false,mainMergeApproved:false};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(summary,null,2));
 console.log('RC2_UAT_USER_01_SCRIPTED_REVIEW '+JSON.stringify({status:summary.status,passed:summary.passed,failed:summary.failed,findings:findings.length}));
 if(failed.length){for(const f of failed)console.error('FAIL '+f.test+' width='+f.width+' '+f.error);process.exitCode=1;}
})().catch(err=>{console.error('RC2_UAT_USER_01_SCRIPTED_REVIEW_ABORT',err.stack||err);process.exitCode=1;});
