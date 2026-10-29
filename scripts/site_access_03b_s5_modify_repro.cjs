'use strict';
// SITE-ACCESS-03B: reproduce S5 edit-demand click only against staged HTTP package.
// Does not access authenticated Netlify or modify product sources.
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const playwright=require(require.resolve('playwright',{paths:[process.cwd(),path.join(process.cwd(),'app/prototype/parallel/core-journey-fix-01'),path.join(process.cwd(),'app')]}));
const base='http://127.0.0.1:4270/prototype/parallel/core-journey-fix-01/demo';
const outdir=path.join(process.env.GITHUB_WORKSPACE||path.resolve(__dirname,'..'),'release-evidence/site-access-03b');
fs.mkdirSync(outdir,{recursive:true});
(async()=>{
 const browser=await playwright.chromium.launch({headless:true});
 const rows=[];
 try{
  for(const vp of [{width:375,height:812},{width:390,height:844}]){
   const context=await browser.newContext({viewport:vp,deviceScaleFactor:1});
   const page=await context.newPage();
   const errors=[];
   page.on('response',r=>{if(r.status()===404)errors.push({url:r.url(),status:r.status()});});
   let actual=null,status='FAIL',error='';
   try{
    const first=await page.goto(base+'/index.html?page=S5',{waitUntil:'domcontentloaded',timeout:25000});
    assert.equal(first?.status(),200,'S5 staged route should load');
    const btn=page.frameLocator('iframe#br04-frame').locator('#modify');
    await btn.waitFor({state:'visible',timeout:12000});
    await Promise.all([
      page.waitForURL(url=>url.pathname.endsWith('/demo/cap.html')||url.pathname.endsWith('/demo/items.html'),{timeout:15000}),
      btn.click()
    ]);
    actual=page.url();
    await page.waitForLoadState('domcontentloaded');
    assert.equal(errors.length,0,'no HTTP 404 triggered on S5 edit-demand click');
    assert.ok(new URL(actual).pathname.endsWith('/demo/cap.html')||new URL(actual).pathname.endsWith('/demo/items.html'),'land on central capacity or items page');
    status='PASS';
    await page.screenshot({path:path.join(outdir,'staged-s5-modify-landed-'+vp.width+'x'+vp.height+'.png'),fullPage:false});
   }catch(e){error=String(e.message).slice(0,380);}
   rows.push({viewport:vp,case:'S5_modify_click_routes_to_Central_CAP_or_ITEMS',status,actual,errors,error,environment:'STAGED_HTTP_NOT_NETLIFY_LIVE'});
   console.log('SITE_ACCESS_03B_S5_MODIFY',vp.width+'x'+vp.height,status,actual||error);
   await context.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(outdir,'s5-modify-staged-results.json'),JSON.stringify({task:'SITE-ACCESS-03B',rows,live_auth_navigation:'NOT_TESTED'},null,2));
 if(rows.some(x=>x.status!=='PASS'))process.exitCode=1;
})().catch(e=>{console.error(String(e));process.exitCode=1;});
