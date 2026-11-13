#!/usr/bin/env node
'use strict';
// S5 extreme content guard: long store title + large demo price on 375/390.
// Mutates only the in-memory prototype fixture for deterministic presentation QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s5-extreme-content-01');
const host='http://127.0.0.1:4636';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(fp,(e,v)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(v));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4636,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN'});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(document.getElementById('central-host')?.contentWindow?.SIM_DEMO?.core?.requirementReady),null,{timeout:20000});
    const app=page.frameLocator('#central-host');
    await app.locator('#screen').evaluate(()=>{
      const B=window.SIM_DEMO;
      B.core.setCity('北京');B.core.setRequirement(3,12,true);B.persist();B.navigate('S5');
    });
    const s5=app.frameLocator('#br04-frame');
    await s5.locator('body[data-page="s5"].bridge-ready').waitFor({timeout:20000});
    const injected=await s5.locator('body').evaluate(()=>{
      const B=window.parent.SIM_DEMO,c=B.core;
      const offers=B.offers();
      if(!offers.length||!offers[0].ids?.length)throw Error('NO_S5_EXTREME_PRICE_UNIT');
      const row=offers[0];
      const campaign=window.parent.SIM_BR03_DATA?.campaigns?.find(x=>x.unitId==='SIM_BJ01_U04');
      const unit=c.fixture.units.find(u=>u.id===campaign?.unitId);
      const store=c.fixture.stores.find(s=>s.id===campaign?.storeId);
      if(!campaign||!unit||!store)throw Error('S5_EXTREME_SPECIAL_UNIT_NOT_FOUND');
      const id=unit.id,originalPrice=unit.base_month,originalCampaignPrice=campaign.baseMonth;
      row.store=store;row.ids=[id];
      unit.base_month=9999999;campaign.baseMonth=9999998;
      const originalStore=B.s5SharedStore;
      const longName='迷你考拉仓北京核心城区超长展示名称极限内容适配专项极限门店';
      const longService='支持大型家具搬运与上门装卸预约及特殊尺寸物品协助服务';
      row.store.operatingTag='特价仓';row.store.serviceTags=[longService,'到店搬运'];
      B.s5SharedStore=storeId=>({...originalStore(storeId),name:longName});
      B.s5Offers=()=>[row];
      window.BR04_REFRESH();
      return {unitId:id,originalPrice,originalCampaignPrice,extremeBasePrice:unit.base_month,extremeCampaignPrice:campaign.baseMonth,longName,longService,storeId:row.store.id};
    });
    await s5.locator('.s5-store-card:not([hidden])').first().waitFor();
    const geometry=await s5.locator('body').evaluate(()=>{
      const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height,top:r.top,bottom:r.bottom}};
      const card=document.querySelector('.s5-store-card:not([hidden])');
      const name=card?.querySelector('.s5-store-name');
      const price=card?.querySelector('.s5-unit-price');
      const formula=card?.querySelector('.s5-unit-terms>small');
      const tags=[...card?.querySelectorAll('.s5-store-services>.mk-store-tag')||[]].map(e=>({text:e.textContent,box:box(e),scroll:e.scrollWidth,client:e.clientWidth,overflow:getComputedStyle(e).overflow,textOverflow:getComputedStyle(e).textOverflow}));
      const buy=card?.querySelector('.s5-unit-buy');
      const info=card?.querySelector('.s5-unit-terms');
      return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
        nameText:name?.textContent,name:box(name),nameScroll:name?.scrollWidth,nameClient:name?.clientWidth,
        priceText:price?.textContent,priceLength:price?.dataset.priceLength,priceFits:price?.dataset.priceFits,
        price:box(price),priceScroll:price?.scrollWidth,priceClient:price?.clientWidth,
        formulaText:formula?.textContent,formula:box(formula),formulaScroll:formula?.scrollWidth,formulaClient:formula?.clientWidth,
        tags,terms:box(info),buy:box(buy),card:box(card),
        buttonVisible:!!buy&&buy.getBoundingClientRect().width>0&&buy.getBoundingClientRect().height>=47};
    });
    assert.equal(geometry.nameText,injected.longName,'full store title must remain in DOM/accessibility text');
    assert.equal(geometry.tags.length,2,'store tag row must respect the two-tag limit');
    assert.equal(geometry.tags[0].text,'特价仓','promotion tag must precede service tags');
    assert.equal(geometry.tags[1].text,injected.longService,'long service tag must retain its full DOM text');
    assert(geometry.tags[1].scroll>geometry.tags[1].client,'long service tag must use visual truncation rather than widening the card');
    assert.equal(geometry.tags[1].textOverflow,'ellipsis','long service tag must ellipsize');
    assert(geometry.tags.every(t=>t.box.right<=width+1),'store tags must stay inside the viewport');
    assert(geometry.name.right<=width+1,'long store title must not escape viewport');
    assert(geometry.documentWidth<=width+2,'long title / large price must not cause page horizontal overflow');
    assert.equal(geometry.priceLength,'extreme','large amount must trigger extreme-price treatment');
    assert.equal(geometry.priceFits,'true','large amount must fit after adaptive font sizing');
    assert(geometry.priceScroll<=geometry.priceClient+1,'large price must not be clipped');
    assert(geometry.price.right<=geometry.buy.left-2,'large price must not overlap purchase CTA');
    assert(geometry.buttonVisible,'purchase CTA must retain 48px target');
    assert(geometry.formula.right<=geometry.buy.left-2,'monthly formula must stay in price column');
    assert.deepEqual(errors,[],'S5 extreme content JavaScript errors');
    await page.screenshot({path:path.join(out,'S5-extreme-content-'+width+'.png'),fullPage:true});
    results.push({width,height,status:'PASS',injected,geometry});
    console.log('S5_EXTREME_CONTENT_PASS '+JSON.stringify({width,priceLength:geometry.priceLength,priceFits:geometry.priceFits,overflow:geometry.documentWidth-width}));
   }catch(e){
    await page.screenshot({path:path.join(out,'FAIL-'+width+'.png'),fullPage:true}).catch(()=>{});
    throw e;
   }finally{await ctx.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({source_sha:process.env.GITHUB_SHA||'',results},null,2));
  console.log('S5_EXTREME_CONTENT_375_390_PASS');
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error('S5_EXTREME_CONTENT_FAIL',e.stack||e);process.exitCode=1;});
