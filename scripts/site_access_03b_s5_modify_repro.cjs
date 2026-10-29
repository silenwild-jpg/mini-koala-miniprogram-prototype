'use strict';
// SITE-ACCESS-03B: staged S5 edit-demand click with iframe readiness + actual frame URLs.
// No Netlify authentication, no writes to product source.
const path=require('node:path'),fs=require('node:fs');
const playwright=require(require.resolve('playwright',{paths:[process.cwd(),path.join(process.cwd(),'prototype/parallel/core-journey-fix-01'),path.join(process.cwd(),'app/prototype/parallel/core-journey-fix-01')]}));
const base='http://127.0.0.1:4270/prototype/parallel/core-journey-fix-01/demo';
const outdir=path.join(process.env.GITHUB_WORKSPACE||path.resolve(__dirname,'..'),'release-evidence/site-access-03b');
fs.mkdirSync(outdir,{recursive:true});
const correct=url=>{try{return ['/demo/cap.html','/demo/items.html'].some(p=>new URL(url).pathname.endsWith(p));}catch{return false;}};
(async()=>{
 const browser=await playwright.chromium.launch({headless:true});
 const rows=[];
 try{
  for(const vp of [{width:375,height:812},{width:390,height:844}]){
   const context=await browser.newContext({viewport:vp,deviceScaleFactor:1});
   const page=await context.newPage(),errors=[],pageErrors=[],navigations=[];
   page.on('response',r=>{if(r.status()===404)errors.push({url:r.url(),status:r.status()});});
   page.on('pageerror',e=>pageErrors.push(String(e.message).slice(0,250)));
   page.on('framenavigated',f=>navigations.push(f.url()));
   let actual=null,status='FAIL',error='',handlerReady=false;
   try{
    const first=await page.goto(base+'/index.html?page=S5',{waitUntil:'domcontentloaded',timeout:25000});
    if(first?.status()!==200)throw Error('S5 initial page status '+first?.status());
    const btn=page.frameLocator('iframe#br04-frame').locator('#modify');
    await btn.waitFor({state:'visible',timeout:15000});
    await page.waitForFunction(()=>{
      try{return typeof document.querySelector('iframe#br04-frame')?.contentWindow?.document?.getElementById('modify')?.onclick==='function';}
      catch{return false;}
    },null,{timeout:15000});
    handlerReady=true;
    await btn.click();
    for(let i=0;i<40;i++){
      const candidates=[page.url(),...page.frames().map(f=>f.url())];
      if(candidates.some(correct)){actual=candidates.find(correct);break;}
      await page.waitForTimeout(250);
    }
    if(!actual)throw Error('No central CAP/ITEMS navigation after click');
    if(errors.some(x=>x.url.includes('/br04/s5/cap.html')||x.url.includes('/br04/s5/items.html')))throw Error('S5-local incorrect relative HTML path returned 404');
    status='PASS';
    await page.screenshot({path:path.join(outdir,'staged-s5-modify-landed-'+vp.width+'x'+vp.height+'.png'),fullPage:false});
   }catch(e){error=String(e.message).slice(0,400);}
   const row={viewport:vp,case:'S5_modify_click_routes_to_Central_CAP_or_ITEMS',status,actual,handlerReady,topUrl:page.url(),frameUrls:page.frames().map(f=>f.url()),navigations:navigations.slice(-14),errors,pageErrors,error,environment:'STAGED_HTTP_NOT_NETLIFY_LIVE'};
   rows.push(row);
   console.log('SITE_ACCESS_03B_S5_MODIFY',vp.width+'x'+vp.height,status,JSON.stringify({actual,handlerReady,topUrl:row.topUrl,frames:row.frameUrls,error,pageErrors:row.pageErrors}));
   await context.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(outdir,'s5-modify-staged-results.json'),JSON.stringify({task:'SITE-ACCESS-03B',rows,live_auth_navigation:'NOT_TESTED'},null,2));
 if(rows.some(x=>x.status!=='PASS'))process.exitCode=1;
})().catch(e=>{console.error(String(e));process.exitCode=1;});
