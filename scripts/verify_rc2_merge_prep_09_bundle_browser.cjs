#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const output=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-09'),root=path.join(output,'site');
const summary=JSON.parse(fs.readFileSync(path.join(output,'build-summary.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(output,'manifest.json'),'utf8'));
assert.equal(summary.hifi06,'ABANDONED_NOT_BUNDLED');
assert.equal(summary.main_merge_allowed,false);assert.equal(summary.deployment_allowed,false);
assert.equal(summary.commit,cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
const fileIndex=new Set(manifest.map(x=>x.path));
for(const p of ['index.html','central-review-02g.html','prototype/parallel/core-journey-fix-01/demo/s01-r2-live.html','prototype/parallel/core-journey-fix-01/demo/cap.html','prototype/parallel/core-journey-fix-01/demo/items.html'])assert(fileIndex.has(p),'missing bundle entry '+p);
assert(![...fileIndex].some(x=>/hifi.?06|mk-h01-central-route-connect03|\.md$|netlify\.toml|node_modules/i.test(x)),'retired or non-runtime material bundled');
for(const x of manifest){const b=fs.readFileSync(path.join(root,x.path));const digest=require('node:crypto').createHash('sha256').update(b).digest('hex');assert.equal(digest,x.sha256,'bundle hash mismatch '+x.path);}
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),destination=path.resolve(root,'.'+pathname);
 if(!destination.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(destination,(e,data)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(destination)]||'application/octet-stream'}).end(data));
});
const base='http://127.0.0.1:4439/';
(async()=>{
 await new Promise(resolve=>server.listen(4439,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const cases=[];
 try{
  for(const [w,h] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1}),page=await ctx.newPage(),jsErrors=[];
   page.on('pageerror',e=>jsErrors.push(e.message));
   await page.goto(base+'index.html',{waitUntil:'load'});
   assert.match(await page.locator('h1').innerText(),/迷你考拉仓/);
   const s01=page.locator('a[href*="page=S01&s01_r2=1"]').first();
   await s01.click();
   await page.waitForURL(/central-review-02g\.html/);
   const host=page.frameLocator('#central-host'),r2=host.frameLocator('#s01-r2-frame');
   await r2.locator('.store-card').first().waitFor();
   assert.equal(await r2.locator('.filter').count(),4);
   assert.equal(await r2.locator('.nav-more').count(),1);
   const before=await host.locator('body').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
   assert.equal(before.distanceVerified,false);
   assert.equal(before.distanceSortSource,'STABLE_DEMO_DISTANCE');
   assert(before.stores.length>=2);
   assert(before.stores.every(s=>/^\d+[.]\d+km$/.test(s.distance)));
   await r2.locator('.filter').nth(1).click();
   const selected=await host.locator('body').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
   assert.equal(selected.filterActive[1],true);
   assert(Number.parseFloat(selected.stores[0].distance)<=Number.parseFloat(selected.stores[1].distance));
   await page.screenshot({path:path.join(output,'isolated-S01-distance-'+w+'.png'),fullPage:true});
   // Input route smoke using the actual packaged central wrapper and its nested iframe.
   await page.goto(base+'central-review-02g.html?catalog=sim&page=CAP');
   const cap=page.frameLocator('#central-host');
   await cap.locator('body[data-journey-ready="true"]').waitFor();
   await cap.locator('#capacity').waitFor();
   await page.goto(base+'central-review-02g.html?catalog=sim&page=ITEMS');
   const items=page.frameLocator('#central-host');
   await items.locator('body[data-journey-ready="true"]').waitFor();
   await items.locator('#footerBtn').waitFor();
   // The legacy MK data source must remain selectable without switching ID namespaces.
   await page.goto(base+'central-review-02g.html?catalog=mk&page=S01&s01_r2=1');
   const mk=page.frameLocator('#central-host');
   await mk.frameLocator('#s01-r2-frame').locator('.filter').first().waitFor();
   const catalog=await page.locator('body').getAttribute('data-catalog');
   assert.equal(catalog,'MK');
   assert.deepEqual(jsErrors,[]);
   cases.push({viewport:w+'x'+h,source_sha:summary.commit,entry:'RC2_ARTIFACT_LOCAL',r2FourFilters:true,sort:'DEMO_DISTANCE_ENABLED',cap:true,items:true,mk_catalog:true,jsErrors:0});
   await ctx.close();
  }
  const receipt={status:'ISOLATED_BUNDLE_SMOKE_PASS',candidate:summary.version,source_commit:summary.commit,bundle_files:manifest.length,cases,visual_signoff:'NOT_FINAL',formal_merge_allowed:false,live_deployment:false};
  fs.writeFileSync(path.join(output,'isolated-bundle-smoke.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log('RC2_MERGE_PREP_09_BUNDLE_BROWSER_PASS',JSON.stringify(cases));
 }finally{await browser.close();}
})().catch(err=>{console.error('RC2_MERGE_PREP_09_BUNDLE_BROWSER_FAIL',err);process.exitCode=1}).finally(()=>server.close());
