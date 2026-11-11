'use strict';
// RC2 PR #107 real-page scripted UAT. Needs the SHA-pinned isolated site build.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-h01-order-s5-uat-01');
const host='http://127.0.0.1:4681';
const base=host+'/prototype/parallel/core-journey-fix-01/demo/';
const home=base+'home.html',main=base+'index.html';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const records=[];
const snapshot=page=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')||'{}'));
function server(){
 return http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}catch{return res.writeHead(400).end()}
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(e,data)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
 });
}
async function seed(page,ttl){
 const data=await page.evaluate((ttl)=>{
  const c=SIM_CORE.create(),f=SIM_FIXTURES,s=c.state();
  const store=f.stores.find(x=>x.city===s.city&&x.status==='open');
  const unit=f.units.find(x=>x.store_id===store.id&&c.available(x));
  if(!unit)throw Error('No available demo unit');
  c.setRequirement(unit.volume,12,true);c.select([unit.id]);c.setDate(c.today());
  c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
  c.quote();const o=c.submit(),snapshot=c.state();
  if(ttl!==null)snapshot.orders.find(x=>x.id===o.id).expiresAt=Date.now()+ttl;
  sessionStorage.setItem('mk_independent_sim_v1',JSON.stringify(snapshot));
  return {orderId:o.id,unitId:unit.id,expiresAt:ttl===null?o.expiresAt:snapshot.orders.find(x=>x.id===o.id).expiresAt};
 },ttl);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#h01FlowTitle').waitFor();
 return data;
}
async function capture(page,w,label){
 const name=w+'-'+label+'.png',dest=path.join(out,name);
 const p=page.locator('#phone');
 if(await p.count())await p.screenshot({path:dest,animations:'disabled'});
 else await page.screenshot({path:dest,animations:'disabled'});
 assert(fs.statSync(dest).size>4000,'empty screenshot '+name);
 return name;
}
async function checkout(page){
 await page.locator('#h01FlowPrimary').click();
 await page.waitForURL(/page=O01/);
 const o=page.frameLocator('#br04-frame');
 await o.locator('#agreed').waitFor();
 await o.locator('#agreed').check();
 await o.locator('#pay').click();
 await o.locator('[data-bridge="payResult"][data-value="failed"]').waitFor();
 return o;
}
async function runCase(browser,w,h,name,fn){
 const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
 const page=await ctx.newPage(),errors=[],item={width:w,case:name,status:'RUNNING',screens:[]};
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(home,{waitUntil:'domcontentloaded'});
  await fn(page,item,async label=>item.screens.push(await capture(page,w,name+'-'+label)));
  assert.deepEqual(errors,[],'unhandled browser errors');
  item.status='PASS';
 }catch(e){item.status='FAIL';item.error=String(e.stack||e);try{item.screens.push(await capture(page,w,name+'-failure'))}catch(_){}}
 records.push(item);await ctx.close();
 console.log(name+' '+w+' '+item.status+(item.error?' '+item.error.split('\n')[0]:''));
}
async function paymentFailure(page,item,shot){
 const o=await seed(page,null);
 assert.equal(await page.locator('#h01FlowTitle').innerText(),'订单待支付');
 await shot('01-pending');
 const frame=await checkout(page);
 await frame.locator('[data-bridge="payResult"][data-value="failed"]').click();
 const s=await snapshot(page);
 assert.equal(s.orders.find(x=>x.id===o.orderId).status,'payment_failed');
 assert.equal(s.stock[o.unitId],'available');
 await shot('02-failed');
 await page.goto(home);
 assert.equal(await page.locator('#h01FlowTitle').innerText(),'支付失败');
 await shot('03-failed-home');
 await page.locator('#h01FlowPrimary').click();
 await page.waitForURL(/page=QUICK/);
 await page.frameLocator('#br04-frame').locator('#next-button').waitFor();
 await shot('04-quick-new-order');
 item.oldOrderId=o.orderId;
}
async function cancelAndResume(page,item,shot){
 const o=await seed(page,null),frame=await checkout(page);
 await frame.locator('[data-bridge="cancelPay"]').click();
 let s=await snapshot(page);
 assert.equal(s.orders.find(x=>x.id===o.orderId).status,'pending');
 assert.equal(s.orders.find(x=>x.id===o.orderId).expiresAt,o.expiresAt);
 assert.equal(s.stock[o.unitId],'reserved');
 await shot('01-cancel');
 await page.goto(home);
 assert.equal(await page.locator('#h01FlowTitle').innerText(),'订单待支付');
 await shot('02-home-resumed');
}
async function expiry(page,item,shot){
 const o=await seed(page,2300);
 await shot('01-before-expiry');
 await page.waitForFunction(()=>document.querySelector('#h01FlowTitle')?.textContent.includes('订单已超时'),{timeout:6000});
 const s=await snapshot(page);
 assert.equal(s.orders.find(x=>x.id===o.orderId).status,'expired');
 assert.equal(s.stock[o.unitId],'available');
 await shot('02-expired');
 await page.locator('#h01FlowPrimary').click();
 await page.waitForURL(/page=QUICK/);
 await shot('03-new-order');
}
async function detailAndS5(page,item,shot,w,h,browser){
 await seed(page,null);
 await page.locator('#h01FlowSecondary').click();
 await page.waitForURL(/page=O03/);
 await page.locator('#mk-order-countdown').waitFor();
 assert.match(await page.locator('#mk-order-countdown').innerText(),/^\d{2}:\d{2}:\d{2}$/);
 await shot('01-o03');
 const ctx=await browser.newContext({viewport:{width:w,height:h}});
 const p=await ctx.newPage();
 try{
  await p.goto(main+'?page=S5');
  await p.locator('#screen').evaluate(()=>{
   window.SIM_DEMO.core.setRequirement(3,12,true);
   window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S5');
  });
  const s5=p.frameLocator('#br04-frame');
  await s5.locator('.s5-store-card[data-rank="0"]:not([hidden])').waitFor();
  assert.equal(await s5.locator('.s5-store-card:not([hidden])').count(),2);
  assert.equal(await s5.locator('.estore').count(),1);
  assert.equal(await s5.locator('#s5-compare,.s5-alt-unit,.s5-comparison-table').count(),0);
  assert.match(await s5.locator('#capacity').innerText(),/3m³.*12个月/);
  const overflow=await s5.locator('html').evaluate(e=>e.scrollWidth>window.innerWidth+2);
  assert.equal(overflow,false);
  const file=w+'-s5-source-runtime.png';
  await p.screenshot({path:path.join(out,file),animations:'disabled'});
  item.screens.push(file);
 }finally{await ctx.close()}
}
(async()=>{
 if(!fs.existsSync(path.join(root,'prototype/parallel/core-journey-fix-01/demo/home.html')))
  throw Error('SOURCE_BUILD_MISSING: run python3 scripts/build_rc2_isolated_demo.py from PR #107 checkout first');
 fs.mkdirSync(out,{recursive:true});
 const srv=server();await new Promise(ok=>srv.listen(4681,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [w,h] of [[375,812],[390,844]]){
   await runCase(browser,w,h,'payment-failed-release',paymentFailure);
   await runCase(browser,w,h,'cancel-preserve-deadline',cancelAndResume);
   await runCase(browser,w,h,'timeout-expired-reselect',expiry);
   await runCase(browser,w,h,'O03-S5-contract',(p,i,s)=>detailAndS5(p,i,s,w,h,browser));
  }
 }finally{await browser.close();await new Promise(ok=>srv.close(ok))}
 const failed=records.filter(x=>x.status!=='PASS');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({kind:'SCRIPTED_PLAYWRIGHT_REAL_BUILT_PAGES_NOT_HUMAN_UAT',sha:process.env.RC2_EXPECT_SHA||'NOT_PINNED',result:failed.length?'FAIL':'PASS',records},null,2));
 if(failed.length)throw Error('UAT FAIL '+failed.map(x=>x.case+'/'+x.width).join(','));
 console.log('RC2 H01 ORDER S5 UAT SCRIPTED '+records.length+'/'+records.length+' PASS');
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
