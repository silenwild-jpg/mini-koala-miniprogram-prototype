#!/usr/bin/env node
'use strict';
// Targeted visual signoff. Real Chromium screenshots at 375/390, no deployment or external data.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/rc2-final-vis-signoff-02');
const base='http://127.0.0.1:4703',types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let target;try{target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(target,(e,bytes)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'}).end(bytes));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(4703,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROME_PATH?{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}:{})});
 const results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base+'/index.html?page=S02',{waitUntil:'domcontentloaded'});
    const ids=await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;
      const store=c.fixture.stores.find(s=>s.status==='open'&&c.fixture.units.some(u=>u.store_id===s.id&&u.volume===3.5&&u.status==='available'));
      if(!store)throw Error('NO_STORE_35');
      const rows=c.fixture.units.filter(u=>u.store_id===store.id);
      b.navigate('S02',store.id);
      return {store:store.id,mini:rows.find(u=>u.volume===0.8)?.id,medium:rows.find(u=>u.volume===3.5)?.id,large:rows.find(u=>u.volume===5)?.id};
    });
    assert(ids.mini&&ids.medium&&ids.large,'fixture missing sizes');
    const row=page.locator('.unit-row[data-unit="'+ids.medium+'"]');
    await row.waitFor();await row.scrollIntoViewIfNeeded();
    assert.match(await row.locator('.unit-spec').innerText(),/1\.4 × 1 × 2\.5m/,'3.5m³ warehouse height');
    const mini=page.locator('.unit-row[data-unit="'+ids.mini+'"]'),large=page.locator('.unit-row[data-unit="'+ids.large+'"]');
    assert.match(await mini.locator('.unit-spec').innerText(),/2m/,'mini warehouse retains 2m height');
    assert.match(await large.locator('.unit-spec').innerText(),/2\.5m/,'5m³ warehouse 2.5m height');
    await page.screenshot({path:path.join(out,'01-S02-3_5m3-height-'+width+'.png')});
    const confirmed=await page.evaluate((storeId)=>{
      const b=window.SIM_DEMO,c=b.core;
      c.setRequirement(3.5,12,true);b.persist();b.navigate('S02',storeId);
      const u=c.fixture.units.find(x=>x.store_id===storeId&&x.volume===3.5);
      return {id:u.id,amount:c.amounts([u.id],12)};
    },ids.store);
    const reloaded=page.locator('.unit-row[data-unit="'+confirmed.id+'"]');
    await reloaded.waitFor();await reloaded.scrollIntoViewIfNeeded();
    assert.match(await reloaded.locator('.unit-spec').innerText(),/2\.5m/);
    const price=await reloaded.locator('.unit-price').innerText();
    assert(price.includes('¥')&&price.includes('12个月'),'term-confirmed price visible');
    assert(!price.includes('.00'),'RC2 integer price should not show cents');
    await page.screenshot({path:path.join(out,'02-S02-confirmed-12month-'+width+'.png')});
    const overflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));
    assert(overflow.doc<=overflow.view+2,'viewport horizontal overflow');
    assert.deepEqual(errors,[],'page JS errors');
    results.push({width,height,store:ids.store,unit:ids.medium,dimensions:'1.4 × 1 × 2.5m',oneMonth:confirmed.amount.monthly_average,priceText:price,jsErrors:0,overflow:false});
   }finally{await ctx.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sha:process.env.GITHUB_SHA||'',results},null,2));
  console.log('RC2-FINAL-VIS-SIGNOFF-02-S02 PASS '+JSON.stringify(results));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
