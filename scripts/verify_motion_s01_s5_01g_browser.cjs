#!/usr/bin/env node
/* MOTION-S01-S5-01G | S5 E-storage full card and 2/1/0/large fallback states at 375/390.
   Isolated Web-prototype QA only; no real map or payment access. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(process.env.RC2_MOTION_BROWSER_ROOT||
  path.join(__dirname,'../release-evidence/rc2-merge-prep-10/site'));
const out=path.resolve(__dirname,'../release-evidence/motion-s01-s5-01g');
const port=4753,host='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let p;try{p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}
  catch{res.writeHead(400).end();return;}
  if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(p,(e,b)=>e?res.writeHead(404).end('missing'):
    res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'}).end(b));
});
const scenarios=[
  {name:'two-stores',count:2,match:'matched'},
  {name:'one-store',count:1,match:'matched'},
  {name:'no-match',count:0,match:'none'},
  {name:'large-no-match',count:0,match:'large'}
];
(async()=>{
  if(!fs.existsSync(path.join(root,'central-review-02g.html')))throw Error('MISSING_BUILT_SITE');
  fs.mkdirSync(out,{recursive:true});
  await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const records=[];
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      for(const scenario of scenarios){
        const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
        const page=await context.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        const record={width,height,scenario:scenario.name,status:'FAIL'};
        try{
          await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',
            {waitUntil:'domcontentloaded'});
          await page.waitForFunction(()=>Boolean(document.getElementById('central-host')
            ?.contentWindow?.SIM_DEMO?.core?.setRequirement),null,{timeout:20000});
          const app=page.frameLocator('#central-host');
          await app.locator('#screen').evaluate(()=>{
            const B=window.SIM_DEMO;
            B.core.setCity('北京');B.core.setRequirement(3,12,true);B.persist();B.navigate('S5');
          });
          const s5=app.frameLocator('#br04-frame');
          await s5.locator('body[data-page="s5"].bridge-ready').waitFor({timeout:20000});
          const seeded=await s5.locator('body').evaluate((_,scenario)=>{
            const B=window.parent.SIM_DEMO;
            const offers=B.offers();
            if(offers.length<2)throw Error('INSUFFICIENT_FIXED_OFFERS');
            if(scenario==='large-no-match'){B.core.setRequirement(60,12,true);B.persist();}
            const target=scenario==='two-stores'?offers.slice(0,2):
              scenario==='one-store'?offers.slice(0,1):[];
            B.s5Offers=()=>target;
            window.BR04_REFRESH();
            return {chosen:target.map(x=>x.store.id),months:B.core.state().requirement.term_months};
          },scenario.name);
          await s5.locator('#artboard').waitFor({state:'visible'});
          const state=await s5.locator('body').evaluate(()=>{
            const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,
              top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
            const board=document.querySelector('#artboard'),viewport=document.querySelector('#app-viewport');
            const visible=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none'
              &&getComputedStyle(el).visibility!=='hidden';
            const e=document.querySelector('.estore'),photo=e?.querySelector('img'),btn=e?.querySelector('button');
            const no=document.querySelector('#no-match'),more=document.querySelector('.more-units');
            const cards=[...document.querySelectorAll('.s5-store-card')].filter(visible);
            const rows=cards.map(card=>({id:card.dataset.storeId,box:rect(card),
              units:card.querySelectorAll('.s5-unit-row').length,price:card.querySelector('.s5-unit-price')?.textContent||''}));
            return {match:board.dataset.match,count:board.dataset.count,rows,
              eVisible:visible(e),eBox:rect(e),ePhotoLoaded:!!photo?.naturalWidth,
              ePhotoAlt:photo?.getAttribute('alt'),eTitle:e.querySelector('h2')?.textContent,
              eButton:btn?.textContent,eButtonBox:rect(btn),eButtonVisible:visible(btn),
              noVisible:visible(no),noBox:rect(no),moreVisible:visible(more),
              width:document.documentElement.scrollWidth,viewportWidth:window.innerWidth,
              viewportOverflow:viewport.scrollWidth-viewport.clientWidth,
              capacity:document.querySelector('#capacity')?.textContent,
              months:document.querySelector('#demand-term')?.textContent,
              compare:document.querySelectorAll('#s5-compare,[data-s5-compare]').length};
          });
          record.state=state;record.seeded=seeded;
          assert.equal(state.match,scenario.match,'S5 state must match scenario');
          assert.equal(Number(state.count),scenario.count,'data-count');
          assert.equal(state.rows.length,scenario.count,'visible store count');
          assert.equal(state.compare,0,'retired compare features must stay gone');
          assert.equal(state.eVisible,true,'E-storage card always available');
          assert.equal(state.eTitle,'考拉E存','E-storage title');
          assert.equal(state.ePhotoLoaded,true,'E-storage illustration must load');
          assert(state.ePhotoAlt&&state.ePhotoAlt.trim(),'E-storage image alt text');
          assert.equal(state.eButtonVisible,true,'E-storage action visible');
          assert(state.eButtonBox.height>=43,'E-storage button minimum 44px tap area');
          assert(state.eBox.width>=280&&state.eBox.height>=108,'E-storage card fully laid out');
          assert(state.eBox.left>=-2&&state.eBox.right<=width+2,'E-storage card horizontal clipping');
          assert(state.width<=width+2,'document horizontal overflow');
          assert(state.viewportOverflow<=2,'internal scroller horizontal overflow');
          assert(state.capacity?.includes(scenario.name==='large-no-match'?'60':'3'),'demand capacity intact');
          assert(state.months?.includes('12'),'rental term intact');
          if(scenario.count===0){
            assert.equal(state.noVisible,true,'no-match fallback visible');
            assert.equal(state.moreVisible,false,'no redundant more-entry in fallback');
            assert(state.noBox.bottom<=state.eBox.top+2,'fallback and E card do not overlap');
          }else{
            assert.equal(state.noVisible,false,'no-match hidden when offers exist');
            assert.equal(state.moreVisible,true,'more-stores entry exists');
            assert(state.rows.every(x=>x.units===1&&x.price),'one matched warehouse per store');
            assert(state.rows.at(-1).box.bottom<=state.eBox.top+2,'last store and E card must not overlap');
          }
          // Capture the card after scrolling it into the visual viewport, not just a DOM crop.
          await s5.locator('.estore').scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(out,`${scenario.name}-${width}-estore-viewport.png`),
            fullPage:false});
          await s5.locator('.estore').screenshot({
            path:path.join(out,`${scenario.name}-${width}-estore-card.png`)});
          if(scenario.count===0){
            await s5.locator('#no-match').scrollIntoViewIfNeeded();
            await page.screenshot({path:path.join(out,`${scenario.name}-${width}-fallback-viewport.png`),
              fullPage:false});
          }
          // The E-storage CTA must open the current existing service flow, not a dead button.
          await s5.locator('#open-estore').click();
          await s5.locator('#modal').waitFor({state:'visible',timeout:7000});
          const action=s5.locator('#modal').getByRole('button',{name:'联系顾问'});
          assert(await action.count()>0,'existing E-store advisor path must be offered');
          await s5.locator('#close-modal').click();
          await s5.locator('#modal').waitFor({state:'hidden',timeout:7000});
          assert.deepEqual(errors,[],'browser JS errors');
          record.status='PASS';
        }catch(error){
          record.error=String(error?.stack||error);
          try{await page.screenshot({path:path.join(out,`FAIL-${scenario.name}-${width}.png`),
            fullPage:false,timeout:5000});}catch(screenshotError){record.screenshotError=String(screenshotError);}
        }finally{
          records.push(record);
          fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(records,null,2));
          console.log('MOTION_01G_CASE',JSON.stringify({
            scenario:scenario.name,width,status:record.status,error:record.error?.slice(0,260)||null}));
          await context.close();
        }
      }
    }
    assert(records.length===scenarios.length*2,'expected all scenarios in both widths');
    assert(records.every(row=>row.status==='PASS'),'At least one E-storage/fallback QA case failed');
    console.log('MOTION-S01-S5-01G: PASS | E storage, one/no match, 375/390');
  }finally{
    await browser.close();
    await new Promise(ok=>server.close(ok));
  }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
