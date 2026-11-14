#!/usr/bin/env node
'use strict';
// DEMO-SCENARIOS-01: browser-visible evidence for promotion and M01 lifecycle fixtures.
// Uses local prototype data only; no real account, CRM, payment or warehouse API.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/demo-scenarios-01');
const base='http://127.0.0.1:4717';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,bytes)=>err?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes));
});
const results=[];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(4717,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const shot=async label=>{
    const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert(dimensions.width<=dimensions.viewport+2,label+' horizontal overflow '+JSON.stringify(dimensions));
    await page.screenshot({path:path.join(out,label+'-'+width+'.png'),fullPage:true});
   };
   const seed=async(id,target)=>{
    await page.evaluate(({id,target})=>{
      const b=window.SIM_DEMO;if(!b)throw Error('SIM_DEMO_NOT_READY');
      b.core.setScenario(id);b.navigate(target);
    },{id,target});
   };
   try{
    // Nine lifecycle states: each must render into the customer-facing M01 page.
    const lifecycle=[
     ['lifeIdentity','identity','入仓前需完成验证'],
     ['lifeUpcoming','upcoming','入仓准备'],
     ['lifeActive','active','我的仓位'],
     ['lifeRenewalQuote','renewal','续租申请处理中'],
     ['lifeReturning','returning','退租处理中'],
     ['lifeInspection','inspection','退租处理中'],
     ['lifeRefund','refund','押金处理中'],
     ['lifeExpired','lease_expired','租期已到期'],
     ['lifeEnded','new','1笔订单']
    ];
    for(const [id,key,visible] of lifecycle){
      await page.goto(base+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!!window.SIM_DEMO);
      await seed(id,'M01');
      await page.locator('#screen .m01-profile').waitFor();
      const body=await page.locator('#screen').innerText();
      assert(body.includes(visible),id+' expected visible M01 state "'+visible+'"; got '+body.slice(0,500));
      if(id==='lifeEnded'){
        assert.equal(await page.locator('#screen .m01-assets-heading').count(),0,'ended rental must not remain an active asset');
        assert.equal(await page.locator('#screen .m01-task').count(),0,'ended rental must not create a live task card');
      }
      const state=await page.evaluate(()=>{const b=window.SIM_DEMO,s=b.state(),o=s.orders[0];return {scenario:s.scenario,orderId:o?.id,life:o?b.core.lifecycleView(o.id):null};});
      assert.equal(state.scenario,id);
      assert.equal(state.orderId,'SIM_REVIEW_ORDER_'+id);
      await shot(id+'-M01');
      results.push({width,height,type:'lifecycle',scenario:id,expected:key,visible:true,lease:state.life.lease_status,identity:state.life.identity_status});
    }

    // Special warehouse: check the store-level campaign tag and capture the actual S01 list.
    await page.goto(base+'/index.html?page=M01&s01_r2=1',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.SIM_DEMO);
    await seed('promoSpecial','S01');
    await page.frameLocator('#s01-r2-frame').locator('body').waitFor();
    const special=await page.evaluate(()=>{
      const b=window.SIM_DEMO,st=b.core.fixture.stores.find(x=>x.id==='SIM_BJ01'),u=b.core.fixture.units.find(x=>x.id==='SIM_BJ01_U04');
      return {tag:b.presentation.storePromotionTag(st),city:b.state().city,amount:b.core.amounts([u.id],6),campaignBase:window.SIM_BR03_DATA.campaigns.find(c=>c.unitId===u.id)?.baseMonth};
    });
    assert.equal(special.tag,'特价仓','campaign tag must come from the explicit valid unit campaign');
    assert(special.amount.campaign_ids.length===1,'special campaign must be present in the shared quote calculation');
    assert.equal(special.amount.unit_pricing[0].base_month,620,'catalog base month must match the campaign snapshot');
    assert.equal(special.amount.unit_special_price,special.campaignBase,'campaign specialMonth must match the active demo campaign, without hardcoded historical price');
    assert(special.amount.unit_special_price<special.amount.unit_pricing[0].base_month,'special warehouse must show a visible reduction from catalog rent');
    assert.equal(special.amount.term_discount_total,0,'special price must not silently stack with term discount');
    const s01Text=await page.frameLocator('#s01-r2-frame').locator('body').innerText();
    assert(s01Text.includes('特价仓'),'S01 list must expose the active special warehouse tag');
    await shot('promoSpecial-S01');
    results.push({width,height,type:'promotion',scenario:'promoSpecial',tag:special.tag,visible:true});

    // Long-term discount: compare the same selected unit at 6 and 12 months, then capture S5.
    await page.goto(base+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.SIM_DEMO);
    await seed('promoLongTerm','S5');
    const term=await page.evaluate(()=>{
      const c=window.SIM_DEMO.core,u=c.matchingUnits().find(x=>!c.amounts([x.id],6).campaign_ids.length);
      if(!u)throw Error('NO_LONG_TERM_UNIT');
      return {unit:u.id,at6:c.amounts([u.id],6),at12:c.amounts([u.id],12)};
    });
    assert(term.at12.monthly_average<term.at6.monthly_average,'12-month monthly rent must be lower than 6-month monthly rent');
    await page.frameLocator('#br04-frame').locator('body[data-page="s5"]').waitFor();
    await shot('promoLongTerm-S5');
    results.push({width,height,type:'promotion',scenario:'promoLongTerm',unit:term.unit,monthly6:term.at6.monthly_average,monthly12:term.at12.monthly_average,visible:true});

    // Cash coupon, eligible moving benefit and ineligible moving benefit must stay separate.
    for(const id of ['promoCouponCash','promoMoving','promoMovingIneligible']){
      await page.goto(base+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!!window.SIM_DEMO);
      await page.evaluate(id=>{
        const c=window.SIM_DEMO.core;
        c.setScenario(id);c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
        const u=c.matchingUnits().find(x=>!c.amounts([x.id],c.state().requirement.term_months).campaign_ids.length);if(!u)throw Error('NO_NON_CAMPAIGN_UNIT_FOR_'+id);
        c.select([u.id]);c.setDate(c.today());
      },id);
      const amounts=await page.evaluate(()=>{const c=window.SIM_DEMO.core,s=c.state();return c.amounts(s.selected,s.requirement.term_months);});
      if(id==='promoCouponCash')assert.equal(amounts.coupon_discount,300,'cash coupon must reduce rent by 300');
      if(id==='promoMoving'){
        assert.equal(amounts.coupon_discount,0,'moving service must not reduce rent');
        assert.equal(amounts.moving_benefit_pending_id,'CPN-003');
      }
      if(id==='promoMovingIneligible')assert.equal(amounts.moving_benefit_pending_id,null,'three-month lease is below the six-month moving threshold');
      await page.evaluate(()=>window.SIM_DEMO.navigate('O01'));
      const frame=page.frameLocator('#br04-frame');
      if(id==='promoMoving'){
        const row=frame.locator('#moving-benefit-row');
        await row.waitFor({state:'visible'});
        assert.match((await row.innerText()).replaceAll('\n',' '),/服务权益 基础搬运权益 · 资格待确认/);
        await shot(id+'-O01-confirmation');
      }else assert.equal(await frame.locator('#moving-benefit-row').count(),0,'ineligible or cash-only promotion must not add a service-benefit row');
      await frame.locator('#agreed').check();
      await frame.locator('#pay').click();
      await frame.locator('#scrim:not([hidden])').waitFor();
      const feeText=await frame.locator('#sheet-content').innerText();
      if(id==='promoCouponCash'){
        assert(feeText.includes('−¥300'),'cash coupon must appear as a rent deduction');
        assert(!feeText.includes('基础搬运权益'),'cash coupon must not create a moving service benefit');
      }
      if(id==='promoMoving'){
        assert(feeText.includes('基础搬运权益'),'eligible moving benefit must be displayed separately');
        assert(feeText.includes('资格待确认'),'moving benefit qualification must remain explicit');
        assert(!feeText.includes('−¥200'),'moving benefit must not appear as cash rent discount');
      }
      if(id==='promoMovingIneligible')assert(!feeText.includes('基础搬运权益'),'ineligible lease must not display moving benefit');
      await shot(id+'-O01-payment-sheet');
      results.push({width,height,type:'promotion',scenario:id,couponDiscount:amounts.coupon_discount,movingBenefit:amounts.moving_benefit_pending_id||null,visible:true});
    }

    // Gift-term benefits appear in S5 and O01, then persist as an immutable M01 order snapshot.
    await page.goto(base+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.SIM_DEMO);
    await seed('promoCampaignGift','S5');
    await page.frameLocator('#br04-frame').locator('body[data-page="s5"]').waitFor();
    const giftAvailable=await page.evaluate(()=>window.SIM_DEMO.core.giftTermOptions(['SIM_BJ01_U04'],6).find(x=>x.eligible));
    assert.equal(giftAvailable.gift_months,1,'approved campaign gift must be available for the matching warehouse');
    const s5GiftText=await page.frameLocator('#br04-frame').locator('body').innerText();
    assert(s5GiftText.includes('赠送1个月'),'S5 must surface the approved gift-term benefit');
    // The first matched store card is the selected campaign warehouse; S5 renders one service-tag row per recommended store.
    const s5HeaderTags=await page.frameLocator('#br04-frame').locator('.s5-store-services').first().innerText();
    const s5UnitInfo=await page.frameLocator('#br04-frame').locator('.s5-unit-info').first().innerText();
    assert(s5HeaderTags.startsWith('特价仓'),'S5 header must lead with the special-price tag when its matched warehouse is special');
    assert(!s5UnitInfo.includes('特价仓'),'S5 must not duplicate the special-price tag inside the unit row');
    const promoTagStyle=await page.frameLocator('#br04-frame').locator('.s5-promo-tag').first().evaluate(el=>({display:getComputedStyle(el).display,background:getComputedStyle(el).backgroundColor}));
    assert(['flex','inline-flex'].includes(promoTagStyle.display),'S5 promotion tags must use the approved compact tag style (inline-flex is blockified inside the flex row)');
    assert.notEqual(promoTagStyle.background,'rgba(0, 0, 0, 0)','S5 promotion tags must have a visible semantic background');
    await shot('promoCampaignGift-S5');

    await page.evaluate(()=>{
      const b=window.SIM_DEMO,c=b.core;
      c.setScenario('promoCampaignGift');c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
      c.select(['SIM_BJ01_U04']);c.setDate(c.today());b.navigate('O01');
    });
    const giftFrame=page.frameLocator('#br04-frame');
    const giftRow=giftFrame.locator('#gift-term-row');
    await giftRow.waitFor({state:'visible'});
    assert((await giftRow.innerText()).includes('赠送1个月'),'O01 must show the gift-term line without changing paid or contract months');
    await giftFrame.locator('#agreed').check();
    await giftFrame.locator('#pay').click();
    await giftFrame.locator('#scrim:not([hidden])').waitFor();
    const giftPaymentText=await giftFrame.locator('#sheet-content').innerText();
    assert(giftPaymentText.includes('赠送1个月'),'payment confirmation must preserve the gift-term snapshot');
    assert(giftPaymentText.includes('特价仓'),'payment confirmation must identify the campaign-priced warehouse');
    const configuredGiftSpecial=await page.evaluate(()=>window.SIM_BR03_DATA.campaigns.find(x=>x.unitId==='SIM_BJ01_U04')?.baseMonth);
    assert(giftPaymentText.includes('¥'+configuredGiftSpecial+'/月'),'payment confirmation must use current warehouse campaign special month');
    assert(!giftPaymentText.includes('优惠券'),'payment confirmation must not show a zero-value coupon row when no coupon is selected');
    await shot('promoCampaignGift-O01-payment-sheet');
    const giftOrder=await page.evaluate(()=>window.SIM_DEMO.state().orders.at(-1));
    assert.equal(giftOrder.benefit_snapshot.gift_terms[0].status,'LOCKED_TO_ORDER');
    await giftFrame.locator('[data-bridge="payResult"][data-value="success"]').click();
    await giftFrame.locator('[data-bridge="orderDetail"]').waitFor();
    await giftFrame.locator('[data-bridge="orderDetail"]').click();
    await page.locator('#screen .mk-order-entitlements').waitFor();
    const orderGiftText=await page.locator('#screen .mk-order-entitlements').innerText();
    assert(orderGiftText.includes('赠送1个月'),'M01 order details must show the persisted gift-term snapshot');
    assert(orderGiftText.includes('¥'+configuredGiftSpecial+'/月'),'M01 order details must preserve current campaign special monthly price snapshot');
    const granted=await page.evaluate(id=>window.SIM_DEMO.core.orderDetail(id).benefit_snapshot.gift_terms[0].status,giftOrder.id);
    assert.equal(granted,'GRANTED','successful demo payment must advance the gift entitlement lifecycle');
    await shot('promoCampaignGift-M01');
    results.push({width,height,type:'promotion',scenario:'promoCampaignGift',giftMonths:1,orderSnapshot:'GRANTED',visible:true});

    assert.deepEqual(errors,[],'JavaScript page errors');
    await context.close();
   }catch(err){await context.close();throw err;}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  console.log('DEMO-SCENARIOS-01 BROWSER PASS',JSON.stringify({cases:results.length,viewports:[375,390],screenshots:results.length,results}));
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(err=>{console.error(err);process.exitCode=1;});
