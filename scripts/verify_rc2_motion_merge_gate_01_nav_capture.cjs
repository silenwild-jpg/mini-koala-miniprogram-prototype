#!/usr/bin/env node
'use strict';
/* NAV-01G final independent visual evidence: capture real current screens first, then inspect DOM/accessibility. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-motion-merge-gate-01-nav-final');
const port=4792,origin='http://127.0.0.1:'+port,base='/prototype/parallel/core-journey-fix-01/demo/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let f;try{f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,origin).pathname));}
 catch{return res.writeHead(400).end()}
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(error,b)=>error?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'}).end(b));
});
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const identity=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 assert.equal(identity.source_sha,process.env.GITHUB_SHA,'review source SHA not equal runner');
 assert.equal(identity.source_branch,(process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME),'review source branch mismatch');
 assert.equal(identity.source_pr,Number(process.env.RC2_EXPECT_SOURCE_PR),'parent should be PR161');
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},locale:'zh-CN',deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const capture=async(label,selector)=>selector?
      page.locator(selector).screenshot({path:path.join(out,width+'-'+label+'.png'),animations:'disabled'}):
      page.screenshot({path:path.join(out,width+'-'+label+'.png'),animations:'disabled'});
   await page.goto(origin+base+'home.html',{waitUntil:'domcontentloaded'});
   await page.locator('#navPhoto').waitFor({state:'visible'});
   await page.locator('#navPhoto').evaluate(img=>img.decode());
   await capture('01-H01-overall');
   await capture('01-H01-footer','.footer-nav');
   const h=await page.locator('.footer-nav').evaluate(node=>{
     const pse=getComputedStyle(node,'::after');
     const labelNodes=[...node.querySelectorAll('.nav-label-01f')];
     const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
     return {captionPseudo:pse.content,pseudoColor:pse.color,pseudoFont:pse.font,pseudoPointer:pse.pointerEvents,
       raster:node.querySelector('img').getAttribute('src'),footBox:rect(node),
       idleLabels:labelNodes.map(e=>({text:e.textContent.trim(),color:getComputedStyle(e).color,
         ariaHidden:e.getAttribute('aria-hidden'),pointer:getComputedStyle(e).pointerEvents,box:rect(e)})),
       buttons:[...node.querySelectorAll('button')].map(el=>({ariaLabel:el.getAttribute('aria-label'),
         action:el.dataset.action,box:rect(el),ariaCurrent:el.getAttribute('aria-current')}))};
   });
   assert(h.raster.includes('nav_original_'+width));
   assert(h.captionPseudo.includes('预约订单'));
   assert.deepEqual(h.idleLabels.map(x=>x.text),['附近门店','我的']);
   assert(h.buttons.every(x=>x.box.width>=44&&x.box.height>=44));
   assert(h.idleLabels.every(x=>x.color==='rgb(82, 101, 121)'&&x.ariaHidden==='true'&&x.pointer==='none'));
   // Record keyboard focus appearance; do not assert WCAG from a screenshot alone.
   await page.locator('.footer-nav button:nth-of-type(3)').focus();
   const hFocus=await page.locator('.footer-nav button:nth-of-type(3)').evaluate(el=>{
     const s=getComputedStyle(el);return {focused:document.activeElement===el,outlineStyle:s.outlineStyle,
       outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,boxShadow:s.boxShadow,focusVisible:el.matches(':focus-visible')};
   });
   await capture('02-H01-focused-footer','.footer-nav');
   results.push({width,page:'H01',status:'CAPTURED',render:h,focus:hFocus});
   for(const route of ['S01','M01']){
     await page.goto(origin+base+'index.html?page='+route+'&s01_r2=1',{waitUntil:'domcontentloaded'});
     const nav=page.locator('.bottom-nav');
     await nav.locator('button').first().waitFor({state:'visible',timeout:14000});
     await nav.locator('img').first().evaluate(async()=>{await Promise.all([...document.querySelectorAll('.bottom-nav img')].map(i=>i.decode()))});
     await capture('03-'+route+'-overall');
     await capture('03-'+route+'-footer','.bottom-nav');
     const data=await nav.evaluate(node=>{
       const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
       return{box:rect(node),entries:[...node.querySelectorAll('button')].map(b=>{
         const img=b.querySelector('img'),css=getComputedStyle(b);return {
           text:b.textContent.trim(),active:b.classList.contains('active'),
           action:b.dataset.action,ariaCurrent:b.getAttribute('aria-current'),ariaLabel:b.getAttribute('aria-label'),
           icon:img.getAttribute('src'),size:rect(img),box:rect(b),color:css.color,fontSize:css.fontSize
         };
       })};
     });
     assert.deepEqual(data.entries.map(x=>x.text),['首页','附近门店','预约订单','我的']);
     assert.deepEqual(data.entries.map(x=>x.active),route==='S01'?[false,true,false,false]:[false,false,false,true]);
     assert(data.entries.every(x=>x.box.width>=44&&x.box.height>=44));
     const active=nav.locator('button.active');
     await active.focus();
     const focused=await active.evaluate(el=>{
       const style=getComputedStyle(el);return{focused:document.activeElement===el,
         outlineStyle:style.outlineStyle,outlineWidth:style.outlineWidth,focusVisible:el.matches(':focus-visible'),
         ariaCurrent:el.getAttribute('aria-current')};
     });
     await capture('04-'+route+'-focused-footer','.bottom-nav');
     results.push({width,page:route,status:'CAPTURED',render:data,focused});
   }
   assert.deepEqual(errors,[],'render-time JS errors');
   await ctx.close();
  }
  const findings=[];
  if(results.filter(x=>['S01','M01'].includes(x.page)).some(x=>x.focused.ariaCurrent==null))
     findings.push({severity:'P2','type':'assistive technology','reason':'S01/M01 active tab is signalled visually via class only; aria-current is absent (not proof of screen-reader failure).'});
  if(results.some(x=>x.page==='H01'&&x.focus.outlineStyle==='none'&&x.focus.boxShadow==='none'))
     findings.push({severity:'P2','type':'keyboard focus','reason':'H01 transparent navigation hotspot may lack visible keyboard focus; requires real keyboard/assistive technology check.'});
  const response={status:'SCREENSHOTS_CAPTURED_FOR_HUMAN_REVIEW',source_sha:identity.source_sha,source_pr:Number(process.env.RC2_EXPECT_SOURCE_PR),
    data:results,findings,evidenceLimit:'HTML/Chromium only. Full source-artboard visual authority and WeChat native voice accessibility not tested.'};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(response,null,2)+'\n');
  console.log('NAV_VIS_UNIFY_01G_FINAL_REVIEW_CAPTURE_PASS '+JSON.stringify({screens:results.length,risks:findings.length}));
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
}
main().catch(e=>{console.error('NAV_VIS_UNIFY_01G_FAIL',e.stack||String(e));process.exitCode=1;server.close()});
