'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../app'),out=path.resolve(process.env.CC01C_EVIDENCE||'release-evidence/content-close-01c');fs.mkdirSync(out,{recursive:true});
const sha=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty=cp.execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b));});
const results=[],url='http://127.0.0.1:4817/prototype/parallel/core-journey-fix-01/demo/';
(async()=>{
 await new Promise(ok=>server.listen(4817,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROME_PATH?{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}:{})});
 try{for(const [width,height] of [[375,812],[390,844]]){
  async function run(name,task){const ctx=await browser.newContext({viewport:{width,height},locale:'zh-CN',timezoneId:'Asia/Shanghai'});await ctx.tracing.start({screenshots:true,snapshots:true});const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const shot=async label=>{assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'horizontal overflow');await page.screenshot({path:path.join(out,width+'-'+name+'-'+label+'.png')});};
   try{await task(page,shot);assert.deepEqual(errors,[]);results.push({width,height,name,status:'PASS',sha});}
   catch(e){await shot('FAILED').catch(()=>{});results.push({width,height,name,status:'FAIL',error:e.stack,errors,sha});console.error(width,name,e.message);}
   finally{await ctx.tracing.stop({path:path.join(out,width+'-'+name+'.zip')});await ctx.close();}}
  for(const kind of ['booking','advisor'])await run(kind,async(p,shot)=>{
   await p.goto(url+'index.html?page=BOOKING&review=1'+(kind==='advisor'?'&mode=advisor':''));const f=p.frameLocator('iframe');
   await f.locator('#reserve-contact').fill('13800000001');if(kind==='booking')await f.locator('#booking-address').fill('合成测试地址01');
   await f.locator('#note').fill('合成输入保留');await f.locator('[data-lead-scenario]').selectOption('fail_once');
   await f.locator('#submit').click();await f.locator('[data-state="SUBMITTING"]').waitFor();await shot('submitting');
   await f.locator('[data-state="FAILED_RETRYABLE"]').waitFor();assert.equal(await f.locator('#note').inputValue(),'合成输入保留');await shot('failed');
   const key=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_br04_ui_v2'))[new URLSearchParams(location.search).get('mode')==='advisor'?'advisor':'reserve'].leadRequest.key);
   await p.reload();await f.locator('[data-state="FAILED_RETRYABLE"]').waitFor();assert.equal(await f.locator('#note').inputValue(),'合成输入保留');
   await f.locator('#note').fill('失败后返回修改');
   await f.locator('#submit').click();await f.locator('#success').waitFor();
   assert.equal(await p.evaluate(()=>SIM_DEMO.core.state().leads.length),1);assert.equal(await p.evaluate(()=>SIM_DEMO.core.state().orders.length),0);await shot('success');
   assert.equal(await p.evaluate(()=>Object.keys(SIM_DEMO.core.state().leadRequestResults)[0]),key);
   await f.locator('#again').click();await f.locator('[data-lead-scenario]').selectOption('timeout_saved');await f.locator('#submit').click();await f.locator('[data-state="UNKNOWN_RESULT"]').waitFor();await shot('unknown');
   await p.reload();await f.locator('[data-lead-retry]').click();await f.locator('#success').waitFor();assert.equal(await p.evaluate(()=>SIM_DEMO.core.state().leads.length),2);
   await f.locator('#again').click();await f.locator('[data-lead-scenario]').selectOption('duplicate_success');
   await f.locator('#submit').evaluate(el=>{el.click();el.click();});await f.locator('#success').waitFor();assert.equal(await p.evaluate(()=>SIM_DEMO.core.state().leads.length),3);await shot('duplicate');
   await f.locator('#again').click();await f.locator('body').evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('synthetic quota failure','QuotaExceededError');};});
   await f.locator('#note').fill('仅页面保留');await f.locator('#submit').click();await f.locator('[data-state="STORAGE_ERROR"]').waitFor();assert.equal(await f.locator('#success').isVisible(),false);await shot('storage-error');
   await f.locator('body').evaluate(()=>Storage.prototype.setItem=window.originalSet);await f.locator('[data-lead-retry]').click();await f.locator('#success').waitFor();assert.equal(await p.evaluate(()=>SIM_DEMO.core.state().leads.length),4);
  });
  await run('storage-cold',async(p,shot)=>{
   await p.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('synthetic cold storage failure');};});
   await p.goto(url+'index.html?page=BOOKING');const f=p.frameLocator('iframe');await f.locator('#reserve-contact').fill('13800000001');await f.locator('#booking-address').fill('合成地址');await f.locator('#submit').click();await f.locator('[data-state="STORAGE_ERROR"]').waitFor();await f.locator('[data-state="STORAGE_ERROR"]').scrollIntoViewIfNeeded();await shot('booking');assert.equal(await p.evaluate(()=>SIM_DEMO.core.state().leads.length),0);
   await p.goto(url+'business.html');await p.locator('#phone').fill('13800000001');await p.locator('#submit').click();await p.locator('[data-state="STORAGE_ERROR"]').waitFor();await p.locator('[data-state="STORAGE_ERROR"]').scrollIntoViewIfNeeded();await shot('enterprise');
  });
  await run('enterprise',async(p,shot)=>{
   await p.goto(url+'business.html?review=1');await p.locator('#phone').fill('13800000001');await p.locator('#notes').fill('企业合成需求');
   await p.locator('[data-lead-scenario]').selectOption('fail_once');await p.locator('#submit').click();await p.locator('[data-state="FAILED_RETRYABLE"]').waitFor();await shot('failed');
   await p.locator('#notes').fill('失败后修改');await p.locator('#submit').evaluate(el=>{el.click();el.click();});await p.locator('.business-result:not([hidden])').waitFor();await shot('success');
   const read=()=>p.evaluate(()=>JSON.parse(sessionStorage.getItem('mk_independent_sim_v1')).enterpriseLeads);const id=(await read())[0].id;assert.equal((await read()).length,1);
   await p.locator('#business-result-close').click();await p.locator('#notes').fill('编辑原记录');await p.locator('[data-lead-scenario]').selectOption('duplicate_success');await p.locator('#submit').click();await p.locator('.business-result:not([hidden])').waitFor();assert.equal((await read()).length,1);assert.equal((await read())[0].id,id);assert.equal((await read())[0].notes,'编辑原记录');
   await p.reload();assert.equal(await p.locator('#notes').inputValue(),'编辑原记录');await shot('restored');
   await p.locator('#new-enterprise').click();await p.locator('[data-lead-scenario]').selectOption('timeout_saved');await p.locator('#submit').click();await p.locator('[data-state="UNKNOWN_RESULT"]').waitFor();await shot('unknown');await p.reload();await p.locator('[data-lead-retry]').click();await p.locator('.business-result:not([hidden])').waitFor();assert.equal((await read()).length,2);
   await p.locator('#business-result-close').click();await p.locator('#notes').fill('存储错误仍保留');await p.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('synthetic storage failure');};});await p.locator('#submit').click();await p.locator('[data-state="STORAGE_ERROR"]').waitFor();await shot('storage-error');assert.equal(await p.locator('.business-result').isVisible(),false);
   await p.evaluate(()=>Storage.prototype.setItem=window.originalSet);await p.locator('[data-lead-retry]').click();await p.locator('.business-result:not([hidden])').waitFor();assert.equal((await read()).length,2);
  });
  await run('deposit-invoice',async(p,shot)=>{
   await p.goto(url+'index.html?page=M01&review=1');const id=await p.evaluate(()=>{const b=SIM_DEMO;b.core.setScenario('lifeRefund');const id=b.core.state().orders.at(-1).id;b.persist();b.openOrder(id);b.navigate('DP01');return id;});
   await shot('processing');await p.locator('[data-action="demoRefundFail"]').click();assert.match(await p.locator('#screen').innerText(),/退款处理失败/);await shot('refund-failed');
   await p.goto(url+'index.html?page=DP01&order='+id);assert.equal(await p.locator('[data-action^="demoRefund"]').count(),0);assert.equal(await p.locator('[data-action="reviewRefund"]').count(),0);await p.locator('[data-action="refundProgress"]').click();await shot('customer-progress');
   await p.goto(url+'index.html?page=DP01&review=1&order='+id);await p.locator('[data-action="demoRefundResume"]').click();assert.equal(await p.evaluate(id=>SIM_DEMO.core.lifecycleView(id).deposit_status,id),'REFUND_PENDING');
   await p.evaluate(()=>SIM_DEMO.navigate('IV01'));await p.locator('#invoice-title').fill('合成发票抬头');await p.locator('#invoice-email').fill('qa@example.invalid');await p.locator('[data-action="requestInvoice"]').click();await p.locator('[data-action="demoInvoiceProcessing"]').click();await shot('invoice-processing');await p.locator('[data-action="demoInvoiceFail"]').click();await shot('invoice-failed');
   await p.goto(url+'index.html?page=IV01&order='+id);assert.equal(await p.locator('[data-action^="demoInvoice"]').count(),0);await p.locator('[id^="retry-title-"]').fill('更正合成抬头');await p.locator('[data-action="retryInvoice"]').click();assert.match(await p.locator('#screen').innerText(),/申请处理中/);await p.reload();const invoices=await p.evaluate(id=>SIM_DEMO.core.lifecycleView(id).invoices,id);assert.equal(invoices.length,1);assert.equal(invoices[0].title,'更正合成抬头');await shot('invoice-retry');
  });
  for(const mode of ['items','scenes'])await run(mode,async(p,shot)=>{
   await p.goto(url+'items.html');await p.locator('body[data-journey-ready="true"]').waitFor();if(mode==='scenes')await p.locator('#modeScenes').click();
   if(await p.locator('[data-browse]').count())await p.locator('[data-browse]').click();await p.locator('[data-step="1"]').first().click();
   const select=p.locator('[data-variant]').first();if(await select.count()){const choices=await select.locator('option').evaluateAll(els=>els.map(el=>el.value));if(choices.length>1)await select.selectOption(choices[1]);}
   await p.locator('[data-step="1"]').first().click();await p.locator('[data-step="-1"]').first().click();const state=await p.evaluate(()=>demo.getState());assert(state.volume>0);assert.equal(state.selected[0].quantity,1);await shot('estimate');
   await p.locator('.back').click();await p.waitForURL(/cap.html/);await shot('cap-return');await p.goBack();assert.deepEqual((await p.evaluate(()=>demo.getState())).selected,state.selected);
   await p.locator('#footerBtn').click();await p.locator('[data-term="6"]').click();await p.locator('#footerBtn').click();await p.waitForURL(/page=S5/);const req=await p.evaluate(()=>SIM_DEMO.core.state().requirement);assert.equal(req.term_months,6);assert.equal(req.term_confirmed,true);assert.deepEqual(req.items,state.selected);assert.equal(req.capacity_m3,Math.max(.5,state.volume));await shot('s5-consistent');
   // The approved S5 editor follows the original ITEMS source. Check that route,
   // then inspect CAP directly to verify its shared-demand refill independently.
   await p.frameLocator('iframe').locator('#modify').click();await p.waitForURL(/items.html/);assert.deepEqual((await p.evaluate(()=>demo.getState())).selected,state.selected);
   await p.goto(url+'cap.html');assert.equal(Number(await p.locator('#capacity').inputValue()),req.capacity_m3);assert.match(await p.locator('#summary').innerText(),/6/);await shot('cap-filled');
  });
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);results.push({status:'ERROR',error:e.stack});}).finally(()=>{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sha,dirty,browser:'actual HTTP Chromium',nativeWechat:'NOT TESTED',results},null,2));console.log(JSON.stringify(results));if(results.some(x=>x.status!=='PASS'))process.exitCode=1;server.close();});
