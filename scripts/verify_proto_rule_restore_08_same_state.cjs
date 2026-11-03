#!/usr/bin/env node
'use strict';
/* RESTORE-08: Same-catalog and same-city H01/S01 visual evidence. Does NOT sign off absent S01 approved master. */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/proto-rule-restore-08');
const port=4498,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const dest=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(dest,(e,b)=>{if(e)res.writeHead(404).end('missing');else res.writeHead(200,{'Content-Type':mime[path.extname(dest)]||'application/octet-stream'}).end(b);});});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const cases=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=H01');
   let app=page.frameLocator('#central-host');
   await app.locator('#heroPhoto').waitFor();
   await app.locator('[aria-label="选择城市或搜索门店"]').click();
   await app.locator('#home-city').selectOption({label:'上海'});
   await app.locator('[data-h="search"]').click();
   const first=app.frameLocator('#s01-r2-frame');
   await first.locator('.filter').first().waitFor();
   const actualCity=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().city);
   assert.equal(actualCity,'上海','H01 search-to-S01 city state lost');
   const filterLabels=(await first.locator('.filter').allInnerTexts()).map(x=>x.trim());
   assert.deepEqual(filterLabels,['排序','距离','服务']);
   const cards=await first.locator('.store-card[data-store-id]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.storeId,title:(n.querySelector('h3')||n.querySelector('.store-title')||n.querySelector('strong'))?.textContent?.trim()||'',price:(n.querySelector('.unit-card')||n.querySelector('.price'))?.textContent?.trim()?.slice(0,85)||''})));
   assert(cards.length>0,'same-city S01 store list empty');
   await page.screenshot({path:path.join(out,'S01_SHANGHAI_'+width+'.png'),fullPage:true});
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=H01');
   app=page.frameLocator('#central-host');
   await app.locator('#heroPhoto').waitFor();
   const label=await app.locator('.demo13-city-label').innerText();
   assert.equal(label.trim(),'上海','return to H01 lost same city');
   const homeStores=await app.locator('#storeRail .store-card[data-sim-store]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.simStore,name:n.querySelector('.store-name')?.textContent?.trim()||'',price:n.querySelector('.store-price')?.textContent?.trim()||''})));
   assert(homeStores.length>0,'same-city H01 store rail empty');
   const homeSrc=await app.locator('#heroPhoto').getAttribute('src');
   assert(homeSrc.includes('hero_original_'+width+'.png'),'approved H01 slice not used');
   await page.screenshot({path:path.join(out,'H01_SHANGHAI_'+width+'.png'),fullPage:true});
   await app.locator('#scroller').evaluate(e=>e.scrollTop=e.scrollHeight);
   await page.screenshot({path:path.join(out,'H01_SHANGHAI_BOTTOM_'+width+'.png'),fullPage:true});
   cases.push({size:width,city:'上海',scenario:'SIM',h01_visual_slice:homeSrc,h01_stores:homeStores,s01_stores:cards,s01_filter_labels:filterLabels,matched_store_ids:homeStores.map(x=>x.id).filter(id=>cards.some(c=>c.id===id)),js_errors:errors});
   assert.deepEqual(errors,[],'JS error on Shanghai same-state');
   await ctx.close();
  }
  const result={status:'PASS',scope:'FIXED_CITY_DEMO_SOURCE_RUNTIME',same_city:'上海',approved_h01_master:'VIS-11J',s01_approved_full_page:'MISSING_HOLD',visual_signoff:'NOT_FINAL',private_mobile_netlify:'NOT_TESTED',cases};
  fs.writeFileSync(path.join(out,'same-state-evidence.json'),JSON.stringify(result,null,2)+'\n');
  console.log('PROTO_RULE_RESTORE_08_SAME_STATE_PASS',JSON.stringify(cases.map(c=>({size:c.size,city:c.city,h01_store_count:c.h01_stores.length,s01_store_count:c.s01_stores.length,matched_store_ids:c.matched_store_ids,filters:c.s01_filter_labels,js_errors:c.js_errors.length}))));
 }finally{await browser.close();}
})().catch(e=>{console.error('PROTO_RULE_RESTORE_08_SAME_STATE_FAIL',e);process.exitCode=1;}).finally(()=>server.close());
