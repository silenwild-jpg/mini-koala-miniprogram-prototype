#!/usr/bin/env node
'use strict';
// RC2-VIS-INTEGRATION-02: real Chromium broad page coverage against one built ZIP source.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-vis-integration-02');
const port=4532,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(fp,(e,b)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(b));});
const contextGuarded=new Set(['O01','O03','RN01','EX01','DP01','OH01','IV01']);
const screens=['H01','S01','S02','CAP','ITEMS','S5','BOOKING','QUICK','O01','M01','O03','RN01','EX01','DP01','OH01','IV01'];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const rows=[];let failed=0;
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   for(const screen of screens){
    const page=await ctx.newPage(),errors=[],bad=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400 && /\/prototype\/|\/assets\//.test(r.url()))bad.push({status:r.status(),url:r.url()});});
    const url=base+'/central-review-02g.html?catalog=sim&page='+screen+'&s01_r2=1'+(screen==='S02'?'&store=SIM_BJ01':'');
    let record={screen,width,height,status:'PASS'};
    try{
     await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
     const frame=page.frameLocator('#central-host'),el=frame.locator('#screen');
     await el.waitFor({state:'attached',timeout:12000});
     await page.waitForTimeout(170);
     const state=await el.evaluate(e=>{
      const box=e.getBoundingClientRect(),doc=document.documentElement;
      const texts=(e.innerText||'').trim();
      return {cls:e.className,renderedText:texts.length,scrollWidth:doc.scrollWidth,innerWidth:innerWidth,screenRect:{width:box.width,height:box.height},nav:!!document.querySelector('.bottom-nav'),auth:!!document.querySelector('.mk-auth-overlay')};
     });
     record={...record,...state,errors,bad,entryMode:contextGuarded.has(screen)?'CONTEXT_GUARD_INSPECTION':'DIRECT_PAGE'};
     await page.screenshot({path:path.join(out,screen+'-'+width+'.png'),fullPage:true,timeout:15000});
     if(!contextGuarded.has(screen))assert(state.renderedText>8,'blank or placeholder screen '+screen);
     // These pages depend on verified phone, existing order, or quote context.
     // A denied direct link is expected; never mark it as a product defect or bypass its guard.
     if(contextGuarded.has(screen))record.contextGate='DIRECT_URL_ONLY_NOT_FULL_JOURNEY';
     assert(state.scrollWidth<=width+4,'horizontal overflow '+screen+' '+JSON.stringify(state));
     assert.equal(errors.length,0,'uncaught JavaScript errors');
     assert.equal(bad.length,0,'missing static resources');
     if(screen==='S01'){
      const child=frame.frameLocator('#s01-r2-frame');
      assert.deepEqual((await child.locator('.filter').allInnerTexts()).map(x=>x.trim()),['排序','距离','服务']);
      assert(await child.locator('#s01-search').isVisible(),'S01 search missing');
      assert.equal(await frame.locator('.bottom-nav .bottom-item').count(),4,'S01 bottom navigation missing');
     }
     if(screen==='H01')assert.equal(await frame.locator('.task-hotspots button').count(),2,'H01 task hotspots missing');
     if(screen==='S02')assert(await frame.locator('.order-button[data-action="choose"]').count()>0,'S02 unit order CTA missing');
    }catch(e){record.status='FAIL';record.failure=String(e.message||e);failed++;}
    rows.push(record);console.log('RC2_VIS_INTEGRATION_02_PAGE',JSON.stringify(record));await page.close();
   }
   await ctx.close();
  }
  fs.writeFileSync(path.join(out,'all-pages-results.json'),JSON.stringify({status:failed?'FAIL':'PASS',total:rows.length,failed,rows},null,2)+'\n');
  assert.equal(failed,0,failed+' full-site page smoke failures');
  console.log('RC2_VIS_INTEGRATION_02_FULL_SITE_PASS',rows.length);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error('RC2_VIS_INTEGRATION_02_FULL_SITE_FAIL',e);process.exitCode=1;server.close();});
