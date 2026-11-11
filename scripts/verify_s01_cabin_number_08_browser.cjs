#!/usr/bin/env node
'use strict';
// S01-UX-REFINE-08 | deterministic cabin IDs and navigation contract.
// No real inventory claim; this is a synthetic prototype UI field.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const source=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s01-cabin-number-08');
const origin='http://127.0.0.1:4645';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(source,'.'+decodeURIComponent(new URL(req.url,origin).pathname))}catch{res.writeHead(400).end();return}
 if(!file.startsWith(source+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,b)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b))
});
const format=/^[A-D](00[1-9]|0[12][0-9]|030)$/;
const cases=[];
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4645,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(origin+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
    await s01.locator('.store-card.s01-compact').first().waitFor();
    const inventory=await app.locator('#screen').evaluate(()=>{
      const b=window.SIM_DEMO,F=b.core.fixture;
      const rows=F.units.map(u=>({id:u.id,store:u.store_id,code:u.demo_cabin_no,source:u.demo_cabin_source}));
      return {rows,unitIdentityType:F.unitIdentityType||'PHYSICAL_SIM',version:F.version};
    });
    const byStore=new Map();
    for(const u of inventory.rows){
      assert.match(u.code,format,'invalid display code on '+u.id);
      assert.equal(u.source,'SYNTHETIC_PRESENTATION_ONLY');
      const used=byStore.get(u.store)||new Set();
      assert(!used.has(u.code),'duplicate cabin within store '+u.store+'/'+u.code);
      used.add(u.code);byStore.set(u.store,used);
    }
    const mounted=await app.locator('#screen').evaluate(()=>{
      const b=window.SIM_DEMO;b.core.setRequirement(3,12,true);b.persist();b.navigate('S01');
      return b.s01R2Bridge.snapshot().stores.slice(0,2).map(s=>({
        storeId:s.id,unitId:s.units[0]?.id,cabinNo:s.units[0]?.cabinNo,volume:s.units[0]?.volume
      }));
    });
    await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
    const s01Data=await s01.locator('.store-card[data-card-kind="expanded"]').evaluateAll(cards=>cards.map(c=>{
      const u=c.querySelector('.unit'),tag=u.querySelector('.s01-cabin-tag'),capacity=u.querySelector('.capacity');
      const r=n=>{const a=n.getBoundingClientRect();return {left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width,height:a.height}};
      return {storeId:c.dataset.storeId,unitId:u.dataset.unitId,cabin:u.dataset.cabinNo,tag:tag.textContent,
        tagFont:parseFloat(getComputedStyle(tag).fontSize),capacity:capacity.textContent,
        capFont:parseFloat(getComputedStyle(capacity).fontSize),
        tagRect:r(tag),capRect:r(capacity),usageRect:r(u.querySelector('.unit-desc')),
        priceRect:r(u.querySelector('.price strong')),buttonRect:r(u.querySelector('.order')),
        price:u.querySelector('.price strong').textContent,
        action:u.querySelector('.order').textContent
      };
    }));
    assert.equal(s01Data.length,2);
    for(let i=0;i<2;i++){
      const row=s01Data[i],want=mounted[i];
      assert.equal(row.unitId,want.unitId);assert.equal(row.cabin,want.cabinNo);
      assert.equal(row.tag,'仓号 '+want.cabinNo);assert(row.capFont>=19&&row.capFont>row.tagFont+7);
      // REF-VIS-FIX-04: cabin / capacity occupy one information group.
      assert(row.tagRect.right<=row.capRect.left+2,'cabin and capacity must be grouped');
      assert(Math.abs(row.tagRect.top-row.capRect.top)<16,'cabin must align with capacity');
      assert(row.capRect.bottom<=row.priceRect.top+2,'price row must follow capacity');
      assert(row.usageRect.top>=row.capRect.top-2,'usage must share capacity group');
      assert(row.buttonRect.left>=row.priceRect.right-2,'checkout remains right of price');
      assert(row.buttonRect.top>=row.priceRect.top-2,'checkout aligns with price row');
      assert(row.buttonRect.height>=48,'checkout action height regression');
      assert.match(row.capacity,new RegExp(String(want.volume)));
    }
    await page.screenshot({path:path.join(out,'S01-cabin-matched-'+width+'.png')});
    await s01.locator('.stores').screenshot({path:path.join(out,'S01-cabin-list-'+width+'.png')});
    const target=mounted[0],targetCode=target.cabinNo;
    await app.locator('#screen').evaluate((_,storeId)=>window.SIM_DEMO.s01R2Bridge.action('store',storeId),target.storeId);
    await app.locator('#screen.page-S02').waitFor();
    const s02=await app.locator('.unit-row[data-unit="'+target.unitId+'"] .mk-cabin-tag').first().innerText();
    assert.equal(s02,'仓号 '+targetCode);
    const s02Strong=await app.locator('.unit-row[data-unit="'+target.unitId+'"] .mk-cabin-capacity').first().innerText();
    assert.equal(s02Strong,target.volume+'m³');
    await page.screenshot({path:path.join(out,'S02-cabin-'+width+'.png')});
    await app.locator('#screen').evaluate((_,id)=>{
      const b=window.SIM_DEMO,c=b.core;
      c.setRequirement(3,12,true);c.select([id]);c.requestPhone();
      c.resolvePhone('success',{phone:'13800138000',method:'local_fixture'});
      c.setDate(c.today());b.persist();b.navigate('O01');
    },target.unitId);
    await app.locator('#screen.page-O01').waitFor();
    const o01=app.frameLocator('#br04-frame');
    await o01.locator('body.bridge-ready').waitFor({timeout:15000});
    const checkout=await o01.locator('#unit-name').innerText();
    assert.equal(checkout,'仓号 '+targetCode);
    assert.equal(await o01.locator('.summary .capacity').innerText(),target.volume+'m³','O01 capacity must appear once in the dedicated capacity row');
    await page.screenshot({path:path.join(out,'O01-cabin-'+width+'.png')});
    // Do not fabricate an order merely to show a number; verify the
    // existing receipt/output renderer uses the same fixture identity.
    const orderName=await app.locator('#screen').evaluate((_,id)=>{
      const b=window.SIM_DEMO,u=b.core.fixture.units.find(x=>x.id===id);
      return {cabin:u.demo_cabin_no,source:u.demo_cabin_source};
    },target.unitId);
    assert.equal(orderName.cabin,targetCode);
    await app.locator('#screen').evaluate(()=>{const b=window.SIM_DEMO;b.navigate('S5');});
    await app.locator('#screen.page-S5').waitFor();
    const s5=app.frameLocator('#br04-frame');
    await s5.locator('body.bridge-ready').waitFor({timeout:15000});
    const s5Cards=await s5.locator('.s5-store-card:not([hidden])').evaluateAll(els=>els.map(el=>({
      storeId:el.dataset.storeId,
      unitIds:el.querySelector('.s5-unit-row')?.dataset.unitIds?.split(','),
      cabin:el.querySelector('.s5-cabin-no')?.textContent||''
    })));
    for(const row of s5Cards){
      const codes=row.unitIds.map(id=>inventory.rows.find(x=>x.id===id)?.code).filter(Boolean);
      assert.equal(row.cabin,'仓号 '+codes.join('、'),'S5 has a different code for the same unit');
    }
    await page.screenshot({path:path.join(out,'S5-cabin-'+width+'.png')});
    // A simulated paid order is local-only; no real payment or inventory
    // reservation. It lets us test downstream order and lifecycle text.
    const simulated=await app.locator('#screen').evaluate(()=>{
      const B=window.SIM_DEMO,c=B.core;
      const o=c.submit?null:null;
      // Quote and order are core demo state-machine calls.
      const quote=c.quote(),created=c.submit();
      c.pay(created.id,'success');
      B.persist();B.openOrder(created.id);
      return {orderId:created.id,unitIds:created.unit_ids,quoteId:quote.id};
    });
    await app.locator('#screen.page-O03').waitFor();
    const orderDetail=await app.locator('.mk-order-summary').innerText();
    assert(orderDetail.includes('仓号 '+targetCode),'O03 order detail lost stable cabin identity');
    await page.screenshot({path:path.join(out,'O03-cabin-'+width+'.png')});
    await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('M01'));
    await app.locator('#screen.page-M01').waitFor();
    const orderList=await app.locator('.mk-order-list-main').first().innerText();
    assert(orderList.includes('仓号 '+targetCode),'M01 order list lost cabin number');
    await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('RN01'));
    await app.locator('#screen.page-RN01').waitFor();
    const renewal=await app.locator('#screen.page-RN01').innerText();
    assert(renewal.includes('仓号：'+targetCode),'renewal lifecycle lost cabin number');
    await page.screenshot({path:path.join(out,'RN01-cabin-'+width+'.png')});
    assert.deepEqual(errors,[],'browser JS errors');
    cases.push({width,height,status:'PASS',fixtureCount:inventory.rows.length,storeCount:byStore.size,
      target,s01:s01Data,s02,o01:checkout,s5:s5Cards,simulated,orderDetail,orderList,renewal});
   }catch(e){
    await page.screenshot({path:path.join(out,'failure-'+width+'.png')}).catch(()=>{});
    throw e;
   }finally{await ctx.close()}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',offlineChromium:true,liveDeployed:false,merged:false,
    userVisualSigned:false,cabinSource:'SYNTHETIC_PRESENTATION_ONLY',cases},null,2));
  console.log('S01_CABIN_NUMBER_08_PASS '+JSON.stringify(cases.map(c=>({width:c.width,code:c.target.cabinNo,s02:c.s02,o01:c.o01}))));
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',message:e.stack||String(e)},null,2));
 console.error('S01_CABIN_NUMBER_08_FAIL '+(e.stack||e));process.exitCode=1});
