#!/usr/bin/env node
'use strict';
// RC2 FINAL VISUAL 04: exact-branch 375/390 customer & reviewer UIs. No real payments, ID providers or hardware.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/rc2-final-vis-signoff-04');
const host='http://127.0.0.1:4707',ext={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(e,bytes)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':ext[path.extname(file)]||'application/octet-stream'}).end(bytes));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4707,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROME_PATH?{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}:{})});
 const results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',err=>errors.push(err.message));
   const capture=async(label,selector='#screen')=>{
    const sel=page.locator(selector);await sel.waitFor({state:'visible'});
    const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,view:innerWidth}));
    assert(overflow.width<=overflow.view+2,label+' horizontal overflow '+JSON.stringify(overflow));
    await page.screenshot({path:path.join(out,label+'-'+width+'.png')});
    results.push({width,height,label,url:new URL(page.url()).pathname+new URL(page.url()).search,overflow:overflow.width-overflow.view,jsErrors:errors.length});
   };
   try{
    await page.goto(host+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
    const ids=await page.evaluate(()=>{
     const b=window.SIM_DEMO,c=b.core,F=c.fixture;
     c.setScenario('normal');c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
     const a=F.units.find(u=>u.volume>=3&&u.status==='available');
     const d=F.units.find(u=>u.volume>=3&&u.status==='available'&&u.id!==a.id&&u.store_id!==a.store_id);
     if(!a||!d)throw Error('NEED_TWO_UNITS_DIFFERENT_STORES');
     const tomorrow=()=>{const [y,m,day]=c.today().split('-').map(Number);return new Date(Date.UTC(y,m-1,day+3)).toISOString().slice(0,10);};
     function pay(u,start){c.setRequirement(u.volume,12,true);c.select([u.id]);c.setDate(start);c.quote();const o=c.submit();c.pay(o.id,'success');return o.id;}
     const A=pay(a,c.today()),B=pay(d,tomorrow());
     b.persist();b.openOrder(A);b.navigate('RN01');
     return {a:A,b:B};
    });
    await capture('01-RN01-before-quote');
    const quoted=await page.evaluate(id=>{
      const b=window.SIM_DEMO,c=b.core,r=c.lifecycleRequestRenewal(id,6);
      c.lifecycleReviewQuote(id,r.id,315,true);b.persist();b.navigate('RN01');
      return {req:r.id,view:c.lifecycleView(id)};
    },ids.a);
    assert.equal(quoted.view.total_months,12);
    await page.locator('[data-action="confirmRenewal"]').waitFor();
    await capture('02-RN01-quote-ready');
    await page.locator('[data-action="confirmRenewal"]').click();
    await page.locator('[data-action="payRenewalSuccess"]').waitFor();
    const unpaid=await page.evaluate(id=>{const c=window.SIM_DEMO.core;return c.lifecycleView(id);},ids.a);
    assert.equal(unpaid.total_months,12,'quote confirm must not extend term');
    assert.equal(unpaid.payments.length,1,'quote confirm must not invent invoiceable payment');
    await capture('03-RN01-payment-pending');
    await page.locator('[data-action="payRenewalCancel"]').click();
    assert.match(await page.locator('#screen').innerText(),/已暂缓支付/);
    await capture('04-RN01-cancelled');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('[data-action="confirmRenewal"]').waitFor();
    await page.locator('[data-action="confirmRenewal"]').click();
    await page.locator('[data-action="payRenewalSuccess"]').waitFor();
    await capture('05-RN01-resumed');
    await page.goto(host+'/index.html?page=RN01&order='+encodeURIComponent(ids.a)+'&review=1',{waitUntil:'domcontentloaded'});
    await page.locator('[data-action="payRenewalFailed"]').waitFor();
    await page.locator('[data-action="payRenewalFailed"]').click();
    await capture('06-RN01-failed-review');
    await page.goto(host+'/index.html?page=RN01&order='+encodeURIComponent(ids.a),{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('[data-action="payRenewalFailed"]').count(),0,'customer UI cannot choose failure');
    await page.locator('[data-action="confirmRenewal"]').click();
    await page.locator('[data-action="payRenewalSuccess"]').click();
    await page.locator('#renew-months').waitFor();
    assert.equal(await page.locator('#renew-months').inputValue(),'','completed month input must reset');
    const paid=await page.evaluate(id=>window.SIM_DEMO.core.lifecycleView(id),ids.a);
    assert.equal(paid.total_months,18);assert.equal(paid.payments.length,2);
    await capture('07-RN01-success');
    await page.evaluate(id=>window.SIM_DEMO.navigate('IV01'),ids.a);
    await page.locator('#invoice-payment').waitFor();
    const paidOptions=await page.locator('#invoice-payment option').allTextContents();
    assert.equal(paidOptions.length,2,'only actual initial and successful renewal payments are invoiceable');
    await capture('08-IV01-two-paid-records');
    const other=await page.evaluate(id=>window.SIM_DEMO.core.lifecycleView(id),ids.b);
    assert.equal(other.total_months,12);assert.equal(other.payments.length,1);
    await page.goto(host+'/account.html?view=identity&id='+encodeURIComponent(ids.b),{waitUntil:'domcontentloaded'});
    await page.locator('[data-act="identitySheet"]').click();
    await page.locator('#sheet[open]').waitFor();
    assert.equal(await page.locator('#sheet [data-act="identityResult"]').count(),0,'customer must not choose reviewer outcome');
    assert.equal(await page.locator('#identity-name').count(),1);
    await capture('09-Identity-customer-form','#sheet');
    await page.locator('#identity-name').fill('示例用户');
    await page.locator('#identity-number').fill('123');
    await page.locator('[data-act="identitySubmit"]').click();
    await page.locator('#sheet #mk-identity-error').waitFor({state:'visible'});
    assert.match(await page.locator('#sheet #mk-identity-error').innerText(),/18位证件号码/);
    assert.equal(await page.locator('#identity-number').getAttribute('aria-invalid'),'true');
    await capture('10-Identity-input-error','#sheet');
    await page.locator('#identity-number').fill('11010119900101123X');
    await page.locator('[data-act="identitySubmit"]').click();
    await page.getByText('核验中',{exact:false}).first().waitFor();
    assert.equal(await page.locator('[data-act="identitySheet"]').count(),0,'review pending blocks ordinary user from controlling result');
    assert(!(await page.evaluate(()=>sessionStorage.getItem('mk_independent_sim_v1'))).includes('11010119900101123X'),'identity number must never persist');
    await capture('11-Identity-review-pending','#content');
    await page.goto(host+'/account.html?view=identity&id='+encodeURIComponent(ids.b)+'&debug=1',{waitUntil:'domcontentloaded'});
    await page.locator('[data-act="identitySheet"]').click();
    assert.equal(await page.locator('#sheet [data-act="identityResult"]').count(),2,'reviewer-only outcome controls');
    await capture('12-Identity-reviewer-controls','#sheet');
    await page.locator('#sheet [data-act="identityResult"][data-value="failed"]').click();
    await page.goto(host+'/account.html?view=identity&id='+encodeURIComponent(ids.b),{waitUntil:'domcontentloaded'});
    await page.getByText('未通过',{exact:false}).first().waitFor();
    await capture('13-Identity-failed-retry','#content');
    await page.locator('[data-act="identitySheet"]').click();
    await page.locator('#identity-name').fill('示例用户');
    await page.locator('#identity-number').fill('11010119900101123X');
    await page.locator('[data-act="identitySubmit"]').click();
    await page.goto(host+'/account.html?view=identity&id='+encodeURIComponent(ids.b)+'&debug=1',{waitUntil:'domcontentloaded'});
    await page.locator('[data-act="identitySheet"]').click();
    await page.locator('#sheet [data-act="identityResult"][data-value="success"]').click();
    await page.goto(host+'/account.html?view=identity&id='+encodeURIComponent(ids.b),{waitUntil:'domcontentloaded'});
    await page.getByText('验证状态：已通过').waitFor();
    await capture('14-Identity-verified','#content');
    await page.goto(host+'/account.html?view=access&id='+encodeURIComponent(ids.b),{waitUntil:'domcontentloaded'});
    await page.getByText('尚未到起租时间',{exact:false}).first().waitFor();
    assert.equal(await page.locator('[data-act="enter"]').count(),0,'future start must forbid access after identity');
    await capture('15-Access-upcoming-still-closed','#content');
    assert.deepEqual(errors,[],'browser page errors');
   }finally{await ctx.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sha:process.env.GITHUB_SHA||'',cases:results,caseCount:results.length},null,2));
  console.log('RC2-VIS04 BROWSER PASS '+results.length+' screenshots');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
