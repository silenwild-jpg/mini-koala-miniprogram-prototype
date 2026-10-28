'use strict';
const {chromium}=require('playwright'), fs=require('node:fs'), path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(__dirname,'../evidence/vis-rebuild-03a');fs.mkdirSync(out,{recursive:true});
const records=[];const root='http://127.0.0.1:4270/central-review-02g.html?catalog=mk&page=S01';
async function verify(w,h){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN',deviceScaleFactor:1});
 const page=await context.newPage(),frame=page.frameLocator('#central-host'),jsErrors=[];page.on('pageerror',e=>jsErrors.push(String(e)));
 try{
  await page.goto(root,{waitUntil:'domcontentloaded'});
  await frame.locator('.page-S01 .store-row').first().waitFor({timeout:12000});
  const info=await frame.locator('.page-S01').evaluate(el=>{
   const rows=[...el.querySelectorAll('.store-row')], first=rows.slice(0,2),style=getComputedStyle(el);
   return {background:style.backgroundColor,bodyScroll:document.documentElement.scrollWidth,viewport:window.innerWidth,
    rowCount:rows.length,first:first.map(x=>({id:x.dataset.storeId,distance:x.querySelector('.store-distance')?.textContent,
      photoWidth:x.querySelector('.store-photo')?.getBoundingClientRect().width,cardWidth:x.getBoundingClientRect().width,
      photoHeight:x.querySelector('.store-photo')?.getBoundingClientRect().height,
      flex:getComputedStyle(x.querySelector('.store-entry')).flexDirection,
      previews:x.querySelectorAll('.unit-preview').length,expanded:x.classList.contains('is-expanded'),
      labels:[...x.querySelectorAll('.s01-03a-photo-label')].map(n=>n.textContent)})),
    allPhotos:[...el.querySelectorAll('.store-photo')].slice(0,3).map(x=>x.complete&&x.naturalWidth>0),
    cssLoaded:[...document.styleSheets].some(x=>x.href?.includes('s01-vis-rebuild-03a.css')),
    filter:[...el.querySelectorAll('.filter-btn')].map(x=>x.textContent.trim())};
  });
  assert.equal(info.background,'rgb(255, 255, 255)','pure white background');
  assert.equal(info.cssLoaded,true,'S01 approval css not loaded');
  assert(info.rowCount>=2,'two stores');
  assert(info.bodyScroll<=w+3,'horizontal overflow');
  assert.equal(info.first.filter(x=>x.expanded).length,2,'first 2 cards must be expanded');
  assert(info.first.every(x=>x.previews<=2&&x.previews>=1),'unit rows inside each store');
  assert(info.first.every(x=>x.photoWidth>=x.cardWidth-5),'approved A image width');
  assert(info.first.every(x=>x.flex==='column'),'photo-first layout');
  assert(info.first.every(x=>x.labels.includes('门店场景示意')),'photo needs source disclosure');
  assert(info.first.every(x=>/演示距离\s+[\d.]+\s*km/.test(x.distance)),'distance kilometre and mock label in both first stores');
  assert(info.allPhotos.every(Boolean),'image load');
  assert(!jsErrors.length,jsErrors.join(';'));
  await page.screenshot({path:path.join(out,'S01_A_approved_'+w+'_viewport.png')});
  // Check expand interaction doesn't change MK data identity or the approved layout.
  await frame.locator('.page-S01 .store-row').first().locator('[data-action="toggleStore"]').click();
  const collapsed=await frame.locator('.page-S01 .store-row').first().locator('.store-previews').evaluate(x=>x.hidden);
  assert(collapsed,'independent collapse');
  await frame.locator('.page-S01 .store-row').first().locator('[data-action="toggleStore"]').click();
  assert.equal(await frame.locator('.page-S01 .store-row').first().locator('.store-previews').evaluate(x=>x.hidden),false);
  // Separate direct route for full-height browser proof in the native app surface.
  const direct=await browser.newContext({viewport:{width:w,height:h},locale:'zh-CN',deviceScaleFactor:1});
  const d=await direct.newPage();await d.addInitScript(()=>sessionStorage.setItem('mk_active_catalog_v1','MK'));
  await d.goto('http://127.0.0.1:4270/prototype/parallel/core-journey-fix-01/demo/index.html?page=S01',{waitUntil:'domcontentloaded'});
  await d.locator('.page-S01 .store-row').first().waitFor({timeout:10000});
  await d.evaluate(()=>{
    const e=document.querySelector('.page-S01 .scroll'),shell=document.querySelector('.app-shell'),screen=document.querySelector('.screen');
    shell.style.height='auto';shell.style.minHeight='0';screen.style.height='auto';e.style.height='auto';e.style.overflow='visible';
  });
  await d.screenshot({path:path.join(out,'S01_A_approved_'+w+'_full.png'),fullPage:true});
  const full=await d.locator('.page-S01').evaluate(el=>({horizontal:el.scrollWidth,html:document.documentElement.scrollWidth,viewport:innerWidth,
       background:getComputedStyle(el).backgroundColor}));
  assert(full.horizontal<=w+3,'full scroll overflow');
  await direct.close();
  const row={width:w,height:h,status:'PASS',first:info.first,loaded:true,collapsed:true,full};records.push(row);console.log('VIS_REBUILD_03A_CASE',JSON.stringify(row));
 }finally{await context.close();await browser.close();}
}
(async()=>{try{await verify(375,812);await verify(390,844);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({status:'PASS',tests:records,visualMaster:'candidate-A-with-authorized-white-km-variations',signedOff:false},null,2));console.log('VIS_REBUILD_03A_SUMMARY',JSON.stringify({pass:records.length,fail:0}));}catch(e){fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({status:'FAIL',tests:records,error:String(e)},null,2));console.error('VIS_REBUILD_03A_FAIL',e.stack);process.exitCode=1;}})();
