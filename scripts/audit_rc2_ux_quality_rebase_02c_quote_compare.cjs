#!/usr/bin/env node
'use strict';
// RC2-UX-QUALITY-REBASE-02C evidence-only audit.
// Current UAT app tree is immutable. Checks quote visibility/amount identity and design target gaps.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-ux-quality-rebase-02c');
const base='http://127.0.0.1:4614';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let target;
 try{target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(target,(e,body)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}).end(body));
});
async function audit(){
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(4614,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const records=[];
 try{
 for(const [width,height] of [[375,812],[390,844]]){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 try{
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/central-review-02g.html?catalog=sim&page=S5&s01_r2=1',{waitUntil:'domcontentloaded'});
 const rootFrame=page.frameLocator('#central-host');
 await rootFrame.locator('#screen').waitFor();
 await rootFrame.locator('#screen').evaluate(()=>{
   const b=window.SIM_DEMO;b.core.setRequirement(3,12,true);b.persist();b.navigate('S5');
 });
 const s5=rootFrame.frameLocator('#br04-frame');
 await s5.locator('body.bridge-ready').waitFor({timeout:15000});
 await s5.locator('.s5-store-card[data-rank="0"]:not([hidden]) .s5-unit-price').first().waitFor({timeout:15000});
 const anon=await s5.locator('.s5-store-card:not([hidden]) .s5-unit-price').allInnerTexts();
 const anonIsLocked=anon.length>0&&anon.every(t=>!/^¥\s*\d/.test(t.trim()));
 // Deliberately observe, do not assume all displayed price information requires authorization.
 // Public shop floor pricing and binding/order quotations need separate business signoff.
 console.log('OBSERVED_ANONYMOUS_PRICE_VISIBILITY '+JSON.stringify({width,anonymousText:anon,allNumericQuotesHidden:anonIsLocked}));
 const compareButton=s5.locator('#s5-compare');
 const anonComparison={visible:await compareButton.isVisible(),rowCount:null,containsFeeBreakdown:null};
 if(anonComparison.visible){
   await compareButton.click();await s5.locator('#modal:not([hidden])').waitFor();
   const text=await s5.locator('#modal').innerText();
   anonComparison.rowCount=await s5.locator('.bridge-compare-row').count();
   anonComparison.containsFeeBreakdown=/押金|管理费|首次应付/.test(text);
   await page.screenshot({path:path.join(out,'S5-anonymous-compare-'+width+'.png')});
 }
 // Verify source business gate by completing the same locally simulated phone verification the prototype supports.
 await rootFrame.locator('#screen').evaluate(()=>{
   const b=window.SIM_DEMO,c=b.core;c.requestPhone();c.resolvePhone('success',{phone:'13800138000',method:'local_fixture'});b.persist();b.navigate('S5');
 });
 await s5.locator('body.bridge-ready').waitFor();
 await s5.locator('.s5-store-card[data-rank="0"]:not([hidden]) .s5-unit-price').first().waitFor();
 const first=s5.locator('.s5-store-card[data-rank="0"] .s5-unit-row').first();
 const ids=(await first.getAttribute('data-unit-ids')).split(',').filter(Boolean);
 const amounts=await rootFrame.locator('#screen').evaluate(ids=>{
   const b=window.SIM_DEMO,c=b.core,s=c.state();
   return {authorized:c.authorized(),months:s.requirement.term_months,volume:s.requirement.capacity_m3,values:c.amounts(ids,s.requirement.term_months)};
 },ids);
 assert(amounts.authorized,'authorized phone condition not achieved');
 assert.equal(amounts.months,12);
 assert.equal(amounts.volume,3);
 const firstDisplayed=(await first.locator('.s5-unit-price').innerText()).trim();
 assert(firstDisplayed.includes(Math.round(amounts.values.rent_total).toLocaleString('zh-CN')),'S5 displayed rent not equal to core rent_total');
 const touch=await s5.locator('.modify,.location-edit,#term-edit,#s5-compare,.s5-store-open,.s5-store-address button').evaluateAll(els=>els.filter(e=>{
  const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
 }).map(e=>{const r=e.getBoundingClientRect();return {target:e.id||e.className||e.tagName,text:e.innerText.trim().slice(0,25),width:Math.round(r.width),height:Math.round(r.height),below44:Math.min(r.width,r.height)<44}}));
 const compareBody=await compareButton.isVisible()?await(async()=>{
   await compareButton.click();await s5.locator('#modal:not([hidden])').waitFor();
   return s5.locator('#modal').innerText();
 })():null;
 const feeGap=compareBody?{depositMissing:!/押金/.test(compareBody),managementMissing:!/管理费/.test(compareBody),payableMissing:!/首次应付/.test(compareBody)}:null;
 const row={
  width,height,anonymousQuoteProtected:anonIsLocked,anonymousText:anon,anonComparison,
  validated:{unitIds:ids,actualRent:amounts.values.rent_total,discountedMonthly:amounts.values.monthly_average,deposit:amounts.values.deposit,management:amounts.values.management_fee,payable:amounts.values.payable,displayedRent:firstDisplayed},
  visibleTouchTargets:touch,undersizedTouchTargets:touch.filter(x=>x.below44),currentComparisonFeeGap:feeGap,errors
 };
 assert.deepEqual(errors,[]);
 records.push(row);
 await page.screenshot({path:path.join(out,'S5-authorized-compare-'+width+'.png')});
 console.log('DESIGN_CONTRACT '+JSON.stringify({width,anonymousQuoteProtected:row.anonymousQuoteProtected,firstRent:row.validated.actualRent,feeGap,touchUnder44:row.undersizedTouchTargets.length}));
 await page.close();
 }finally{await ctx.close()}
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
 const report={status:'PASS',kind:'OFFLINE_SCRIPTED_SOURCE_IDENTICAL_TO_UAT',appTree:'4fbf5eefccbc9ee3e05a969b88334314263a3e79',authGateDesignApproved:false,compareSheetVisualApproved:false,records};
 fs.writeFileSync(path.join(out,'quote-and-compare-inspector.json'),JSON.stringify(report,null,2)+'\n');
 console.log('RC2_UX_QUALITY_REBASE_02C_INSPECTION_PASS '+records.length);
}
audit().catch(e=>{console.error('RC2_UX_QUALITY_REBASE_02C_INSPECTION_FAIL '+(e.stack||e));process.exitCode=1});
