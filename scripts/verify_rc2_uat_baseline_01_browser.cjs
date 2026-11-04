#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../app'),out=path.resolve(__dirname,'../release-evidence/rc2-uat-baseline-01');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,b)=>e?res.writeHead(404).end('NOT_FOUND'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b))
});
const routes=['H01','CAP','S01','S02','S5'],rows=[];
(async()=>{
 await new Promise(r=>server.listen(4932,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  for(const route of routes){
   const page=await ctx.newPage(),errors=[],badAssets=[],checks={};
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1')&&r.status()>=400)badAssets.push({status:r.status(),url:r.url().split('?')[0]})});
   let failure='';
   try{
    await page.goto('http://127.0.0.1:4932/central-review-02g.html?catalog=sim&page='+route+(route==='S02'?'&store=SIM_BJ01':''),{waitUntil:'load',timeout:25000});
    await page.waitForTimeout(900);
    checks.contractErrorHidden=await page.locator('#central-error').isHidden();
    const frame=page.frameLocator('#central-host');
    checks.centralBody=await frame.locator('body').count()===1;
    const snap=async name=>{await page.screenshot({path:path.join(out,route+'-'+width+'-'+name+'.png'),fullPage:false})};
    await snap('top');
    if(route==='S5'){
     const nested=frame.frameLocator('#br04-frame');
     checks.s5RealPage=await nested.locator('#artboard').count()===1;
     checks.capacity=await nested.locator('#capacity').count()===1;
     for(const [ix,px] of [[1,380],[2,760]]){await nested.locator('#app-viewport').evaluate((e,n)=>e.scrollTop=n,px);await page.waitForTimeout(220);await snap('scroll'+ix)}
    }else{
     // Select the actual inner scrolling surface; outer fullPage screenshots miss iframe content.
     let scrollerInfo=null;
     for(const [ix,fraction] of [[1,.5],[2,1]]){
      const info=await frame.locator('body').evaluate((body,ratio)=>{
       const elements=[document.querySelector('#app-viewport'),document.querySelector('#scroll'),document.querySelector('.page'),document.querySelector('.scroll'),document.scrollingElement,body].filter(Boolean);
       const chosen=elements.map(el=>({el,range:Math.max(0,el.scrollHeight-el.clientHeight)})).sort((a,b)=>b.range-a.range)[0];
       if(chosen&&chosen.range>0)chosen.el.scrollTop=chosen.range*ratio;
       return {max:chosen?.range||0,at:chosen?.el.scrollTop||0,element:chosen?.el.id||chosen?.el.className||chosen?.el.tagName};
      },fraction);
      scrollerInfo=info;await page.waitForTimeout(180);await snap('scroll'+ix);
     }
     checks.scrollSegmentCaptured=!!scrollerInfo;
     if(route==='S01'){
      checks.threeFilters=await frame.locator('.filter-bar .filter-btn').count()===3;
      checks.serviceFilter=await frame.locator('.filter-bar .filter-btn').last().innerText().then(s=>s.includes('服务'));
     }
     if(route==='S02'){
       checks.unitImage=await frame.locator('.unit-img').first().evaluate(e=>e.complete&&e.naturalWidth>0).catch(()=>false);
       checks.capacitySource=await frame.locator('.unit-img').first().getAttribute('src').then(v=>/unit-r3/.test(v||'')).catch(()=>false);
     }
    }
    checks.documentFits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
   }catch(e){failure=String(e.message||e)}
   rows.push({route,width,checks,errors,badAssets,failure});await page.close();
  }
  await ctx.close();
 }
 }finally{
 await browser.close();await new Promise(r=>server.close(r));
 const issues=rows.filter(r=>r.failure||r.errors.length||r.badAssets.length||Object.values(r.checks).some(x=>!x));
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({source:'GitHub candidate only; NOT deployed Netlify bytes',pass:issues.length===0,rows},null,2));
 console.log(JSON.stringify({pass:issues.length===0,count:rows.length,issues},null,2));
 if(issues.length)process.exitCode=1;
 }
})().catch(e=>{console.error(e);process.exitCode=1});
