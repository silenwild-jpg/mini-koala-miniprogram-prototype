#!/usr/bin/env node
'use strict';
/** RC2-P1-DEMO-CLOSE-01 independent 375/390 source-backed browser verification. NO DEPLOY. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-p1-demo-close-01');
const base='http://127.0.0.1:4609';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let target;try{target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}
 catch{res.writeHead(400).end();return;}
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(target,(err,data)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}).end(data));
});
const results=[];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(4609,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  try{
   // S01 compact-flat list + same store and unit semantics.
   {
    const page=await ctx.newPage(),jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
    await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
    const cards=s01.locator('.store-card[data-card-kind="expanded"]');await cards.first().waitFor();
    await s01.locator('link[href*="s01-p1-flat-density.css"]').waitFor({state:'attached'});
    assert.equal(await cards.count(),2,'first two must remain expanded');
    assert.equal(await s01.locator('.s01-estore-card').count(),1,'third operating slot E-storage must remain');
    const x=await cards.first().evaluate(card=>{
       const r=card.getBoundingClientRect(),pic=card.querySelector('.store-photo'),pr=pic.getBoundingClientRect(),style=getComputedStyle(card),ps=getComputedStyle(pic);
       const unitButtons=[...card.querySelectorAll('.unit .order')].filter(el=>getComputedStyle(el).display!=='none').map(el=>({height:el.getBoundingClientRect().height,label:el.textContent.trim()}));
       return {height:r.height,width:r.width,imageWidth:pr.width,imageHeight:pr.height,imageFloat:ps.float,border:style.borderTopWidth,shadow:style.boxShadow,unitButtons};
    });
    assert(x.height<380,'expanded S01 card remains too tall '+JSON.stringify(x));
    assert(x.imageWidth<=90&&x.imageWidth>=82&&x.imageHeight<=90&&x.imageHeight>=82,'photo not compact '+JSON.stringify(x));
    assert.equal(x.shadow,'none','unapproved old card shadow persists');
    assert(x.unitButtons.length>=1&&x.unitButtons.every(b=>b.height>=44),'direct unit order buttons must remain usable');
    assert((await s01.locator('html').evaluate(el=>el.scrollWidth))<=width+2,'S01 horizontal overflow');
    assert.equal(await app.locator('.bottom-nav .bottom-item').count(),4,'S01 bottom navigation missing');
    const rankOne=await cards.first().getAttribute('data-store-id');
    await page.screenshot({path:path.join(out,'S01-flat-'+width+'.png'),fullPage:false});
    await cards.first().locator('h2').click();await app.locator('#screen.page-S02').waitFor();
    assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().storeId),rankOne,'S01->S02 identity mismatch');
    await page.screenshot({path:path.join(out,'S02-from-S01-'+width+'.png'),fullPage:false});
    assert.deepEqual(jsErrors,[]);
    results.push({test:'S01_flat_card_and_s02_identity',width,status:'PASS',geometry:x,storeId:rankOne});await page.close();
   }
   // CAP approved CTA must stay visible after user explicitly chooses capacity + term.
   {
    const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/prototype/parallel/core-journey-fix-01/demo/cap.html',{waitUntil:'domcontentloaded'});
    await page.locator('body[data-journey-ready="true"]').waitFor();
    await page.locator('#quick button[data-v="3"]').click();
    await page.locator('button[data-month="12"]').click();
    const cta=page.locator('#cta'),label=(await cta.innerText()).trim();
    assert.equal(label,'查看仓位报价','CAP CTA drifted from approved copy');
    assert.equal(await cta.isEnabled(),true);
    await page.screenshot({path:path.join(out,'CAP-cta-'+width+'.png'),fullPage:false});
    await cta.click();await page.waitForURL(/index\.html\?page=S5/);
    await page.locator('#screen.page-S5').waitFor();
    const value=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
    assert.equal(value.capacity_m3,3);assert.equal(value.term_months,12);assert.equal(value.term_confirmed,true);
    assert.deepEqual(errors,[]);
    results.push({test:'CAP_exact_cta_and_flow',width,status:'PASS',label,capacity:3,months:12});await page.close();
   }
   // Booking receipt must be consumer-safe but never imply lead reached real CRM.
   {
    const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/central-review-02g.html?catalog=sim&page=BOOKING',{waitUntil:'domcontentloaded'});
    const app=page.frameLocator('#central-host'),book=app.frameLocator('#br04-frame');
    await book.locator('#reserve-contact').waitFor();
    const count=()=>app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().leads.length);
    const before=await count();await book.locator('#submit').click();assert.equal(await count(),before,'empty booking incorrectly accepted');
    await book.locator('#booking-address').fill('北京市朝阳区青年路18号');
    await book.locator('#reserve-contact').fill('13800138000');await book.locator('#submit').click();
    await book.locator('#success').waitFor({state:'visible',timeout:5000});
    const txt=await book.locator('#success').innerText();
    assert(!/SIM_LEAD_|MK_LEAD_|LEAD_[0-9]/.test(txt),'internal lead id leaked');
    assert.match(txt,/尚未发送给顾问/,'local-only source not disclosed');
    assert.equal(await count(),before+1);
    const lead=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().leads.at(-1));
    assert.equal(lead.status,'saved_locally','must not invent CRM delivery');
    await page.screenshot({path:path.join(out,'BOOKING-receipt-'+width+'.png'),fullPage:false});
    assert.deepEqual(errors,[]);
    results.push({test:'BOOKING_no_internal_id_and_truthful_receipt',width,status:'PASS',receiptText:txt,leadStatus:lead.status});await page.close();
   }
   // O01 false payment claims must be absent from the default and dynamic view strings.
   {
    const page=await ctx.newPage();
    await page.goto(base+'/prototype/parallel/core-journey-fix-01/demo/br04/o01/index.html',{waitUntil:'domcontentloaded'});
    await page.locator('#pay').waitFor();
    assert.match(await page.locator('.payment-note').innerText(),/不会实际扣款或锁定仓位/);
    assert(!/模拟支付/.test(await page.locator('#pay').innerText()),'O01 initial pay CTA exposes simulated-payment label');
    const bridge=fs.readFileSync(path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo/br04/bridge.js'),'utf8');
    assert(bridge.includes("'确认订单 <span id=\"pay-amount\">'"),'rendered O01 pay action mismatch');
    assert(bridge.includes("体验支付成功流程")&&bridge.includes("体验支付失败流程"),'payment outcome flow must remain explicitly non-transactional');
    await page.screenshot({path:path.join(out,'O01-entry-'+width+'.png'),fullPage:false});
    results.push({test:'O01_truthful_static_and_dynamic_payment_copy',width,status:'PASS'});await page.close();
   }
  }finally{await ctx.close();}
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
 const final={status:'PASS',kind:'OFFLINE_SCRIPTED_NOT_LIVE_UAT',count:results.length,results,liveDeployed:false,humanVisualSignoff:false,crmVerified:false,realWechatPayment:false};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(final,null,2));
 console.log('RC2_P1_DEMO_CLOSE_01_PASS '+JSON.stringify({cases:final.count,summary:results.filter(x=>x.test.includes('S01')).map(x=>({width:x.width,cardHeight:x.geometry.height}))}));
})().catch(e=>{console.error('RC2_P1_DEMO_CLOSE_01_FAIL '+(e.stack||e));process.exitCode=1;});
