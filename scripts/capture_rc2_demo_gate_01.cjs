#!/usr/bin/env node
'use strict';
/** Independent RC2 DEMO-GATE screenshot capture + measurable evidence. Does not claim human signoff. */
const assert = require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const output=path.resolve(__dirname,'../release-evidence/rc2-demo-gate-01');
const base='http://127.0.0.1:4606';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let target;try{target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}
 catch{res.writeHead(400).end();return;}
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(target,(err,data)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}).end(data));
});
const sizeModes=[[375,812],[390,844]],scenes=['H01','S01','S02','S5','BOOKING','CAP','QUICK','O01_COLD'];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 await new Promise(ok=>server.listen(4606,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const shots=[],notices=[];
 try{
 for(const [width,height] of sizeModes){
   for(const scene of scenes){
     const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
     const page=await context.newPage(),jsErrors=[];
     page.on('pageerror',err=>jsErrors.push(String(err.message)));
     try{
       let target=scene==='O01_COLD'?'O01':scene==='S02'?'S01':scene;
       const suffix=scene==='O01_COLD'?'&store=SIM_BJ01&unit=INVALID':'';
       await page.goto(base+'/central-review-02g.html?catalog=sim&page='+target+'&s01_r2=1'+suffix,{waitUntil:'domcontentloaded',timeout:30000});
       const app=page.frameLocator('#central-host');
       if(scene==='O01_COLD'){
         await page.locator('#central-error').waitFor({state:'visible',timeout:10000});
       }else if(scene==='S01'){
         await app.frameLocator('#s01-r2-frame').locator('.store-card[data-card-kind="expanded"]').first().waitFor({timeout:15000});
         const list=app.frameLocator('#s01-r2-frame');
         const picture=await list.locator('.store-card[data-card-kind="expanded"]').first().evaluate(card=>{
           const r=card.getBoundingClientRect();
           const pic=[...card.querySelectorAll('img')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,src:el.currentSrc})).sort((a,b)=>b.width-a.width)[0]||null;
           return {card:{width:r.width,height:r.height},picture:pic,ratio:pic?pic.width/r.width:null};
         });
         notices.push({type:'S01_FIRST_CARD_GEOMETRY',width,picture});
       }else if(scene==='S02'){
         const list=app.frameLocator('#s01-r2-frame');
         await list.locator('.store-card[data-card-kind="expanded"] h2').first().waitFor({timeout:15000});
         await list.locator('.store-card[data-card-kind="expanded"] h2').first().click();
         await app.locator('#screen.page-S02').waitFor({timeout:15000});
       }else if(scene==='S5'){
         await app.locator('#screen').evaluate(()=>{
           window.SIM_DEMO.core.setRequirement(3,12,true);
           window.SIM_DEMO.persist();
           window.SIM_DEMO.navigate('S5');
         });
         await app.frameLocator('#br04-frame').locator('.s5-store-card[data-rank="0"]:not([hidden]) .s5-unit-buy').first().waitFor({timeout:15000});
       }else if(scene==='BOOKING'){
         await app.frameLocator('#br04-frame').locator('#reserve-contact').waitFor({timeout:15000});
         const b=app.frameLocator('#br04-frame');
         await b.locator('#booking-address').fill('北京市朝阳区青年路18号');
         await b.locator('#reserve-contact').fill('13800138000');
         await b.locator('#submit').click();
         await b.locator('#success').waitFor({state:'visible',timeout:10000});
         const receipt=await b.locator('#success').innerText();
         notices.push({type:'BOOKING_RECEIPT_CONTENT',width,receipt});
       }else if(scene==='H01'||scene==='CAP'){
         // These two standalone approved visual pages are mounted directly rather than #screen.
         // A missing #screen is not a failed render; inspect the screenshot and real page DOM.
         await page.waitForTimeout(800);
         assert((await page.locator('body').innerText()).trim().length>25,'H01/CAP rendered blank text');
       }else{
         await app.locator('#screen').waitFor({timeout:15000});
       }
       const f=scene+'-'+width+'.png';
       await page.screenshot({path:path.join(output,f),fullPage:false});
       shots.push({scene,width,height,file:f,status:'CAPTURED',jsErrors});
     }catch(err){
       const file='FAIL-'+scene+'-'+width+'.png';
       try{await page.screenshot({path:path.join(output,file),fullPage:false})}catch{}
       shots.push({scene,width,height,file,status:'FAIL',error:String(err.stack||err).slice(0,2000),jsErrors});
     }finally{await context.close();}
   }
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
 const source={
  reviewKind:'NEW_OFFLINE_CHROMIUM_CAPTURE_NOT_NETLIFY_AUTHENTICATED',
  reviewStatus:'EVIDENCE_CAPTURE_COMPLETE',
  appGitTree:'6f96d6dc95c0669aa571e260ff18d0ca097cc3cf',
  sourceApprovedPrSHA:'a6b5e7c70b7b44b699369218c2b2ee67401d5c81',
  liveNetlifyVisualProved:false,humanSignoff:false,sourceScreenshots:shots,notices,
  failures:shots.filter(s=>s.status==='FAIL').length
 };
 fs.writeFileSync(path.join(output,'capture-results.json'),JSON.stringify(source,null,2));
 console.log('RC2_DEMO_GATE_01_CAPTURE '+JSON.stringify({captured:shots.filter(x=>x.status==='CAPTURED').length,failures:source.failures,notices}));
 if(source.failures)process.exitCode=1;
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
