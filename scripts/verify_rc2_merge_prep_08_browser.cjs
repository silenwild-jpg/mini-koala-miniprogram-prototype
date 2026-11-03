#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),out=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-08');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const srv=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=path.resolve(root,'.'+name);if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(f,(e,data)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}).end(data))});
const base='http://127.0.0.1:4428/prototype/parallel/core-journey-fix-01/demo/';
const output=[];
const km=s=>Number.parseFloat(String(s.distance).replace('km',''));
async function current(page){return page.evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());}
(async()=>{await new Promise(ok=>srv.listen(4428,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const [width,height] of [[375,812],[390,844]]){
 const ctx=await browser.newContext({viewport:{width,height}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'index.html?page=S01&s01_r2=1');
 const r2=page.frameLocator('#s01-r2-frame');
 await r2.locator('.store-card').first().waitFor();
 let original=await current(page);
 assert.equal(original.distanceVerified,false);
 assert.equal(original.distanceSortSource,'STABLE_DEMO_DISTANCE');
 assert.equal(original.filterActive[1],false);
 assert.equal(await r2.locator('.filter').count(),4);
 assert(original.stores.every(s=>/^\d+[.]\d+km$/.test(s.distance)));
 // Selecting distance must genuinely reorder by displayed kilometers, not by current card index.
 await r2.locator('.filter').nth(1).click();
 let sorted=await current(page);
 assert.equal(sorted.distanceVerified,false,'demo sort may not set trusted geolocation');
 assert.equal(sorted.distanceSortSource,'STABLE_DEMO_DISTANCE');
 assert.equal(sorted.filterActive[1],true);
 assert.equal(sorted.filterLabels[1],'距离优先');
 assert.equal(sorted.filterActive[0],false,'no redundant selected state on sort field');
 assert(km(sorted.stores[0])<=km(sorted.stores[1]),'first visible store should be nearest');
 assert.equal(await r2.locator('.filter').nth(1).getAttribute('aria-pressed'),'true');
 const storeDistance=new Map([...original.stores,...sorted.stores].map(s=>[s.id,s.distance]));
 assert(sorted.stores.every(s=>storeDistance.get(s.id)===s.distance),'card rank must not change per-store km');
 const bounds=await r2.locator('html').evaluate(el=>({scrollWidth:el.scrollWidth,clientWidth:document.documentElement.clientWidth}));
 assert(bounds.scrollWidth<=bounds.clientWidth+4,'horizontal overflow after sorting');
 await page.screenshot({path:path.join(out,'s01-distance-active-'+width+'.png'),fullPage:true});
 // Persist across refresh, including no TDZ crash when reading saved sort.
 await page.reload();
 await r2.locator('.store-card').first().waitFor();
 let refreshed=await current(page);
 assert.equal(refreshed.filterActive[1],true,'distance selection not persisted after reload');
 assert(refreshed.stores.every(s=>storeDistance.get(s.id)===s.distance));
 assert(km(refreshed.stores[0])<=km(refreshed.stores[1]));
 await r2.locator('.filter').nth(0).click();
 await page.locator('button[data-action="setSort"][data-value="recommended"]').click();
 const reset=await current(page);
 assert.equal(reset.filterActive[1],false);
 assert.equal(reset.distanceVerified,false);
 await r2.locator('.filter').nth(0).click();
 await page.locator('button[data-action="setSort"][data-value="distance"]').click();
 const menuSort=await current(page);
 assert.equal(menuSort.filterActive[1],true,'sort menu and distance tab must share state');
 assert(km(menuSort.stores[0])<=km(menuSort.stores[1]));
 // Open matching store after distance sort and return; same store ID remains tied to its kilometers.
 const id=menuSort.stores[0].id;
 await r2.locator('.store-card').first().click();
 await page.locator('#screen.page-S02').waitFor();
 assert.equal(await page.evaluate(()=>window.SIM_DEMO.core.state().storeId),id);
 await page.locator('button[aria-label="返回门店列表"]').click();
 await r2.locator('.store-card').first().waitFor();
 const returned=await current(page);
 assert.equal(returned.filterActive[1],true);
 assert.equal(returned.stores[0].id,id);
 assert.equal(returned.stores[0].distance,storeDistance.get(id));
 assert.deepEqual(errors,[]);
 output.push({viewport:width+'x'+height,decision:'R2_DEMO_DISTANCE_SORT',trustedLocation:false,sortedKm:sorted.stores.map(s=>s.distance),reloaded:true,reset:true,fromMenu:true,storeReturn:true,errors:0});
 await ctx.close();
 // Separate browser context: old/opted-out S01 still requires verified location; never silently alter real flow.
 const other=await browser.newContext({viewport:{width,height}}),legacy=await other.newPage(),legacyErrors=[];
 legacy.on('pageerror',e=>legacyErrors.push(e.message));
 await legacy.goto(base+'index.html?page=S01&s01_r2=0');
 await legacy.locator('#screen.page-S01').waitFor();
 assert.equal(await legacy.locator('#s01-r2-frame').count(),0);
 await legacy.locator('button[data-action="setSort"][data-value="distance"]').click();
 const msg=await legacy.locator('#screen').innerText();
 assert.match(msg,/尚未取得出发位置/,'legacy sort must keep live-location guard');
 assert.deepEqual(legacyErrors,[]);
 await other.close();
}
fs.writeFileSync(path.join(out,'distance-results.json'),JSON.stringify({status:'PASS',cases:output,hifi06:'ABANDONED',visualSignoff:'TECHNICAL_ONLY',mergeEligible:false},null,2));
console.log('RC2_MERGE_PREP_08_BROWSER_PASS',JSON.stringify(output));
}finally{await browser.close();}
})().catch(e=>{console.error('RC2_MERGE_PREP_08_BROWSER_FAILED',e);process.exitCode=1;}).finally(()=>srv.close());
