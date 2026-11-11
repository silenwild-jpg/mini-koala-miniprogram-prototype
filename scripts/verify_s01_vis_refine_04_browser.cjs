#!/usr/bin/env node
'use strict';
// S01-VIS-REFINE-04: independent browser checks for the approved information
// hierarchy at native 375×812 and 390×844. Screenshots are from actual source.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/s01-vis-refine-04');
const host='http://127.0.0.1:4639';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname))}
 catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,data)=>err?res.writeHead(404).end('Not Found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
function near(a,b,max=2){return Math.abs(a-b)<=max}
const cases=[];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(4639,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
    await s01.locator('.store-card.s01-compact').first().waitFor();
    const layout=await s01.locator('body').evaluate(body=>{
      const one=s=>body.querySelector(s),box=s=>{const r=one(s)?.getBoundingClientRect();return r&&{top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
      const rows=[...body.querySelectorAll('.store-card.s01-compact')].slice(0,4);
      const address=rows.map(el=>{
        const copy=el.querySelector('.address-copy'),distance=el.querySelector('.km');
        const a=copy.getBoundingClientRect(),d=distance?.getBoundingClientRect();
        return {
          text:copy.textContent,fullAddress:copy.title,
          css:{whiteSpace:getComputedStyle(copy).whiteSpace,overflow:getComputedStyle(copy).overflow,textOverflow:getComputedStyle(copy).textOverflow},
          copy:{x:a.x,width:a.width,height:a.height,right:a.right,scrollWidth:copy.scrollWidth},
          distance:d?{x:d.x,width:d.width,height:d.height}:null,
          indicator:el.querySelector('.s01-compact-arrow')?.textContent,
          entireCardRole:el.getAttribute('role'),
          wholeCardTap:el.getAttribute('tabindex'),
          strongFont:parseFloat(getComputedStyle(el.querySelector('.s01-compact-side strong')).fontSize),
          shadow:getComputedStyle(el).boxShadow
        };
      });
      const chips=[...body.querySelectorAll('.s01-quick button')].map(el=>{
        const r=el.getBoundingClientRect(),pseudo=getComputedStyle(el,'::before');
        return {height:r.height,font:parseFloat(getComputedStyle(el).fontSize),bg:pseudo.backgroundColor,pseudoTop:pseudo.top,pseudoBottom:pseudo.bottom,selected:el.getAttribute('aria-pressed')};
      });
      return {header:box('.searchbar'),filter:box('.s01-filter-anchor'),quick:box('.s01-quick'),demand:box('.s01-context'),stores:box('.stores'),
        parentSequence:[...one('.s01-context').parentNode.children].map(x=>x.className||x.id).filter(Boolean).slice(0,18),
        addresses:address,chips,chevronCount:body.querySelectorAll('.s01-compact-arrow').length,
        visibleViewText:body.querySelector('.stores')?.innerText.includes('查看门店'),
        width:document.documentElement.scrollWidth-innerWidth,
        estoreCount:body.querySelectorAll('.s01-estore-card').length,
        compactCount:body.querySelectorAll('.s01-compact').length
      };
    });
    assert(layout.filter.bottom<=layout.quick.top+2,'quick chips not below main filters');
    assert(layout.quick.bottom<=layout.demand.top+2,'estimate not below quick filters');
    assert(layout.demand.bottom<=layout.stores.top+3,'estimate not before store list');
    assert(layout.chips.length===2,'chip count drift');
    assert(layout.chips.every(c=>c.height>=44&&c.font<=12.5),'chips are no longer unobtrusive 44px targets');
    assert(layout.chips.every(c=>Math.abs(parseFloat(c.pseudoTop)-8)<=1),'visible chip pill is not ~28px high');
    assert.equal(layout.visibleViewText,false,'duplicate visible 查看门店 returned');
    assert.equal(layout.estoreCount,1);assert(layout.compactCount>=4);
    assert(layout.addresses.every(a=>a.css.whiteSpace==='nowrap'&&a.css.overflow==='hidden'&&a.css.textOverflow==='ellipsis'),'address is not one-line ellipsis');
    assert(layout.addresses.every(a=>a.copy.height<=19.5),'two-line address affects list density');
    assert(layout.addresses.every(a=>a.fullAddress===a.text),'full address no longer available to details/accessible info');
    assert(layout.addresses.every(a=>!a.distance||a.copy.right<=a.distance.x+1),'distance overlaps truncated address');
    assert(layout.addresses.every(a=>a.indicator==='›'&&a.entireCardRole==='button'&&a.wholeCardTap==='0'),'entire card navigation affordance drifted');
    assert(layout.addresses.every(a=>a.strongFont>=16&&a.shadow==='none'),'price hierarchy or flat card style drifted');
    assert(layout.width<=2,'browse horizontal overflow '+layout.width);
    await page.screenshot({path:path.join(out,'S01-refine-browse-'+width+'.png'),fullPage:false});
    await s01.locator('.stores').screenshot({path:path.join(out,'S01-refine-list-'+width+'.png')});

    // Every quick chip is a filter, not a prominent banner; ensure interaction.
    await s01.locator('[data-quick="promo"]').click();
    assert.equal(await s01.locator('[data-quick="promo"]').getAttribute('aria-pressed'),'true');
    await s01.locator('[data-quick="promo"]').click();
    assert.equal(await s01.locator('[data-quick="promo"]').getAttribute('aria-pressed'),'false');
    await s01.locator('.s01-edit').click();
    await page.waitForURL(/cap\.html/,{timeout:10000});
    const cap=page.url();
    await page.goto(host+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    const app2=page.frameLocator('#central-host'),s02=app2.frameLocator('#s01-r2-frame');
    await s02.locator('.store-card.s01-compact').first().waitFor();
    const firstStore=await s02.locator('.store-card.s01-compact').first().getAttribute('data-store-id');
    await s02.locator('.store-card.s01-compact').first().click();
    await app2.locator('#screen.page-S02').waitFor();
    const selected=await app2.locator('#screen').evaluate(()=>window.SIM_DEMO.core.state().storeId);
    assert.equal(selected,firstStore,'whole-card click did not navigate to S02');
    await app2.locator('#screen').evaluate(()=>{
      const b=window.SIM_DEMO;b.core.setRequirement(3,12,true);b.persist();b.navigate('S01');
    });
    await s02.locator('.store-card[data-card-kind="expanded"]').first().waitFor();
    const matched=await s02.locator('body').evaluate(body=>{
      const card=body.querySelector('.store-card[data-card-kind="expanded"]'),cost=card.querySelector('.price[data-price-kind="term"]');
      const amount=cost.querySelector('strong'),sub=cost.querySelector('.price-secondary');
      const addr=card.querySelector('.address-copy'),km=card.querySelector('.km');
      return {
        amount:amount.textContent,sub:sub.textContent,
        primaryFont:parseFloat(getComputedStyle(amount).fontSize),
        secondaryFont:parseFloat(getComputedStyle(sub).fontSize),
        hasCubic:!!body.querySelector('.store-cubic-price:not([hidden])'),
        addr:{height:addr.getBoundingClientRect().height,whiteSpace:getComputedStyle(addr).whiteSpace},
        distance:km.textContent,unitCount:[...card.querySelectorAll('.unit')].filter(x=>!x.hidden).length,
        quickIsAboveDemand:body.querySelector('.s01-quick').getBoundingClientRect().bottom<=body.querySelector('.s01-context').getBoundingClientRect().top+2,
        width:document.documentElement.scrollWidth-innerWidth
      };
    });
    assert.equal(matched.hasCubic,false);assert.equal(matched.unitCount,1);
    assert.match(matched.sub,/¥[\d,.]+\/月 × 12个月/);
    assert(matched.primaryFont>=19&&matched.primaryFont>matched.secondaryFont+6,'whole term rental price is not dominant');
    assert(matched.addr.height<=19.5&&matched.addr.whiteSpace==='nowrap','matched card address still has two lines');
    assert(matched.quickIsAboveDemand);assert(matched.width<=2);
    await page.screenshot({path:path.join(out,'S01-refine-matched-'+width+'.png'),fullPage:false});
    await s02.locator('.stores').screenshot({path:path.join(out,'S01-refine-matched-list-'+width+'.png')});
    assert.deepEqual(errors,[],'browser page errors');
    cases.push({width,height,status:'PASS',layout,matched,cap,selected,errors:errors.length});
   }catch(error){await page.screenshot({path:path.join(out,'S01-refine-FAIL-'+width+'.png')}).catch(()=>{});throw error}
   finally{await context.close()}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',source:'PR99',offlineChromium:true,deployed:false,merged:false,humanVisualSigned:false,cases},null,2));
  console.log('S01_VIS_REFINE_04_PASS '+JSON.stringify(cases.map(x=>({width:x.width,priceFont:x.layout.addresses[0]?.strongFont,matchedFont:x.matched.primaryFont}))));
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(err=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',error:err.stack||String(err)},null,2));console.error('S01_VIS_REFINE_04_FAIL '+(err.stack||err));process.exitCode=1});
