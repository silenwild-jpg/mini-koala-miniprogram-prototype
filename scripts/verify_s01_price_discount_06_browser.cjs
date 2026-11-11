#!/usr/bin/env node
'use strict';
// S01-PRICE-DISCOUNT-06: branch-isolated 375 / 390 Chrome regression.
// No physical store price claims. Only configured term-rent factors are shown.
// Crossed-out original prices are prohibited without verified history.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s01-price-discount-06');
const host='http://127.0.0.1:4641';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}
  catch{res.writeHead(400).end();return}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,bytes)=>error?res.writeHead(404).end('Not found'):
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes))
});
const terms=[1,3,4,6,7,12,13,36,37,60];
const results=[];
const fmt=v=>'¥'+Number(v).toLocaleString('zh-CN',{maximumFractionDigits:2});
const capPriceCase=async (app,s01,months)=>{
  await app.locator('#screen').evaluate((_,months)=>{
    const b=window.SIM_DEMO;
    b.core.setRequirement(3,months,true);
    b.persist();b.navigate('S01');
  },months);
  await s01.locator('.store-card[data-card-kind="expanded"] .s01-term-discount').first().waitFor({state:'visible'});
  const s=await app.locator('#screen').evaluate(()=>({
    snap:window.SIM_DEMO.s01R2Bridge.snapshot(),
    rules:window.SIM_DEMO.core.fixture.pricing.termRules,
    unitPrices:window.SIM_DEMO.core.state().prices,
    fixtureUnits:window.SIM_DEMO.core.fixture.units
  }));
  const rule=s.rules.find(v=>months>=v.min&&months<=v.max);
  assert(rule&&rule.factor>0&&rule.factor<1,'term price factor missing for '+months);
  const expected=Number((rule.factor*10).toFixed(1))+'折';
  const cards=await s01.locator('.store-card[data-card-kind="expanded"]').evaluateAll(els=>els.map(el=>{
    const unit=el.querySelector('.unit'),meta=unit.querySelector('.unit-main'),
      action=unit.querySelector('.unit-action-row'),capacity=unit.querySelector('.capacity'),
      usage=unit.querySelector('.unit-desc'),p=unit.querySelector('.price[data-price-kind="term"]'),
      major=p.querySelector('strong'),chip=p.querySelector('.s01-term-discount'),
      sub=p.querySelector('.price-secondary'),button=unit.querySelector('.order');
    const rect=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    return {
      storeId:el.dataset.storeId,unitId:unit.dataset.unitId,layout:unit.dataset.s01Layout,
      price:major.textContent,secondary:sub.textContent,
      chipText:chip?.textContent,chipVisible:!!chip&&!chip.hidden&&getComputedStyle(chip).display!=='none',
      chipBackground:chip?getComputedStyle(chip).backgroundColor:null,
      aria:p.getAttribute('aria-label'),
      metaRect:rect(meta),actionRect:rect(action),capacityRect:rect(capacity),usageRect:rect(usage),
      priceRect:rect(p),mainRect:rect(major),chipRect:rect(chip),subRect:rect(sub),button:rect(button),
      capacityLabel:getComputedStyle(capacity,'::before').content,
      capacityAria:capacity.getAttribute('aria-label'),
      metaHasCapacity:capacity.parentElement===meta,metaHasUsage:usage.parentElement===meta,
      actionHasPrice:p.parentElement===action,actionHasButton:button.parentElement===action,
      priceAndButtonSameRow:Math.abs((p.getBoundingClientRect().top+p.getBoundingClientRect().height/2)-(button.getBoundingClientRect().top+button.getBoundingClientRect().height/2))<=2,
      usageUnclipped:usage.scrollWidth<=usage.clientWidth+1,
      strongUnclipped:major.scrollWidth<=major.clientWidth+1,
      secondaryUnclipped:sub.scrollWidth<=sub.clientWidth+1,
      promo:el.querySelector('.hot')?.textContent||'',
      hasStrike:!!el.querySelector('s,del,[class*="original-price"],[style*="line-through"]'),
      hasPublicCubic:!!el.querySelector('.store-cubic-price:not([hidden])')
    };
  }));
  assert.equal(cards.length,2,'must keep exactly two matched expanded store cards');
  for(const card of cards){
    assert(card.chipVisible,'discount not visible at '+months+' months');
    assert.equal(card.chipText,expected);
    assert.match(card.aria,new RegExp('租期优惠'+expected));
    assert.equal(card.hasStrike,false,'unsupported original price has returned');
    assert.equal(card.hasPublicCubic,false,'matched price must not show cubic rate');
    assert(card.chipBackground!=='rgb(255, 0, 0)','discount chip too aggressive');
    assert.equal(card.layout,'stacked','matched unit is not using the two-row layout');
    assert.equal(card.capacityLabel,'"仓位"','capacity must be distinguished from user requirement');
    assert.match(card.capacityAria,/仓位.*立方米/);
    assert(card.metaHasCapacity&&card.metaHasUsage,'capacity and usage must share the first row');
    assert(card.actionHasPrice&&card.actionHasButton,'price and CTA must share the second row');
    assert(card.metaRect.bottom<=card.actionRect.y+1.5,'action row must sit below warehouse meta row');
    assert(card.priceAndButtonSameRow,'price block and order button must align vertically');
    assert(card.usageUnclipped,'warehouse usage text unexpectedly clipped');
    assert(card.mainRect.right<=card.chipRect.x+1.1,'discount overlaps main price');
    assert(card.chipRect.right<=card.priceRect.right+1.1,'discount runs outside price region');
    assert(card.chipRect.right<=card.button.x-5,'discount overlaps order CTA');
    assert(card.strongUnclipped,'total rent is truncated');
    assert(card.secondaryUnclipped,'monthly price formula is truncated');
    assert(card.button.height>=48,'order CTA must remain 48px');
    const row=s.fixtureUnits.find(u=>u.id===card.unitId);
    const base=s.unitPrices[card.unitId]??row?.base_month;
    assert(base>0);
    const expectedMonthly=Math.round((Number(base)*rule.factor+Number.EPSILON)*100)/100;
    const total=expectedMonthly*months;
    assert.equal(card.price,fmt(total));
    assert.equal(card.secondary,fmt(expectedMonthly)+'/月 × '+months+'个月');
  }
  const width=await s01.locator('html').evaluate(el=>el.scrollWidth-innerWidth);
  assert(width<=2,'S01 horizontal overflow '+width);
  const all=s.snap.stores.slice(0,2).map(x=>x.units[0]);
  assert(all.every(x=>x.termDiscountLabel===expected&&x.termDiscountSource==='LEASE_TERM_RULE'));
  assert(!s.snap.stores.some(x=>x.publicCubicPrice),'matched still has public cubic');
  return {months,expected,cards:cards.map(({storeId,unitId,price,secondary,chipText,button,priceRect})=>
    ({storeId,unitId,price,secondary,chipText,buttonWidth:button.width,priceWidth:priceRect.width})),overflow:width};
};
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4641,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
    const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
      await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
      const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
      await s01.locator('.store-card.s01-compact').first().waitFor();
      assert.equal(await s01.locator('.s01-term-discount:visible').count(),0,'browse has discount');
      assert.equal(await s01.locator('.store-card[data-card-kind="expanded"]').count(),0);
      await page.screenshot({path:path.join(out,'S01-discount-browse-'+width+'.png')});
      const termCases=[];
      for(const months of terms){
        const info=await capPriceCase(app,s01,months);termCases.push(info);
        if([1,7,12,37,60].includes(months)){
          // The previous screenshots retained the S01 restored scroll
          // position (typically 280px) and did not prove full first-screen
          // hierarchy. Capture zero-scroll independently on every frame.
          await page.evaluate(()=>window.scrollTo(0,0));
          await app.locator('html').evaluate(()=>window.scrollTo(0,0));
          await s01.locator('html').evaluate(()=>window.scrollTo(0,0));
          await page.screenshot({path:path.join(out,'S01-discount-'+months+'m-top-'+width+'.png')});
          await page.screenshot({path:path.join(out,'S01-discount-'+months+'m-'+width+'.png')});
          await s01.locator('.stores').screenshot({path:path.join(out,'S01-discount-'+months+'m-list-'+width+'.png')});
        }
      }
      // Price override at the core must preserve discount factor and recompute totals.
      // Do not assume the static fixture amount is the final price.
      await app.locator('#screen').evaluate(()=>{
        const b=window.SIM_DEMO;
        b.core.setRequirement(3,12,true);b.persist();b.navigate('S01');
      });
      const discounted12=await capPriceCase(app,s01,12);
      assert(discounted12.cards.length===2);
      // Negative control: a non-discount term rule cannot emit a sale tag.
      const negative=await app.locator('#screen').evaluate(()=>{
        const b=window.SIM_DEMO,rule=b.core.fixture.pricing.termRules.find(r=>r.min===7);
        const old=rule.factor;rule.factor=1;
        b.core.setRequirement(3,12,true);
        const view=b.s01R2Bridge.snapshot();
        rule.factor=old;
        return view.stores.slice(0,2).map(s=>s.units[0]?.termDiscountLabel||null);
      });
      assert.deepEqual(negative,[null,null],'undiscounted term unexpectedly produces a discount');
      assert.deepEqual(errors,[],'browser errors');
      results.push({width,height,status:'PASS',termCases,negative,errors:errors.length});
    }catch(e){
      await page.screenshot({path:path.join(out,'S01-discount-FAIL-'+width+'.png')}).catch(()=>{});
      throw e;
    }finally{await ctx.close()}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',
    isolatedChromium:true,liveDeployed:false,merged:false,humanVisualSigned:false,
    priceDataType:'synthetic fixture; not a verified public original price',
    discountDefinition:'core monthly base × configured term factor; excludes coupons, deposit and fees',
    cases:results},null,2));
  console.log('S01_PRICE_DISCOUNT_06_PASS '+JSON.stringify(results.map(v=>({width:v.width,termCases:v.termCases.length,tags:v.termCases.map(t=>t.expected)}))));
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(err=>{
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',error:err.stack||String(err)},null,2));
 console.error('S01_PRICE_DISCOUNT_06_FAIL '+(err.stack||err));process.exitCode=1
});
