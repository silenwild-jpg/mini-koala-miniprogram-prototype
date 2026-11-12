#!/usr/bin/env node
'use strict';
// NAV-VIS-UNIFY-01E: compare two local icon SVGs and two H01 text-contrast candidates
// on actual 375/390 browser pages. Never save trial DOM mutations into the app.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/nav-vis-unify-01e');
const origin='http://127.0.0.1:4793',prefix='/prototype/parallel/core-journey-fix-01/demo/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,origin).pathname));}
 catch{return res.writeHead(400).end();}
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,b)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b));
});
const candidateDir=path.resolve(__dirname,'../app/assets/nav/nav01e-candidates');
const candidate={};
for(const key of ['stores','mine']){
 const svg=fs.readFileSync(path.join(candidateDir,key+'-active.svg'),'utf8');
 assert(svg.startsWith('<svg')&&svg.includes('viewBox="0 0 24 24"'));
 candidate[key]='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
}
const contrast=(h)=>{
 const a=[1,3,5].map(k=>parseInt(h.slice(k,k+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 return +(1.05/(a[0]*.2126+a[1]*.7152+a[2]*.0722+.05)).toFixed(2);
};
const ink=async locator=>locator.evaluate(img=>{
 const canvas=document.createElement('canvas');canvas.width=240;canvas.height=240;const c=canvas.getContext('2d',{willReadFrequently:true});
 c.drawImage(img,0,0,240,240);const pix=c.getImageData(0,0,240,240).data;
 let x0=240,x1=-1,y0=240,y1=-1;
 for(let y=0;y<240;y++)for(let x=0;x<240;x++){
  if(pix[(y*240+x)*4+3]>=64){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 }
 return {width:+((x1-x0+1)/10).toFixed(1),height:+((y1-y0+1)/10).toFixed(1),
  centerX:+((x0+x1+1)/20).toFixed(1),centerY:+((y0+y1+1)/20).toFixed(1)};
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const version=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 assert.equal(version.source_sha,process.env.GITHUB_SHA,'not the current SHA');
 assert.equal(version.source_branch,process.env.GITHUB_REF_NAME,'wrong branch');
 assert.equal(version.source_pr,159,'parent source must be PR #159');
 await new Promise(ok=>server.listen(4793,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const runs=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN'});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const screenshot=async label=>page.screenshot({path:path.join(out,width+'-'+label+'.png'),animations:'disabled'});
   const shotNav=async label=>page.locator('.footer-nav').screenshot({path:path.join(out,width+'-'+label+'-nav-only.png')});
   await page.goto(origin+prefix+'home.html',{waitUntil:'domcontentloaded'});
   await page.locator('#navPhoto').waitFor({state:'visible'});
   await page.locator('#navPhoto').evaluate(async img=>img.decode());
   const originalAsset=await page.locator('#navPhoto').getAttribute('src');
   assert(originalAsset.includes('nav_original_'+width),'approved raster must not change');
   await screenshot('01-H01-runtime-current');
   await shotNav('01-H01-runtime-current');
   const options=[
    {tag:'02-H01-muted-readable',color:'#64798B',minimum:4.5},
    {tag:'03-H01-strong-readable',color:'#526579',minimum:6}
   ];
   for(const option of options){
    await page.locator('.footer-nav').evaluate((node,opts)=>{
      node.querySelectorAll('.nav01e-type-trial').forEach(n=>n.remove());
      for(let k=1;k<=3;k++){
       const span=document.createElement('span');
       span.className='nav01e-type-trial';
       span.textContent=['首页','附近门店','预约订单','我的'][k];
       span.style.cssText=[
        'position:absolute','left:'+(k*25)+'%','top:43%','width:25%','height:27%',
        'display:flex','align-items:center','justify-content:center','background:#fff',
        'color:'+opts.color,'font-size:10px','font-weight:500','line-height:1',
        'white-space:nowrap','pointer-events:none','z-index:2'
       ].join(';');
       node.appendChild(span);
      }
    },option);
    const c=contrast(option.color);
    assert(c>=option.minimum,'required candidate text contrast not reached');
    const txt=await page.locator('.nav01e-type-trial').allTextContents();
    assert.deepEqual(txt,['附近门店','预约订单','我的']);
    const cover=await page.locator('.nav01e-type-trial').first().boundingBox();
    assert(cover&&cover.y>=0&&cover.y+cover.height<=height+2);
    await screenshot(option.tag);
    await shotNav(option.tag);
    runs.push({width,page:'H01',variant:option.tag,contrast:c,labelColor:option.color,sourceRasterUnchanged:true,kind:'BROWSER_ONLY_CANDIDATE',status:'PASS'});
   }
   // Ensure H01 third-tab transparent hotspot is not intercepted by the trial labels.
   const targets=await page.locator('.footer-nav button').evaluateAll(nodes=>nodes.map(x=>{
     const r=x.getBoundingClientRect();return {text:x.getAttribute('aria-label'),w:r.width,h:r.height};
   }));
   assert.equal(targets.length,4);
   assert(targets.every(x=>x.w>=44&&x.h>=44),'H01 hotspot shrink in trial');
   // Reset visual trial by loading the actual current page.
   for(const route of ['S01','M01']){
    await page.goto(origin+prefix+'index.html?page='+route+'&s01_r2=1',{waitUntil:'domcontentloaded'});
    const nav=page.locator('.bottom-nav');await nav.locator('.bottom-item').first().waitFor({state:'visible'});
    const active=nav.locator('.bottom-item.active');
    await active.locator('img').evaluate(async img=>img.decode());
    const label=(await active.innerText()).trim();
    assert.equal(label,route==='S01'?'附近门店':'我的');
    await screenshot('04-'+route+'-runtime-current');
    await nav.screenshot({path:path.join(out,width+'-04-'+route+'-runtime-nav.png')});
    const originalImage=active.locator('img');
    const source=await originalImage.getAttribute('src');
    assert(source.includes('nav-current-01c/'+(route==='S01'?'stores':'mine')+'-active.svg'));
    const old=await ink(originalImage);
    const key=route==='S01'?'stores':'mine';
    // For optical comparison use this icon's own inactive SVG, not the other tab's inactive SVG.
    const idleData=await page.evaluate(async key=>{
      const img=new Image();img.src='assets/nav-current-01c/'+key+'-inactive.svg';await img.decode();
      const c=document.createElement('canvas');c.width=240;c.height=240;const d=c.getContext('2d',{willReadFrequently:true});d.drawImage(img,0,0,240,240);const p=d.getImageData(0,0,240,240).data;
      let x0=240,x1=-1,y0=240,y1=-1;
      for(let y=0;y<240;y++)for(let x=0;x<240;x++){if(p[(y*240+x)*4+3]>=64){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}}
      return {width:+((x1-x0+1)/10).toFixed(1),height:+((y1-y0+1)/10).toFixed(1)};
    },key);
    await originalImage.evaluate((img,data)=>img.setAttribute('src',data),candidate[key]);
    await originalImage.evaluate(async img=>img.decode());
    const updated=await ink(originalImage);
    const ratio=+(updated.width/idleData.width).toFixed(3);
    assert(ratio>=.95&&ratio<=1.08,'ink-width balance not acceptable: '+route+' '+JSON.stringify({updated,idleData,ratio}));
    const r=await active.boundingBox();assert(r&&r.width>=44&&r.height>=44,'button target changed');
    assert.equal(await active.locator('img').evaluate(img=>getComputedStyle(img).filter),'none');
    await screenshot('05-'+route+'-optical-candidate');
    await nav.screenshot({path:path.join(out,width+'-05-'+route+'-candidate-nav.png')});
    runs.push({width,page:route,variant:'OPTICAL_REBALANCE',inkBefore:old,inkCandidate:updated,inkInactive:idleData,inkWidthRatio:ratio,oldSrc:source,
      sourceRuntimeUnchanged:true,status:'PASS'});
   }
   assert.deepEqual(errors,[],'runtime JS error in screenshot audit');
   await ctx.close();
  }
  const result={source_sha:version.source_sha,source_pr:159,
    status:'TWO_OPTICAL_SVG_CANDIDATES_PLUS_H01_THREE_LABEL_CONTRAST_TRIALS_PASS',
    totalChecks:runs.length,results:runs,
    holds:['H01 nonactive three-label contrast candidates are only browser previews; original raster/CSS preserved',
      'Only two active SVGs added as isolated assets; S01/M01 current runtime remains on 01C icons',
      'Need explicit user visual approval before code integration, main merge, or deployment']};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log('NAV_VIS_UNIFY_01E_375_390_PREVIEW_PASS '+JSON.stringify({checks:runs.length,ratios:runs.filter(r=>r.inkWidthRatio).map(r=>({width:r.width,page:r.page,ratio:r.inkWidthRatio}))}));
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error('NAV_VIS_UNIFY_01E_FAIL',e.stack||String(e));process.exitCode=1;server.close()});
