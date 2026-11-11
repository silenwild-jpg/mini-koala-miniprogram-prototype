#!/usr/bin/env node
'use strict';
/* 02C decision-contract diagnostics, NOT visual approval, business edit or deployment. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const output=path.resolve(__dirname,'../release-evidence/rc2-ux-quality-rebase-02c');
const host='http://127.0.0.1:4614',MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let name;try{name=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}catch{res.writeHead(400).end();return;}
 if(!name.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(name,(e,body)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':MIME[path.extname(name)]||'application/octet-stream'}).end(body))
});
const records=[],errors=[];
async function snap(page,name,width){
 await page.waitForTimeout(250);
 const filename=name+'-'+width+'.png';
 await page.screenshot({path:path.join(output,filename),fullPage:false,animations:'disabled'});
 return filename;
}
async function stage(width,height){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 const page=await context.newPage();page.on('pageerror',e=>errors.push({width,message:e.message}));
 try{
 await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
 const app=page.frameLocator('#central-host');
 const list=app.frameLocator('#s01-r2-frame');
 await list.locator('.store-card[data-card-kind="expanded"]').first().waitFor({timeout:15000});
 await app.locator('#screen').evaluate(()=>{
  const b=window.SIM_DEMO;
  b.core.setRequirement(3,12,true);
  b.persist();
  b.navigate('S01')
 });
 await list.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
 const result=await list.locator('.store-card[data-card-kind="expanded"]').evaluateAll(cs=>cs.map((c,i)=>{
   const p=c.querySelector('.store-photo')?.getBoundingClientRect();
   return {rank:i,storeId:c.dataset.storeId,cardH:Math.round(c.getBoundingClientRect().height),
       image:p?{w:Math.round(p.width),h:Math.round(p.height)}:null,
       offers:[...c.querySelectorAll('.unit:not([hidden])')].map(u=>({id:u.dataset.unitId,priceKind:u.querySelector('.price')?.dataset.priceKind,display:u.querySelector('.price')?.innerText.replace(/\s+/g,' ').trim(),capacity:u.querySelector('.capacity')?.innerText.trim(),button:u.querySelector('.order')?.textContent.trim()}))};
 }));
 records.push({scene:'S01-carry-3m3-12months',width,screenshot:await snap(page,'S01-carry-3m3',width),stores:result});
 await app.locator('#screen').evaluate(()=>{const b=window.SIM_DEMO;b.navigate('S5');});
 const s5=app.frameLocator('#br04-frame');
 await s5.locator('body.bridge-ready').waitFor({timeout:10000});
 await s5.locator('.s5-store-card[data-rank="0"]:not([hidden]) .s5-unit-buy').first().waitFor({timeout:12000});
 const states=await s5.locator('#artboard').evaluate(el=>({match:el.dataset.match,count:el.dataset.count,termCompact:el.dataset.termCompact,requiresCapacity:el.dataset.requiresCapacity}));
 const cards=await s5.locator('.s5-store-card:not([hidden])').evaluateAll(xs=>xs.map((el,i)=>{
    const r=el.getBoundingClientRect();
    const rows=[...el.querySelectorAll('.s5-unit-row')].map(u=>({ids:u.dataset.unitIds,price:u.querySelector('.s5-unit-price')?.textContent.trim(),priceFit:u.querySelector('.s5-unit-price')?.dataset.priceFits,buy:u.querySelector('.s5-unit-buy')?.textContent.trim(),buttonRect:Math.round(u.querySelector('.s5-unit-buy').getBoundingClientRect().height)}));
    return {rank:i,storeId:el.dataset.storeId,top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height),photoHeight:Math.round(el.querySelector('.s5-store-photo')?.getBoundingClientRect().height||0),rows};
 }));
 const amount=await app.locator('#screen').evaluate(()=>{const b=window.SIM_DEMO,s=b.core.state(),offers=b.s5Offers?.()||b.offers();return offers.slice(0,2).map(o=>({ids:o.ids,amount:b.core.amounts(o.ids,s.requirement.term_months)}))});
 records.push({scene:'S5-two-matched',width,screenshot:await snap(page,'S5-two-matched',width),states,cards,sourceAmounts:amount,viewportHeight:height});
 const compare=s5.locator('#s5-compare');
 if(await compare.isVisible()){
   await compare.click();
   await s5.locator('#modal:not([hidden])').waitFor();
   const txt=await s5.locator('#modal-body').innerText();
   records.push({scene:'S5-compare-modal',width,screenshot:await snap(page,'S5-compare-modal',width),text:txt,containsDeposit:/押金/.test(txt),containsManagementFee:/管理费/.test(txt),containsPayable:/应付/.test(txt)});
   await s5.locator('#close-modal').click();
 }
 const p=s5.locator('.s5-unit-price').first();await p.click();
 await s5.locator('#modal:not([hidden])').waitFor();
 const fees=await s5.locator('#modal-body').innerText();
 records.push({scene:'S5-fee-detail',width,screenshot:await snap(page,'S5-fee-detail',width),text:fees,containsDeposit:/押金/.test(fees),containsManagementFee:/管理费/.test(fees)});
 await s5.locator('#close-modal').click();
 await app.locator('#screen').evaluate(()=>{const b=window.SIM_DEMO;b.core.setRequirement(70,12,true);b.persist();b.navigate('S5');});
 await s5.locator('body.bridge-ready').waitFor();
 const large=await s5.locator('#artboard').evaluate(el=>({match:el.dataset.match,count:el.dataset.count}));
 records.push({scene:'S5-70m3-large',width,screenshot:await snap(page,'S5-70m3',width),state:large});
 }catch(err){errors.push({width,error:String(err.stack||err).slice(0,1600)})}
 finally{await context.close();await browser.close();}
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(4614,'127.0.0.1',resolve));
 try{await stage(375,812);await stage(390,844)}finally{await new Promise(resolve=>server.close(resolve))}
 const report={audit:'RC2-UX-QUALITY-REBASE-02C',kind:'CURRENT_UAT_APP_TREE_OFFLINE_CHROMIUM',appTree:'4fbf5eefccbc9ee3e05a969b88334314263a3e79',results:records,errors,notHumanUAT:true,notVisualApproval:true};
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log('RC2_UX_REBASE_02C '+JSON.stringify({cases:records.length,errors:errors.length,scenes:records.map(x=>x.scene)}));
 if(errors.length)process.exitCode=1;
})().catch(e=>{console.error('RC2_UX_REBASE_02C_FATAL '+e.stack);process.exitCode=1});
