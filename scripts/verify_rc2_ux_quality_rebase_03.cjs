#!/usr/bin/env node
'use strict';
// RC2-UX-QUALITY-REBASE-03: source-identical isolated Chromium QA, NO Netlify deploy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-ux-quality-rebase-03');
const host='http://127.0.0.1:4616';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
const cases=[];
function rect(el){const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4616,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const [width,height] of [[375,812],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(host+'/central-review-02g.html?catalog=sim&page=S5&s01_r2=1',{waitUntil:'domcontentloaded'});
   const app=page.frameLocator('#central-host');
   await app.locator('#screen').evaluate(()=>{
    const b=window.SIM_DEMO;b.core.setRequirement(3,12,true);b.persist();b.navigate('S5');
   });
   const s5=app.frameLocator('#br04-frame');
   await s5.locator('.s5-store-card[data-rank="0"]:not([hidden]) .s5-unit-price').first().waitFor();
   const cards=s5.locator('.s5-store-card:not([hidden])');
   assert.equal(await cards.count(),2,'S5 must retain two real matching stores');
   const initial=await cards.evaluateAll(el=>el.map(x=>({
    rank:x.getAttribute('data-rank'),storeId:x.dataset.storeId,
    rect:(()=>{const r=x.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}})(),
    photo:{width:x.querySelector('.s5-store-photo')?.getBoundingClientRect().width,height:x.querySelector('.s5-store-photo')?.getBoundingClientRect().height},
    visibleUnitRows:[...x.querySelectorAll('.s5-unit-row')].filter(y=>!y.hidden).length,
    alternateUnits:x.querySelectorAll('.s5-alt-unit').length
   })));
   assert(initial.every(x=>x.photo.width<=82&&x.photo.height<=82),'oversized cover photo still occupies two-store S5 screen');
   assert(initial[1].rect.top<height-110,'second recommended store not visible high enough for comparison');
   assert(initial.every(x=>x.visibleUnitRows===1),'alternate rows should start collapsed, preserving access via disclosure');
   const payableTexts=await cards.locator('.s5-store-payable').allInnerTexts();
   const expectedPayables=await app.locator('#screen').evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core,s=c.state(),rows=b.s5Offers?.()||b.offers();
      return rows.slice(0,2).map(x=>c.amounts(x.ids,s.requirement.term_months).payable);
   });
   assert.equal(payableTexts.length,2,'both stores must disclose first payable');
   for(let i=0;i<2;i++)assert(payableTexts[i].includes(expectedPayables[i].toLocaleString('zh-CN')),'first payable mismatch '+i);
   const beforePrices=await s5.locator('.s5-unit-row:not([hidden]) .s5-unit-price').evaluateAll(nodes=>nodes.map(e=>{
     const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {value:e.innerText,clip:e.scrollWidth>e.clientWidth+1,font:parseFloat(s.fontSize),rect:{w:r.width,h:r.height}};
   }));
   assert(beforePrices.length>=2);
   assert(beforePrices.every(x=>x.font>=14&&!x.clip),'readable term prices should not be clipped');
   const controls=await s5.locator('#modify,#change-origin,#term-edit,#s5-compare,.s5-store-open,.s5-store-address button,.s5-unit-row:not([hidden]) .s5-unit-price,.s5-unit-row:not([hidden]) .s5-unit-buy,.s5-alt-toggle,.s5-store-payable').evaluateAll(elements=>{
    const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
    return elements.filter(visible).map(e=>({text:(e.innerText||e.getAttribute('aria-label')||'').trim(),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)}));
   });
   assert(controls.length>=10,'expected all important controls');
   assert(controls.every(c=>c.width>=44&&c.height>=44),'sub-44px interactive targets: '+JSON.stringify(controls.filter(c=>c.width<44||c.height<44)));
   assert((await s5.locator('html').evaluate(el=>el.scrollWidth))<=width+2,'horizontal overflow');
   await page.screenshot({path:path.join(out,'S5-two-store-'+width+'.png'),fullPage:false});
   const toggle=cards.first().locator('.s5-alt-toggle');
   const alt=cards.first().locator('.s5-alt-unit');
   assert(await toggle.count()>=1,'second unit must remain available');
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   await toggle.click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   await alt.first().waitFor({state:'visible'});
   assert.equal(await alt.first().locator('.s5-unit-buy').count(),1);
   await page.screenshot({path:path.join(out,'S5-expanded-alternative-'+width+'.png'),fullPage:false});
   await toggle.click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   assert.equal(await alt.first().isVisible(),false);
   const compare=s5.locator('#s5-compare');
   await compare.click();
   await s5.locator('#modal:not([hidden])').waitFor();
   const table=s5.locator('.s5-comparison-table');
   await table.waitFor();
   const labels=await table.locator('tbody th').allInnerTexts();
   assert.deepEqual(labels,['整期租金','月均租金','优惠券','押金','管理费','首次应付']);
   const feeRows=await table.locator('tbody tr').evaluateAll(els=>els.map(tr=>({
    key:tr.querySelector('th')?.textContent.trim(),
    prices:[...tr.querySelectorAll('td')].map(td=>td.textContent.trim())
   })));
   const jsPrices=await app.locator('#screen').evaluate(()=>{
    const b=window.SIM_DEMO,c=b.core,s=c.state(),rows=b.s5Offers?.()||b.offers();
    return rows.slice(0,2).map(x=>c.amounts(x.ids,s.requirement.term_months));
   });
   for(const [index,amounts] of jsPrices.entries()){
    for(const [label,key] of [['整期租金','rent_total'],['月均租金','monthly_average'],['押金','deposit'],['管理费','management_fee'],['首次应付','payable']]){
      const row=feeRows.find(x=>x.key===label);
      assert(row,'missing '+label);
      const rendered=Number(row.prices[index].replace(/[¥,\s]/g,''));
      assert.equal(rendered,amounts[key],label+' must come from live core amounts for store '+index);
    }
   }
   await page.screenshot({path:path.join(out,'S5-fee-table-'+width+'.png'),fullPage:false});
   await s5.locator('#close-modal').click();
   const anonState=await app.locator('#screen').evaluate(()=>{
    const c=window.SIM_DEMO.core,s=c.state();return {authorized:c.authorized(),quote:!!s.quote,orders:s.orders.length};
   });
   assert.equal(anonState.authorized,false);
   assert.equal(anonState.quote,false);
   assert.equal(anonState.orders,0);
   cases.push({width,height,status:'PASS',firstCards:initial,prices:beforePrices,firstPayables:payableTexts,controls,feeRows,anonState});
   console.log('UX_REBASE_03_VIEWPORT '+JSON.stringify({width,secondTop:Math.round(initial[1].rect.top),controls:controls.length,feeRows:feeRows.length}));
   assert.deepEqual(errors,[],'browser JS error(s)');
  }finally{await context.close()}
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',kind:'OFFLINE_CHROMIUM_NOT_SSO_UAT',cases,reviewedRentDisplayCeiling:100000,formalProductionRentCapNotEnforced:true,mainMerged:false},null,2));
 console.log('RC2_UX_QUALITY_REBASE_03_PASS '+cases.length);
})().catch(err=>{console.error('RC2_UX_QUALITY_REBASE_03_FAIL '+(err.stack||err));process.exitCode=1});
