#!/usr/bin/env node
'use strict';
// VIS-SYSTEM-01: real isolated Chromium screenshots of the existing S01 UI.
// Three candidate layouts are opt-in only; default product candidate remains untouched.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/vis-system-01');
const origin='http://127.0.0.1:4684';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,origin).pathname))}
 catch{res.writeHead(400).end();return}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,data)=>err?res.writeHead(404).end('not found'):
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
const variants=['baseline','compact','balanced','flow'];
const all=[];
const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(4684,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    try{
      await page.goto(origin+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
      const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
      await s01.locator('.store-card.s01-compact').first().waitFor();
      await app.locator('#screen').evaluate(()=>{
        const b=window.SIM_DEMO;b.core.setRequirement(3,12,true);b.persist();b.navigate('S01');
      });
      await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();

      const visitVariants=[];
      for(const variant of variants){
        await s01.locator('html').evaluate((el,v)=>{
          el.dataset.visSystem=v;
          // Screenshoting a long list scrolls the iframe into view.
          // Each variant MUST be returned to exactly the same screen origin.
          const doc=el.ownerDocument;
          doc.scrollingElement.scrollTop=0;doc.body.scrollTop=0;
          doc.defaultView.scrollTo(0,0);
        },variant);
        await app.locator('html').evaluate(el=>{
          el.ownerDocument.scrollingElement.scrollTop=0;
          el.ownerDocument.defaultView.scrollTo(0,0);
        });
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.waitForTimeout(90); // allow browser layout and scroll reset
        const details=await s01.locator('body').evaluate(body=>{
          const cards=[...body.querySelectorAll('.store-card[data-card-kind="expanded"]')];
          const getRect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
          const result=cards.map(el=>{
            const unit=el.querySelector('.unit'),name=el.querySelector('.store-body h2');
            const capacity=unit.querySelector('.capacity'),cabin=unit.querySelector('.s01-cabin-tag');
            const usage=unit.querySelector('.unit-desc'),meta=unit.querySelector('.unit-main');
            const action=unit.querySelector('.unit-action-row'),price=action.querySelector('.price[data-price-kind="term"]');
            const major=price.querySelector('strong'),discount=price.querySelector('.s01-term-discount');
            const monthly=price.querySelector('.price-secondary'),order=unit.querySelector('.order');
            return {
              store:el.dataset.storeId,card:getRect(el),name:name.textContent,
              meta:getRect(meta),action:getRect(action),capacity:getRect(capacity),cabin:getRect(cabin),
              use:getRect(usage),main:getRect(major),discount:getRect(discount),
              monthly:getRect(monthly),button:getRect(order),
              texts:{cabin:cabin.textContent,capacity:capacity.textContent,use:usage.textContent,
                main:major.textContent,discount:discount.textContent,monthly:monthly.textContent,cta:order.textContent},
              visible:{cabin:!cabin.hidden,discount:!discount.hidden,order:!order.hidden},
              clipped:{
                major:major.scrollWidth>major.clientWidth+1,
                monthly:monthly.scrollWidth>monthly.clientWidth+1,
                use:usage.scrollWidth>usage.clientWidth+1
              },
              cardShadow:getComputedStyle(el).boxShadow,
              unitBackground:getComputedStyle(unit).backgroundColor,
              orderHit:order.getBoundingClientRect().height,
              priceLeft:price.getBoundingClientRect().left
            };
          });
          const e=body.querySelector('.s01-estore-card');
          return {
            version:document.documentElement.dataset.visSystem||'baseline',
            screenOverflow:document.documentElement.scrollWidth-innerWidth,
            ETop:e?.getBoundingClientRect().y,
            headerTop:body.querySelector('.statusbar')?.getBoundingClientRect().top,
            cardCount:cards.length,cards:result,
            cssToken:getComputedStyle(document.documentElement).getPropertyValue('--mk-color-brand-primary').trim()
          };
        });
        assert.equal(details.version,variant);
        assert.equal(details.cssToken,'#11845f','global token not loaded in S01');
        assert.equal(details.cardCount,2,'two matched store cards are required');
        assert(details.headerTop>=-1&&details.headerTop<=1,'comparison screenshot was scrolled: '+details.headerTop);
        assert(details.screenOverflow<=2,'horizontal page overflow '+details.screenOverflow);
        for(const card of details.cards){
          assert.match(card.texts.cabin,/^仓号 [A-D](00[1-9]|0[12][0-9]|030)$/);
          assert.match(card.texts.capacity,/^[\d.]+m3$/);
          assert(card.texts.use.startsWith('适合'));
          assert.match(card.texts.main,/^¥[\d,]+$/);
          assert.match(card.texts.discount,/^\d+(?:\.\d+)?折$/);
          assert.match(card.texts.monthly,/^¥[\d,]+\/月 × 12个月$/);
          assert.equal(card.texts.cta,'立即下单');
          assert(card.button.height>=48);
          assert(!card.clipped.monthly&&!card.clipped.major,'price clipped at normal 12 months');
          assert(card.main.right<=card.discount.x+1.5,'discount overlaps main amount');
          if(variant==='balanced'||variant==='compact')assert(card.priceLeft<card.button.x,'side CTA layout price should be before button');
          if(variant==='flow'){
            assert(card.button.y>=card.action.y+49,'flow CTA should occupy the lower row');
            assert(card.button.width>=card.action.width-2,'flow CTA must use available row width');
          }
        }
        await page.screenshot({path:path.join(out,'S01-'+variant+'-'+width+'.png')});
        await s01.locator('.stores').screenshot({path:path.join(out,'S01-'+variant+'-list-'+width+'.png')});
        visitVariants.push(details);
      }
      // A realistic contract-stress test uses display-only extreme values in a
      // temporary preview; it never changes prices, orders or persisted fixture data.
      const stress=[];
      for(const variant of ['compact','balanced','flow']){
        await s01.locator('html').evaluate((el,v)=>{el.dataset.visSystem=v},variant);
        const measure=await s01.locator('.store-card[data-card-kind="expanded"]').first().evaluate(el=>{
          const root=el.querySelector('.unit-action-row'),
            major=root.querySelector('.price strong'),
            monthly=root.querySelector('.price-secondary'),
            promo=root.querySelector('.s01-term-discount'),
            before={major:major.textContent,monthly:monthly.textContent};
          major.textContent='¥1,234,567';
          monthly.textContent='¥20,576/月 × 60个月';
          const r=n=>n.getBoundingClientRect();
          const answer={
            majorUnclipped:major.scrollWidth<=major.clientWidth+1,
            monthlyUnclipped:monthly.scrollWidth<=monthly.clientWidth+1,
            mainDiscountOverlap:r(major).right>r(promo).left+1,
            discountCTAOverlap:
              r(promo).right>r(root.querySelector('.order')).left-4 &&
              r(promo).left<r(root.querySelector('.order')).right+4 &&
              r(promo).bottom>r(root.querySelector('.order')).top &&
              r(promo).top<r(root.querySelector('.order')).bottom,
            horizontalOverflow:document.documentElement.scrollWidth-innerWidth
          };
          major.textContent=before.major;monthly.textContent=before.monthly;
          return answer;
        });
        stress.push({variant,...measure});
        // Stress is a comparative warning, not a new price policy or blocked release.
      }
      // CTA identity and checkout path must not depend on the visual variant.
      await s01.locator('html').evaluate(el=>{el.dataset.visSystem='flow'});
      const firstUnit=await s01.locator('.store-card[data-card-kind="expanded"] .order').first().getAttribute('data-unit-id');
      await s01.locator('.store-card[data-card-kind="expanded"] .order').first().click();
      const selected=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().selected);
      assert.deepEqual(selected,[firstUnit],'visual variant altered order selection');
      assert.deepEqual(errors,[],'JavaScript errors: '+errors.join(';'));
      all.push({width,height,status:'PASS',variants:visitVariants,stress,selected,
        baselineNotChangedByDefault:true});
    }catch(e){await page.screenshot({path:path.join(out,'ERROR-'+width+'.png')}).catch(()=>{});throw e}
    finally{await context.close()}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({
    status:'PASS',baseline:'PR99 unchanged; preview CSS opt-in only',
    branch:'design/vis-system-01-s01-layout-20261111',offlineChromium:true,
    deployed:false,merged:false,humanSigned:false,
    stressData:'VISUAL ONLY not a change to quote or unit data',cases:all
  },null,2));
  console.log('VIS_SYSTEM_01_PASS '+JSON.stringify(all.map(x=>({width:x.width,heights:x.variants.map(v=>v.cards[0].card.height),stress:x.stress}))));
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(err=>{
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',error:err.stack||String(err)},null,2));
 console.error('VIS_SYSTEM_01_FAIL '+(err.stack||err));process.exitCode=1;
});
