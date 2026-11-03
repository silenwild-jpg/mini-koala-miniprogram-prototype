#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-store-image-map-01');
const base='http://127.0.0.1:4523';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(fp,(e,b)=>{if(e)res.writeHead(404).end('missing');else res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(b);});});
async function inspect(page,kind,width,id){
 const app=page.frameLocator('#central-host');
 let img,storeId;
 if(kind==='H01'){
  await app.locator('#storeRail .store-photo').first().waitFor({state:'visible'});
  const card=app.locator('#storeRail .store-card').first();storeId=await card.getAttribute('data-sim-store');
  img=card.locator('.store-photo');
 }else if(kind==='S01'){
  const child=app.frameLocator('#s01-r2-frame');
  await child.locator('.store-card .store-photo').first().waitFor({state:'visible'});
  const card=child.locator('.store-card').first();storeId=await card.getAttribute('data-store-id');
  img=card.locator('.store-photo');
 }else{
  await app.locator('.hero img').first().waitFor({state:'visible'});
  storeId=id;img=app.locator('.hero img').first();
 }
 const src=await img.getAttribute('src');
 const expected='store-curated/v1/'+storeId+'/'+(kind==='S02'?'hero.webp':'card.webp');
 assert(src?.includes(expected),kind+' '+width+' expected '+expected+' got '+src);
 const natural=await img.evaluate(async el=>{await el.decode();return {w:el.naturalWidth,h:el.naturalHeight,alt:el.alt};});
 assert(natural.w>=512,'image broken or fallback was rendered in '+kind+' '+src);
 assert(natural.alt.includes(kind==='S02'?'归属':'环境'),'image alt status lost');
 return {page:kind,width,storeId,src,dimensions:[natural.w,natural.h]};
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4523,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   for(const [kind,url,id] of [
    ['H01','/central-review-02g.html?catalog=sim&page=H01',null],
    ['S01','/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',null],
    ['S02','/central-review-02g.html?catalog=sim&page=S02&store=SIM_BJ01&s01_r2=1','SIM_BJ01']]){
    const page=await ctx.newPage(),errs=[],bad=[];page.on('pageerror',e=>errs.push(e.message));
    page.on('response',r=>{if(r.url().includes('/store-curated/')&&r.status()!==200)bad.push([r.status(),r.url()]);});
    await page.goto(base+url,{waitUntil:'domcontentloaded'});
    const row=await inspect(page,kind,width,id);
    assert.deepEqual(errs,[],'runtime error '+kind+JSON.stringify(errs));
    assert.deepEqual(bad,[],'curated photo asset 404 '+kind+JSON.stringify(bad));
    if(kind==='S01'){
      const app=page.frameLocator('#central-host');
      const cards=app.frameLocator('#s01-r2-frame').locator('.store-card');
      const ids=await cards.evaluateAll(nodes=>nodes.slice(0,10).map(n=>n.dataset.storeId));
      const matched=ids.filter(v=>/^SIM_BJ0[1-9]$/.test(v));
      assert(matched.length>=4,'insufficient curated store coverage in visible S01 cards');
      for(const sid of matched){
       const pic=cards.locator('img.store-photo').nth(ids.indexOf(sid));
       const src=await pic.getAttribute('src');
       assert(src.includes('store-curated/v1/'+sid+'/card.webp'),'R2 photo changed catalog id '+sid);
      }
      row.verifiedVisibleStores=matched.length;
    }
    if(kind==='S02'){
      const gallery=page.frameLocator('#central-host').locator('.gallery-count');
      assert.equal(await gallery.isVisible(),false,'one-photo gallery should not show a dead 1/1 next control');
    }
    await page.screenshot({path:path.join(out,kind+'-'+width+'.png'),fullPage:true});
    results.push(row);await page.close();
   }
   await ctx.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',cases:results},null,2)+'\n');
  console.log('RC2_STORE_IMAGE_MAP_01_BROWSER_PASS',JSON.stringify(results));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error('RC2_STORE_IMAGE_MAP_01_BROWSER_FAIL',e);process.exitCode=1;server.close();});
