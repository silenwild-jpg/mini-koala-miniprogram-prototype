#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-final-vis-delta-01');
const port=4609,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}
  catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes)=>error?res.writeHead(404).end('NOT_FOUND'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes));
});
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const results=[];
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      const page=await context.newPage(),errors=[],missing=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))missing.push({url:r.url(),status:r.status()});});
      const origin=base+'/prototype/parallel/core-journey-fix-01/demo/';
      await page.goto(origin+'home.html',{waitUntil:'load'});
      await page.locator('#taskPhoto').evaluate(img=>img.decode());
      const label=page.locator('.task-caption-correction');
      assert(await label.isVisible(),'Visible H01 label patch is missing');
      assert.equal((await label.innerText()).trim(),'估大小算价格');
      assert.equal(await page.locator('.task-hotspots button[aria-label="估大小算价格"]').count(),1,'H01 semantic hotspot name');
      const h01=await label.evaluate(el=>{
        const rect=el.getBoundingClientRect(),img=document.querySelector('#taskPhoto').getBoundingClientRect();
        const mask=getComputedStyle(el,'::before');
        return {left:rect.left,top:rect.top,width:rect.width,imgLeft:img.left,imgTop:img.top,imgWidth:img.width,
          right:rect.right,maskBackground:mask.backgroundImage,pointerEvents:getComputedStyle(el).pointerEvents};
      });
      assert(h01.left>=width*.56&&h01.right<width*.92,'H01 label escapes the approved task card');
      assert(h01.top>h01.imgTop&&h01.top<h01.imgTop+imgHeight(width),'H01 label is outside fused image');
      assert(h01.maskBackground.includes('gradient'),'H01 old baked text not visually masked');
      assert.equal(h01.pointerEvents,'none','H01 label patch must not intercept click');
      await page.screenshot({path:path.join(out,'H01-'+width+'-visible-task-correction.png'),fullPage:false});
      await page.locator('.task-hotspots button[aria-label="估大小算价格"]').click();
      await page.waitForURL(/page=CAP/, {timeout:13000});
      const cap=await page.evaluate(()=>({href:location.href}));
      await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
      const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
      await s01.locator('.s01-context-text').waitFor({state:'visible',timeout:13000});
      assert.equal((await s01.locator('.s01-context-text').innerText()).trim(),'不确定用多大仓？');
      assert.equal((await s01.locator('.s01-edit').innerText()).trim(),'立即估算');
      assert.deepEqual((await s01.locator('.filter').allInnerTexts()).map(x=>x.trim()),['排序','距离','服务']);
      const s01Profile=await s01.locator('.s01-context').evaluate(el=>{
        const a=el.getBoundingClientRect(),text=el.querySelector('.s01-context-text').getBoundingClientRect(),
          btn=el.querySelector('.s01-edit').getBoundingClientRect();
        return {height:a.height,overflow:document.documentElement.scrollWidth>innerWidth+1,
          textFits:text.right+8<=btn.left,buttonWidth:btn.width,visible:btn.width>=40};
      });
      assert(!s01Profile.overflow,'S01 change introduced horizontal overflow');
      assert(s01Profile.textFits,'S01 CTA overlaps text');
      assert(s01Profile.visible,'S01 estimate action too narrow');
      await page.screenshot({path:path.join(out,'S01-'+width+'-empty-demand-correction.png'),fullPage:false});
      await s01.locator('.s01-edit').click();
      await app.locator('#screen.page-CAP').waitFor({timeout:13000});
      assert.equal(errors.length,0,'JS runtime errors: '+errors.join('; '));
      assert.equal(missing.length,0,'missing files: '+JSON.stringify(missing.slice(0,4)));
      results.push({width,height,h01,cap,s01Profile,result:'PASS'});
      await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',results},null,2));
    console.log('RC2_FINAL_VIS_DELTA_01_BROWSER_PASS '+JSON.stringify(results));
  }finally{await browser.close();await new Promise(done=>server.close(done));}
})().catch(e=>{console.error('RC2_FINAL_VIS_DELTA_01_BROWSER_FAIL',e.stack||e);process.exitCode=1;});
function imgHeight(w){return w*125/463;}
