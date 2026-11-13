#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'), http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),outdir=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-04');
fs.mkdirSync(outdir,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const target=path.resolve(root,'.'+pathname);
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(target,(err,data)=>{if(err){res.writeHead(404).end('missing');return;}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}).end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(4394,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const results=[];
 const url='http://127.0.0.1:4394/prototype/parallel/core-journey-fix-01/demo/';
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  // CAP explicit user input: no pre-seeding requirement / term, preserve 12 months and 3m3.
  {
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(url+'cap.html',{waitUntil:'domcontentloaded'});
   await page.locator('body[data-journey-ready="true"]').waitFor();
   await page.locator('#quick button[data-v="3"]').click();
   await page.locator('button[data-month="12"]').click();
   await page.locator('#cta').click();
   await page.waitForURL(/index\.html\?page=S5/);
   await page.locator('#screen.page-S5').waitFor();
   const r=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
   assert.equal(r.capacity_m3,3);assert.equal(r.term_months,12);assert.equal(r.term_confirmed,true);
   assert.deepEqual(errors,[]);
   results.push({viewport:width,flow:'CAP click 3m3 /12months -> S5',status:'PASS'});
   await page.screenshot({path:path.join(outdir,'cap-to-s5-'+width+'.png'),fullPage:true});
   await page.close();
  }
  // ITEMS known-volume independent flow: direct volume -> explicit term -> S5 without fixture injection.
  {
   const page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(url+'items.html',{waitUntil:'domcontentloaded'});
   await page.locator('#footerBtn').waitFor();
   await page.locator('[data-known="1"]').first().click();
   await page.locator('#knownVolume').fill('3.5');
   await page.locator('#toTerm').click();
   await page.locator('[data-term="6"]').click();
   await page.locator('#footerBtn').click();
   await page.waitForURL(/index\.html\?page=S5/);
   await page.locator('#screen.page-S5').waitFor();
   const req=await page.evaluate(()=>window.SIM_DEMO.core.state().requirement);
   assert.equal(req.capacity_m3,3.5);assert.equal(req.term_months,6);assert.equal(req.term_confirmed,true);
   assert.deepEqual(errors,[]);
   results.push({viewport:width,flow:'ITEMS known volume 3.5m3 /6months -> S5',status:'PASS'});
   await page.screenshot({path:path.join(outdir,'items-to-s5-'+width+'.png'),fullPage:true});
   await page.close();
  }
 }
 fs.writeFileSync(path.join(outdir,'cap-items-results.json'),JSON.stringify({status:'PASS',cases:results,scope:'isolated real browser only, not final visual signoff'},null,2));
 console.log('RC2_MERGE_PREP_04_CAP_ITEMS_BROWSER_PASS',JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error('RC2_MERGE_PREP_04_CAP_ITEMS_BROWSER_FAILED',e);process.exitCode=1;}).finally(()=>server.close());
