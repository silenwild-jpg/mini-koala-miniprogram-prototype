#!/usr/bin/env node
'use strict';
// S5-FINAL-VIS-SIGNOFF-04: isolated S01↔S5 visual/semantic contract QA, not live inventory.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s5-final-vis-signoff-04');
const port=4634,origin='http://127.0.0.1:'+port,mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,origin).pathname));}catch{res.writeHead(400).end();return;}if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(fp,(e,b)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(b));});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const result=[];
 try{
  for(const [w,h] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1}),page=await context.newPage(),errors=[],row={width:w,height:h,status:'FAIL'};
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(origin+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded',timeout:25000});
    const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame'),s5=app.frameLocator('#br04-frame');
    await app.locator('#screen').evaluate(()=>{const b=window.SIM_DEMO;b.core.setCity('北京');b.core.setRequirement(3,12,true);b.core.setDate(b.core.today());b.persist();b.navigate('S01');});
    await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor({timeout:20000});
    const reference=await app.locator('#screen').evaluate(()=>{
      const b=window.SIM_DEMO;const a=b.s01R2Bridge.snapshot();
      return {items:a.stores.slice(0,2).map(s=>({id:s.id,name:s.name,unit:s.units?.[0]?.id,cabin:s.units?.[0]?.cabinNo,usage:s.units?.[0]?.usage,discount:s.units?.[0]?.termDiscountLabel,price:s.units?.[0]?.price,secondary:s.units?.[0]?.secondary}))};
    });
    const s01Targets=await s01.locator('.store-card[data-card-kind="expanded"]').evaluateAll(nodes=>nodes.slice(0,2).map(e=>{
      const button=e.querySelector('.order'),img=e.querySelector('.store-photo');
      const v=x=>x?.getBoundingClientRect().toJSON()||null;
      return {photo:v(img),cta:v(button),header:e.querySelector('.store-body>h2')?.textContent,capacity:e.querySelector('.capacity')?.textContent};
    }));
    await page.screenshot({path:path.join(out,'S01-matched-'+w+'-source.png')});
    await app.locator('#screen').evaluate(()=>window.SIM_DEMO.navigate('S5'));
    await s5.locator('body.bridge-ready').waitFor({timeout:20000});
    const state=await s5.locator('body').evaluate(()=>{
      const a=document.getElementById('artboard');
      const visible=e=>!!e&&!e.hidden&&getComputedStyle(e).display!=='none';
      const rect=e=>e?.getBoundingClientRect().toJSON()||null;
      const cards=[...document.querySelectorAll('.s5-store-card')].filter(visible);
      return {cards:cards.map(e=>{
        const store=e.querySelector('.s5-store-head'),photo=e.querySelector('.s5-store-photo'),info=e.querySelector('.s5-store-info'),unit=e.querySelector('.s5-unit-row'),title=e.querySelector('.s5-store-name'),map=e.querySelector('.s5-map-action'),open=e.querySelector('.s5-store-open'),buy=e.querySelector('.s5-unit-buy'),price=e.querySelector('.s5-unit-price'),discount=e.querySelector('.s5-term-discount');
        const head=rect(store),p=rect(photo),i=rect(info),b=rect(buy),pbtn=rect(price),m=rect(map),detail=rect(open),cap=rect(e.querySelector('.s5-unit-capacity'));
        return {id:e.dataset.storeId,photo:photo?.querySelector('img')?.currentSrc||'',imgReady:!!photo?.querySelector('img')?.naturalWidth,
          storeName:title?.textContent||'',cabin:e.querySelector('.s5-cabin-tag')?.textContent||'',
          capacity:e.querySelector('.s5-unit-capacity')?.textContent||'',usage:e.querySelector('.s5-unit-use')?.textContent||'',
          discount:discount?.textContent||'',price:price?.textContent||'',secondary:e.querySelector('.s5-unit-terms>small')?.textContent||'',
          priceFit:!!price&&price.scrollWidth<=price.clientWidth+2,ctaText:buy?.textContent||'',unitIds:unit?.dataset.unitIds?.split(',')||[],
          photoLeft:p?.left,infoLeft:i?.left,headRight:head?.right,priceButton:pbtn,cta:b,map:m,details:detail,nameHit:rect(title),capacityRect:cap,cardRect:rect(e),
          tagText:[...e.querySelectorAll('.s5-store-services .mk-store-tag')].map(n=>n.textContent),
          address:e.querySelector('.s5-store-address>span')?.textContent||'',
          distance:e.querySelector('.s5-store-distance')?.textContent||''};
      }),docW:document.documentElement.scrollWidth,viewW:innerWidth,compareCount:document.querySelectorAll('#s5-compare,[data-s5-compare]').length,
      fixedCta:!!document.querySelector('.fixed-cta,.sticky-order'),estore:visible(document.querySelector('.estore')),termConfirmed:document.getElementById('demand-term').textContent.trim(),board:rect(a),
      storeStyle:cards[0]?getComputedStyle(cards[0]).display:'none'};
    });
    assert.equal(state.cards.length,2,'two matching physical stores');assert.equal(state.compareCount,0,'compare must stay removed');
    assert.equal(state.fixedCta,false,'S5 has no fixed purchase bar');assert(state.docW<=state.viewW+2,'horizontal scroll');
    assert.equal(state.termConfirmed,'12个月');
    assert.equal(state.estore,true,'E-storage service card exists');
    assert.equal(state.cards.length,s01Targets.length,'S01/S5 should both show two candidate cards for current Beijing fixture');
    for(let i=0;i<2;i++){
      const c=state.cards[i],r=reference.items.find(x=>x.id===c.id);
      assert(r,'S5 store is absent in S01 candidate store data '+c.id);
      assert(c.imgReady&&c.photo,'real demo source photo loaded');
      assert(c.photoLeft<c.infoLeft,'store photo left, text right');
      assert(c.unitIds.length>=1,'unit id missing');
      assert(c.cabin.startsWith('仓号 ')||c.cabin==='组合仓','cabin group missing');
      assert(c.capacity.includes('m³'),'capacity must be adjacent to cabin');
      assert(c.usage.startsWith('适合'),'retained suitable-use copy');
      assert(!c.usage.includes('月均'),'do not mix rent identity into usage');
      assert(!/对比|查看门店|导航|距离优先|区域低价/.test(c.ctaText),'CTA text regressed');
      assert(c.cta?.height>=47.5,'48px purchase CTA');
      assert(c.map?.width>=43.5&&c.map?.height>=43.5&&c.details?.height>=43.5&&c.nameHit?.height>=43.5,'map/store/name touch target min44px');
      assert(c.priceButton?.height>=43.5&&c.priceFit,'fee details click target and price unclipped');
      assert(c.tagText.length<=2,'S5 tags maximum 2');
      assert(c.price===r.price,'S01/S5 same unit term price '+c.id+' '+c.price+' vs '+r.price);
      assert(c.secondary===r.secondary,'S01/S5 same unit rent/month term copy');
      assert(c.usage===r.usage,'S01/S5 source-backed usage copy must be same');
      assert(c.discount===(r.discount||''),'S01/S5 lease discount must be same');
      assert(c.unitIds.includes(r.unit),'S01/S5 matched unit identity differs');
    }
    const fitsSecond=state.cards[1].cta.bottom<=h+2;
    row.screenDensity={secondCardEnd:state.cards[1].cardRect.bottom,secondCTABottom:state.cards[1].cta.bottom,fullyVisibleSecondCTA:fitsSecond};
    // Two primary purchase CTAs ought to be seen without leaving the first viewport.
    assert(fitsSecond,'second store purchase CTA is still below initial viewport');
    await page.screenshot({path:path.join(out,'S5-matched-'+w+'-viewport.png')});
    await s5.locator('#artboard').screenshot({path:path.join(out,'S5-matched-'+w+'-artboard.png')});
    await s5.locator('#app-viewport').evaluate(el=>el.scrollTop=el.scrollHeight);
    await page.screenshot({path:path.join(out,'S5-matched-'+w+'-bottom.png')});
    const extra=await s5.locator('body').evaluate(()=>{
      const buy=document.querySelector('#main-buy'),price=document.querySelector('#main-price');
      const actual=buy.textContent;price.textContent='¥100,000';
      const fit=price.scrollWidth<=price.parentElement.clientWidth+2;
      buy.textContent=actual;
      return {fits100k:fit,width:price.getBoundingClientRect().width,parent:price.parentElement.clientWidth};
    });
    assert(extra.fits100k,'100000 price geometric pressure');
    // Actual click must keep phone/order guard, not direct bypass.
    await app.locator('#screen').evaluate(()=>{const c=window.SIM_DEMO.core;c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});});
    await s5.locator('#main-buy').click();
    await app.frameLocator('#br04-frame').locator('body[data-page=o01].bridge-ready').waitFor({timeout:18000});
    const orderCabin=await app.frameLocator('#br04-frame').locator('#unit-name').innerText();
    const sourceCabin=state.cards[0].cabin.replace(/^仓号\s*/, '');
    assert(orderCabin.includes(sourceCabin),'O01 user-facing cabin number differs from S01/S5: '+orderCabin+' vs '+sourceCabin);
    row.orderCabin=orderCabin;
    const priceContract=await app.locator('#screen').evaluate(()=>{
      const c=window.SIM_DEMO.core,s=c.state(),a=c.amounts(s.selected,s.requirement.term_months);
      return {ids:s.selected,term:s.requirement.term_months,total:a.rent_total,monthly:a.monthly_average,deposit:a.deposit,fee:a.management_fee,payable:a.payable};
    });
    assert.equal(priceContract.term,12);assert.equal(priceContract.total,priceContract.monthly*12);assert.equal(priceContract.deposit,priceContract.monthly);assert.equal(priceContract.fee,50);
    assert.equal(priceContract.payable,priceContract.total+priceContract.deposit+50);
    assert.equal(errors.length,0,'uncaught JS');
    await page.screenshot({path:path.join(out,'S5-O01-'+w+'.png')});
    row.status='PASS';row.state=state;row.reference=reference;row.order=priceContract;row.pricePressure=extra;
   }catch(e){row.error=String(e.stack||e);await page.screenshot({path:path.join(out,'FAIL-'+w+'.png')}).catch(()=>{});}
   result.push(row);console.log('S5_VIS_04',JSON.stringify(row));
   await context.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sha:process.env.GITHUB_SHA||'',result},null,2));
 assert(result.every(x=>x.status==='PASS'),'S01/S5 crosspage QA fails: '+result.filter(x=>x.status!=='PASS').map(x=>x.width+': '+x.error).join(' | '));
 console.log('S5_S01_VIS_SIGNOFF_04_375_390_PASS');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
