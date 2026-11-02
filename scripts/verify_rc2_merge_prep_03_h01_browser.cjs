#!/usr/bin/env node
'use strict';
// Screenshots and technical diagnostics for physically received HIFI-06 master.
// This cannot replace owner-signed pixel comparison or approve a production merge.
const { chromium }=require('playwright'), fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-03');
const receipt=JSON.parse(fs.readFileSync(path.join(root,'h01_receipt.json'),'utf8'));
if(receipt.status!=='SOURCE_BYTES_VERIFIED_VISUAL_SIGNOFF_PENDING')throw Error('H01_SOURCE_RECEIPT_NOT_VERIFIED');
const source=path.join(root,'source'),entry=receipt.html_entry;
const mimes={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const target=path.resolve(source,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!target.startsWith(source+path.sep)){res.writeHead(403).end('bad path');return;}
 fs.readFile(target,(error,data)=>{if(error){res.writeHead(404).end('missing');return;}res.writeHead(200,{'Content-Type':mimes[path.extname(target)]||'application/octet-stream'}).end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(4389,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const evidence=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
   const url='http://127.0.0.1:4389/'+entry.split('/').map(encodeURIComponent).join('/');
   await page.goto(url,{waitUntil:'load'});
   await page.locator('body').waitFor();
   const stats=await page.evaluate(()=>({
    title:document.title,
    bodyTextLength:document.body.innerText.trim().length,
    scrollWidth:document.documentElement.scrollWidth,
    viewportWidth:document.documentElement.clientWidth,
    images:[...document.images].map(x=>({src:x.currentSrc||x.src,complete:x.complete,naturalWidth:x.naturalWidth})),
    buttons:document.querySelectorAll('button,[role="button"],a[href]').length,
   }));
   const broken=stats.images.filter(x=>!x.complete||!x.naturalWidth);
   if(broken.length)throw Error('H01_BROKEN_IMAGE '+JSON.stringify(broken));
   if(stats.scrollWidth>width+4)throw Error('H01_HORIZONTAL_OVERFLOW '+width+' '+stats.scrollWidth);
   if(jsErrors.length)throw Error('H01_JAVASCRIPT_ERRORS '+JSON.stringify(jsErrors));
   assert(stats.bodyTextLength>50,'H01 source HTML appears blank or not loaded');
   const shot='h01-source-'+width+'x'+height+'.png';
   await page.screenshot({path:path.join(root,shot),fullPage:true});
   evidence.push({viewport:width+'x'+height,source_html_sha256:receipt.html_sha256,rendered:true,brokenImages:0,javascriptErrors:0,horizontalOverflow:false,screenshot:shot,...stats});
   await page.close();
  }
  fs.writeFileSync(path.join(root,'h01_render.json'),JSON.stringify({status:'TECHNICAL_RENDER_PASS_VISUAL_COMPARISON_PENDING',evidence,visualSignedOff:false,candidateIntegrated:false},null,2));
  console.log('H01_HIFI06_SOURCE_RENDER_PASS_NOT_VISUAL_SIGNOFF',JSON.stringify(evidence.map(x=>({viewport:x.viewport,screenshot:x.screenshot}))));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
