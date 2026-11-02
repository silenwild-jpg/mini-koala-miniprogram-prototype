#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),out=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-07');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const srv=http.createServer((req,res)=>{let u=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b));});
const base='http://127.0.0.1:4417/prototype/parallel/core-journey-fix-01/demo/';
const result=[];
async function layout(frame,size,tag){
 const shape=await frame.locator('.unit').first().evaluate(el=>{
  const price=el.querySelector('.price'),primary=price.querySelector('strong'),secondary=price.querySelector('.price-secondary'),action=el.querySelector('.order'),volume=el.querySelector('.capacity');
  const rect=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom};};
  return {price:rect(price),primary:rect(primary),secondary:rect(secondary),action:rect(action),volume:rect(volume),scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};
 });
 assert(shape.scrollWidth<=shape.clientWidth+4,tag+' horizontal overflow: '+JSON.stringify(shape));
 assert(shape.price.right<=shape.action.x+2,tag+' price overlaps CTA: '+JSON.stringify(shape));
 assert(shape.secondary.right<=shape.price.right+2,tag+' secondary text clipped: '+JSON.stringify(shape));
 assert(shape.primary.right<=shape.price.right+2,tag+' primary text clipped: '+JSON.stringify(shape));
 assert(shape.volume.right<=shape.price.x+2,tag+' volume overlaps price: '+JSON.stringify(shape));
 return shape;
}
(async()=>{await new Promise(ok=>srv.listen(4417,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const [width,height] of [[375,812],[390,844]]){
 const ctx=await browser.newContext({viewport:{width,height}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'index.html?page=S01&s01_r2=1');
 const r2=page.frameLocator('#s01-r2-frame');await r2.locator('.store-card').first().waitFor();
 const snapshot=()=>page.evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
 let before=await snapshot();
 assert.equal(before.distanceVerified,false);
 assert.equal(before.stores.length,2);
 assert(before.stores.every(s=>!s.distanceVerified&&/^\\d+\\.\\d+km$/.test(s.distance)));
 assert(before.stores.every(s=>s.units.every(u=>u.priceKind==='reference'&&u.suffix==='/月起'&&u.secondary==='')));
 assert((await r2.locator('.km').allTextContents()).every(t=>/^\\d+\\.\\d+km$/.test(t)));
 assert.equal(await r2.locator('.filter').count(),4);
 assert.equal(await r2.locator('.price-secondary').count(),before.stores.reduce((n,s)=>n+s.units.length,0));
 assert.equal(await r2.locator('.price-secondary:visible').count(),0);
 await layout(r2,width,'public-monthly');
 await page.screenshot({path:path.join(out,'S01-monthly-'+width+'.png'),fullPage:true});
 // Require real CAP selection before full-term price; term alone must not bypass phone gate.
 await r2.locator('.nav-more').click();
 await page.locator('button[data-action="r2EditDemand"]').click();
 await page.waitForURL(/cap\.html$/);
 await page.locator('#quick button[data-v="3"]').click();
 await page.locator('button[data-month="6"]').click();
 await page.locator('#cta').click();
 await page.waitForURL(/index\.html\?page=S01/);
 await r2.locator('.store-card').first().waitFor();
 let selected=await snapshot();
 assert.equal(selected.termConfirmed,true);
 assert.equal(selected.authorized,false);
 assert(selected.stores.every(s=>s.units.every(u=>u.priceKind==='reference')),'term-only displayed formal quote before phone');
 await r2.locator('.filter').nth(1).click();
 await page.locator('.control-sheet').getByText('当前距离尚未验证').waitFor();
 await page.locator('button[data-action="close"]').last().click();
 await r2.locator('.filter').nth(2).click();
 const auth=page.locator('.mk-auth-overlay');await auth.waitFor();
 await auth.locator('#mk-auth-agree').check();await auth.locator('[data-auth="wechat"]').click();
 await auth.waitFor({state:'detached'});
 await r2.locator('.store-card').first().waitFor();
 const after=await snapshot();assert.equal(after.authorized,true);assert.equal(after.termMonths,6);
 assert(after.stores.every(s=>!s.distanceVerified&&/^\\d+\\.\\d+km$/.test(s.distance)));
 const first=after.stores[0].units[0];assert(first&&first.priceKind==='term');
 const expected=await page.evaluate(id=>{const c=window.SIM_DEMO.core,r=c.state().requirement,a=c.formalAmounts([id],r.term_months);return {price:'¥'+Number(a.rent_total).toLocaleString('zh-CN'),monthly:'月均约 ¥'+Number(a.monthly_average).toLocaleString('zh-CN')+'/月'};},first.id);
 assert.equal(first.price,expected.price,'main price must match central O01 calculation');
 assert.equal(first.secondary,expected.monthly);
 assert.equal(first.suffix,'整期租金');
 const row=r2.locator('.unit').first();
 assert.equal(await row.locator('.price strong').innerText(),expected.price);
 assert.equal(await row.locator('.price-secondary').innerText(),expected.monthly);
 assert.equal(await row.locator('.price span').innerText(),'整期租金');
 const geometry=await layout(r2,width,'formal');
 await page.screenshot({path:path.join(out,'S01-whole-term-'+width+'.png'),fullPage:true});
 await row.locator('.order[aria-disabled="false"]').click();
 await page.locator('#screen.page-O01').waitFor();
 const order=page.frameLocator('#br04-frame');await order.locator('#pay').waitFor();
 // Assert quote is created by the central state from this selected unit and term.
 const state=await page.evaluate(()=>window.SIM_DEMO.core.state());
 assert.equal(state.requirement.term_months,6);
 assert.equal(state.requirement.term_confirmed,true);
 assert.deepEqual(errors,[]);
 result.push({viewport:width+'x'+height,publicMonthly:true,phonePlusTermWholeRent:expected.price,monthly:expected.monthly,distance:'PRESET_DEMO_KM_DISPLAY',distanceSort:'BLOCKED',cardGeometry:geometry,checkoutRoute:'O01',jsErrors:0});
 await ctx.close();
}
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({result:'PASS',cases:result,visualSignoff:'TECHNICAL_ONLY',mergeAllowed:false},null,2));
console.log('RC2_MERGE_PREP_07_BROWSER_PASS',JSON.stringify(result.map(({viewport,publicMonthly,phonePlusTermWholeRent,monthly,distance,distanceSort,checkoutRoute,jsErrors})=>({viewport,publicMonthly,phonePlusTermWholeRent,monthly,distance,distanceSort,checkoutRoute,jsErrors}))));
}finally{await browser.close();}
})().catch(e=>{console.error('RC2_MERGE_PREP_07_BROWSER_FAILED',e);process.exitCode=1}).finally(()=>srv.close());
