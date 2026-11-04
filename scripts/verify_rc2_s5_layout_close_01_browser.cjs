#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../release-evidence/rc2-final-admission-01/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-s5-layout-close-01/screens');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),p=path.resolve(root,'.'+decodeURIComponent(u.pathname));
 if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(p,(e,b)=>e?res.writeHead(404).end('NOT_FOUND'):res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'}).end(b));
});
(async()=>{
 const results=[];
 await new Promise(r=>server.listen(4938,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   for(const route of ['S5','S01','S02','H01','CAP']){
    const page=await ctx.newPage(),errors=[],failed=[],checks={};let exception='';
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1')&&r.status()>=400)failed.push(r.url().split('?')[0])});
    try{
     await page.goto('http://127.0.0.1:4938/central-review-02g.html?catalog=sim&page='+route+(route==='S02'?'&store=SIM_BJ01':''),{waitUntil:'load'});
     await page.waitForTimeout(350);
     const central=page.frameLocator('#central-host');
     if(route==='S5'){
      const nested=central.frameLocator('#br04-frame');
      await nested.locator('#artboard').waitFor();
      // S5 without a capacity still has an accessible estimate path.
      checks.noNeedState=await nested.locator('#no-match').isVisible();
      await central.locator('body').evaluate(()=>{
       const a=window.SIM_DEMO;
       a.core.setRequirement(3,12,true);
       a.navigate('S5');
      });
      await page.waitForTimeout(650);
      checks.twoCards=await nested.locator('.major-unit').isVisible()&&await nested.locator('.minor-unit').isVisible();
      checks.termInherited=(await nested.locator('#term-summary-value').innerText()).trim()==='12个月';
      checks.termOptionsCollapsed=await nested.locator('#term-options').isHidden();
      checks.noStorePreviewOrCollapse=await nested.locator('.store-preview-toggle,.store-previews').count()===0;
      checks.wideRealStorePhotos=await nested.locator('.major-photo img,.minor-photo').evaluateAll(es=>es.length===2&&es.every(e=>e.complete&&e.naturalWidth>=1000&&e.src.includes('/store-curated/v1/'))&&es[0].src!==es[1].src);
      checks.priceUnbroken=await nested.locator('#artboard').evaluate(board=>{
       const pairs=[['.major-price strong','.major-price span'],['.minor-price strong','.minor-price span']];
       return pairs.every(([a,b])=>{
        const x=board.querySelector(a),y=board.querySelector(b);
        if(!x||!y)return false;
        const r=x.getBoundingClientRect(),s=y.getBoundingClientRect();
        return Math.abs((r.top+r.height/2)-(s.top+s.height/2))<=12&&r.right<=s.left+2;
       });
      });
      checks.buttonsNoOverlap=await nested.locator('#artboard').evaluate(board=>{
       const pairs=[['.major-price','.main-buy'],['.minor-price','.minor-buy']];
       return pairs.every(([a,b])=>{
        const r=board.querySelector(a).getBoundingClientRect(),s=board.querySelector(b).getBoundingClientRect();
        return r.right<=s.left+7;
       });
      });
      checks.noFixedBlankTail=await nested.locator('#artboard').evaluate(board=>{
       const last=board.querySelector('.estore'),br=board.getBoundingClientRect(),end=last.getBoundingClientRect();
       return br.bottom-end.bottom>=0&&br.bottom-end.bottom<=55;
      });
      checks.horizontalFit=await nested.locator('#artboard').evaluate(board=>board.scrollWidth<=board.clientWidth+1);
      await page.screenshot({path:path.join(out,'S5-'+width+'-matched-top.png')});
      await nested.locator('#app-viewport').evaluate(e=>e.scrollTop=Math.floor(e.scrollHeight/2));
      await page.waitForTimeout(110);
      await page.screenshot({path:path.join(out,'S5-'+width+'-matched-mid.png')});
      await nested.locator('#app-viewport').evaluate(e=>e.scrollTop=e.scrollHeight);
      await page.waitForTimeout(120);
      await page.screenshot({path:path.join(out,'S5-'+width+'-matched-bottom.png')});
      await nested.locator('#edit-term').click();
      checks.termEditable=await nested.locator('#modal').isVisible();
      await nested.locator('#close-modal').click();
     }else if(route==='S01'){
      checks.noPreviewToggles=await central.locator('.store-preview-toggle').count()===0;
      checks.noPreviewBlocks=await central.locator('.store-previews').count()===0;
      checks.storeDetailLinks=await central.locator('.store-quick-link').count()>=2;
      checks.capacityPrompt=(await central.locator('.demand').innerText()).includes('不确定用多大仓？');
      checks.estimateLink=(await central.locator('.demand').innerText()).includes('立即估算');
      await page.screenshot({path:path.join(out,'S01-'+width+'-compact.png')});
     }else if(route==='S02'){
      checks.lightEstimate=(await central.locator('.s02-demand').innerText()).includes('立即估算');
      await page.screenshot({path:path.join(out,'S02-'+width+'-prompt.png')});
     }else if(route==='H01'){
      checks.homeTask=(await central.locator('body').innerText()).includes('估大小算价格');
      await page.screenshot({path:path.join(out,'H01-'+width+'-cta.png')});
     }else if(route==='CAP'){
      checks.capacityCTA=(await central.locator('#cta').innerText()).includes('查看仓位报价');
      await page.screenshot({path:path.join(out,'CAP-'+width+'-cta.png')});
     }
    }catch(e){exception=String(e.stack||e)}
    results.push({route,width,checks,errors,failed,exception});
    await page.close();
   }
   await ctx.close();
  }
 }finally{
  await browser.close();await new Promise(r=>server.close(r));
  const issues=results.filter(r=>r.exception||r.errors.length||r.failed.length||Object.values(r.checks).some(v=>!v));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({pass:issues.length===0,results},null,2));
  console.log(JSON.stringify({pass:issues.length===0,count:results.length,issues},null,2));
  if(issues.length)process.exitCode=1;
 }
})().catch(e=>{console.error(e);process.exitCode=1});
