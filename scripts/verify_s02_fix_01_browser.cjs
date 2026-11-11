#!/usr/bin/env node
'use strict';
// S02-FIX-01: isolated source-tree Chromium evidence. No network and no deployment.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app'),host='http://127.0.0.1:4692';
const output=path.resolve(__dirname,'../release-evidence/s02-fix-01');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,bytes)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes));
});
async function entry(browser,width,height){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
 const app=page.frameLocator('#central-host');await app.locator('#screen').waitFor();
 await app.locator('#screen').evaluate(()=>{
  const m=window.SIM_DEMO;
  const s=m.core.fixture.stores.find(s=>s.city===m.state().city);
  if(!s)throw Error('NO_SAME_CITY_STORE');
  m.openStore(s.id,'S01');
 });
 await app.locator('#screen.page-S02').waitFor();
 return {context,page,app,errors};
}
function checkTargets(els,label){
 assert(els.length>0,'missing touch target: '+label);
 for(const x of els)assert(x.width>=43.5&&x.height>=43.5,'touch <44 '+label+' '+JSON.stringify(x));
}
const rects=async(loc)=>loc.evaluateAll(nodes=>nodes.filter(e=>!!e.getClientRects().length).map(e=>{
 const r=e.getBoundingClientRect();return {label:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,32),width:r.width,height:r.height};
}));
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 await new Promise(resolve=>server.listen(4692,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const {context,page,app,errors}=await entry(browser,width,height);
   try{
    const svc=app.locator('.s02-service-summary');await svc.waitFor();
    assert.match(await svc.innerText(),/存取/);
    assert.match(await svc.innerText(),/到店搬运/);
    assert.equal(await app.locator('.hero .s02-hours').count(),0,'duplicate hours shown on hero');
    assert.equal(await app.locator('.hero .gallery-count').count(),0,'non-verified 1/2 gallery must not show');
    const t={};
    for(const [name,selector] of Object.entries({
      hero:'.hero .circle-btn',navigation:'.detail-head .nav-ext',favorite:'.unit-row[data-unit] .fav',
      category:'.unit-filter .chip',buy:'.unit-row[data-unit] .order-button',
      need:'.s02-demand a',service:'.s02-service-summary'})){
      t[name]=await rects(app.locator(selector));checkTargets(t[name],name);
    }
    assert(t.buy.every(x=>x.height>=47.5),'buy CTA less than 48px');
    await page.screenshot({path:path.join(output,'s02-default-'+width+'.png')});
    await svc.click();
    await app.locator('.s02-services').waitFor();
    assert.match(await app.locator('.s02-services').innerText(),/到店搬运/);
    await page.screenshot({path:path.join(output,'s02-services-'+width+'.png')});
    await app.getByRole('tab',{name:'交通路线'}).click();
    await app.locator('#s02MapSlot').waitFor();
    assert.equal(await app.locator('.s02-travel-modes button').count(),4);
    await page.screenshot({path:path.join(output,'s02-route-'+width+'.png')});
    await app.getByRole('tab',{name:'可选仓位'}).click();
    await app.locator('#screen').evaluate(()=>{
     const m=window.SIM_DEMO;m.core.setRequirement(3,12,true);m.navigate('S02',m.state().storeId);
    });
    await app.locator('.unit-row[data-unit] .order-button[data-action="s02EditCapacity"]').first().waitFor();
    const smaller=await app.locator('.unit-row[data-unit] .order-button[data-action="s02EditCapacity"]').first().innerText();
    assert.equal(smaller,'修改容量');
    await page.screenshot({path:path.join(output,'s02-with-demand-'+width+'.png')});
    const match=await app.locator('#screen').evaluate(()=>{
     const m=window.SIM_DEMO,fx=m.core.fixture;
     const stores=fx.stores.filter(s=>s.city===m.state().city);
     for(const s of stores){
       const vols=fx.units.filter(u=>u.store_id===s.id).map(u=>Number(u.volume)).filter(Number.isFinite).sort((a,b)=>b-a);
       if(vols.length<2||vols[0]+vols[1]<=vols[0]+0.5)continue;
       const target=Number((vols[0]+0.5).toFixed(1));
       m.core.setRequirement(target,12,true);
       if(m.core.combinations(s.id).length){
         m.openStore(s.id,'S01');return {store:s.id,capacity:target};
       }
     }
     return null;
    });
    if(match){
      await app.locator('.combo-row').first().waitFor();
      assert.equal(await app.locator('.combo-row .order-button[data-action="choose"]').count()>0,true);
      await page.screenshot({path:path.join(output,'s02-combo-'+width+'.png')});
    }
    assert.deepEqual(errors,[],'runtime page errors');
    results.push({width,height,status:'PASS',touchTargets:t,smallerCapacityAction:smaller,comboCase:match,source:'same branch static app; Chromium, not live Netlify'});
   }finally{await context.close();}
  }
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({status:'PASS',runCount:results.length,results},null,2));
  console.log('S02_FIX_01_CHROMIUM_PASS '+JSON.stringify(results.map(r=>({width:r.width,combo:r.comboCase}))));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error('S02_FIX_01_CHROMIUM_FAIL',e.stack||e);process.exitCode=1;});
