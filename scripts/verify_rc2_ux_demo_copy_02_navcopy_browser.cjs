#!/usr/bin/env node
'use strict';
// RC2-SINGLE-CANDIDATE-05: frozen nav source and duplicate-copy audit, no page redesign.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-ux-demo-copy-02-navcopy');
const host='http://127.0.0.1:4765',prefix='/prototype/parallel/core-journey-fix-01/demo/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const srv=http.createServer((req,res)=>{
 let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{return res.writeHead(400).end();}
 if(!fp.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(fp,(e,b)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(b));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>srv.listen(4765,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const rows=[];
 try{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json')));
  assert.equal(manifest.source_sha,process.env.GITHUB_SHA,'artifact is not same SHA');
  assert.equal(manifest.source_branch,process.env.GITHUB_REF_NAME,'branch mismatch');
  assert.equal(manifest.source_pr,151,'this candidate must trace to PR150');
  for(const [w,h] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN',deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(host+prefix+'home.html',{waitUntil:'domcontentloaded'});
   await page.locator('#navPhoto').waitFor({state:'attached'});
   const marketingSource=await page.locator('#navPhoto').getAttribute('src');
   assert(marketingSource&&marketingSource.includes('nav_original'),'marketing approved photo nav source changed');
   await page.screenshot({path:path.join(out,w+'-H01-marketing.png')});
   await page.goto(host+prefix+'index.html?page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   await page.locator('.bottom-nav .bottom-item').first().waitFor({state:'visible'});
   const nav=await page.locator('.bottom-nav .bottom-item').evaluateAll(nodes=>nodes.map(n=>({
    label:n.textContent.trim(),icon:n.querySelector('img')?.getAttribute('src'),action:n.dataset.action,
    height:Math.round(n.getBoundingClientRect().height)
   })));
   assert.deepEqual(nav.map(n=>n.label),['首页','附近门店','预约订单','我的']);
   assert(nav.every(n=>n.icon?.includes('vis07-nav-')),'locked app icon asset changed');
   assert.equal(nav.length,4);
   await page.screenshot({path:path.join(out,w+'-S01-nav.png')});
   await page.locator('.bottom-nav [data-action="navBooking"]').click();
   const modal=page.locator('.control-sheet[role="dialog"]');
   await modal.waitFor({state:'visible'});
   const modalText=await modal.innerText();
   assert(modalText.includes('预约与下单')&&modalText.includes('预约用仓')&&modalText.includes('立即下单'),'booking menu actions missing');
   assert(!modalText.includes('预约只需用仓地址')&&!modalText.includes('立即下单先选'),'duplicate explanatory copy returned');
   assert.equal(await modal.locator('[data-action="go"][data-value="BOOKING"]').count(),1);
   assert.equal(await modal.locator('[data-action="go"][data-value="QUICK"]').count(),1);
   await page.screenshot({path:path.join(out,w+'-booking-menu.png')});
   await modal.locator('[data-action="go"][data-value="QUICK"]').click();
   await page.waitForURL(/page=QUICK/,{timeout:10000});
   const quick=page.url();
   await page.goto(host+prefix+'index.html?page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   await page.locator('.bottom-nav [data-action="navBooking"]').click();
   await page.locator('.control-sheet [data-action="go"][data-value="BOOKING"]').click();
   await page.waitForURL(/page=BOOKING/,{timeout:10000});
   const booking=page.url();
   assert.deepEqual(errors,[],'JS error in customer nav menu');
   rows.push({width:w,height:h,marketingNavImage:marketingSource,appNavIcons:nav,quick,booking,status:'PASS',
    visualDecision:'H01 snapshot icons and app vis07 icons deliberately not auto-normalized'});
   await ctx.close();
  }
  const result={source_sha:manifest.source_sha,source_pr:151,pass:rows.length,fail:0,rows};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
  console.log('RC2_05_NAV_COPY_375_390_PASS '+JSON.stringify(rows.map(r=>({width:r.width,status:r.status}))));
 }finally{await browser.close();await new Promise(ok=>srv.close(ok));}
})().catch(e=>{console.error('RC2_05_NAV_COPY_FAIL',e.stack||String(e));process.exitCode=1});
