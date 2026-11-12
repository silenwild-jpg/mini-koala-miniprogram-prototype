#!/usr/bin/env node
'use strict';
// Only prototype-state and visual smoke tests; never uses actual accounts or payment.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/m01-ia-03'),base='http://127.0.0.1:4697';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let dest;try{dest=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(dest,(err,bytes)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(dest)]||'application/octet-stream'}).end(bytes));});
const summary=[];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(r=>server.listen(4697,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROME_PATH?{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}:{})});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   async function shot(name){await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});}
   async function home(){await page.goto(base+'/index.html?page=M01',{waitUntil:'domcontentloaded'});await page.locator('.m01-profile').waitFor();}
   async function scrollBottom(){await page.evaluate(()=>{const x=document.querySelector('#scroll');if(x)x.scrollTop=x.scrollHeight;});await page.waitForTimeout(100);}
   try{
    await home();
    assert.equal(await page.locator('.m01-assets-heading').count(),0,'empty account must not show assets');
    assert.equal(await page.locator('.m01-profile-action').count(),1,'single account detail entry');
    assert.equal(await page.locator('.m01-row[data-value="account"]').count(),0,'no redundant account row');
    await shot('01-new-top');
    await scrollBottom();await shot('02-new-bottom');
    const seeded=await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;
      try{
       c.setScenario('normal');c.setRequirement(3,12,true);c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
       const choices=c.matchingUnits().filter(x=>x.volume>=3);if(choices.length<2)throw Error('NEED_2_AVAILABLE_UNITS');
       function paid(u){
        c.setRequirement(3,12,true);c.select([u.id]);c.setDate(c.today());c.quote();const o=c.submit();
        c.pay(o.id,'success');c.identity(o.id,'success');return o;
       }
       const first=paid(choices[0]);
       b.persist();b.navigate('M01');
       return {first:first.id,firstUnit:choices[0].id};
      }catch(err){return {error:err.message};}
    });
    assert(!seeded.error,'cannot create an active order: '+seeded.error);
    await page.locator('.m01-assets-heading').waitFor();
    assert.equal(await page.locator('.m01-asset-row').count(),1);
    assert.equal(await page.locator('.m01-task').count(),0,'active rental must not duplicate passive task card');
    const active=await page.locator('.m01-asset-row').innerText();
    assert.match(active,/m³/,'code and capacity visible');
    assert.match(active,/租用中/);
    await shot('03-active-asset');
    const activeOrder=seeded.first;
    await page.locator('.m01-asset-row').first().click();
    await page.locator('.mk-order-details').waitFor();
    const detail=await page.evaluate(()=>window.SIM_DEMO.core.state().orders.find(x=>x.id===window.sessionStorage.getItem('mk_lifecycle_selected_order_v1')).id);
    assert.equal(detail,activeOrder,'asset row must go to the same O03 order');
    await page.evaluate(()=>window.SIM_DEMO.navigate('M01'));
    await page.locator('.m01-assets-heading').waitFor();
    const second=await page.evaluate(firstId=>{
      const b=window.SIM_DEMO,c=b.core;
      try{
       const choices=c.matchingUnits().filter(x=>x.volume>=3);
       const u=choices.find(x=>!c.state().orders.find(o=>o.id===firstId)?.unit_ids.includes(x.id));
       if(!u)throw Error('NO_SECOND_AVAILABLE_UNIT');
       c.setRequirement(3,12,true);c.select([u.id]);c.setDate(c.today());c.quote();
       const o=c.submit();c.pay(o.id,'success');c.identity(o.id,'success');b.persist();b.navigate('M01');
       return {id:o.id,unit:u.id};
      }catch(err){return {error:err.message};}
    },seeded.first);
    assert(!second.error,'cannot create a second active order: '+second.error);
    assert.equal(await page.locator('.m01-asset-row').count(),2);
    assert.match(await page.locator('.m01-assets-all').innerText(),/2处/);
    await shot('04-two-active-assets');
    await page.locator('.m01-assets-all').click();
    await page.locator('.m01-subhead').waitFor();
    assert.match(await page.locator('.m01-subhead').innerText(),/我的仓位/);
    assert.equal(await page.locator('.m01-assets-list-full .m01-asset-row').count(),2);
    await shot('05-all-active-assets');
    await page.locator('.m01-back').click();
    await page.locator('.m01-assets-heading').waitFor();
    const captured=await page.evaluate(()=>{
      const s=window.SIM_DEMO.core.state();
      s.leads.push({id:'LEAD_PERSON',type:'SIMULATED_BOOKING_LEAD',status:'saved_locally',address:'朝阳区',capacity_m3:3,term_months:12});
      s.leads.push({id:'LEAD_ADVISOR',type:'ADVISOR_CONSULTATION',status:'saved_locally',address:'海淀区'});
      s.enterpriseLeads.push({id:'LEAD_ENTERPRISE',type:'ENTERPRISE_REQUIREMENT',status:'saved_locally',location:'北京市',capacity_m3:8,term_months:12});
      sessionStorage.setItem('mk_independent_sim_v1',JSON.stringify(s));
      return s.leads.length+s.enterpriseLeads.length;
    });
    await home();
    assert.equal(await page.locator('.m01-row[data-value="booking"]').count(),1);
    const bookingRow=await page.locator('.m01-row[data-value="booking"]').innerText();
    assert.match(bookingRow,/3条记录/);
    await page.locator('.m01-row[data-value="booking"]').click();
    await page.locator('.m01-subhead').waitFor();
    const bookingText=await page.locator('.m01-subcontent').innerText();
    for(const label of ['预约用仓','顾问咨询','企业用仓'])assert(bookingText.includes(label),'missing lead category '+label);
    assert(!bookingText.includes('已预约成功')&&!bookingText.includes('已受理'),'must not imply CRM acceptance');
    await shot('06-three-lead-types');
    await home();
    await page.locator('.m01-row[data-value="recent"]').click();
    await page.locator('.m01-subhead').waitFor();
    assert.match(await page.locator('.m01-subcontent').innerText(),/最近参考/,'completed-order snapshot should not masquerade as active task');
    assert.equal(await page.locator('.m01-subcontent [data-action="m01Resume"]').count(),0);
    await shot('07-recent-demand-reference');
    await home();
    // Closed single order: completed lease should be history, not a live asset card.
    const closed=await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;
      try{
       c.setScenario('normal');c.setRequirement(3,12,true);c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
       const u=c.matchingUnits().find(x=>x.volume>=3);c.select([u.id]);c.setDate(c.today());c.quote();
       const o=c.submit();c.pay(o.id,'success');c.identity(o.id,'success');
       c.lifecycleRequestExit(o.id,'early',c.today());c.lifecycleRequestInspection(o.id);
       c.lifecycleReviewInspection(o.id,'passed',true);c.lifecycleReviewRefund(o.id,true);
       b.persist();b.navigate('M01');return {id:o.id};
      }catch(err){return {error:err.message};}
    });
    assert(!closed.error,'cannot close lease: '+closed.error);
    assert.equal(await page.locator('.m01-assets-heading').count(),0);
    assert.equal(await page.locator('.m01-task').count(),0,'no empty passive historical hero');
    assert.match(await page.locator('.m01-row[data-value="orders"]').innerText(),/1笔订单/);
    await shot('08-closed-history');
    const geometry=await page.evaluate(()=>{
      const root=document.querySelector('#scroll')||document.documentElement;
      const buttons=[...document.querySelectorAll('.m01-surface button')].filter(x=>x.getBoundingClientRect().height>0).map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}));
      const horizontalOverflow=Array.from(document.querySelectorAll('.m01-surface *')).some(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2);});
      return {screenWidth:document.documentElement.scrollWidth,buttons,horizontalOverflow,scrollHeight:root.scrollHeight};
    });
    assert(geometry.screenWidth<=width+2&&!geometry.horizontalOverflow,'horizontal overflow');
    assert(geometry.buttons.every(x=>x.w>=44&&x.h>=44),'undersized M01 action');
    assert.deepEqual(errors,[],'JavaScript errors');
    summary.push({width,height,assetCount:2,threeLeadTypes:true,closedHistory:true,linksSameOrder:true,overflow:false,jsErrors:0});
   }finally{await context.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(summary,null,2));
  console.log('M01-IA-03 375/390 PASS',JSON.stringify(summary));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
