#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site'),out=path.resolve(__dirname,'../release-evidence/s5-final-rebase-01');
const port=4613,origin='http://127.0.0.1:'+port,mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,origin).pathname));}catch{res.writeHead(400).end();return;}if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(fp,(e,b)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(b));});
const cases=['two-stores','one-store','term-missing','none','term-37'];
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const results=[];
 try{for(const [w,h] of [[375,812],[390,844]])for(const name of cases){
 const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1}),page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));const row={name,width:w,height:h,status:'FAIL'};
 try{
 await page.goto(origin+'/central-review-02g.html?catalog=sim&page=S5&s01_r2=1',{waitUntil:'domcontentloaded',timeout:25000});
 const s5=page.frameLocator('#central-host').frameLocator('#br04-frame');await s5.locator('body.bridge-ready').waitFor({timeout:20000});
 const state=await s5.locator('body').evaluate((body,name)=>{
 const host=window.parent.SIM_DEMO,core=host.core;
 core.setRequirement(3,name==='term-37'?37:12,true);
 const opts=host.offers();
 if(name==='term-missing')core.setRequirement(3,12,false);if(!opts.length&&name!=='none')throw Error('NO_FIXTURE_OFFERS');
 if(name==='one-store')host.s5Offers=()=>opts.slice(0,1);
 if(name==='two-stores'||name==='term-37')host.s5Offers=()=>opts.slice(0,2);
 if(name==='none')host.s5Offers=()=>[];
 window.BR04_REFRESH();
 const visible=s=>[...document.querySelectorAll(s)].filter(x=>!x.hidden&&getComputedStyle(x).display!=='none');
 const a=document.getElementById('artboard'),rect=s=>{const e=document.querySelector(s);return e?e.getBoundingClientRect().toJSON():null;};
 return {stores:visible('.s5-store-card').length,schemes:visible('.s5-unit-row').length,
 termVisible:visible('.term').length>0,termInDemand:document.getElementById('demand-term').innerText,
 compare:document.querySelectorAll('#s5-compare,.bridge-compare-row').length,
 estore:visible('.estore').length,nav:visible('#change-origin').length,
 fixed:!!document.querySelector('.fixed-cta,.fixed-buy'),
 boardW:a.getBoundingClientRect().width,docW:document.documentElement.scrollWidth,viewW:innerWidth,
 boardHeight:a.getBoundingClientRect().height,photo:rect('.s5-store-photo'),second:rect('.minor-unit'),
 priceFit:[...document.querySelectorAll('.s5-unit-price')].map(el=>({text:el.innerText,scroll:el.scrollWidth,client:el.clientWidth})),
 integerRates:[...document.querySelectorAll('.s5-unit-row')].map(el=>{
  const ids=(el.dataset.unitIds||'').split(',').filter(Boolean),n=core.state().requirement.term_months;
  if(!ids.length)return null;
  const a=core.amounts(ids,n),keys=['monthly_average','rent_total','rent_after_coupon','deposit','coupon_discount','management_fee','payable'];
  return {allInts:keys.every(k=>Number.isInteger(a[k])),exact:a.monthly_average*n===a.rent_total,
    payable:a.payable===a.rent_after_coupon+a.deposit+a.management_fee,
    suffix:el.querySelector('.s5-unit-terms>small')?.textContent||'',months:n};
 }).filter(Boolean),
 monthlyLines:[...document.querySelectorAll('.s5-unit-row')].map(el=>{
   const ids=el.dataset.unitIds?.split(',').filter(Boolean)||[];
   if(!ids.length)return null;
   const a=core.amounts(ids,core.state().requirement.term_months);
   const n=core.state().requirement.term_months;
   return {text:el.querySelector('.s5-unit-terms>small')?.textContent||'',
     rentTotal:a.rent_total,month:a.monthly_average,months:n,
     exact:Math.abs(a.monthly_average*n-a.rent_total)<.011};
 }).filter(Boolean),
 link:document.getElementById('see-more')!==null,modifies:document.querySelectorAll('#modify').length,
 photoLoaded:[...document.querySelectorAll('.s5-store-photo img')].every(el=>el.complete&&el.naturalWidth>0)
 };},name);
 assert.equal(state.compare,0);assert.equal(state.estore,1);assert.equal(state.modifies,1);assert.equal(state.nav,1);assert.equal(state.fixed,false);
 assert(state.docW<=state.viewW+2,'horizontal overflow');assert(state.boardW<=state.viewW+1,'board overflow');
 assert(state.priceFit.every(p=>p.scroll<=p.client+2),'price clipping');
 assert(state.integerRates.every(x=>x.allInts&&x.exact&&x.payable),'integer rent/total/deposit/coupon/first-pay contract');
 assert(state.integerRates.every(x=>x.suffix.includes('× '+x.months+'个月')&&!x.suffix.includes('月均')),'monthly formula text matches the source');
 assert(state.monthlyLines.every(x=>!x.text.includes('月均')&&x.text.includes('/月')),'old monthly average label visible');
 assert(state.monthlyLines.every(x=>x.exact?x.text.includes('× '+x.months+'个月'):!x.text.includes('×')),'rent formula must match real source total');
 if(name==='two-stores'||name==='term-37'){assert.equal(state.stores,2);assert.equal(state.schemes,2);if(name==='two-stores')assert(state.second.top<810,'second store starts too late');}
 if(name==='one-store'){assert.equal(state.stores,1);assert.equal(state.schemes,1);}
 if(name==='none'||name==='term-missing'){assert.equal(state.stores,0);assert.equal(state.schemes,0);}
 if(name==='term-missing')assert.equal(state.termVisible,true);else assert.equal(state.termVisible,false);
 assert.equal(errors.length,0,'browser errors: '+errors.join(';'));
 await page.screenshot({path:path.join(out,name+'-'+w+'-viewport.png')});
 await s5.locator('#artboard').screenshot({path:path.join(out,name+'-'+w+'-fullpage.png')});
 const scroll=await s5.locator('#app-viewport').evaluate(el=>{el.scrollTop=el.scrollHeight;return {scrollTop:el.scrollTop,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight};});
 row.scroll=scroll;
 if(scroll.scrollTop>0){await page.waitForTimeout(100);await page.screenshot({path:path.join(out,name+'-'+w+'-scrolled-bottom.png')});}
 if(name==='two-stores'){
 await s5.locator('#change-origin').click();assert.equal(await s5.locator('#modal').isVisible(),true,'location chooser');
 }
 row.status='PASS';row.state=state;
 }catch(e){row.error=String(e.stack||e);}finally{results.push(row);console.log('S5_FINAL_CASE',JSON.stringify(row));await context.close();}
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({head_sha:process.env.GITHUB_SHA||'',results},null,2));
 assert(results.every(x=>x.status==='PASS'),'failed: '+results.filter(x=>x.status!=='PASS').map(x=>x.name+'-'+x.width).join(','));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
