#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-single-candidate-03-s01');
const port=4567,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(e,b)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const rows=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   const page=await context.newPage(),errors=[],bad=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&/\/assets\/|estore-existing-scene/.test(r.url()))bad.push({status:r.status(),url:r.url()});});
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   const app=page.frameLocator('#central-host'),child=app.frameLocator('#s01-r2-frame');
   await child.locator('#s01-search').waitFor({state:'visible'});
   await child.locator('.s01-compact-store').first().waitFor({state:'attached',timeout:13000});
   const profile=await child.locator('.stores').evaluate(node=>{
     const entries=[...node.children].filter(el=>el.matches('.store-card,.s01-estore-card'));
     const cards=entries.map(el=>{
       const r=el.getBoundingClientRect();
       return {kind:el.dataset.cardKind,rank:Number(el.dataset.cardRank),id:el.dataset.storeId||null,
         hasUnits:el.querySelectorAll('.unit').length,
         photo:el.querySelector('img')?.getAttribute('src'),title:el.querySelector('h2,.s01-compact-info>strong,.s01-estore-info>strong')?.textContent?.trim(),
         top:r.top,bottom:r.bottom,width:r.width};
     });
     return {cards,overflow:document.documentElement.scrollWidth>innerWidth+2,contentWidth:document.documentElement.scrollWidth};
   });
   assert(profile.cards.length>=4,'browse must show two compact stores, fixed E-storage, and later compact stores');
   assert.deepEqual(profile.cards.slice(0,4).map(x=>x.kind),['compact','compact','estore','compact'],'browse cards should be flat');
   assert.deepEqual(profile.cards.slice(0,4).map(x=>x.rank),[1,2,3,4]);
   assert(profile.cards[0].hasUnits===0&&profile.cards[1].hasUnits===0,'browse has no confirmed capacity/term and must not expose matched units');
   assert(profile.cards.slice(3).every(x=>x.kind==='compact'&&x.hasUnits===0&&x.id),'later stores must not expand warehouse rows');
   assert.equal(profile.cards.filter(x=>x.kind==='estore').length,1,'exactly one E-storage slot');
   assert(!profile.overflow,'horizontal overflow');
   assert.equal(errors.length,0,'browser javascript errors');
   assert.equal(bad.length,0,'missing images');
   assert.deepEqual((await child.locator('.filter').allInnerTexts()).map(x=>x.trim()),['排序','距离','服务']);
   assert.equal(await child.locator('[data-quick="single"]').count(),0,'retired filter returned');
   await child.locator('#canvas').screenshot({path:path.join(out,'S01-'+width+'-full.png'),timeout:25000});
   await child.locator('.s01-estore-card').screenshot({path:path.join(out,'S01-'+width+'-estore.png')});
   await child.locator('.s01-compact-store').nth(2).screenshot({path:path.join(out,'S01-'+width+'-compact.png')});
   // Continuous actual viewport scroll evidence — do not substitute element-only screenshots.
   const scroller=await child.locator('body').evaluate(()=>{
     const candidates=[document.scrollingElement,document.documentElement,document.body,
       ...document.querySelectorAll('#stage,#canvas')];
     const ranked=candidates.filter(Boolean).map(el=>({tag:el.id||el.tagName,range:el.scrollHeight-el.clientHeight}))
       .sort((a,b)=>b.range-a.range);
     return {ranked,bodyHeight:document.body.scrollHeight,visibleHeight:innerHeight};
   });
   const slicePositions=[{name:'third',selector:'.s01-estore-card'},
                         {name:'fourth',selector:'.s01-compact-store:first-of-type'},
                         {name:'last',selector:'.s01-compact-store:last-of-type'}];
   const scrollEvidence=[];
   for(const item of slicePositions){
     const locator=item.name==='fourth'?child.locator('.s01-compact-store').nth(2):
       item.name==='last'?child.locator('.s01-compact-store').last():
       child.locator(item.selector);
     await locator.scrollIntoViewIfNeeded();
     const visible=await locator.evaluate(el=>{
       const r=el.getBoundingClientRect();
       return {top:r.top,bottom:r.bottom,viewport:innerHeight,scrollY:scrollY,
         pageHeight:document.scrollingElement?.scrollHeight,
         visible:Math.min(r.bottom,innerHeight)>Math.max(r.top,0)};
     });
     assert(visible.visible,item.name+' must be visible within the iframe viewport after scrolling');
     await page.screenshot({path:path.join(out,'S01-'+width+'-scroll-'+item.name+'.png'),fullPage:false});
     scrollEvidence.push({...visible,name:item.name});
   }
   assert(scrollEvidence[0].pageHeight>scrollEvidence[0].viewport,'long list must extend below first viewport');
   rows.push({width,height,scrollEvidence,scrollMetrics:scroller});

   // Browse mode has compact ranks 1, 2 and 4: rank 4 is compact index 2.
   const compactId=profile.cards[3].id;
   await child.locator('.s01-compact-store').nth(2).click();
   await app.locator('.page-S02').waitFor({state:'visible',timeout:12000});
   const storeId=await app.locator('body').evaluate(()=>window.SIM_DEMO?.core?.state()?.storeId);
   assert.equal(storeId,compactId,'compact card should navigate to its actual S02 store id');
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   const again=page.frameLocator('#central-host').frameLocator('#s01-r2-frame');
   await again.locator('.s01-estore-cta').click();
   await page.waitForTimeout(400);
   const pageUrl=await app.locator('body').evaluate(()=>location.href);
   assert.match(pageUrl,/page=BOOKING/,'E-storage must lead to existing booking/advisor flow');
   // Confirmed capacity + lease term is a different product state: the first
   // two stores must expose one matched warehouse each, while 3rd E-storage
   // and 4th+ compact entries keep their frozen positions.
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
   const matchedApp=page.frameLocator('#central-host');
   await matchedApp.locator('#screen').waitFor();
   await matchedApp.locator('#screen').evaluate(()=>{
     const demo=window.SIM_DEMO;
     demo.core.setRequirement(3,12,true);
     demo.persist();
     demo.navigate('S01');
   });
   const matchedFrame=matchedApp.frameLocator('#s01-r2-frame');
   await matchedFrame.locator('.store-card[data-card-kind="expanded"]').first().waitFor({state:'visible',timeout:15000});
   const match=await matchedFrame.locator('.stores').evaluate(node=>{
     const entries=[...node.children].filter(el=>el.matches('.store-card,.s01-estore-card'));
     return entries.map(el=>({kind:el.dataset.cardKind,rank:Number(el.dataset.cardRank),id:el.dataset.storeId||null,
       units:[...el.querySelectorAll('.unit')].filter(u=>!u.hidden&&!!u.dataset.unitId).length,priceText:el.textContent.slice(0,220)}));
   });
   assert(match.length>=4,'confirmed scenario has two expanded stores and E-storage plus compact later store');
   assert.deepEqual(match.slice(0,4).map(x=>x.kind),['expanded','expanded','estore','compact'],'confirmed requirement must expand first two only');
   assert.deepEqual(match.slice(0,4).map(x=>x.rank),[1,2,3,4]);
   assert(match[0].units===1&&match[1].units===1,'first two matching stores must show exactly one warehouse each');
   assert(match.slice(3).every(x=>x.kind==='compact'&&x.units===0),'fourth+ stores must remain compact');
   await matchedFrame.locator('#canvas').screenshot({path:path.join(out,'S01-'+width+'-matched.png'),timeout:25000});
   rows.push({width,height,cardCount:profile.cards.length,browseFirstFour:profile.cards.slice(0,4),
     matchedFirstFour:match.slice(0,4),compactStoreId:compactId,estoreRoute:pageUrl,overflow:false});
   await context.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',cases:rows.length,rows},null,2));
  console.log('RC2_SINGLE_CANDIDATE_03_S01_BROWSE_AND_MATCH_375_390_PASS',rows.length);
 }catch(e){fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'FAIL',error:String(e.stack||e),rows},null,2));throw e;}
 finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error('RC2_SINGLE_CANDIDATE_03_S01_FAIL',e);process.exitCode=1;});