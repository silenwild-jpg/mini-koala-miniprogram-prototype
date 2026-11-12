#!/usr/bin/env node
'use strict';
// Final visual optics report: analyze screenshots only after opening real pages at current commit.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site'),out=path.resolve(__dirname,'../release-evidence/nav-vis-unify-01f-optics');
const origin='http://127.0.0.1:4799',prefix='/prototype/parallel/core-journey-fix-01/demo/';
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const srv=http.createServer((req,res)=>{let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,origin).pathname));}catch{return res.writeHead(400).end();}if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(b));});
const contrast=(c1,c2)=>{
 const rgb=c=>[...c.matchAll(/\d+(?:\.\d+)?/g)].slice(0,3).map(x=>Number(x[0])/255);
 const l=c=>rgb(c).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((acc,v,i)=>acc+[.2126,.7152,.0722][i]*v,0);
 const [a,b]=[l(c1),l(c2)].sort((x,y)=>y-x);return +( (a+.05)/(b+.05)).toFixed(2);
};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const v=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json')));
 assert.equal(v.source_sha,process.env.GITHUB_SHA);assert.equal(v.source_pr,160);assert.equal(v.source_branch,process.env.GITHUB_REF_NAME);
 await new Promise(done=>srv.listen(4799,'127.0.0.1',done));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const rows=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},locale:'zh-CN',deviceScaleFactor:1}),page=await ctx.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+prefix+'home.html',{waitUntil:'domcontentloaded'});
   await page.locator('#navPhoto').waitFor({state:'visible'});
   const home=await page.locator('.footer-nav').evaluate(el=>{
     const n=getComputedStyle(el,'::after'),box=el.getBoundingClientRect();
     return {caption:n.content,captionColor:n.color,captionBackground:n.backgroundColor,fontSize:n.fontSize,
       originalRaster:el.querySelector('img').getAttribute('src'),box:{y:box.y,height:box.height},
       buttonLabels:[...el.querySelectorAll('button')].map(b=>b.getAttribute('aria-label'))};
   });
   assert(home.caption.includes('预约订单'),'visible H01 caption not corrected');
   home.captionContrast=contrast(home.captionColor,home.captionBackground);
   await page.locator('.footer-nav').screenshot({path:path.join(out,width+'-H01-nav.png')});
   rows.push({width,page:'H01',...home});
   for(const route of ['S01','M01']){
     await page.goto(origin+prefix+'index.html?page='+route+'&s01_r2=1',{waitUntil:'domcontentloaded'});
     const nav=page.locator('.bottom-nav');await nav.locator('.bottom-item').first().waitFor({state:'visible'});
     await nav.locator('img').first().evaluate(async()=>{await Promise.all([...document.querySelectorAll('.bottom-nav img')].map(img=>img.decode()))});
     const data=await nav.evaluate(el=>{
       const shape=img=>{
         const c=document.createElement('canvas');c.width=240;c.height=240;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,240,240);
         const rgba=ctx.getImageData(0,0,240,240).data;let minX=240,minY=240,maxX=-1,maxY=-1;
         for(let y=0;y<240;y++)for(let x=0;x<240;x++){if(rgba[(y*240+x)*4+3]>64){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
         return {width24:Math.round((maxX-minX+1)/10*10)/10,height24:Math.round((maxY-minY+1)/10*10)/10,
             middleX:Math.round((minX+maxX+1)/20)/10,middleY:Math.round((minY+maxY+1)/20)/10};
       };
       return {bg:getComputedStyle(el).backgroundColor,
         items:[...el.querySelectorAll('button')].map(btn=>{
           const icon=btn.querySelector('img'),rect=btn.getBoundingClientRect();return {
            label:btn.textContent.trim(),active:btn.classList.contains('active'),color:getComputedStyle(btn).color,
            iconSrc:icon.getAttribute('src'),iconSourceDims:[icon.naturalWidth,icon.naturalHeight],
            imgBox:{width:icon.getBoundingClientRect().width,height:icon.getBoundingClientRect().height},
            buttonBox:{width:rect.width,height:rect.height},shape:shape(icon),focusAttr:btn.getAttribute('aria-label')
           };
         })};
     });
     assert(data.items.length===4&&data.items.every(x=>x.imgBox.width>=25&&x.buttonBox.height>=44&&x.buttonBox.width>=44));
     data.items.forEach(x=>x.labelContrast=contrast(x.color,data.bg));
     await nav.screenshot({path:path.join(out,width+'-'+route+'-nav.png')});
     rows.push({width,page:route,...data});
   }
   assert.deepEqual(errors,[],'JS errors');
   await ctx.close();
  }
  const findings=[];
  const h=rows.find(r=>r.page==='H01');
  if(h.captionContrast<4.5)findings.push({severity:'P2',type:'contrast',reason:'H01 replacement label on white has below 4.5:1 contrast',ratio:h.captionContrast});
  const m=rows.find(r=>r.page==='M01'),s=rows.find(r=>r.page==='S01');
  const activeMine=m.items.find(i=>i.active),inactiveMine=s.items.find(i=>i.label==='我的');
  const activeStores=s.items.find(i=>i.active),inactiveStores=m.items.find(i=>i.label==='附近门店');
  const myRatio=+(activeMine.shape.width24/inactiveMine.shape.width24).toFixed(3);
  const storeRatio=+(activeStores.shape.width24/inactiveStores.shape.width24).toFixed(3);
  assert(myRatio>=.95&&myRatio<=1.08,'M01 selected glyph is out of balance '+myRatio);
  assert(storeRatio>=.95&&storeRatio<=1.08,'S01 selected glyph is out of balance '+storeRatio);
  assert(h.captionContrast>=5.9,'H01 corrected caption still too faint');
  const extra=rows.find(r=>r.page==='H01');
  assert(extra.caption==='"预约订单"'||extra.caption.includes('预约订单'),'third caption lost');
  const weak=rows.filter(r=>['S01','M01'].includes(r.page)).flatMap(r=>r.items.filter(x=>!x.active&&x.labelContrast<4.5).map(x=>({page:r.page,label:x.label,contrast:x.labelContrast})));
  if(weak.length)findings.push({severity:'P2',type:'inactive-contrast',reason:'Some idle text labels have below 4.5:1 contrast',samples:weak});
  const result={sha:v.source_sha,source_pr:v.source_pr,status:'FUNCTION_PASS_VISUAL_REVIEW_REQUIRED',
    rows,findings,inkWidthRatios:{mine:myRatio,stores:storeRatio},limits:['Contrast calculations compare computed CSS against declared white background, not photograph color',
     'Automated bbox does not replace human review of visual weight or native VoiceOver',
     'Current preview is HTML/Web, not native WeChat release']};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log('NAV_VIS_UNIFY_01F_OPTICS_CAPTURE_PASS '+JSON.stringify({screens:rows.length,findings:findings.length}));
 }finally{await browser.close();await new Promise(done=>srv.close(done))}
})().catch(e=>{console.error('NAV_VIS_UNIFY_01F_OPTICS_FAIL',e.stack||String(e));process.exitCode=1;srv.close()});
