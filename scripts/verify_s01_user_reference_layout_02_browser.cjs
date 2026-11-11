#!/usr/bin/env node
'use strict';
// User screenshot S01-REFERENCE-02: store header + three lower info groups.
// The screenshot guides information hierarchy, not its example price or inventory.
// All displayed amounts are provided by the original shared price model.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s01-user-reference-02');
const host='http://127.0.0.1:4688';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}
 catch{res.writeHead(400).end();return}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(e,b)=>e?res.writeHead(404).end('missing'):
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b));
});
const cases=[];
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4688,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
    await s01.locator('.store-card.s01-compact').first().waitFor();
    const before=await s01.locator('html').getAttribute('data-vis-system');
    assert.equal(before,'reference','reference must be default in this isolated design branch');
    // Check all direct children: the E-storage service has its own class,
    // intentionally not 'store-card', so filtering .store-card would omit it.
    const browse=await s01.locator('.stores').evaluate(root=>[...root.children].map(el=>({
      kind:el.dataset.cardKind,unitCount:el.querySelectorAll('.unit:not([hidden])').length
    })));
    assert(browse.filter(x=>x.kind==='expanded').length===0,'browsing must remain compact');
    assert.equal(browse[0]?.kind,'compact');
    assert.equal(browse[1]?.kind,'compact');
    assert.equal(browse[2]?.kind,'estore','third card remains fixed E-storage in browse state');
    assert.equal(browse[3]?.kind,'compact');
    assert(browse.every(x=>x.unitCount===0),'browse mode must not show matched unit content');
    await page.screenshot({path:path.join(out,'S01-reference-browse-'+width+'.png')});
    const results=[];
    for(const months of [1,12,37,60]){
      const data=await app.locator('#screen').evaluate((_,term)=>{
        const b=window.SIM_DEMO;
        b.core.setRequirement(3,term,true);b.persist();b.navigate('S01');
        return b.s01R2Bridge.snapshot().stores.slice(0,2).map(s=>({
          id:s.id,unit:s.units?.[0]?.id,cabin:s.units?.[0]?.cabinNo,
          total:s.units?.[0]?.price,formula:s.units?.[0]?.secondary
        }));
      },months);
      await s01.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
      const kinds=await s01.locator('.stores').evaluate(el=>[...el.children].slice(0,5).map(x=>x.dataset.cardKind));
      assert.deepEqual(kinds.slice(0,4),['expanded','expanded','estore','compact'],
        'matched ranking must be first two physical stores, fixed E-storage, then compact 4th');
      const result=await s01.locator('.store-card[data-card-kind="expanded"]').evaluateAll(cards=>{
        const rect=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
        const overlap=(a,b)=>a.right>b.x+1&&b.right>a.x+1&&a.bottom>b.y+1&&b.bottom>a.y+1;
        return cards.map(card=>{
          const photo=card.querySelector('.store-photo'),
            store=card.querySelector('.store-body'),
            address=card.querySelector('.address-copy'),
            km=card.querySelector('.km'),list=card.querySelector('.units'),
            unit=card.querySelector('.unit'),capacity=unit.querySelector('.capacity'),
            use=unit.querySelector('.unit-desc'),price=unit.querySelector('.price'),
            total=price.querySelector('strong'),discount=price.querySelector('.s01-term-discount'),
            monthly=price.querySelector('.price-secondary'),
            cabin=unit.querySelector('.s01-cabin-tag'),button=unit.querySelector('.order'),
            title=store.querySelector('h2'),cta=card.querySelector('.s01-store-detail');
          const titleRange=document.createRange();titleRange.selectNodeContents(title);
          const addressStyle=getComputedStyle(address);
          const R={photo:rect(photo),store:rect(store),address:rect(address),addressContainer:rect(card.querySelector('.address')),addressText:rect(address),titleText:rect({getBoundingClientRect:()=>titleRange.getBoundingClientRect()}),km:rect(km),
            list:rect(list),unit:rect(unit),capacity:rect(capacity),use:rect(use),
            price:rect(price),total:rect(total),discount:rect(discount),monthly:rect(monthly),
            cabin:rect(cabin),button:rect(button),title:rect(title),detail:rect(cta),card:rect(card)};
          return {
            store:card.dataset.storeId,unitId:unit.dataset.unitId,
            cardKind:card.dataset.cardKind,priceKind:price.dataset.priceKind,
            texts:{capacity:capacity.textContent,use:use.textContent,
              total:total.textContent,discount:discount.textContent,
              monthly:monthly.textContent,cabin:cabin.textContent,button:button.textContent},
            R,
            overflow:document.documentElement.scrollWidth-innerWidth,
            totalClipped:total.scrollWidth>total.clientWidth+1,
            monthlyClipped:monthly.scrollWidth>monthly.clientWidth+1,
            overlaps:{
              totalDiscount:overlap(R.total,R.discount),
              discountCabin:overlap(R.discount,R.cabin),
              monthlyButton:overlap(R.monthly,R.button),
              capacityPrice:overlap(R.capacity,R.price),
              detailTitle:overlap(R.detail,R.titleText)
            },
            distanceVisible:!km.hidden&&getComputedStyle(km).visibility==='visible'&&getComputedStyle(km).display!=='none',
            addressOneLine:addressStyle.whiteSpace==='nowrap',
            addressDetail:{text:address.textContent,display:addressStyle.display,visibility:addressStyle.visibility,
              opacity:addressStyle.opacity,fontSize:addressStyle.fontSize,color:addressStyle.color,
              width:address.clientWidth,height:address.clientHeight,scrollWidth:address.scrollWidth,
              style:address.getAttribute('style')},
            unitDisplay:getComputedStyle(unit).display,
            boxShadow:getComputedStyle(card).boxShadow,
            cardRadius:getComputedStyle(card).borderRadius
          };
        });
      });
      assert.equal(result.length,2,'only first two stores expanded');
      if(width===375&&months===1)console.log('S01_REFERENCE_ADDRESS_DEBUG '+JSON.stringify(result.map(v=>({
        store:v.store,addr:v.addressDetail,R:{photo:v.R.photo,body:v.R.store,address:v.R.address,km:v.R.km,title:v.R.title,titleText:v.R.titleText}
      }))));
      for(let i=0;i<2;i++){
        const v=result[i],want=data[i],r=v.R;
        assert.equal(v.cardKind,'expanded');
        assert.equal(v.unitId,want.unit);
        assert.equal(v.texts.cabin,'仓号 '+want.cabin);
        assert.equal(v.texts.total,want.total);
        assert.equal(v.texts.monthly,want.formula);
        assert.equal(v.texts.button,'立即下单');
        assert.match(v.texts.total,/^¥[\d,]+$/);
        assert(v.texts.monthly.endsWith('× '+months+'个月'));
        assert(r.photo.right<=r.title.x+2,'photo must precede the store title');
        assert(v.distanceVisible&&r.km.height>=17&&r.km.y>=r.addressText.bottom-1&&r.km.bottom<=r.addressContainer.bottom+1,'distance must be visible below the address without clipping');
        assert(r.list.y>=r.photo.bottom-2,'lower shelf must follow store photo');
        assert(r.capacity.x<r.total.x-4,'capacity must be left of total');
        assert(r.total.x<r.cabin.x-4,'total must be center left of cabin');
        assert(r.use.y>r.capacity.y,'usage should be below capacity');
        assert(r.monthly.y>r.total.y,'monthly formula should be below total');
        assert(r.button.y>=r.cabin.y,'order action should be below cabin');
        assert(r.button.height>=48,'order tap target height');
        assert(v.addressOneLine&&r.address.width>70&&r.address.height>=16&&r.address.x>=r.photo.right-2,'address must visibly appear to the right of the photo, on one line');
        assert(v.unitDisplay==='grid');
        assert(!v.totalClipped&&!v.monthlyClipped,'normal price should never be clipped');
        assert(v.overflow<=2,'horizontal overflow');
        for(const [key,overlaps] of Object.entries(v.overlaps))
          assert(!overlaps,'card content overlaps: '+key+' '+width+' '+months);
      }
      if([12,60].includes(months)){
        await s01.locator('html').evaluate(el=>{el.ownerDocument.scrollingElement.scrollTop=0;el.ownerDocument.defaultView.scrollTo(0,0)});
        await app.locator('html').evaluate(el=>{el.ownerDocument.scrollingElement.scrollTop=0;el.ownerDocument.defaultView.scrollTo(0,0)});
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:path.join(out,'S01-reference-'+months+'m-'+width+'.png')});
        await s01.locator('.stores').screenshot({path:path.join(out,'S01-reference-list-'+months+'m-'+width+'.png')});
      }
      results.push({months,cards:result});
    }
    // The lower right CTA continues to select the identical concrete unit.
    await app.locator('#screen').evaluate(()=>{const b=window.SIM_DEMO;b.core.setRequirement(3,12,true);b.persist();b.navigate('S01')});
    const expectedUnit=await s01.locator('.store-card[data-card-kind="expanded"] .unit-action-row .order').first().getAttribute('data-unit-id');
    await s01.locator('.store-card[data-card-kind="expanded"] .unit-action-row .order').first().click();
    const selected=await app.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().selected);
    assert.deepEqual(selected,[expectedUnit],'original order action must continue selecting same unit');
    assert.deepEqual(errors,[],'javascript errors');
    cases.push({width,height,status:'PASS',before,browse,result:results,selected});
   }catch(e){
    await page.screenshot({path:path.join(out,'S01-reference-FAILED-'+width+'.png')}).catch(()=>{});
    throw e;
   }finally{await ctx.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',
   userReference:"user supplied cropped S01 screenshot, only information layout",
   visualSigned:false,merged:false,deployed:false,offlineChromium:true,cases},null,2));
  console.log('S01_REFERENCE_LAYOUT_02_PASS '+JSON.stringify(cases.map(c=>({
    width:c.width,cardHeights:c.result.find(v=>v.months===12).cards.map(v=>v.R.card.height),
    names:c.result.find(v=>v.months===12).cards.map(v=>v.texts.cabin)
  }))));
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',error:e.stack||String(e)},null,2));
 console.error('S01_REFERENCE_LAYOUT_02_FAIL '+(e.stack||e));process.exitCode=1;
});
