#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),out=path.resolve(__dirname,'../release-evidence/rc2-final-integration-02/fullsite');
fs.mkdirSync(out,{recursive:true});
const mimes={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const srv=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname))}
 catch{res.writeHead(400).end();return}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,b)=>e?res.writeHead(404).end('NOT_FOUND'):res.writeHead(200,{'Content-Type':mimes[path.extname(file)]||'application/octet-stream'}).end(b));
});
const routes=['H01','CAP','ITEMS','S01','S02','S5','BOOKING','QUICK','M01'];
(async()=>{
 await new Promise(ok=>srv.listen(4963,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const rows=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   for(const route of routes){
    const page=await context.newPage(),errors=[],badAssets=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1')&&r.status()>=400)badAssets.push([r.status(),r.url().split('?')[0]])});
    const query=route==='S02'?'&store=SIM_BJ01':'';
    await page.goto('http://127.0.0.1:4963/central-review-02g.html?catalog=sim&page='+route+query,{waitUntil:'domcontentloaded',timeout:25000});
    const frame=page.frameLocator('#central-host');
    assert.equal(await page.locator('#central-error').isHidden(),true,route+': route contract rejected');
    await frame.locator('body').waitFor({state:'attached'});
    if(route==='S01')await frame.frameLocator('#s01-r2-frame').locator('.s01-estore-card').waitFor();
    if(route==='S5')await frame.frameLocator('#br04-frame').locator('#artboard').waitFor();
    const textLen=await frame.locator('body').evaluate(b=>b.textContent.trim().length);
    assert(textLen>15,route+' empty page');
    await page.waitForTimeout(180);
    await page.screenshot({path:path.join(out,route+'-'+width+'-top.png')});
    const surface=route==='S01'?frame.frameLocator('#s01-r2-frame'):
      ['S5','QUICK','BOOKING'].includes(route)?frame.frameLocator('#br04-frame'):frame;
    const scrolled=await surface.locator('body').evaluate(b=>{
      const targets=[document.querySelector('#app-viewport'),document.querySelector('#scroll'),document.querySelector('.scroll'),document.scrollingElement,b].filter(Boolean);
      const main=targets.map(el=>({el,range:Math.max(0,el.scrollHeight-el.clientHeight)})).sort((a,b)=>b.range-a.range)[0];
      if(main?.range>0)main.el.scrollTop=main.range*.65;
      return {max:main?.range||0};
    });
    await page.waitForTimeout(120);
    await page.screenshot({path:path.join(out,route+'-'+width+'-mid.png')});
    await surface.locator('body').evaluate(b=>{
      const targets=[document.querySelector('#app-viewport'),document.querySelector('#scroll'),document.querySelector('.scroll'),document.scrollingElement,b].filter(Boolean);
      const main=targets.map(el=>({el,range:Math.max(0,el.scrollHeight-el.clientHeight)})).sort((a,b)=>b.range-a.range)[0];
      if(main?.range>0)main.el.scrollTop=main.range;
    });
    await page.waitForTimeout(110);
    await page.screenshot({path:path.join(out,route+'-'+width+'-bottom.png')});
    const fit=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2);
    assert(fit,route+' outer horizontal overflow');
    assert.deepEqual(errors,[],route+' JS exceptions');
    assert.deepEqual(badAssets,[],route+' 404 source assets');
    rows.push({width,height,route,bodyText:textLen,innerScrollRange:scrolled.max,jsErrors:0,badAssets:0,pass:true});
    await page.close();
   }
   await context.close();
  }
 }finally{await browser.close();await new Promise(ok=>srv.close(ok))}
 const results={pass:true,screenshots:routes.length*2*3,routeStates:rows.length,head:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rows};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify({pass:true,routeStates:rows.length,screenshots:routes.length*2*3,routes},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
