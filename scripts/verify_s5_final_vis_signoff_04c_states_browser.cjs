#!/usr/bin/env node
'use strict';
// S5-FINAL-VIS-SIGNOFF-04C | 10 state + 3 interaction paths x 375/390.
// Controlled prototype fixtures preserve real unit IDs and actual core.amounts;
// deterministic display-state injection never changes pricing or stock code.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s5-final-vis-signoff-04c');
const host='http://127.0.0.1:4635',port=4635;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
 if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(fp,(e,v)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(v));
});
const cases=[
 {key:'two-stores',expected:'matched',n:2},
 {key:'one-store',expected:'matched',n:1},
 {key:'no-match',expected:'none',n:0},
 {key:'near-capacity',expected:'near',n:1},
 {key:'combo',expected:'combo',n:1},
 {key:'expanded',expected:'expanded',n:1},
 {key:'large-no-match',expected:'large',n:0},
 {key:'short-term',expected:'matched',n:1},
];
const formatted=n=>'¥'+Number(n).toLocaleString('zh-CN');
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[],paths=[];
 try{
  for(const [w,h] of [[375,812],[390,844]]){
   for(const tc of cases){
    const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
    const page=await ctx.newPage(),errors=[],record={width:w,height:h,scenario:tc.key,status:'FAIL'};
    page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
     const app=page.frameLocator('#central-host');
     await app.locator('#screen').evaluate(()=>{const B=window.SIM_DEMO;B.core.setCity('北京');B.core.setRequirement(3,12,true);B.persist();B.navigate('S5');});
     const s5=app.frameLocator('#br04-frame');
     await s5.locator('body[data-page="s5"].bridge-ready').waitFor({timeout:20000});
     const pre=await s5.locator('body').evaluate((_,key)=>{
       const B=window.parent.SIM_DEMO,c=B.core,F=c.fixture;
       c.setCity('北京');c.setRequirement(3,12,true);
       const offers=B.offers();
       if(offers.length<2)throw Error('TEST_FIXTURE_MISSING_TWO_OFFERS');
       let sample=offers[0],target=[sample],capacity=3,months=12,confirmed=true;
       if(key==='two-stores')target=offers.slice(0,2);
       if(key==='no-match'||key==='large-no-match')target=[];
       if(key==='near-capacity'){capacity=Math.min(50,Math.max(5,Math.ceil((sample.volume+0.5)*2)/2));target=[sample];}
       if(key==='expanded')target=[{...sample,expandedSearch:true}];
       if(key==='combo'){
         const units=F.units.filter(u=>u.store_id===sample.store.id&&c.available(u)&&Number(u.volume)>0);
         let pair=null;
         for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
           const total=Number((Number(units[i].volume)+Number(units[j].volume)).toFixed(3));
           if(total<=50&&(!pair||total>pair.total))pair={ids:[units[i].id,units[j].id],total};
         }
         if(!pair)throw Error('TEST_FIXTURE_MISSING_VALID_COMBO');
         capacity=pair.total;target=[{...sample,ids:pair.ids,volume:pair.total,combo:true}];
       }
       if(key==='short-term'){months=1;target=[sample];}
       if(key==='large-no-match')capacity=60;
       c.setRequirement(capacity,months,confirmed);
       B.s5Offers=()=>target;
       window.BR04_REFRESH();
       return {requiredCapacity:capacity,months,ids:target.map(x=>x.ids),volumes:target.map(x=>x.volume)};
     },tc.key);
     const actual=await s5.locator('body').evaluate(()=>{
       const board=document.getElementById('artboard'),vp=document.getElementById('app-viewport');
       const visible=e=>!!e&&!e.hidden&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
       const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
       const cards=[...document.querySelectorAll('.s5-store-card')].filter(visible);
       const B=window.parent.SIM_DEMO,c=B.core,F=c.fixture,n=c.state().requirement.term_months;
       return {match:board.dataset.match,advisor:visible(document.getElementById('s5-advisor')),
         advisorRect:box(document.getElementById('s5-advisor')),
         noMatch:visible(document.getElementById('no-match')),noMatchBox:box(document.getElementById('no-match')),duplicateStoreAction:document.querySelectorAll('[data-nm=stores]').length,termOptions:visible(document.querySelector('.term')),
         noMatchText:document.querySelector('.nm-kicker')?.textContent,
         capacityText:document.getElementById('capacity')?.textContent,monthsText:document.getElementById('demand-term')?.textContent,
         estore:visible(document.querySelector('.estore')),estoreRect:box(document.querySelector('.estore')),
         more:visible(document.querySelector('.more-units')),moreRect:box(document.querySelector('.more-units')),
         actionAdvisor:visible(document.querySelector('[data-nm=advisor]')),actionRange:visible(document.querySelector('[data-nm=range]')),
         missingCompareText:[...document.querySelectorAll('#s5-advisor p')].map(e=>e.textContent),
         originVisible:visible(document.getElementById('change-origin')),
         compareMarkup:document.querySelectorAll('#s5-compare,.bridge-compare-row,[data-s5-compare]').length,
         selected:{capacity:c.state().requirement.capacity_m3,term:n,confirmed:c.state().requirement.term_confirmed},
         scroll:{documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,viewportScrollWidth:vp.scrollWidth,viewportClientWidth:vp.clientWidth,artboard:box(board),viewHeight:vp.clientHeight,fullHeight:vp.scrollHeight},
         cards:cards.map(e=>{
           const ids=e.querySelector('.s5-unit-row')?.dataset.unitIds?.split(',')||[],a=ids.length?c.amounts(ids,n):null,
             price=e.querySelector('.s5-unit-price'),buy=e.querySelector('.s5-unit-buy'),head=e.querySelector('.s5-store-head'),
             name=e.querySelector('.s5-store-name'),photo=e.querySelector('.s5-store-photo'),map=e.querySelector('.s5-map-action'),
             detail=e.querySelector('.s5-store-open'),discount=e.querySelector('.s5-term-discount');
           return {storeId:e.dataset.storeId,ids,actualVolume:ids.reduce((v,id)=>v+(F.units.find(u=>u.id===id)?.volume||0),0),
             cabin:e.querySelector('.s5-cabin-tag')?.textContent,capacity:e.querySelector('.s5-unit-capacity')?.textContent,
             usage:e.querySelector('.s5-unit-use')?.textContent,warning:visible(e.querySelector('.s5-unit-warning')),
             price:price?.textContent,formula:e.querySelector('.s5-unit-terms>small')?.textContent,
             priceFits:!!price&&price.scrollWidth<=price.clientWidth+2,
             priceRect:box(price),buyRect:box(buy),mapRect:box(map),detailRect:box(detail),nameRect:box(name),
             photoRect:box(photo),headRect:box(head),imgLoaded:!!photo?.querySelector('img')?.naturalWidth,
             buyLabel:buy?.textContent,cardRect:box(e),services:[...e.querySelectorAll('.mk-store-tag')].map(t=>t.textContent),
             discount:discount?.textContent||'',money:a&&{total:a.rent_total,month:a.monthly_average,deposit:a.deposit,fee:a.management_fee,payable:a.payable}};
         })
       };
     });
     record.pre=pre;record.actual=actual;
     assert.equal(actual.match,tc.expected,'semantic S5 state');
     assert.equal(actual.cards.length,tc.n,'number of valid cards');
     assert.equal(actual.compareMarkup,0,'comparison must not return');
     assert(!actual.missingCompareText.some(x=>x.includes('比较')||x.includes('对比')),'old comparison language');
     assert(actual.scroll.documentWidth<=w+2&&actual.scroll.viewportScrollWidth<=actual.scroll.viewportClientWidth+2,'horizontal overflow');
     assert(actual.scroll.artboard.width<=w+1,'artboard width');
     assert.equal(actual.estore,true,'E-store must stay available');
     assert.equal(actual.originVisible,true,'location chooser');
     assert(!actual.compareMarkup,'no S5 compare');
     assert.equal(actual.termOptions,false,'no S5 local lease picker');
     if(tc.n===0){
       assert(actual.noMatch,'no-match guidance required');
       assert(actual.actionAdvisor&&actual.actionRange,'empty fallback links missing');
       assert(!actual.more,'no stores should not show more units in cards block');
       assert.equal(actual.duplicateStoreAction,0,'no duplicate S01 navigation in empty state');
       assert(actual.noMatchBox.height<230,'empty state should not reserve a huge blank card');
     }else{
       assert(!actual.noMatch,'recommendations should hide no-match');
       assert(actual.more,'more stores entry should exist');
       assert(actual.cards.at(-1).cardRect.bottom<=actual.estoreRect.top+2,'E-store should follow two stores');
     }
     for(const c of actual.cards){
       const r=c.money;
       assert(c.imgLoaded,'store photo load');
       assert(c.photoRect.left<c.nameRect.left,'S01-aligned left photo and right text');
       assert(c.buyRect.height>=47.5&&c.nameRect.height>=43.5&&c.mapRect.width>=43.5&&c.detailRect.height>=43.5,'48/44px action targets');
       assert(c.priceFits&&c.priceRect.height>=43.5,'price clipping or fee tap target');
       assert(c.services.length<=2,'S5 tags count');
       assert(c.usage?.startsWith('适合')||c.ids.length>1,'usage/combination source');
       assert(c.price===formatted(r.total),'whole term price from core');
       assert(c.formula.includes(formatted(r.month)+'/月')&&c.formula.includes('× '+pre.months+'个月'),'whole term/months formula');
       assert(r.total===r.month*pre.months&&r.fee===50,'price math');
       assert(c.ids.length>1?c.cabin==='组合仓':/^仓号 [A-D]\d{3}$/.test(c.cabin),'cabin identity');
       assert(r.payable>=r.total,'first-payment reasonable range');
       assert(c.cardRect.right<=w+1,'card right clipped');
     }
     const shouldAdvisor=tc.n>0&&(pre.requiredCapacity>10||actual.cards[0].money.total>2000);
     assert.equal(actual.advisor,shouldAdvisor,'advisor trigger boundary');
     if(tc.key==='near-capacity'){assert.equal(actual.cards[0].buyLabel,'查看门店');assert(actual.cards[0].warning,'near-capacity warning');}
     if(tc.key==='combo'){assert.equal(actual.cards[0].ids.length,2,'atomic two-unit combo');assert.equal(actual.cards[0].cabin,'组合仓');assert(actual.cards[0].usage.startsWith('适合'),'combo should not repeat the grouping label');}
     if(tc.key==='two-stores'){assert(actual.cards[1].buyRect.bottom<=h+2,'second CTA still beyond first viewport');}
     if(tc.key==='large-no-match'){assert.match(actual.noMatchText,/大空间/);}
     assert.deepEqual(errors,[],'page errors');
     await page.screenshot({path:path.join(out,tc.key+'-'+w+'-top.png')});
     await s5.locator('#app-viewport').evaluate(el=>{el.scrollTop=el.scrollHeight;});
     await page.screenshot({path:path.join(out,tc.key+'-'+w+'-bottom.png')});
     record.status='PASS';
    }catch(e){record.error=String(e.stack||e);await page.screenshot({path:path.join(out,'FAIL-'+tc.key+'-'+w+'.png')}).catch(()=>{});}
    results.push(record);console.log('S5_04C_CASE',JSON.stringify({name:tc.key,width:w,status:record.status,error:record.error,match:record.actual?.match,advisor:record.actual?.advisor}));
    await ctx.close();
   }
   // Real navigation contract checks from unmodified public click handlers.
   for(const name of ['location','more-stores','modify']){
    const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
    const page=await ctx.newPage(),row={width:w,name,status:'FAIL'},errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
     const app=page.frameLocator('#central-host'),s5=app.frameLocator('#br04-frame');
     await app.locator('#screen').evaluate(()=>{const b=window.SIM_DEMO;b.core.setCity('北京');b.core.setRequirement(3,12,true);b.persist();b.navigate('S5');});
     await s5.locator('body.bridge-ready').waitFor({timeout:20000});
     await s5.locator('#main-buy').waitFor({timeout:15000});
     if(name==='location'){
       await s5.locator('#change-origin').click();
       await s5.locator('#modal:not([hidden])').waitFor();
       await s5.locator('[data-bridge="s5Area"]').filter({hasText:'全城门店'}).first().click();
       const origin=await s5.locator('#origin-name').innerText();
       assert(origin.includes('北京')&&origin.includes('全城'),'location fallback must preserve chosen city '+origin);
       row.origin=origin;
     }else if(name==='more-stores'){
       await s5.locator('#see-more').click();
       await app.locator('#screen.page-S01').waitFor({timeout:16000});
       const demand=await app.locator('#screen').evaluate(()=>({city:window.SIM_DEMO.core.state().city,req:window.SIM_DEMO.core.state().requirement}));
       assert.equal(demand.req.capacity_m3,3);assert.equal(demand.req.term_months,12);assert.equal(demand.req.term_confirmed,true);
       row.demand=demand;
     }else{
       await s5.locator('#modify').click();
       // CAP replaces the #central-host iframe, not the top-level page URL.
       // The former top-level waitForURL produced a false failure.
       // The CAP interface may be reached inside a nested frame; inspect the
       // actual frame navigation and its visible CTA rather than guessing an h1.
       await page.waitForTimeout(650);
       const capFrame=page.frames().find(frame=>/(?:\/cap\.html|\/items\.html)(?:\?|$)/.test(frame.url()));
       row.frameUrls=page.frames().map(frame=>frame.url());
       assert(capFrame,'CAP editor frame was not opened: '+JSON.stringify(row.frameUrls));
       row.editorUrl=capFrame.url();
       const bodyText=await capFrame.locator('body').innerText();
       assert(bodyText.includes('查看仓位报价'),'CAP editor lacks return CTA: '+bodyText.slice(0,200));
       const saved=await capFrame.evaluate(()=>sessionStorage.getItem('mk_estimate_return_v4')||'');
       assert(saved.includes('page=S5'),'capacity editor must return to S5: '+saved);
       row.returnPath=saved;
       await capFrame.getByRole('button',{name:/8m³/}).first().click();
       await capFrame.getByRole('button',{name:/查看仓位报价/}).first().click();
       await s5.locator('body[data-page="s5"].bridge-ready').waitFor({timeout:20000});
       const after=await app.locator('#screen').evaluate(()=>{
         const B=window.SIM_DEMO,s=B.core.state();
         return {capacity:s.requirement.capacity_m3,months:s.requirement.term_months,confirmed:s.requirement.term_confirmed,route:location.search};
       });
       assert.equal(after.capacity,8,'updated capacity must return to S5');
       assert.equal(after.months,12,'lease term must persist after capacity edit');
       assert.equal(after.confirmed,true,'confirmed term must persist after capacity edit');
       assert(after.route.includes('page=S5'),'CAP must return into S5');
       row.afterEdit=after;
     }
     assert.deepEqual(errors,[],'navigation JS errors');
     await page.screenshot({path:path.join(out,'flow-'+name+'-'+w+'.png')});
     row.status='PASS';
    }catch(e){row.error=String(e.stack||e);await page.screenshot({path:path.join(out,'FAIL-flow-'+name+'-'+w+'.png')}).catch(()=>{});}
    paths.push(row);console.log('S5_04C_FLOW',JSON.stringify(row));
    await ctx.close();
   }
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({source_sha:process.env.GITHUB_SHA||'',widths:[375,390],cases:results,flows:paths},null,2));
 const bad=[...results,...paths].filter(x=>x.status!=='PASS');
 assert(!bad.length,'S5 04C failed: '+bad.map(x=>x.width+':'+(x.scenario||x.name)+' '+x.error).join(' | '));
 console.log('S5_04C_20_STATES_6_FLOWS_PASS');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
