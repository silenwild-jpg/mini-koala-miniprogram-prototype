#!/usr/bin/env node
'use strict';
// UNIT-IMAGE-REBUILD-01-R3: independently check exact built RC2 CAP/S02 image loads in real Chromium.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/unit-image-r3');
const base='http://127.0.0.1:4547';
const runtime='/prototype/parallel/core-journey-fix-01/demo/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(fp,(e,b)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(b));});
const volumes=[['mini','0.75'],['small','4.5'],['medium','15'],['large','35']];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 for(const [tier] of volumes)for(const group of ['cap','thumb']){
  const size=group==='cap'?'640x480':'336x312';
  const p=path.join(root,runtime,'assets/unit-r3',group,'unit-r3-'+tier+'-'+size+'.webp');
  assert(fs.existsSync(p),'missing packaged image '+p);
  const b=fs.readFileSync(p);
  assert(b.length>1000 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP','invalid WebP '+p);
 }
 await new Promise(ok=>server.listen(4547,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let rows=[],errors=[];
 try{
  for(const [w,h] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
   const cap=await context.newPage();
   cap.on('pageerror',e=>errors.push({page:'CAP',width:w,msg:e.message}));
   await cap.goto(base+runtime+'cap.html',{waitUntil:'domcontentloaded',timeout:25000});
   for(const [tier,volume] of volumes){
    await cap.locator('#capacity').fill(volume);
    await cap.waitForFunction(t=>document.getElementById('sceneimg')?.getAttribute('src')?.includes('unit-r3-'+t),tier,{timeout:10000});
    const state=await cap.locator('#sceneimg').evaluate(e=>({src:e.getAttribute('src'),w:e.naturalWidth,h:e.naturalHeight,loaded:e.complete}));
    assert(state.loaded&&state.w===640&&state.h===480,'CAP picture not loaded '+tier+' '+w+' '+JSON.stringify(state));
    const overflow=await cap.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert(overflow<=4,'CAP horizontal overflow '+w);
    await cap.screenshot({path:path.join(out,'CAP-'+tier+'-'+w+'.png'),fullPage:true});
    rows.push({page:'CAP',width:w,tier,volume,asset:state.src,status:'PASS'});
   }
   const store=await context.newPage();
   store.on('pageerror',e=>errors.push({page:'S02',width:w,msg:e.message}));
   await store.goto(base+'/central-review-02g.html?catalog=sim&page=S02&store=SIM_BJ01&s01_r2=1',{waitUntil:'domcontentloaded',timeout:25000});
   const img=store.frameLocator('#central-host').locator('.page-S02 .unit-img').first();
   await img.waitFor({state:'visible',timeout:15000});
   const state=await img.evaluate(e=>({src:e.getAttribute('src'),w:e.naturalWidth,h:e.naturalHeight,loaded:e.complete}));
   assert(state.src.includes('unit-r3/thumb/'),'S02 source not connected '+w+' '+state.src);
   assert(state.loaded&&state.w===336&&state.h===312,'S02 picture not loaded '+w+' '+JSON.stringify(state));
   await store.screenshot({path:path.join(out,'S02-'+w+'.png'),fullPage:true});
   rows.push({page:'S02',width:w,asset:state.src,status:'PASS'});
   await context.close();
  }
  assert.equal(errors.length,0,'JavaScript errors: '+JSON.stringify(errors));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',commit:process.env.GITHUB_SHA||null,rows,errors},null,2)+'\n');
  console.log('UNIT_IMAGE_R3_BROWSER_PASS',rows.length);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error('UNIT_IMAGE_R3_BROWSER_FAIL',e);process.exitCode=1;server.close();});
