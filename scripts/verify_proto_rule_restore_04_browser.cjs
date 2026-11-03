#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const port=4494,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(target,(err,bytes)=>{if(err)res.writeHead(404).end('missing');else res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}).end(bytes);});
});
const cases=[];
(async()=>{
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',x=>errors.push(x.message));
   // The sole live S01 presentation is R2 high fidelity, including historical no-flag links.
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1');
   let app=page.frameLocator('#central-host');
   await app.frameLocator('#s01-r2-frame').locator('.filter').first().waitFor();
   assert.equal(await app.frameLocator('#s01-r2-frame').locator('.filter').count(),3);
   for(const q of ['','&s01_r2=0']){
     await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01'+q);
     app=page.frameLocator('#central-host');
     await app.locator('#screen.page-S01').waitFor();
     await app.frameLocator('#s01-r2-frame').locator('.filter').first().waitFor();
     assert.equal(await app.frameLocator('#s01-r2-frame').locator('.filter').count(),3,'S01 must always show three filters');
     assert.equal(await app.locator('.filter-btn').count(),0,'retired S01 list reappeared');
     assert.equal(await app.locator('#screen').evaluate(()=>new URLSearchParams(location.search).get('s01_r2')),'1','S01 inner URL not canonical');
   }
   await app.frameLocator('#s01-r2-frame').locator('.filter').nth(2).click();
   await app.locator('.control-sheet').getByText('服务筛选').waitFor();
   await app.locator('[data-action="setService"][data-value="all"]').click();
   cases.push({size:width,case:'canonical-single-S01-three-filters',result:'PASS'});
   // U01 deep link must discard stale unit/store/quote parameters.
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=U01&store=FAKE&unit=FAKE&price=1');
   await page.waitForURL(/page=S01.*legacy=u01/);
   const url=new URL(page.url());
   for(const key of ['unit','store','price'])assert.equal(url.searchParams.has(key),false,'retired selection leaked: '+key);
   assert.equal(await page.locator('.legacy-notice').isVisible(),true);
   app=page.frameLocator('#central-host');
   await app.frameLocator('#s01-r2-frame').locator('.filter').first().waitFor();
   assert.equal(await app.frameLocator('#s01-r2-frame').locator('.filter').count(),3);
   cases.push({size:width,case:'U01-deeplink-safe-S01-recovery',result:'PASS'});
   // Restore both map navigation controls on S5 without manufacturing a distance.
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1');
   app=page.frameLocator('#central-host');
   await app.locator('#screen').evaluate(()=>{window.SIM_DEMO.core.setRequirement(3,6,true);window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S5');});
   await app.locator('#screen.page-S5').waitFor();
   const s5=app.frameLocator('#br04-frame');
   await s5.locator('#main-buy').waitFor();
   assert.equal(await s5.locator('#navigate-main').isVisible(),true);
   assert.equal(await s5.locator('.minor-unit').isVisible(),true,'fixture must provide second recommendation');
   assert.equal(await s5.locator('#navigate-secondary').isVisible(),true,'second map navigation missing');
   assert.equal((await s5.locator('.distance-nav span').innerText()).trim(),'','unverified distance should stay absent');
   await page.screenshot({path:path.resolve(__dirname,'../release-evidence/rule-restore-04/s5-map-'+width+'.png'),fullPage:true});
   await s5.locator('.minor-unit').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.resolve(__dirname,'../release-evidence/rule-restore-04/s5-second-nav-'+width+'.png')});
   await s5.locator('#open-store-secondary').click();
   await app.locator('#screen.page-S02').waitFor();
   await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('S01'));
   await app.frameLocator('#s01-r2-frame').locator('.filter').first().waitFor();
   cases.push({size:width,case:'S5-second-map-and-R2-return',result:'PASS'});
   assert.deepEqual(errors,[],'browser errors: '+errors.join('; '));
   await ctx.close();
  }
  const out=path.resolve(__dirname,'../release-evidence/rule-restore-04/browser.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({result:'PASS',cases,visual_scope:'S01 three-filter screenshot technical + S5 CTA; no approved whole-page signoff'},null,2)+'\n');
  console.log('PROTO_RULE_RESTORE_04_BROWSER_PASS',JSON.stringify(cases));
 }finally{await browser.close();}
})().catch(e=>{console.error('PROTO_RULE_RESTORE_04_BROWSER_FAIL',e);process.exitCode=1;}).finally(()=>server.close());
