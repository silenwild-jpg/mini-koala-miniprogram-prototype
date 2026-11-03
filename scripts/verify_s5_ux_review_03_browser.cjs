#!/usr/bin/env node
'use strict';
// S5-UX-REVIEW-03: real Chromium, controlled fixture states; never treat mocks as live inventory.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s5-ux-review-03');
const port=4547,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(fp,(e,b)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(b));});
const cases=[
  {name:'matched',capacity:3,rent:2000,volume:3,expectedAdvisor:false},
  {name:'near',capacity:3,rent:2001,volume:2,expectedAdvisor:true},
  {name:'expanded',capacity:3,rent:1900,volume:3,expandedSearch:true,expectedAdvisor:false},
  {name:'combo',capacity:15,rent:1900,combo:true,expectedAdvisor:true},
  {name:'large',capacity:60,rent:1900,volume:60,expectedAdvisor:true},
  {name:'none',capacity:11,rent:0,empty:true,expectedAdvisor:false},
  {name:'incomplete',capacity:3,rent:0,confirmed:false,expectedAdvisor:false}
];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   for(const tc of cases){
    const page=await context.newPage(),errors=[],bad=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&/\/prototype\//.test(r.url()))bad.push(r.url());});
    let row={case:tc.name,width,height,status:'FAIL',fixture:'CONTROLLED_SIMULATION_NOT_LIVE'};
    try{
     await page.goto(base+'/central-review-02g.html?catalog=sim&page=S5&s01_r2=1',{waitUntil:'domcontentloaded',timeout:22000});
     const s5=page.frameLocator('#central-host').frameLocator('#br04-frame');
     await s5.locator('body.bridge-ready').waitFor({timeout:18000});
     const probe=await s5.locator('body').evaluate((body,scenario)=>{
       const host=window.parent.SIM_DEMO,core=host.core;
       core.setRequirement(scenario.capacity,12,scenario.confirmed!==false);
       const baseRows=host.offers();
       if(!baseRows.length&&!scenario.empty)throw Error('FIXTURE_NO_VALID_BASE_OFFER');
       const template=baseRows[0];
       const candidate=template?{...template,volume:scenario.volume??template.volume,combo:scenario.combo?{count:2}:template.combo,expandedSearch:!!scenario.expandedSearch}:null;
       // Use real offer identity/price formatter and only inject deterministic state labels and rent thresholds.
       host.offers=()=>scenario.empty?[]:[candidate];
       const originalAmounts=core.formalAmounts.bind(core);
       core.formalAmounts=(ids,term)=>({...originalAmounts(ids,term),rent_total:scenario.rent});
       window.BR04_REFRESH();
       const board=document.getElementById('artboard'),advisor=document.getElementById('s5-advisor');
       const visible=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none';
       const rect=selector=>{const el=document.querySelector(selector);if(!el||getComputedStyle(el).display==='none')return null;const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
       return {state:board.dataset.match,advisor:visible(advisor),advisorRect:rect('#s5-advisor'),estoreRect:rect('.estore'),moreRect:rect('.more-units'),boardHeight:Number(board.dataset.designHeight),bodyWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,buyCount:document.querySelectorAll('#main-buy,#secondary-buy').length,hasFixedPurchase:!!document.querySelector('.fixed-buy,.fixed-cta,.bottom-buy,.sticky-checkout')};
     },tc);
     assert.equal(probe.state,tc.name,JSON.stringify(probe));
     assert.equal(probe.advisor,tc.expectedAdvisor,'advisor condition');
     assert.equal(probe.buyCount,2,'preserve both card CTAs');
     assert.equal(probe.hasFixedPurchase,false,'fixed purchase should be absent');
     assert(probe.bodyWidth<=probe.viewportWidth+2,'S5 iframe horizontally overflows');
     if(probe.advisor){
       assert(probe.moreRect&&probe.advisorRect&&probe.estoreRect,'required layout rects missing');
       assert(probe.moreRect.bottom<=probe.advisorRect.top+2,'advisor overlaps more link');
       assert(probe.advisorRect.bottom<=probe.estoreRect.top+2,'advisor overlaps E-store');
     }
     assert.equal(errors.length,0,'browser JS errors');
     assert.equal(bad.length,0,'missing assets');
     await page.screenshot({path:path.join(out,tc.name+'-'+width+'.png'),fullPage:true});
     // Capture full S5 iframe, not just the outer preview window.
     await s5.locator('#artboard').screenshot({path:path.join(out,tc.name+'-'+width+'-artboard.png')});
     row={...row,status:'PASS',probe};
    }catch(e){row.failure=String(e.message||e);}
    results.push(row);console.log('S5_UX_REVIEW_03_CASE',JSON.stringify(row));
    await page.close();
   }
   await context.close();
  }
  const failed=results.filter(r=>r.status!=='PASS');
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:failed.length?'FAIL':'PASS',count:results.length,failed:failed.length,results},null,2));
  assert.equal(failed.length,0,'failed controlled-state browser cases: '+failed.map(x=>x.case+'@'+x.width+':'+x.failure).join('; '));
  console.log('S5_UX_REVIEW_03_ALL_CONTROLLED_STATES_PASS',results.length);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
