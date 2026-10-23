const fs=require('fs');
const path=require('path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const PROTO=path.join(ROOT,'prototype');
const OUT=path.join(ROOT,'verification_store_unit_review_patch');
fs.mkdirSync(OUT,{recursive:true});

function inlineFile(name,query='',seed={}){
  const file=path.join(PROTO,name);
  let html=fs.readFileSync(file,'utf8');
  html=html.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi,(m,src)=>{
    const target=path.resolve(path.dirname(file),src);
    return fs.existsSync(target)?`<style data-inline="${src}">${fs.readFileSync(target,'utf8')}</style>`:m;
  });
  html=html.replace(/<script\s+src=["']([^"']+)["']><\/script>/gi,(m,src)=>{
    const target=path.resolve(path.dirname(file),src);
    return fs.existsSync(target)?`<script>${fs.readFileSync(target,'utf8')}</script>`:m;
  });
  html=html.replaceAll('location.search',JSON.stringify(query?`?${query}`:''));
  html=html.replaceAll('window.localStorage','window.__qaStorage').replaceAll('localStorage','window.__qaStorage');
  const encoded=JSON.stringify(Object.fromEntries(Object.entries(seed).map(([k,v])=>[k,typeof v==='string'?v:JSON.stringify(v)])));
  const shim=`<script>window.__qaMap=new Map(Object.entries(${encoded}));window.__qaStorage={getItem:k=>window.__qaMap.has(k)?window.__qaMap.get(k):null,setItem:(k,v)=>window.__qaMap.set(k,String(v)),removeItem:k=>window.__qaMap.delete(k)};</script>`;
  return html.replace('<head>','<head>'+shim);
}

function pageMetrics(page){
  return page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    text:document.body.innerText
  }));
}

