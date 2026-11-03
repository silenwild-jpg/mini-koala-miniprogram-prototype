#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site'),dir=path.resolve(__dirname,'../release-evidence/rule-restore-06'),port=4496,base='http://127.0.0.1:'+port;
fs.mkdirSync(dir,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const dest=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(dest,(e,b)=>{if(e)res.writeHead(404).end('missing');else res.writeHead(200,{'Content-Type':mime[path.extname(dest)]||'application/octet-stream'}).end(b);});});
const cases=[];
async function verifyS01(app,width,tag){
 await app.locator('#screen.page-S01').waitFor();
 const child=app.frameLocator('#s01-r2-frame');
 await child.locator('.filter').first().waitFor();
 assert.equal(await app.locator('#s01-r2-frame').count(),1,'S01 R2 frame absent: '+tag);
 assert.equal(await app.locator('.filter-btn').count(),0,'retired S01 layout reachable: '+tag);
 assert.deepEqual((await child.locator('.filter').allInnerTexts()).map(x=>x.trim()),['排序','距离','服务']);
 const info=await child.locator('.filters').evaluate(e=>{const box=e.getBoundingClientRect(),cs=getComputedStyle(e);return {columns:cs.gridTemplateColumns.trim().split(/\s+/).map(Number.parseFloat),width:box.width,scroll:document.documentElement.scrollWidth,viewport:window.innerWidth};});
 assert.equal(info.columns.length,3,'not three columns');
 assert(Math.max(...info.columns)-Math.min(...info.columns)<2,'unequal filter widths');
 assert(info.scroll<=info.viewport+2,'unexpected S01 horizontal overflow');
 assert(info.viewport<=width+1,'viewport mismatch');
 assert(await child.locator('.store-card').count()>0,'missing store cards');
 assert(await child.locator('.order').count()>0,'store unit CTA disappeared');
 const flags=await app.locator('#screen').evaluate(()=>({r2:new URLSearchParams(location.search).get('s01_r2'),page:new URLSearchParams(location.search).get('page')||'S01'}));
 assert.equal(flags.r2,'1');assert.equal(flags.page,'S01');
 return child;
}
(async()=>{
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await ctx.newPage(),jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=H01');
   let app=page.frameLocator('#central-host');
   await app.locator('#heroPhoto').waitFor();
   const visual=await app.locator('#heroPhoto').evaluate(async im=>{await im.decode();return {src:im.getAttribute('src'),width:im.naturalWidth,height:im.naturalHeight};});
   assert(visual.src.includes(width===375?'375':'390')&&visual.width>10,'H01 wrong approved-width hero source');
   for(const id of ['taskPhoto','navPhoto','belowImg'])assert(await app.locator('#'+id).evaluate(async el=>{try{await el.decode();return el.naturalWidth>0;}catch{return false;}}),'H01 visual source missing: '+id);
   assert.equal(await app.locator('.task-hotspots button[aria-label="找附近门店"]').count(),1);
   assert.equal(await app.locator('.task-hotspots button[aria-label="估算大小"]').count(),1);
   await page.screenshot({path:path.join(dir,'H01-runtime-'+width+'.png'),fullPage:true});
   await app.locator('.task-hotspots button[aria-label="找附近门店"]').click();
   let child=await verifyS01(app,width,'H01 button');
   await page.screenshot({path:path.join(dir,'S01-from-H01-'+width+'.png'),fullPage:true});
   const firstId=await child.locator('.store-card[data-store-id]').first().getAttribute('data-store-id');
   await child.locator('.store-card[data-store-id]').first().click();
   await app.locator('#screen.page-S02').waitFor();
   assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().storeId),firstId,'store identity changed in S02');
   await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('S01'));
   await verifyS01(app,width,'S02 return');
   cases.push({size:width,path:'H01→canonical S01→S02→S01',result:'PASS'});
   for(const suffix of ['','&s01_r2=0','&s01_r2=1']){
    await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01'+suffix);
    app=page.frameLocator('#central-host');await verifyS01(app,width,'wrapper '+suffix);
   }
   await page.goto(base+'/prototype/parallel/core-journey-fix-01/demo/index.html?page=S01&s01_r2=0');
   const direct=page.locator('#screen');
   await direct.locator('#s01-r2-frame').waitFor();
   assert.equal(new URL(page.url()).searchParams.get('s01_r2'),'1','direct R2=0 did not canonicalize');
   cases.push({size:width,path:'all S01 wrapper URLs and direct legacy URL → one R2 view',result:'PASS'});
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01');
   app=page.frameLocator('#central-host');
   await app.locator('#screen').evaluate(()=>{window.SIM_DEMO.core.setRequirement(3,6,true);window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S5');});
   await app.locator('#screen.page-S5').waitFor();
   await app.frameLocator('#br04-frame').locator('#see-more').click();
   await verifyS01(app,width,'S5 see more');
   cases.push({size:width,path:'S5→more stores→canonical S01',result:'PASS'});
   assert.deepEqual(jsErrors,[],'javascript errors '+jsErrors.join('; '));await ctx.close();
  }
  const receipt={status:'PASS',cases,visual:{H01:'SOURCE_SLICES_AND_STRUCTURE_TECHNICAL_PASS_FULL_PIXEL_SIGNOFF_HOLD',S01:'CANONICAL_SINGLE_ENTRY_PASS_FULL_APPROVED_MASTER_IMAGE_HOLD'},deployed:false,main_merged:false};
  fs.writeFileSync(path.join(dir,'single-s01-browser.json'),JSON.stringify(receipt,null,2)+'\n');console.log('PROTO_RULE_RESTORE_06_BROWSER_PASS',JSON.stringify(receipt));
 }finally{await browser.close();}
})().catch(e=>{console.error('PROTO_RULE_RESTORE_06_BROWSER_FAIL',e);process.exitCode=1;}).finally(()=>server.close());
