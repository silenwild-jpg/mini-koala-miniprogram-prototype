#!/usr/bin/env node
'use strict';
// RC2 single-SHA page smoke: frozen H01/S01/S02/S5 + newly integrated M01.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/rc2-h01-m01-integration-01');
const base='http://127.0.0.1:4699',mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let target;try{target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(target,(err,buf)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}).end(buf));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4699,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROME_PATH?{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}:{})});
 const results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const shot=async(name)=>page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});
   try{
    await page.goto(base+'/home.html',{waitUntil:'domcontentloaded'});
    await page.locator('#h01FlowPrimary').waitFor({state:'attached'});assert(await page.locator('.footer-nav').count());
    await shot('01-h01-home');
    await page.goto(base+'/index.html?page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    const frame=page.frameLocator('#s01-r2-frame');await frame.locator('body').waitFor();
    const list=await frame.locator('body').innerText();assert(list.includes('排序')&&list.includes('距离')&&list.includes('服务'),'S01 3 filters must survive');
    await shot('02-s01-nearby');
    const target=await page.evaluate(()=>window.SIM_DEMO.core.fixture.stores.find(x=>x.city==='北京'&&x.status==='open')?.id);
    assert(target,'expected Beijing fixture store');
    await page.goto(base+'/index.html?page=S02&store='+encodeURIComponent(target),{waitUntil:'domcontentloaded'});
    await page.locator('#screen .hero').waitFor();const detail=await page.locator('#screen').innerText();
    assert(detail.includes('存取时间'),'S02 store hours lost');
    await shot('03-s02-detail');
    await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;
      c.setRequirement(3,12,true);b.persist();b.navigate('S5');
    });
    const s5=page.frameLocator('#br04-frame');await s5.locator('#artboard').waitFor();
    const s5Text=await s5.locator('body').innerText();
    assert(/用仓|推荐|仓位/.test(s5Text),'S5 entry not loaded');
    assert.equal(await s5.locator('#s5-compare').count(),0,'forbidden compare returned');
    await shot('04-s5-recommendation');
    await page.evaluate(()=>window.SIM_DEMO.navigate('M01'));
    await page.locator('.m01-profile').waitFor();
    assert(await page.locator('.m01-row[data-value="orders"]').count(),'M01 records absent');
    await shot('05-m01-profile');
    const horiz=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert(horiz.scrollWidth<=width+2,'M01 horizontal overflow');
    assert.deepEqual(errors,[],'JS page errors');
    results.push({width,height,h01:true,s01_three_filters:true,s02_store_hours:true,s5_visible:true,m01:true,jsErrors:0,overflow:false});
   }finally{await context.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({source_sha:process.env.GITHUB_SHA||'',results},null,2));
  console.log('RC2-H01-M01-INTEGRATION-01 PAGE SMOKE PASS '+JSON.stringify(results));
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e);process.exitCode=1;});
