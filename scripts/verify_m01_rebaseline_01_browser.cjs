#!/usr/bin/env node
'use strict';
// M01-REBASELINE-01: real Chromium page evidence, no deployment and no production claim.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/m01-rebaseline-01');
const host='http://127.0.0.1:4684';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let f;try{f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch(_){res.writeHead(400).end();return;}
  if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(f,(err,b)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}).end(b));
});
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  await new Promise(ok=>server.listen(4684,'127.0.0.1',ok));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const results=[];
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      try{
        await page.goto(host+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
        await page.locator('.m01-surface .m01-task').waitFor();
        assert.match(await page.locator('.m01-task').innerText(),/就近找个合适的仓位/);
        assert.equal(await page.locator('.m01-row').count(),10,'4 records + 4 service + 2 secondary');
        assert.equal(await page.locator('.bottom-nav').count(),1,'single app bottom nav');
        assert.equal(await page.locator('.m01-surface [class*="compare"]').count(),0,'no compare');
        await page.screenshot({path:path.join(out,'M01-empty-'+width+'.png'),fullPage:true});
        await page.locator('#scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;});
        assert.equal(await page.locator('.m01-row[data-value="services"]').count(),1,'rent-after entry missing');
        await page.screenshot({path:path.join(out,'M01-lower-'+width+'.png')});
        await page.locator('#scroll').evaluate(el=>{el.scrollTop=0;});
        await page.locator('.m01-row[data-value="orders"]').click();
        await page.locator('.m01-subhead').waitFor();
        assert.match(await page.locator('.m01-subhead').innerText(),/我的订单/);
        await page.locator('.m01-back').click();
        await page.locator('.m01-task').waitFor();
        // A confirmed demand must surface as resume, not a signed quote or an invented order.
        const demand=await page.evaluate(()=>{
          const b=window.SIM_DEMO,c=b.core;
          c.setScenario('normal');c.setRequirement(3,12,true);b.persist();b.navigate('M01');
          return c.state().requirement;
        });
        assert.equal(demand.capacity_m3,3);
        assert.match(await page.locator('.m01-task').innerText(),/继续找仓/);
        await page.screenshot({path:path.join(out,'M01-demand-'+width+'.png'),fullPage:true});
        // Use the same central core that drives O01, never create a fabricated M01-only order.
        const pending=await page.evaluate(()=>{
          const b=window.SIM_DEMO,c=b.core;
          try{
            c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
            const u=c.matchingUnits('SIM_BJ01')[0];if(!u)throw Error('NO_MATCHING_UNIT');
            c.select([u.id]);c.setDate(c.today());c.quote();const o=c.submit();
            b.persist();b.navigate('M01');return {id:o.id};
          }catch(e){return {error:e.message};}
        });
        assert(!pending.error,'central pending order setup: '+pending.error);
        assert.match(await page.locator('.m01-task').innerText(),/继续支付/);
        assert.match(await page.locator('.m01-task').innerText(),/应付¥/);
        await page.screenshot({path:path.join(out,'M01-pending-'+width+'.png'),fullPage:true});
        await page.locator('.m01-task .m01-primary-button').click();
        await page.locator('#br04-frame').waitFor();
        assert.match(await page.locator('#br04-frame').getAttribute('src'),/o01/,'continue payment must open O01 directly');
        await page.evaluate(()=>window.SIM_DEMO.navigate('M01'));
        await page.locator('.m01-task').waitFor();
        // Payment changes the central order and should replace the M01 primary task.
        const paid=await page.evaluate(id=>{
          const b=window.SIM_DEMO,c=b.core;
          try{c.pay(id,'success');b.persist();b.navigate('M01');return {ok:true};}
          catch(e){return {error:e.message};}
        },pending.id);
        assert(!paid.error,'central payment setup: '+paid.error);
        assert.match(await page.locator('.m01-task').innerText(),/完成身份验证/);
        await page.screenshot({path:path.join(out,'M01-identity-'+width+'.png'),fullPage:true});
        // Legacy identity page is an interim service detail, not a second first-level Mine page.
        await page.locator('.m01-task .m01-primary-button').click();
        await page.waitForURL(/account\.html\?view=identity/);
        assert.match(await page.locator('.account-header').innerText(),/身份验证/);
        await page.locator('.account-header a').first().click();
        await page.waitForURL(/index\.html\?page=M01/);
        await page.locator('.m01-task').waitFor();
        assert.match(await page.locator('.m01-task').innerText(),/完成身份验证/);
        const geom=await page.evaluate(()=>{
          const w=document.documentElement.scrollWidth;
          const hit=[...document.querySelectorAll('.m01-surface button')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({text:e.innerText,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));
          return {w,hit};
        });
        assert(geom.w<=width+2,'horizontal overflow at '+width+'px '+geom.w);
        assert(geom.hit.every(c=>c.w>=44&&c.h>=44),'small click target '+JSON.stringify(geom.hit.filter(c=>c.w<44||c.h<44)));
        assert.deepEqual(errors,[],'browser JS errors');
        results.push({width,height,pending:pending.id,hitCount:geom.hit.length,horizontalOverflow:false,jsErrors:errors.length});
      }finally{await context.close();}
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
    console.log('M01 375/390 page and state checks PASS',JSON.stringify(results));
  }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(err=>{console.error(err);process.exitCode=1;});
