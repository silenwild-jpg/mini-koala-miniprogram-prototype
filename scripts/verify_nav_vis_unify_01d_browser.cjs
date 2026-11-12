#!/usr/bin/env node
'use strict';
/* NAV-VIS-UNIFY-01D: real runtime integration. Evidence is sourced from this SHA, not a browser-only mock. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/nav-vis-unify-01d');
const host='http://127.0.0.1:4789',prefix='/prototype/parallel/core-journey-fix-01/demo/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}
 catch{return res.writeHead(400).end()}
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(e,data)=>e?res.writeHead(404).end('missing'):
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
const labels=['首页','附近门店','预约订单','我的'];
const filenames=['home','stores','calendar','mine'];
const oldnames=['home','stores','calendar','user'];
const dimensions=[[375,812],[390,844]];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const identity=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 assert.equal(identity.source_sha,process.env.GITHUB_SHA,'different build SHA');
 assert.equal(identity.source_branch,process.env.GITHUB_REF_NAME,'wrong source branch');
 assert.equal(identity.source_pr,158,'unique parent must be PR157');
 await new Promise(done=>server.listen(4789,'127.0.0.1',done));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report=[];
 try{
  for(const [width,height] of dimensions){
   const ctx=await browser.newContext({viewport:{width,height},locale:'zh-CN',deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   const shot=async name=>page.screenshot({path:path.join(out,String(width)+'-'+name+'.png'),animations:'disabled'});
   await page.goto(host+prefix+'home.html',{waitUntil:'domcontentloaded'});
   await page.locator('#navPhoto').waitFor({state:'visible'});
   await page.locator('#navPhoto').evaluate(async img=>img.decode());
   const homeNav=await page.locator('.footer-nav').evaluate(node=>{
     const b=node.getBoundingClientRect(),css=getComputedStyle(node,'::after');
     const r=el=>{const a=el.getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,h:a.height}};
     return {image:node.querySelector('#navPhoto').getAttribute('src'),box:r(node),
       mask:{left:parseFloat(css.left),top:parseFloat(css.top),width:parseFloat(css.width),height:parseFloat(css.height),
         content:css.content,color:css.color,pointer:css.pointerEvents,z:css.zIndex},
       targets:[...node.querySelectorAll('button')].map(btn=>({label:btn.getAttribute('aria-label'),box:r(btn)}))};
   });
   assert(homeNav.image.includes('nav_original_'+width),'original H01 pixel source changed');
   assert(homeNav.mask.content.includes('预约订单'),'H01 current user-visible label not corrected');
   assert.equal(homeNav.mask.pointer,'none','H01 visual text mask must not steal clicks');
   assert.deepEqual(homeNav.targets.map(t=>t.label),labels);
   assert(homeNav.targets.every(t=>t.box.w>=44&&t.box.h>=44),'H01 hitbox degraded');
   await shot('01-H01-corrected-live');
   await page.addStyleTag({content:'.footer-nav::after{display:none!important}'});
   await shot('00-H01-original-bitmap-reference');
   report.push({width,screen:'H01',mode:'RENDER_TEXT_ONLY',sourceImagePreserved:true,nav:homeNav,status:'PASS'});
   for(const target of ['S01','M01']){
     await page.goto(host+prefix+'index.html?page='+target+'&s01_r2=1',{waitUntil:'domcontentloaded'});
     const nav=page.locator('.bottom-nav');
     await nav.locator('.bottom-item').first().waitFor({state:'visible',timeout:15000});
     await nav.locator('img').first().evaluate(async()=>Promise.all([...document.querySelectorAll('.bottom-nav img')].map(i=>i.decode())));
     const data=await nav.evaluate(node=>{
       const outer=node.getBoundingClientRect();
       return {box:{x:outer.x,y:outer.y,w:outer.width,h:outer.height},
         entries:[...node.querySelectorAll('button')].map(b=>{
           const image=b.querySelector('img'),r=b.getBoundingClientRect(),ri=image.getBoundingClientRect();
           return {label:b.textContent.trim(),action:b.dataset.action,value:b.dataset.value,active:b.classList.contains('active'),
             icon:image.getAttribute('src'),w:r.width,h:r.height,iconSize:[ri.width,ri.height],
             filter:getComputedStyle(image).filter,loaded:!!image.naturalWidth};
         })};
     });
     const active=target==='S01'?[false,true,false,false]:[false,false,false,true];
     assert.deepEqual(data.entries.map(x=>x.label),labels);
     assert.deepEqual(data.entries.map(x=>x.active),active,'route selection');
     assert(data.entries.every((entry,i)=>entry.icon==='assets/nav-current-01c/'+filenames[i]+'-'+(active[i]?'active':'inactive')+'.svg'),'wrong two-state icon source');
     assert(data.entries.every(x=>x.loaded&&x.w>=44&&x.h>=44&&Math.abs(x.iconSize[0]-26)<1&&Math.abs(x.iconSize[1]-26)<1&&x.filter==='none'),'icon decode, frame, or greyscale regression');
     assert(data.entries.every(x=>x.w>0&&x.h>0),'NAV geometry missing');
     await shot('03-'+target+'-new-icons-live');
     // Generate same-sha historical VIS07 reference using a browser-only reverse toggle.
     await nav.evaluate((node,names)=>{
       for(const [idx,b] of [...node.querySelectorAll('.bottom-item')].entries()){
         const img=b.querySelector('img');
         img.setAttribute('src','assets/vis07-nav-'+names[idx]+'.png');
         img.classList.remove('nav-01c-icon');
       }
     },oldnames);
     await nav.locator('img').first().evaluate(async()=>Promise.all([...document.querySelectorAll('.bottom-nav img')].map(i=>i.decode())));
     await shot('02-'+target+'-old-VIS07-reference');
     report.push({width,screen:target,mode:'REAL_SVG_WIRED',nav:data,status:'PASS'});
   }
   await page.goto(host+prefix+'index.html?page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   await page.locator('.bottom-nav [data-action="navBooking"]').click();
   const modal=page.locator('.control-sheet[role="dialog"]');
   await modal.waitFor({state:'visible'});
   assert.equal(await modal.locator('[data-action="go"][data-value="BOOKING"]').count(),1);
   assert.equal(await modal.locator('[data-action="go"][data-value="QUICK"]').count(),1);
   await shot('04-appointment-dual-menu');
   await modal.locator('[data-action="go"][data-value="BOOKING"]').click();
   await page.waitForURL(/page=BOOKING/,{timeout:12000});
   await page.goto(host+prefix+'index.html?page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   await page.locator('.bottom-nav [data-action="mine"]').click();
   await page.waitForURL(/page=M01/,{timeout:12000});
   const m01=page.locator('.bottom-nav [data-action="go"][data-value="S01"]');
   await m01.click();
   await page.waitForURL(/page=S01/,{timeout:12000});
   report.push({width,screen:'NAV',booking:'BOOKING',quickButton:true,mine:'M01',storesReturn:'S01',status:'PASS'});
   assert.deepEqual(errors,[],'JS errors on nav pages');
   await ctx.close();
  }
  const result={source_sha:identity.source_sha,source_pr:158,status:'RUNTIME_INTEGRATION_PASS_PENDING_VISUAL_SIGNOFF',
    count:report.length,checks:report,knownLimitations:[
      'H01 binary bitmap is unchanged; the visible caption is a reversible CSS pixel mask; original file was not regenerated',
      'S01/M01 SVG assets wired but require human visual signoff before production merge',
      'Other screens S02 and S5 do not acquire bottom tabs; H01 rejected A/C visual components remain excluded']};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log('NAV_VIS_UNIFY_01D_ACTUAL_375_390_PASS '+report.length);
 }finally{await browser.close();await new Promise(done=>server.close(done));}
})().catch(err=>{console.error('NAV_VIS_UNIFY_01D_FAIL',err.stack||String(err));process.exitCode=1;server.close();});