(async()=>{
  const executablePath=process.env.CHROMIUM_PATH||(['/usr/bin/chromium',chromium.executablePath()].find(fs.existsSync));
  const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox','--disable-gpu']});
  const results={};
  for(const [width,height] of [[375,812],[390,844]]){
    {
      const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.setContent(inlineFile('mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html','state=browse&entry=browse_nearby'),{waitUntil:'load'});
      await page.waitForTimeout(200);
      const controls=await page.evaluate(()=>({sort:[...document.querySelector('#sortSelect').options].map(o=>o.textContent),distance:[...document.querySelector('#distanceSelect').options].map(o=>o.textContent),visible:getComputedStyle(document.querySelector('#distanceSelect')).display!=='none'}));
      await page.selectOption('#sortSelect','price');await page.selectOption('#distanceSelect','5');await page.waitForTimeout(100);
      results[`s01_${width}`]={...pageMetrics?await pageMetrics(page):{},errors,controls,selected:await page.evaluate(()=>({sort:sortMode,distance:browseDistanceKm}))};
      await page.screenshot({path:path.join(OUT,`S01_DROPDOWNS_${width}x${height}.png`),fullPage:true});await page.close();
    }
    {
      const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.setContent(inlineFile('mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html','store=jianguo&state=browse'),{waitUntil:'load'});await page.waitForTimeout(200);
      const before=await page.locator('#unitList .unit-card').count();
      if(await page.locator('#allUnits').isVisible())await page.click('#allUnits');
      const first=await page.evaluate(()=>{const cards=[...document.querySelectorAll('#unitList .unit-card,#allUnitsInline .unit-card')];const b=document.querySelector('#allUnits');const last=cards.at(-1);return {count:cards.length,buttonVisible:!!b&&getComputedStyle(b).display!=='none',buttonAfterLast:!b||getComputedStyle(b).display==='none'||b.getBoundingClientRect().top>=last.getBoundingClientRect().bottom-1};});
      for(let i=0;i<50&&await page.locator('#allUnits').isVisible();i++)await page.click('#allUnits');
      const done=await page.evaluate(()=>({buttonHidden:getComputedStyle(document.querySelector('#allUnits')).display==='none',shown:document.querySelectorAll('#unitList .unit-card,#allUnitsInline .unit-card').length,inventory:inventoryUnits().length}));
      results[`s02_${width}`]={...await pageMetrics(page),errors,before,first,done};
      await page.screenshot({path:path.join(OUT,`S02_ALL_UNITS_${width}x${height}.png`),fullPage:true});await page.close();
    }
    {
      const seed={mini_storage_b2b_quick_current:{target_volume:4.8,term_months:6,moving_support:'待确认',storage_types:['库存']}};
      const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.setContent(inlineFile('space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html','entry=b2b_recommend&term=6',seed),{waitUntil:'load'});await page.waitForTimeout(250);
      await page.locator('#r113EstoreCard').scrollIntoViewIfNeeded();
      const layout=await page.evaluate(()=>{const card=document.querySelector('.estore-feature'),price=card?.querySelector('.estore-price'),points=card?.querySelector('.estore-points'),ship=card?.querySelector('.estore-ship');const C=card?.getBoundingClientRect(),P=price?.getBoundingClientRect(),T=points?.getBoundingClientRect(),S=ship?.getBoundingClientRect();return {hasCard:!!card,priceInside:!!(C&&P&&P.left>=C.left&&P.right<=C.right+1&&P.top>=C.top&&P.bottom<=C.bottom+1),priceBelowContent:!!(P&&S&&P.top>=S.bottom-1),pointsWrap:getComputedStyle(points).flexWrap,cardWidth:C?.width,priceWidth:P?.width};});
      results[`estore_${width}`]={...await pageMetrics(page),errors,layout};
      await page.screenshot({path:path.join(OUT,`ESTORE_FIXED_${width}x${height}.png`),fullPage:true});await page.close();
    }
    {
      const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.setContent(inlineFile('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html','store=jianguo&unit=C008&target=4.8&term=6'),{waitUntil:'load'});await page.waitForTimeout(150);
      results[`u01_${width}`]={...await pageMetrics(page),errors,longCopy:await page.getByText('面积及长宽按',{exact:false}).count()};
      await page.screenshot({path:path.join(OUT,`U01_NO_LONG_COPY_${width}x${height}.png`),fullPage:true});await page.close();
    }
    {
      const order={order_no:'MK-DEMO-A01-001',status:'PAID',payment_status:'PAID',store_id:'jianguo',unit_id:'C008',actual_unit_id:'A038',volume:4.8,term_months:6,monthly_price:573,total_price:3438,start_date:'2026-09-01',lease_status:'ACTIVE',lifecycle_state:'active',inventory_status:'LOCKED_TO_ORDER',identity_verification_status:'VERIFIED',access_status:'ACTIVE',lock_code:'2468'};
      const seed={mini_storage_order_current:order,mini_storage_order_history_v242:[order]};
      const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.setContent(inlineFile('mini_storage_access_a01_v2_self_service_Visual_V2_7_4.html','orderNo=MK-DEMO-A01-001',seed),{waitUntil:'load'});await page.waitForTimeout(150);
      results[`a01_${width}`]={...await pageMetrics(page),errors,homeVisible:await page.locator('#homeEntry').isVisible(),homeLabel:await page.locator('#homeEntry').innerText()};
      await page.screenshot({path:path.join(OUT,`A01_HOME_ENTRY_${width}x${height}.png`),fullPage:true});await page.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT,'runtime.json'),JSON.stringify(results,null,2));
  const failures=[];
  for(const [name,row] of Object.entries(results)){
    if(row.errors?.length)failures.push(`${name}: ${row.errors.join('; ')}`);
    if(row.overflow)failures.push(`${name}: horizontal overflow`);
  }
  for(const width of [375,390]){
    const s=results[`s01_${width}`],d=results[`s02_${width}`],e=results[`estore_${width}`],u=results[`u01_${width}`],a=results[`a01_${width}`];
    if(s.selected.sort!=='price'||s.selected.distance!=='5'||!s.controls.visible)failures.push(`s01_${width}: dropdown interaction`);
    if(!d.first.buttonAfterLast||!d.done.buttonHidden||d.done.shown!==d.done.inventory)failures.push(`s02_${width}: progressive inventory`);
    if(!e.layout.hasCard||!e.layout.priceInside||!e.layout.priceBelowContent||e.layout.pointsWrap!=='wrap')failures.push(`estore_${width}: layout`);
    if(u.longCopy!==0)failures.push(`u01_${width}: long copy remains`);
    if(!a.homeVisible||a.homeLabel!=='返回首页')failures.push(`a01_${width}: home entry`);
  }
  if(failures.length){console.error(JSON.stringify({failures,results},null,2));process.exit(1)}
  console.log(JSON.stringify({status:'PASS',screens:Object.keys(results).length,viewports:['375x812','390x844']},null,2));
})().catch(error=>{console.error(error);process.exit(1)});
