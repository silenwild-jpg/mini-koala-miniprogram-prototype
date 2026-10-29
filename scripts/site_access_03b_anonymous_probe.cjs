'use strict';
// SITE-ACCESS-03B: external anonymous HTTP + two-viewport access-gate evidence.
// Never provides credentials, follows login redirects, or reads response bodies.
const fs=require('node:fs');
const path=require('node:path');
const origin='https://mini-koala-internal-rc1-review.netlify.app';
const permalink='https://6ae2d21c2256217ab4a2fef5--mini-koala-internal-rc1-review.netlify.app';
const tests=[
 ['production-root',origin+'/'],
 ['central-s5',origin+'/central-review-02g?catalog=mk&page=S5'],
 ['s5-iframe',origin+'/prototype/parallel/core-journey-fix-01/demo/br04/s5/index.html'],
 ['core-javascript',origin+'/prototype/parallel/core-journey-fix-01/demo/fixtures.js'],
 ['s5-image',origin+'/prototype/parallel/core-journey-fix-01/demo/br04/s5/assets/demand-object.png'],
 ['deploy-permalink-root',permalink+'/'],
 ['deploy-permalink-s5',permalink+'/central-review-02g?catalog=mk&page=S5']
];
const outdir=path.join(process.cwd(),'release-evidence/site-access-03b');
fs.mkdirSync(outdir,{recursive:true});
const headers={'Cache-Control':'no-store','Pragma':'no-cache','User-Agent':'MiniKoala-Site-Access-03B-Anonymous-Audit'};
async function check(label,url){
 const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(url,{method:'GET',redirect:'manual',headers,signal:controller.signal});
  const status=response.status;
  const state=[401,403].includes(status)?'PROTECTED':status>=300&&status<400?'REDIRECT_NOT_PROOF':status===200||status===206||status===304?'EXPOSED_ANONYMOUSLY':'UNVERIFIED';
  try{await response.body?.cancel();}catch{}
  return {label,url,status,state,redirect_url:status>=300&&status<400?(response.headers.get('location')||''):''};
 }catch(e){return {label,url,status:null,state:'NETWORK_UNVERIFIED',error:String(e.message).slice(0,120)};}
 finally{clearTimeout(timer);}
}
(async()=>{
 const results=[];
 for(const [label,url] of tests){const row=await check(label,url);results.push(row);console.log('03B_ANON',row.label,row.status,row.state);}
 let screenshotStatus='NOT_ATTEMPTED';
 if(results[0].state==='PROTECTED'){
   // These screenshots show ONLY Netlify's anonymous access gate, never the private product.
   try{
    const playwrightPath=require.resolve('playwright',{paths:[process.cwd(),path.join(process.cwd(),'app/prototype/parallel/core-journey-fix-01'),path.join(process.cwd(),'app'),path.join(process.cwd(),'scripts')]});
    const {chromium}=require(playwrightPath);
    const browser=await chromium.launch({headless:true});
    const shots=[];
    for(const viewport of [{width:375,height:812},{width:390,height:844}]){
      const context=await browser.newContext({viewport,deviceScaleFactor:1});
      const page=await context.newPage();
      const response=await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:25000});
      const status=response?.status()??null;
      if([401,403].includes(status)){
        const file=path.join(outdir,'anonymous-gate-'+viewport.width+'x'+viewport.height+'.png');
        await page.screenshot({path:file,fullPage:true});shots.push({viewport,status,file:path.basename(file)});
      }else{shots.push({viewport,status,file:null});}
      await context.close();
    }
    await browser.close();
    screenshotStatus=shots;
   }catch(e){screenshotStatus='UNVERIFIED: '+String(e.message).slice(0,200);}
 }
 const artifact={task:'SITE-ACCESS-03B',time:new Date().toISOString(),type:'ANONYMOUS_REMOTE_CHECK_ONLY',authorized_browser:'NOT_AVAILABLE',authenticated_live_product_screenshots:'NOT_TESTED',results,anonymous_gate_screenshots:screenshotStatus};
 fs.writeFileSync(path.join(outdir,'anonymous-remote-results.json'),JSON.stringify(artifact,null,2));
 if(results.some(r=>r.state==='EXPOSED_ANONYMOUSLY')){console.error('SITE_ACCESS_03B_POSSIBLE_PRIVATE_RESOURCE_EXPOSURE');process.exitCode=2;}
 else if(results.some(r=>r.state!=='PROTECTED')){console.error('SITE_ACCESS_03B_PARTIAL_HOLD');process.exitCode=1;}
 else console.log('SITE_ACCESS_03B_ANONYMOUS_GUARD_PASS (authorized browser still NOT TESTED)');
})().catch(e=>{console.error('SITE_ACCESS_03B_ERROR',String(e));process.exitCode=1;});
