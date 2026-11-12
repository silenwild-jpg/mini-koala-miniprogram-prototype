#!/usr/bin/env node
'use strict';
// RC2-UX-COPY-03: inspect direct legacy RESULT, O01 agreement, and phone gate.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-ux-copy-03');
const host='http://127.0.0.1:4791';
const base=host+'/prototype/parallel/core-journey-fix-01/demo/';
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let f;try{f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}
 catch{return res.writeHead(400).end();}
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(err,data)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}).end(data));
});
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const version=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 assert.equal(version.source_sha,process.env.GITHUB_SHA,'test source sha mismatch');
 assert.equal(version.source_branch,process.env.GITHUB_REF_NAME,'branch mismatch');
 assert.equal(version.source_pr,153,'source PR should be #153');
 await new Promise(resolve=>server.listen(4791,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const rows=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN'});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const visit=async route=>{await page.goto(base+'index.html?page='+route+'&s01_r2=1',{waitUntil:'domcontentloaded'});await page.locator('#screen').waitFor({state:'attached'});};
   const snap=async name=>page.screenshot({path:path.join(out,width+'-'+name+'.png')});
   // A direct URL without data must not falsely claim a booking or payment.
   await visit('RESULT');
   let txt=await page.locator('#screen').innerText();
   assert(txt.includes('暂无可查看的提交记录'),'empty RESULT falsely claims success');
   assert(!txt.includes('已提交')&&!txt.includes('模拟结果'),'empty RESULT copy regression');
   await snap('01-empty-result');
   rows.push({width,step:'empty-result',result:'PASS'});
   // A locally saved lead shows exactly the local persistence state.
   await page.evaluate(()=>{
     const b=window.SIM_DEMO,c=b.core;
     c.setContact('13800138000');
     c.saveLead('北京市朝阳区本地留资回归地址');
     b.persist();
     sessionStorage.setItem('mk_sim_result_kind','lead');
   });
   await page.reload({waitUntil:'domcontentloaded'});
   txt=await page.locator('#screen').innerText();
   assert(txt.includes('用仓需求已保存')&&txt.includes('尚未发送给顾问'),'lead result lacks truthful local status');
   assert(!txt.includes('模拟')&&!txt.includes('已由顾问联系'),'legacy lead copy remains');
   await snap('02-local-lead-result');
   rows.push({width,step:'local-lead-result',result:'PASS'});
   // Separate context isolates the order state from the saved lead.
   const oc=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN'});
   const orderPage=await oc.newPage(),orderErrors=[];
   orderPage.on('pageerror',e=>orderErrors.push(e.message));
   await orderPage.goto(base+'index.html?page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   const orderId=await orderPage.evaluate(()=>{
     const b=window.SIM_DEMO,c=b.core,F=c.fixture;
     const unit=F.units.find(u=>u.volume>=3&&u.status==='available');
     assertUnit(unit);
     c.setRequirement(unit.volume,12,true);
     c.select([unit.id]);c.setDate(c.today());
     c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
     c.quote();const order=c.submit();
     b.persist();b.navigate('RESULT');return order.id;
     function assertUnit(u){if(!u)throw Error('NO_AVAILABLE_UNIT')}
   });
   await orderPage.locator('#screen.page-RESULT').waitFor({state:'attached'});
   txt=await orderPage.locator('#screen').innerText();
   assert(txt.includes('订单待支付')&&txt.includes(orderId),'pending RESULT status mismatch');
   assert.equal(await orderPage.locator('[data-action="paySuccess"],[data-action="payFailed"]').count(),0,'legacy fake pay controls reintroduced');
   await orderPage.screenshot({path:path.join(out,width+'-03-pending-result.png')});
   rows.push({width,step:'pending-order-readonly',result:'PASS',id:orderId});
   // The record can still be inspected in the existing M01/O03 order flow.
   await orderPage.locator('[data-action="orderDetail"]').first().click();
   await orderPage.waitForURL(/page=O03/,{timeout:10000});
   rows.push({width,step:'order-detail-route',result:'PASS'});
   // When payment test state is recorded, do not assert actual money transfer.
   await orderPage.evaluate(id=>{
     const b=window.SIM_DEMO;b.core.pay(id,'success');b.persist();b.navigate('RESULT');
   },orderId);
   txt=await orderPage.locator('#screen').innerText();
   assert(txt.includes('付款流程已记录')&&txt.includes('未发生实际扣款'),'paid flow must not claim real charge');
   await orderPage.screenshot({path:path.join(out,width+'-04-payment-record.png')});
   rows.push({width,step:'payment-record-readonly',result:'PASS'});
   // O01 uses the active BR04 checkout, not the retired legacy RESULT buttons.
   await orderPage.evaluate(()=>window.SIM_DEMO.navigate('O01'));
   const orderFrame=orderPage.frameLocator('#br04-frame');
   await orderFrame.locator('[data-legal]').first().waitFor({state:'visible',timeout:15000});
   await orderFrame.locator('[data-legal]').first().click();
   const legal=orderFrame.locator('#scrim');
   await legal.waitFor({state:'visible'});
   const legalText=await legal.innerText();
   // The R2 copy-normalizer replaces the old internal text with a generic
   // “confirm order details” sentence. It is still not a readable agreement.
   const originalLegal=fs.readFileSync(path.resolve(__dirname,
     '../app/prototype/parallel/core-journey-fix-01/demo/br04/bridge.js'),'utf8');
   assert(originalLegal.includes('这里只展示内部模拟条款说明'),'legal source must stay marked placeholder until legal provides documents');
   assert(legalText.includes('请确认所选门店、仓位、租期与费用')||
     legalText.includes('内部模拟条款说明'),'unexpected legal source render');
   assert(legalText.length<260,'original legal modal unexpectedly replaced by full legal document; re-audit source');
   await orderPage.screenshot({path:path.join(out,width+'-05-legal-placeholder.png')});
   rows.push({width,step:'O01-legal',result:'REQUIRES_DOCUMENT',reviewOnly:true});
   await oc.close();
   // Current phone gate: customer controls visible, internal tester controls hidden.
   const authPage=await ctx.newPage();authPage.on('pageerror',e=>errors.push(e.message));
   await authPage.goto(base+'index.html?page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   await authPage.evaluate(()=>{
     const b=window.SIM_DEMO;b.core.requestPhone();b.core.resolvePhone('denied');
     b.persist();b.requestPhone('ORDER');
   });
   await authPage.locator('.mk-auth-overlay').waitFor({state:'visible',timeout:10000});
   assert(await authPage.locator('.mk-auth-settings').isHidden(),'debug verification settings leaked into customer UI');
   assert((await authPage.locator('.mk-auth-sheet').innerText()).includes('手机号快捷登录'),'phone gate absent');
   await authPage.screenshot({path:path.join(out,width+'-06-phone-gate.png')});
   await authPage.locator('[data-auth="close"]').last().click();
   rows.push({width,step:'phone-gate-preview',result:'PASS',isRealVerification:false});
   await authPage.close();
   assert.deepEqual(errors,[],'general JS errors');
   assert.deepEqual(orderErrors,[],'order JS errors');
   await ctx.close();
  }
  const final={source_sha:version.source_sha,source_pr:153,
    status:'TECH_PASS_WITH_LEGAL_HOLD',
    steps:rows.length,rows,
    knownHolds:['O01 service and privacy agreement are placeholders; neither can establish legal consent','WeChat and SMS backend not connected']};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(final,null,2)+'\n');
  console.log('RC2_UX_COPY_03_RESULT_AND_LEGAL_375_390_PASS',rows.length);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error('RC2_UX_COPY_03_FAIL',e.stack||String(e));process.exitCode=1;server.close();});
