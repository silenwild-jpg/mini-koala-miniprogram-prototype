#!/usr/bin/env node
'use strict';
// RC2-MERGE-READY-07: current SHA visual/nav geometry, touch, scroll and routes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-merge-ready-07-nav');
const host='http://127.0.0.1:4887',url='/prototype/parallel/core-journey-fix-01/demo/';
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let f;try{f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{return res.writeHead(400).end()}
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(e,b)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'}).end(b));
});
const result={source_sha:process.env.GITHUB_SHA||'',source_branch:process.env.GITHUB_REF_NAME||'',source_pr:Number(process.env.RC2_EXPECT_SOURCE_PR||0),screens:[],checks:[],blocked:[],limits:['Visual glyph identity still requires H01 original icon extraction approval','WeChat native tab bar and VoiceOver are not tested']};
const labels=['首页','附近门店','预约订单','我的'];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const v=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 assert.equal(v.source_sha,process.env.GITHUB_SHA);assert.equal(v.source_pr,result.source_pr);assert.equal(v.source_branch,result.source_branch);
 await new Promise(resolve=>server.listen(4887,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [w,h] of [[375,812],[390,844]]){
   const c=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN',deviceScaleFactor:1});
   const page=await c.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const screenshot=async(label,selector)=>{
    const name=w+'-'+label+'.png';
    await (selector?page.locator(selector):page).screenshot({path:path.join(out,name),animations:'disabled'});
    result.screens.push(name);
   };
   await page.goto(host+url+'home.html',{waitUntil:'domcontentloaded'});
   await page.locator('#navPhoto').evaluate(async e=>e.decode());
   const home=await page.locator('.footer-nav').evaluate(e=>{
    const a=e.getBoundingClientRect();return{height:a.height,width:a.width,source:e.querySelector('img').getAttribute('src'),targets:[...e.querySelectorAll('button')].map(b=>({label:b.getAttribute('aria-label'),height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width}))}
   });
   assert(home.source.includes('nav_original_'+w));
   assert.deepEqual(home.targets.map(x=>x.label),labels);
   await screenshot('H01-approved-nav','.footer-nav');
   for(const route of ['S01','M01']){
    await page.goto(host+url+'index.html?page='+route+'&s01_r2=1',{waitUntil:'domcontentloaded'});
    const nav=page.locator('.bottom-nav');
    await nav.locator('button').first().waitFor({timeout:15000});
    await nav.locator('img').first().evaluate(async()=>Promise.all([...document.querySelectorAll('.bottom-nav img')].map(img=>img.decode())));
    const d=await nav.evaluate(node=>{
     const box=el=>{const b=el.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
     const frame=document.querySelector('#s01-r2-frame')||document.querySelector('#scroll');
     const r=node.getBoundingClientRect();
     return {box:box(node),frame:frame?box(frame):null,viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      items:[...node.querySelectorAll('button')].map(b=>({label:b.innerText.trim(),active:b.classList.contains('active'),current:b.getAttribute('aria-current'),
       icon:b.querySelector('img')?.getAttribute('src'),iconLoaded:!!b.querySelector('img')?.naturalWidth,
       fontSize:getComputedStyle(b).fontSize,box:box(b)}))};
    });
    const target=(route==='S01'?1:3);
    assert(Math.abs(d.box.height-home.height)<=1,route+' master-height mismatch '+d.box.height+' vs '+home.height);
    assert.equal(d.items.length,4);
    assert.deepEqual(d.items.map(x=>x.label),labels);
    assert(d.items.every((x,i)=>x.active===(i===target)&&x.current===(i===target?'page':null)),route+' selected/semantic mismatch');
    assert(d.items.every(x=>x.iconLoaded&&x.fontSize==='10px'&&x.box.width>=44&&x.box.height>=44),route+' tap/visual contract mismatch');
    assert(d.items.every((x,i)=>Math.abs(x.box.width-w/4)<=1),route+' column width');
    assert(d.items.every((x,i)=>Math.abs(x.box.x-i*w/4)<=1),route+' column alignment');
    assert(d.frame&&Math.abs(d.frame.bottom-d.box.y)<=2,route+' scroll/iframe ends '+d.frame.bottom+' but nav starts '+d.box.y);
    assert(d.scrollWidth<=w+1,route+' horizontal overflow '+d.scrollWidth);
    await screenshot(route+'-footer','.bottom-nav');
    await screenshot(route+'-viewport');
    result.checks.push({width:w,route,homeHeight:home.height,navHeight:d.box.height,frameEnd:d.frame.bottom,navStart:d.box.y,
      textSize:d.items.map(x=>x.fontSize),tapWidths:d.items.map(x=>x.box.width),tapHeights:d.items.map(x=>x.box.height),ariaCurrent:d.items.map(x=>x.current),status:'PASS'});
    if(route==='S01'){
     await page.locator('.bottom-nav [data-action="navBooking"]').click();
     const modal=page.locator('.control-sheet[role="dialog"]');await modal.waitFor({state:'visible'});
     assert.equal(await modal.locator('[data-action="go"][data-value="BOOKING"]').count(),1);
     assert.equal(await modal.locator('[data-action="go"][data-value="QUICK"]').count(),1);
     await screenshot('S01-booking-menu');
     await modal.locator('[data-action="go"][data-value="QUICK"]').click();
     await page.waitForURL(/page=QUICK/);
     result.checks.push({width:w,route:'S01→QUICK',status:'PASS'});
    }else{
     await page.locator('.bottom-nav [data-action="go"][data-value="S01"]').click();
     await page.waitForURL(/page=S01/);
     result.checks.push({width:w,route:'M01→S01',status:'PASS'});
    }
   }
   assert.deepEqual(errors,[],'Browser JS errors');
   await c.close();
  }
 }finally{
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
  await browser.close();await new Promise(resolve=>server.close(resolve));
 }
 console.log('RC2_MERGE_READY_07_NAV_PASS '+JSON.stringify({screens:result.screens.length,checks:result.checks.length,sha:result.source_sha}));
})().catch(err=>{console.error('RC2_MERGE_READY_07_NAV_FAIL',err.stack||String(err));process.exitCode=1;server.close()});
