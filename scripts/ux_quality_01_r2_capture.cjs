#!/usr/bin/env node
'use strict';
// UX-QUALITY-01-R2 capture-only: no runtime edits, no branch merge/deploy.
const { chromium } = require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../app'),out=path.resolve(__dirname,'../release-evidence/ux-quality-01-r2');
fs.mkdirSync(out,{recursive:true});
const port=4491,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,base).pathname),dest=path.resolve(root,'.'+pathname);
 if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(dest,(err,b)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(dest)]||'application/octet-stream'}).end(b));
});
const all=[];
(async()=>{await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [width,height] of [[375,812],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const frame=page.frameLocator('#central-host');
  async function capture(id,description){
   await page.waitForTimeout(260);
   const filename=id+'-'+width+'.png';
   await page.screenshot({path:path.join(out,filename),fullPage:true});
   let text='',buttonCount=0,smallTapTargets=[],screen='';
   try {
    text=(await frame.locator('body').innerText()).slice(0,3500);
    const x=await frame.locator('body').evaluate(el=>{
     const controls=[...el.querySelectorAll('button,a,[role=button],input,select')].filter(n=>{
       const s=getComputedStyle(n),r=n.getBoundingClientRect();
       return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0 && r.top<window.innerHeight && r.bottom>0;
     });
     return {count:controls.length,small:controls.filter(n=>{
       const r=n.getBoundingClientRect();return r.width<32 || r.height<32;
      }).slice(0,18).map(n=>({tag:n.tagName,text:(n.innerText||n.getAttribute('aria-label')||n.getAttribute('title')||'').trim().slice(0,50),width:Math.round(n.getBoundingClientRect().width),height:Math.round(n.getBoundingClientRect().height)})),
      screen:el.querySelector('#screen')?.className||'H01'
     };
    });
    buttonCount=x.count;smallTapTargets=x.small;screen=x.screen;
   }catch(e){text='DOM_UNAVAILABLE '+String(e.message)}
   all.push({id,description,viewport:width+'x'+height,filename,screen,buttonCount,smallTapTargets,text,errors:[...errors]});
   console.log('UX_R2_CAPTURE',id,width,screen,buttonCount);
  }
  async function safe(id,description,fn){
   try{await fn();await capture(id,description)}
   catch(e){all.push({id,description,viewport:width+'x'+height,status:'NOT_CAPTURED',reason:String(e.message).slice(0,700),errors:[...errors]});console.log('UX_R2_BLOCKER',id,width,String(e.message).slice(0,170))}
  }
  async function nav(target,extra=''){
   await page.goto(base+'/central-review-02g.html?catalog=sim&page='+target+extra,{waitUntil:'domcontentloaded',timeout:25000});
   await frame.locator(target==='H01'?'.task-hotspots button[aria-label="找附近门店"]':'#screen').waitFor({timeout:10000});
  }
  await safe('01-H01-first-screen','Home master and primary actions',async()=>{await nav('H01')});
  await safe('02-H01-lower','Home stores, scenarios and brand lower scroll',async()=>{
    await frame.locator('#scroller').evaluate(el=>el.scrollTop=el.scrollHeight);
  });
  await safe('03-S01-list','Four-filter stores and prices',async()=>{
    await nav('S01','&s01_r2=1');
    await frame.locator('#screen.page-S01').waitFor({timeout:10000});
  });
  await safe('04-S01-filter-layer','Four filters accessible modal state',async()=>{
    const s01=frame.frameLocator('#s01-r2-frame');
    await s01.locator('button.filter, .filter').first().click();
    await page.waitForTimeout(130);
  });
  await safe('05-S02-detail','Store detail after list entry',async()=>{
    await nav('S01','&s01_r2=1');
    await frame.locator('.store-entry[data-store]').first().click();
    await frame.locator('#screen.page-S02').waitFor({timeout:10000});
  });
  await safe('06-PHONE-gate','Phone gate reached from selected unit',async()=>{
    await frame.locator('.order-button[data-action="choose"]:not([disabled])').first().click();
    await frame.locator('.mk-auth-overlay').waitFor({timeout:10000});
  });
  await safe('07-O01-confirm','Formal order with consent and pricing',async()=>{
    await frame.locator('#mk-auth-agree').check();
    await frame.locator('button[data-auth="wechat"]').click();
    await frame.locator('#screen.page-O01').waitFor({timeout:10000});
  });
  await safe('08-CAP-entry','Known capacity and term input',async()=>{await nav('CAP')});
  await safe('09-ITEMS-entry','Item-by-item estimation default state',async()=>{await nav('ITEMS')});
  await safe('10-S5-demand','S5 prefilled requirement recommendation',async()=>{
    await nav('S01');
    await frame.locator('#screen').evaluate(()=>{window.SIM_DEMO.core.setRequirement(3,6,true);window.SIM_DEMO.persist();window.SIM_DEMO.navigate('S5')});
    await frame.locator('#screen.page-S5').waitFor({timeout:10000});
  });
  await safe('11-M01-entry','Account/orders default state',async()=>{await nav('M01')});
  await page.close();await context.close();
 }
}finally{await browser.close();server.close()}
const names=all.filter(x=>x.filename),blocked=all.filter(x=>x.status==='NOT_CAPTURED');
const meta={source_sha:process.env.GITHUB_SHA||null,method:'fresh Playwright Chromium screenshots on isolated audit branch, runtime identical to central candidate',captured:names.length,blocked:blocked.length,results:all};
fs.writeFileSync(path.join(out,'ux-r2-capture-index.json'),JSON.stringify(meta,null,2));
console.log('UX_R2_CAPTURE_RESULT',JSON.stringify({captured:names.length,blocked:blocked.length}));
if(names.length<12) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
