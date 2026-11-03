#!/usr/bin/env node
'use strict';
/* CLOSE-01 actual fixture/catalog regression; no synthetic offers injected. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s5-ux-close-01');
const port=4549,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(fp,(e,b)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(b));});
const cities=['北京','上海','深圳','杭州','广州'],capacities=[null,0.5,1,3,5,8,10,11,15,18,20,25,30,35,50,60,200];
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const records=[],seen=new Set();let errors=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=S5&s01_r2=1',{waitUntil:'domcontentloaded'});
   const frame=page.frameLocator('#central-host').frameLocator('#br04-frame');
   await frame.locator('body.bridge-ready').waitFor({timeout:15000});
   for(const city of cities){
    for(const capacity of capacities){
     const res=await frame.locator('body').evaluate((body,{city,capacity})=>{
       const host=parent.SIM_DEMO,core=host.core;
       core.setCity(city);core.setRequirement(capacity,capacity===null?null:12,capacity!==null);
       const offers=host.s5Offers();
       window.BR04_REFRESH();
       const board=document.querySelector('#artboard'),advisor=document.querySelector('#s5-advisor');
       const state=board.dataset.match;
       const visible=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none';
       return {state,city,capacity,count:offers.length,offerVolume:offers[0]?.volume??null,near:offers[0]?.nearCapacity===true,expanded:offers[0]?.expandedSearch===true,advisor:visible(advisor),advisorCount:document.querySelectorAll('.s5-advisor:not([hidden]),.no-match [data-nm="advisor"]').length,cta:document.getElementById('main-buy')?.innerText??'',height:Number(board.dataset.designHeight),overflow:document.documentElement.scrollWidth>innerWidth+2};
     },{city,capacity});
     if(res.count&&res.offerVolume<capacity)assert.notEqual(res.cta,'立即下单','unsafe undersized CTA');
     if(res.state==='large'&&res.count===0)assert.equal(res.advisor,false,'no duplicate high volume advisor');
     assert(!res.overflow,'horizontal overflow');
     assert(!(res.near&&res.offerVolume>=capacity),'wrong near flag');
     assert(!(res.expanded&&res.near),'expanded and near must differ');
     records.push({...res,width,height});
     if(!seen.has(res.state+'-'+width)){
       seen.add(res.state+'-'+width);
       await page.screenshot({path:path.join(out,res.state+'-'+width+'.png'),fullPage:true});
       await frame.locator('#app-viewport').evaluate(el=>el.scrollTop=el.scrollHeight);
       await page.screenshot({path:path.join(out,res.state+'-'+width+'-bottom.png'),fullPage:true});
     }
    }
   }
   // Existing project scenario, not a mocked offer: closest two stores sold out.
   const expanded=await frame.locator('body').evaluate(()=>{
     const host=parent.SIM_DEMO;host.core.setScenario('noNear');
     const offers=host.s5Offers();window.BR04_REFRESH();
     return {state:document.getElementById('artboard').dataset.match,city:host.core.state().city,
       capacity:host.core.state().requirement.capacity_m3,count:offers.length,
       nearestDistance:offers[0]?.store.distance,expanded:offers[0]?.expandedSearch===true};
   });
   assert.equal(expanded.state,'expanded','sold-out nearby stores should exercise real expanded city fallback');
   records.push({...expanded,width,height,scenario:'noNear',source:'ACTUAL_DEMO_SCENARIO'});
   await page.screenshot({path:path.join(out,'expanded-'+width+'.png'),fullPage:true});
   await ctx.close();
  }
  assert.equal(errors.length,0,'JS runtime errors: '+errors.join(';'));
  const states=[...new Set(records.map(r=>r.state))].sort();
  for(const required of ['matched','near','expanded','combo','large','none','incomplete'])assert(states.includes(required),'actual directory did not exercise '+required);
  assert(records.some(r=>r.capacity>10&&r.count>0&&r.advisor),'large-capacity advisor not triggered on real offer');
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',source:'REAL_DEMO_FIXTURE',tested:records.length,states,missingStates:['matched','near','expanded','combo','large','none','incomplete'].filter(s=>!states.includes(s)),records},null,2));
  console.log('S5_UX_CLOSE_01_ACTUAL_CATALOG_PASS',JSON.stringify({tested:records.length,states}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error('S5_UX_CLOSE_01_ACTUAL_CATALOG_FAIL',e);process.exitCode=1;server.close();});
