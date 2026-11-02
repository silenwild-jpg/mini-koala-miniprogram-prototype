#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),evidence=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-01');fs.mkdirSync(evidence,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
const server=http.createServer((req,res)=>{const uri=new URL(req.url,'http://localhost');const target=path.resolve(root,'.'+decodeURIComponent(uri.pathname));if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403).end();return;}fs.readFile(target,(err,bytes)=>{if(err){res.writeHead(404).end('not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'}).end(bytes);});});
const base='http://127.0.0.1:4382';
(async()=>{await new Promise(resolve=>server.listen(4382,'127.0.0.1',resolve));let browser=await chromium.launch({headless:true,args:['--no-sandbox']});const checks=[];
try{
for(const [width,height] of [[375,812],[390,844]]){
 const ctx=await browser.newContext({viewport:{width,height}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const missing=[];page.on('response',r=>{if(r.status()>=400&&/s01-r2|lifecycle|br04/.test(r.url()))missing.push([r.status(),r.url()]);});
 await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1');
 const app=page.frameLocator('#central-host'),r2=app.frameLocator('#s01-r2-frame');
 await r2.locator('#r2-search').waitFor();
 assert.equal(await r2.locator('html').getAttribute('data-binding'),'CENTRAL_RC1');
 assert.equal(await r2.locator('.filter').count(),3);
 assert((await r2.locator('img.store-photo').count())>=1);
 const views=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot());
 assert.equal(views.sourceNamespace,'SIM');
 assert.equal(views.stores.length,2);
 await r2.locator('#r2-search').fill('一个没有的门店');
 await r2.getByRole('status').first().waitFor();
 await r2.locator('#r2-search').fill('');
 await r2.locator('.filter').nth(2).click();
 await app.locator('[data-action="setTerm"][data-value="6"]').click();
 await r2.locator('.order[aria-disabled="false"]').first().click();
 await app.locator('.mk-auth-overlay').waitFor();
 const auth=app.locator('.mk-auth-overlay');
 await auth.locator('#mk-auth-agree').check();await auth.locator('[data-auth=wechat]').click();
 await app.locator('#screen.page-O01').waitFor();
 const checkout=app.frameLocator('#br04-frame');
 const d=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
 await checkout.locator('#start-date').fill(d);
 await checkout.locator('#agreed').check();await checkout.locator('#pay').click();
 await checkout.locator('[data-bridge=payResult][data-value=success]').click();
 await checkout.locator('[data-bridge=orderDetail]').click();
 await app.locator('#screen.page-O03').waitFor();
 await app.locator('button[data-value="RN01"]').waitFor();
 const order=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().orders.at(-1));
 assert.equal(order.status,'paid_simulated');
 assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.s01R2Bridge.snapshot().sourceNamespace),'SIM');
 await page.screenshot({path:path.join(evidence,'r2-checkout-'+width+'.png'),fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 checks.push({size:width,scenario:'R2 opt-in visual → term filter → phone → O01 → O03',result:'PASS'});
 await ctx.close();
 const mk=await browser.newContext({viewport:{width,height}}),pageMk=await mk.newPage();
 await pageMk.goto(base+'/central-review-02g.html?catalog=mk&page=S01&s01_r2=1');
 const mkapp=pageMk.frameLocator('#central-host'),mkr2=mkapp.frameLocator('#s01-r2-frame');await mkr2.locator('#r2-search').waitFor();
 const cities=['北京','上海','深圳','杭州','广州'];
 for(const city of cities){
  const snapshot=await mkapp.locator('#screen').evaluate(city=>{window.SIM_DEMO.core.setCity(city);return window.SIM_DEMO.s01R2Bridge.snapshot();},city);
  assert.equal(snapshot.city,city);assert.equal(snapshot.sourceNamespace,'MK');
  const ids=snapshot.stores.map(o=>o.id);assert(ids.every(id=>id.startsWith('MK_')),'non-MK store id');
 }
 checks.push({size:width,scenario:'R2 MK five cities same-source ID contract',result:'PASS'});
 await mk.close();
 const legacy=await browser.newContext({viewport:{width,height}}),pageLegacy=await legacy.newPage();
 await pageLegacy.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=0');
 const old=pageLegacy.frameLocator('#central-host');await old.locator('#store-search').waitFor();
 assert.equal(await old.locator('[data-action="sort"]').count(),1);
 assert.equal(await old.locator('[data-action="priceFilter"]').count(),1);
 assert.equal(await old.locator('[data-action="serviceFilter"]').count(),1);
 checks.push({size:width,scenario:'R2 off legacy sort/price/service available',result:'PASS'});
 await legacy.close();
}
fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify({result:'PASS',checks,note:'PR isolation; R2 visibility of legacy filters still needs UI decision'},null,2));
console.log('RC2_MERGE_PREP_01_BROWSER_PASS',JSON.stringify(checks));
}finally{await browser.close();}
})().catch(e=>{console.error('RC2_MERGE_PREP_01_BROWSER_FAILED',e);process.exitCode=1}).finally(()=>server.close());
