#!/usr/bin/env node
/* MOTION-S01-S5-01C | Optional same-SHA local browser QA. No new UI or production connection. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(process.env.RC2_MOTION_BROWSER_ROOT||path.join(__dirname,'../release-evidence/rc2-merge-prep-10/site'));
const out=path.resolve(__dirname,'../release-evidence/motion-s01-s5-01c');
const port=4751,host='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let p;try{p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
  if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(p,(e,b)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'}).end(b));
});
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
(async()=>{
  if(!fs.existsSync(path.join(root,'central-review-02g.html')))throw Error('BUILD_RC2_BUNDLE_BEFORE_BROWSER_QA');
  fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const results=[];
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      try{
        await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>Boolean(document.querySelector('#central-host')?.contentWindow?.SIM_DEMO?.core),null,{timeout:20000});
        const app=page.frameLocator('#central-host');
        await app.locator('#screen').evaluate(()=>{
          const B=window.SIM_DEMO;
          B.core.setCity('北京');B.core.setRequirement(3,12,true);B.persist();
          window.wx={chooseLocation({success}){success({name:'北京市朝阳区选定位置',latitude:39.900,longitude:116.400});}};
          B.navigate('S5');
        });
        let s5=app.frameLocator('#br04-frame');
        await s5.locator('body[data-page="s5"].bridge-ready').waitFor({timeout:15000});
        const before=await s5.locator('#origin-name').innerText();
        await s5.locator('#change-origin').click();
        await s5.locator('#origin-name').filter({hasText:'北京市朝阳区选定位置'}).waitFor({timeout:10000});
        const after=await s5.locator('body').evaluate(()=>{
          const ids=[...document.querySelectorAll('.s5-store-card')].filter(x=>!x.hidden)
            .map(x=>({id:x.dataset.storeId,distance:x.querySelector('.s5-store-distance')?.textContent||'',
              price:x.querySelector('.s5-unit-price')?.textContent||''}));
          return {label:document.querySelector('#origin-name')?.textContent,ids,
            capacity:document.querySelector('#capacity')?.textContent,
            term:document.querySelector('#demand-term')?.textContent};
        });
        assert(after.ids.length>=2,'S5 has two matched stores');
        assert(after.ids.every(x=>x.id&&/km/.test(x.distance)),'S5 map distance visible');
        assert(after.capacity.includes('3')&&after.term.includes('12'),'demand preserved');
        await page.screenshot({path:path.join(out,'S5-'+width+'-selected-origin.png'),fullPage:false});
        await s5.locator('#see-more').click();
        const s01=app.frameLocator('#s01-r2-frame');
        await s01.locator('.stores').waitFor({state:'visible',timeout:15000});
        const snapshot=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
        assert.equal(snapshot.distanceSortSource,'S5_SELECTED_ORIGIN_PROPERTY','S01 must inherit the same map location');
        assert(snapshot.canReturnToS5,'return to S5 must retain demand context');
        assert.deepEqual(snapshot.stores.slice(0,2).map(x=>x.id),after.ids.slice(0,2).map(x=>x.id),'first two matched store IDs preserve selected-origin ranking');
        for(let i=0;i<2;i++)
          assert.equal(snapshot.stores[i].distance,after.ids[i].distance.trim().replace(/^↗\\s*/,''),'same distance in S5 and S01');
        const panel=s01.locator('.filter').first();await panel.click();
        await s01.locator('#s01-inline-panel').waitFor({state:'visible'});
        const state=await s01.locator('.filter').first().evaluate(el=>({expanded:el.getAttribute('aria-expanded'),label:el.textContent}));
        assert.equal(state.expanded,'true','filter panel exposes expanded state');
        await page.screenshot({path:path.join(out,'S01-'+width+'-filter-open.png'),fullPage:false});
        await page.emulateMedia({reducedMotion:'reduce'});
        const transition=await panel.evaluate(el=>getComputedStyle(el).transitionDuration);
        assert(transition.split(',').every(x=>parseFloat(x)===0),'reduced-motion must turn off filter animation');
        const overflow=await s01.locator('body').evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
        assert(!overflow,'S01 horizontally overflows the device width');
        await s01.locator('#s01-inline-panel').locator('[data-sort="recommended"]').click();
        await s01.locator('.s01-return-recommend').click();
        s5=app.frameLocator('#br04-frame');
        await s5.locator('body[data-page="s5"].bridge-ready').waitFor({timeout:15000});
        const backLabel=await s5.locator('#origin-name').innerText();
        assert.equal(backLabel,after.label,'returned S5 retains selected location');
        assert.deepEqual(errors,[],'No JS page errors');
        results.push({width,height,before,origin:after.label,stores:after.ids,returned:backLabel,
          filterExpanded:state.expanded,reducedMotion:transition,status:'PASS'});
      }finally{await context.close();}
    }
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify({status:'PASS',checks:results},null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
