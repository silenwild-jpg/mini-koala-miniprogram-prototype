#!/usr/bin/env node
'use strict';
// NAV-VIS-UNIFY-01B | isolated editable-asset comparison only; no app/ runtime patch.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const iconDir=path.resolve(__dirname,'../app/assets/nav/current-four-01b/svg');
const out=path.resolve(__dirname,'../release-evidence/nav-vis-unify-01b');
const base='http://127.0.0.1:4797/prototype/parallel/core-journey-fix-01/demo/';
const host='http://127.0.0.1:4797';
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const httpServer=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{return res.writeHead(400).end();}
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(e,buf)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(buf));
});
function src(key,status){
 const data=fs.readFileSync(path.join(iconDir,key+'-'+status+'.svg'),'utf8');
 assert(data.startsWith('<svg')&&data.includes('viewBox="0 0 24 24"'),'bad SVG '+key+'/'+status);
 return 'data:image/svg+xml;base64,'+Buffer.from(data).toString('base64');
}
const icons={};for(const k of ['home','stores','calendar','mine']){icons[k]={active:src(k,'active'),inactive:src(k,'inactive')};}
const label='预约订单';
async function run(){
 fs.mkdirSync(out,{recursive:true});
 const version=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 assert.equal(version.source_sha,process.env.GITHUB_SHA,'candidate must run on current SHA');
 assert.equal(version.source_branch,process.env.GITHUB_REF_NAME,'candidate branch must be current');
 assert.equal(version.source_pr,156,'parent PR must be 156');
 await new Promise(ok=>httpServer.listen(4797,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const evidence=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN'});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const shot=async tag=>page.screenshot({path:path.join(out,width+'-'+tag+'.png')});
   await page.goto(base+'home.html',{waitUntil:'domcontentloaded'});
   await page.locator('#navPhoto').waitFor({state:'visible'});
   const original=await page.locator('#navPhoto').getAttribute('src');assert(original.includes('nav_original'),'approved H01 source replaced');
   await shot('01-H01-current');
   const before=await page.locator('.footer-nav').boundingBox();
   await page.locator('.footer-nav').evaluate((node,label)=>{
     const cover=document.createElement('span');cover.className='nav-01b-label-trial';
     cover.textContent=label;cover.style.cssText=[
       'position:absolute','left:50%','width:25%','top:43%','height:27%',
       'display:flex','align-items:center','justify-content:center',
       'background:#fff','color:#8799a6','font-size:10px','font-weight:500',
       'letter-spacing:0','line-height:1','pointer-events:none','z-index:1',
       'white-space:nowrap'
     ].join(';');
     node.appendChild(cover);
   },label);
   const corrected=await page.locator('.nav-01b-label-trial').innerText();
   assert.equal(corrected,label,'H01 preview label text');
   const after=await page.locator('.footer-nav').boundingBox();
   const coverBox=await page.locator('.nav-01b-label-trial').boundingBox();
   assert(before&&after&&Math.abs(before.height-after.height)<.1&&Math.abs(before.width-after.width)<.1,'H01 container geometry changed');
   assert(coverBox&&coverBox.y<=before.y+before.height*.47&&coverBox.y+coverBox.height>=before.y+before.height*.69,'H01 original label zone must be entirely occluded');
   await shot('02-H01-label-candidate');
   evidence.push({width,screen:'H01',original,originalNav:before,candidateLabel:corrected,navGeometryPreserved:true});
   for(const target of ['S01','M01']){
     await page.goto(base+'index.html?page='+target+'&s01_r2=1',{waitUntil:'domcontentloaded'});
     await page.locator('.bottom-nav .bottom-item').first().waitFor({state:'visible'});
     const nav=page.locator('.bottom-nav');
     const originalState=await nav.evaluate(n=>[...n.querySelectorAll('.bottom-item')].map(b=>({name:b.textContent.trim(),active:b.classList.contains('active'),src:b.querySelector('img')?.src,rect:()=>null})));
     assert.deepEqual(originalState.map(s=>s.name),['首页','附近门店','预约订单','我的']);
     await shot('03-'+target+'-current');
     await nav.evaluate((node,icons)=>{
       for(const item of node.querySelectorAll('.bottom-item')){
         const image=item.querySelector('img');if(!image)throw Error('missing icon image');
         const key=String(image.getAttribute('src')).match(/vis07-nav-(home|stores|calendar|user)\.png/)?.[1];
         if(!key)throw Error('unexpected source asset '+image.getAttribute('src'));
         const mapped=key==='user'?'mine':key;
         image.setAttribute('src',icons[mapped][item.classList.contains('active')?'active':'inactive']);
         image.style.width='26px';image.style.height='26px';
         image.style.filter='none';
       }
     },icons);
     await nav.locator('img').first().evaluate(async()=>await Promise.all([...document.querySelectorAll('.bottom-nav img')].map(img=>img.decode())));
     const current=await nav.evaluate(n=>[...n.querySelectorAll('.bottom-item')].map(b=>{
       const r=b.getBoundingClientRect();return {name:b.textContent.trim(),active:b.classList.contains('active'),
         w:+r.width.toFixed(1),h:+r.height.toFixed(1),src:b.querySelector('img')?.getAttribute('src')?.slice(0,27),
         decoded:b.querySelector('img').naturalWidth>0,filter:getComputedStyle(b.querySelector('img')).filter};
     }));
     assert(current.every(i=>i.w>=44&&i.h>=44&&i.decoded&&i.filter==='none'),target+' candidate assets or 44px targets fail');
     assert.deepEqual(current.map(x=>x.active),target==='S01'?[false,true,false,false]:[false,false,false,true],target+' active mapping');
     await shot('04-'+target+'-candidate');
     evidence.push({width,screen:target,originalState:originalState.map(({name,active})=>({name,active})),trial:current,status:'VISUAL_TRIAL_ONLY'});
   }
   assert.deepEqual(errors,[],'browser JS errors');
   await ctx.close();
  }
  const result={source_sha:version.source_sha,source_pr:156,status:'ASSET_PREVIEW_PASS_NOT_VISUAL_SIGNOFF',screens:6,widths:[375,390],evidence,
    caveats:['H01 label is tested as a non-interactive overlay on the immutable raster, not a final edited bitmap',
    'No current H01 or app/ business source was changed; all icon replacements are in QA browser only',
    'S02 S5 do not acquire a bottom tab; no prior 2026-10 find-storage navigation was reintroduced']};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
  console.log('NAV_VIS_UNIFY_01B_375_390_ASSET_PREVIEW_PASS '+JSON.stringify({screens:result.screens,status:result.status}));
 }finally{await browser.close();await new Promise(ok=>httpServer.close(ok));}
}
run().catch(e=>{console.error('NAV_VIS_UNIFY_01B_FAIL',e.stack||String(e));process.exitCode=1;httpServer.close();});
