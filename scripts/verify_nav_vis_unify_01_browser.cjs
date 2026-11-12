#!/usr/bin/env node
'use strict';
/* NAV-VIS-UNIFY-01: read-only mobile navigation source audit; never mutates UI. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/nav-vis-unify-01');
const host='http://127.0.0.1:4795',prefix='/prototype/parallel/core-journey-fix-01/demo/';
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let f;try{f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}catch{return res.writeHead(400).end();}
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(err,b)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}).end(b));
});
const labels=['首页','附近门店','预约订单','我的'];
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const version=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 assert.equal(version.source_sha,process.env.GITHUB_SHA,'different SHA in review bundle');
 assert.equal(version.source_branch,process.env.GITHUB_REF_NAME,'different source branch');
 assert.equal(version.source_pr,154,'must run off PR #154');
 await new Promise(done=>server.listen(4795,'127.0.0.1',done));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const result=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},locale:'zh-CN',deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(host+prefix+'home.html',{waitUntil:'domcontentloaded'});
   await page.locator('#navPhoto').waitFor({state:'visible'});
   await page.locator('#navPhoto').evaluate(async img=>{if(!img.complete||!img.naturalWidth)await img.decode();});
   const h01=await page.locator('.footer-nav').evaluate(node=>{
    const img=node.querySelector('#navPhoto');
    const bbox=e=>{const r=e.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1)}};
    return {asset:img.getAttribute('src'),size:[img.naturalWidth,img.naturalHeight],navBox:bbox(node),
      links:[...node.querySelectorAll('button')].map(b=>({label:b.getAttribute('aria-label'),box:bbox(b),
        pointer:getComputedStyle(b).pointerEvents,visible:getComputedStyle(b).visibility}))};
   });
   assert(h01.asset.includes('nav_original_'+width),'original H01 artboard nav asset was changed');
   assert.deepEqual(h01.links.map(x=>x.label),labels);
   assert(h01.links.every(x=>x.box.width>=44&&x.box.height>=44),'H01 touch target smaller than 44x44');
   assert(h01.links.every(x=>x.box.y>=0&&x.box.y+x.box.height<=height+1),'H01 hotspot outside viewport');
   await page.screenshot({path:path.join(out,width+'-01-H01-marketing.png')});
   const fetchAppNav=async target=>{
    await page.goto(host+prefix+'index.html?page='+target+'&s01_r2=1',{waitUntil:'domcontentloaded'});
    await page.locator('.bottom-nav .bottom-item').first().waitFor({state:'visible',timeout:16000});
    const n=await page.locator('.bottom-nav').evaluate(nav=>{
     const bbox=e=>{const r=e.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1)}};
     return {box:bbox(nav),items:[...nav.querySelectorAll('.bottom-item')].map(b=>{
       const img=b.querySelector('img');return {label:b.textContent.trim(),route:b.dataset.action,value:b.dataset.value,
        active:b.classList.contains('active'),icon:img?.getAttribute('src'),box:bbox(b),
        iconBox:img?bbox(img):null,computedColor:getComputedStyle(b).color,iconFilter:img?getComputedStyle(img).filter:'',
        accessibleName:b.getAttribute('aria-label'),imageDecoded:!!(img&&img.complete&&img.naturalWidth>0)};
     })};
    });
    assert.deepEqual(n.items.map(x=>x.label),labels,'four item wording/order changed');
    assert.deepEqual(n.items.map(x=>x.active),target==='S01'?[false,true,false,false]:[false,false,false,true],
      'selected state must follow current route');
    assert(n.items.every(x=>x.icon?.includes('vis07-nav-')&&x.imageDecoded),'VIS07 icon source or decode changed');
    assert(n.items.every(x=>x.box.width>=44&&x.box.height>=44),'tap targets under 44x44');
    assert(n.items.every(x=>x.box.y>=0&&x.box.y+x.box.height<=height+1),'nav element outside viewport');
    return n;
   };
   const s01=await fetchAppNav('S01');
   await page.screenshot({path:path.join(out,width+'-02-S01-active.png')});
   const m01=await fetchAppNav('M01');
   await page.screenshot({path:path.join(out,width+'-03-M01-active.png')});
   // The third action is a two-choice menu, not an independent storage-search tab.
   await page.locator('.bottom-nav [data-action="navBooking"]').click();
   const modal=page.locator('.control-sheet[role="dialog"]');await modal.waitFor({state:'visible'});
   const menuText=await modal.innerText();
   assert(menuText.includes('预约用仓')&&menuText.includes('立即下单'),'third tab lost booking/quick dual intent');
   assert.equal(await modal.locator('[data-action="go"][data-value="BOOKING"]').count(),1);
   assert.equal(await modal.locator('[data-action="go"][data-value="QUICK"]').count(),1);
   await page.screenshot({path:path.join(out,width+'-04-appointment-menu.png')});
   await modal.locator('[data-action="go"][data-value="BOOKING"]').click();
   await page.waitForURL(/page=BOOKING/,{timeout:12000});
   const bookingPath=new URL(page.url()).searchParams.get('page');
   assert.equal(bookingPath,'BOOKING');
   assert.deepEqual(errors,[],'client JS errors in navigation run');
   result.push({width,height,H01:h01,S01:s01,M01:m01,bookingPath,
     assetWarning:'H01 nav_original screenshot is a raster layer; app VIS07 PNGs are a different icon family',
     legacyAssetWarning:'NAV-ICON-01B labels HOME/FIND/STORES/ME are incompatible with HOME/NEARBY/APPOINTMENT/ME',
     verdict:'NAVIGATION_PASS_VISUAL_SOURCE_DIVERGENCE'});
   await context.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({
    source_sha:version.source_sha,source_pr:version.source_pr,steps:result.length*4,
    status:'FUNCTION_PASS_VISUAL_SOURCE_HOLD',results:result},null,2)+'\n');
  console.log('NAV_VIS_UNIFY_01_375_390_CAPTURE_PASS',result.length,'VISUAL_SOURCE_HOLD');
 }finally{await browser.close();await new Promise(done=>server.close(done));}
}
main().catch(e=>{console.error('NAV_VIS_UNIFY_01_FAIL',e.stack||String(e));process.exitCode=1;server.close();});
