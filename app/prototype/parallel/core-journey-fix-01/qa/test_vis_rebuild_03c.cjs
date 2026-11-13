'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PNG}=require('pngjs');
const out=path.resolve(__dirname,'../evidence/vis-rebuild-03c');
fs.mkdirSync(out,{recursive:true});
const origin=process.env.VIS03C_ORIGIN||'http://127.0.0.1:4270';
const records=[];
const geometrySelector='.canvas,.statusbar,.navbar,.searchbar,.filters,.filter,.store-card,.store-photo,.store-body,.store-tags,.address,.units,.unit,.unit-main,.order';
const maskSelector='.search-pill,.filter,.store-body h2,.store-tags,.address,.capacity,.price,.hot,.unit-desc';
async function measure(frame){return frame.locator('body').evaluate((body,{geometrySelector,maskSelector})=>{
 const d=body.ownerDocument,box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
 return {geometry:[...d.querySelectorAll(geometrySelector)].map(n=>({tag:n.className,...box(n)})),masks:[...d.querySelectorAll(maskSelector)].map(box),
   cards:[...d.querySelectorAll('.store-card')].map(n=>({id:n.dataset.storeId,name:n.querySelector('h2').textContent,address:n.querySelector('.address-copy').textContent,
     addressFits:n.querySelector('.address-copy').scrollWidth<=n.querySelector('.address-copy').clientWidth,
     distance:n.querySelector('.km').textContent,photo:n.querySelector('img').currentSrc,loaded:n.querySelector('img').complete&&n.querySelector('img').naturalWidth>0,
     tags:[...n.querySelectorAll('.store-tags span')].filter(x=>!x.hidden).map(x=>x.textContent),
     units:[...n.querySelectorAll('.unit:not([hidden])')].map(x=>({id:x.dataset.unitId,capacity:x.querySelector('.capacity').textContent,price:x.querySelector('.price').textContent}))})),
   bg:getComputedStyle(body).backgroundColor,overflow:d.documentElement.scrollWidth>innerWidth,
   text:body.innerText,filters:[...d.querySelectorAll('.filter')].map(x=>x.textContent.trim())};
 },{geometrySelector,maskSelector});}
function pixelDiff(before,after,masks,file){
 const a=PNG.sync.read(before),b=PNG.sync.read(after);assert.equal(a.width,b.width);assert.equal(a.height,b.height);
 const diff=new PNG({width:a.width,height:a.height});let total=0,unmasked=0,count=0,changed=0;
 for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
   const i=(y*a.width+x)*4,delta=(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2]))/3;
   total+=delta;const masked=masks.some(r=>x>=r.x-2&&x<r.x+r.w+2&&y>=r.y-2&&y<r.y+r.h+2);
   if(!masked){unmasked+=delta;count++;if(delta>12)changed++;}
   diff.data[i]=delta>12?255:235;diff.data[i+1]=delta>12?40:235;diff.data[i+2]=delta>12?40:235;diff.data[i+3]=255;
 }
 fs.writeFileSync(file,PNG.sync.write(diff));return {rawMAE:total/(a.width*a.height),outsideContentMAE:unmasked/count,outsideContentChangedFraction:changed/count,maskedContentSlots:maskSelector};
}
async function visibleText(frame){return frame.locator('body').evaluate(body=>{const walk=(d)=>[...d.querySelectorAll('body')].map(x=>x.innerText).join('\n')+[...d.querySelectorAll('iframe')].map(x=>x.contentDocument?walk(x.contentDocument):'').join('\n');return walk(body.ownerDocument);});}
async function titles(page){return page.evaluate(()=>{const walk=d=>d.title+[...d.querySelectorAll('iframe')].map(f=>f.title+(f.contentDocument?walk(f.contentDocument):'')).join('');return walk(document);});}
async function run(browser,width,height,source){
 const ctx=await browser.newContext({viewport:{width,height},locale:'zh-CN',deviceScaleFactor:1});
 const p=await ctx.newPage(),outer=p.frameLocator('#central-host'),s01=outer.frameLocator('#s01-r2-frame');
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const prefix=`${source.toUpperCase()}-${width}`;
 try{
  await p.goto(`${origin}/central-review-02g.html?catalog=${source}&page=S01&s01_r2=1`);
  await s01.locator('html[data-binding="CENTRAL_RC1"]').waitFor();await s01.locator('.store-photo').last().evaluate(img=>img.decode());
  // PROTO-MERGE-02F-R1: audit central recommendation independently of two-row reference geometry.
  const rankedAudit=await outer.locator('body').evaluate(()=>{
    const d=window.SIM_DEMO,f=window.SIM_FIXTURES,p=window.SIM_REC_POLICY;
    const s=d.state();
    const active=f.stores.filter(row=>row.city===s.city&&row.status==='open');
    const eligible=active.filter(row=>f.units.some(u=>u.store_id===row.id&&d.core.available(u)));
    const ranked=p.rank(eligible,{distanceVerified:f.distanceVerified,costOf:row=>row.teaserCubicPrice}).items;
    const recommended=ranked.slice(0,2).map(row=>({id:row.id,name:row.name,available:f.units.filter(u=>u.store_id===row.id&&d.core.available(u)).length}));
    const shown=d.s01R2Bridge.snapshot().stores.map(row=>({id:row.id,name:row.name,shownUnits:row.units.length}));
    return {catalog:f.sourceNamespace||'SIM',city:s.city,capacity:s.requirement.capacity_m3,recommended,shown,
      sameOrder:recommended.every((x,i)=>x.id===shown[i]?.id)};
  });
  console.log('S01_R2_RECOMMENDATION_AUDIT '+JSON.stringify(rankedAudit));
  assert(rankedAudit.sameOrder,'R2 display changed eligible central recommendation order: '+JSON.stringify(rankedAudit));
  const initial=await measure(s01);assert.equal(initial.cards.length,2);assert.equal(initial.cards.flatMap(s=>s.units).length,4);assert.equal(initial.filters.length,3);
  assert.equal(initial.bg,'rgb(255, 255, 255)');assert(!initial.overflow);assert(!/演示|模拟|示意|测试|undefined|仓型预览|参考价说明/.test(initial.text));
  assert(initial.cards.every(s=>s.tags.length===3&&s.loaded&&/^\d+\.\dkm$/.test(s.distance)&&s.addressFits));
  assert(initial.cards.every(s=>s.id.startsWith(source.toUpperCase()+'_')&&s.units.every(u=>u.id.startsWith(source.toUpperCase()+'_'))));
  assert(!/演示|模拟|示意|测试/.test(await titles(p)),'product/browser/frame title contains internal copy');
  const actual=await p.screenshot({path:path.join(out,`${prefix}-S01.png`)});
  const ref=await ctx.newPage();await ref.goto(`${origin}/prototype/parallel/core-journey-fix-01/evidence/vis-rebuild-03c/A-R2-reference.html`);
  await ref.locator('.store-photo').last().evaluate(img=>img.decode());const reference=await measure(ref);
  const referenceImage=await ref.screenshot({path:path.join(out,`A-R2-${width}.png`)});
  assert.equal(initial.geometry.length,reference.geometry.length);
  let maxGeometryError=0;for(let i=0;i<initial.geometry.length;i++)for(const k of ['x','y','w','h'])maxGeometryError=Math.max(maxGeometryError,Math.abs(initial.geometry[i][k]-reference.geometry[i][k]));
  assert(maxGeometryError<=0.1,'A template geometry drift: '+maxGeometryError);
  const diff=pixelDiff(referenceImage,actual,[...initial.masks,...reference.masks],path.join(out,`${prefix}-diff.png`));
  assert(diff.outsideContentMAE<=0.5,'visual difference outside authorized content slots');await ref.close();
  await s01.locator('#r2-search').fill('不存在的门店');assert.equal(await s01.locator('.store-card').count(),0);assert(await s01.locator('[role="status"]').isVisible());
  await s01.locator('#r2-search').fill(initial.cards[0].name);assert.equal(await s01.locator('.store-card').count(),1);
  await s01.locator('#r2-search').fill('');
  await s01.locator('.filter').nth(0).click();const region=await outer.locator('[data-action="setR2Region"]').nth(1).getAttribute('data-value');
  await outer.locator('[data-action="setR2Region"]').nth(1).click();assert((await measure(s01)).cards.every(s=>s.address.startsWith(region)));
  await s01.locator('.filter').nth(0).click();await outer.locator('[data-action="setR2Region"][data-value="all"]').click();
  await s01.locator('.filter').nth(1).click();await outer.locator('[data-action="setR2Capacity"][data-value="medium"]').click();
  const filtered=await measure(s01);assert(filtered.cards.length>0);assert(filtered.cards.flatMap(s=>s.units).every(u=>parseFloat(u.capacity)>3&&parseFloat(u.capacity)<=6));
  await p.screenshot({path:path.join(out,`${prefix}-filtered.png`)});
  await s01.locator('.filter').nth(1).click();await outer.locator('[data-action="setR2Capacity"][data-value="all"]').click();
  await s01.locator('.filter').nth(2).click();await outer.locator('#custom-term').fill('0');await outer.locator('[data-action="customTerm"]').click();
  assert(await outer.locator('[role="alert"]').isVisible());await outer.locator('#custom-term').fill('6');await outer.locator('[data-action="customTerm"]').click();
  assert.equal((await measure(s01)).filters[2],'6个月');
  await s01.locator('.store-card h2').first().click();await outer.locator('.detail-name').waitFor();assert.equal(await outer.locator('.detail-name').innerText(),initial.cards[0].name);
  assert(!/演示|模拟|示意|测试|undefined/.test(await visibleText(outer)));await p.screenshot({path:path.join(out,`${prefix}-S02.png`)});
  await outer.locator('[aria-label="返回门店列表"]').click();await s01.locator('.order').first().click();await outer.locator('.mk-auth-overlay').waitFor();
  await p.screenshot({path:path.join(out,`${prefix}-phone.png`)});await outer.locator('.mk-auth-close').click();
  await s01.locator('.order').first().click();await outer.locator('.mk-auth-overlay').waitFor();
  await outer.locator('#mk-auth-agree').check();
  if(width===375)await outer.locator('[data-auth="wechat"]').click();
  else {await outer.locator('[data-auth="sms"]').click();await outer.locator('#mk-auth-phone').fill('13800000000');await outer.locator('[data-auth="send"]').click();await outer.locator('#mk-auth-code').fill('123456');await outer.locator('[data-auth="smsSubmit"]').click();}
  const order=outer.frameLocator('#br04-frame');await order.locator('#store-name').waitFor();assert.equal(await order.locator('#store-name').innerText(),initial.cards[0].name);
  const orderText=await order.locator('body').innerText();assert(!/演示|模拟|示意|测试|undefined/.test(orderText));assert(orderText.includes('6个月'));assert(orderText.includes('3.35')||source==='sim');
  assert(!/演示|模拟|示意|测试/.test(await titles(p)));
  await p.screenshot({path:path.join(out,`${prefix}-O01.png`)});
  assert.equal(errors.length,0,errors.join('|'));
  records.push({source,width,height,status:'PASS',initial,maxGeometryError,pixelDifference:diff,search:true,region:true,capacity:true,invalidTerm:true,termInherited:true,phoneCancellation:true,phoneMethod:width===375?'wechat':'sms',S02:true,O01:true});
 }finally{await ctx.close();}
}
async function multiCityAndRollback(browser,width,height){
 const ctx=await browser.newContext({viewport:{width,height},locale:'zh-CN'}),p=await ctx.newPage(),outer=p.frameLocator('#central-host'),s01=outer.frameLocator('#s01-r2-frame');
 try{
  await p.goto(`${origin}/central-review-02g.html?catalog=mk&page=S01&s01_r2=1`);await s01.locator('html[data-binding]').waitFor();
  for(const city of ['北京','上海','深圳','杭州','广州']){
   await s01.getByRole('button',{name:'切换城市',exact:true}).click();await outer.locator('[data-action="setCity"]').filter({hasText:city}).click();
   await s01.locator('html[data-binding]').waitFor();const data=await measure(s01);assert(!data.overflow);assert(!/演示|模拟|示意|测试|undefined/.test(data.text));
   assert((await s01.locator('#r2-search').getAttribute('placeholder')).startsWith(city));
   assert.equal(data.cards.length,2);
   await p.screenshot({path:path.join(out,`MK-${width}-${city}.png`)});records.push({city,width,status:'PASS',cards:data.cards.length,units:data.cards.flatMap(s=>s.units).length});
  }
  await p.goto(`${origin}/central-review-02g.html?catalog=mk&page=S01&s01_r2=0`);await outer.locator('.filter-bar').waitFor();assert.equal(await outer.locator('#s01-r2-frame').count(),0);records.push({width,rollback:'RC1_EXPLICIT_ZERO',status:'PASS'});
 }finally{await ctx.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const [w,h] of [[375,812],[390,844]]){await run(browser,w,h,'mk');await run(browser,w,h,'sim');await multiCityAndRollback(browser,w,h);}
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({status:'PASS',records,visualHumanSignoff:false},null,2));console.log('VIS03C_PASS',records.length);
 }catch(e){fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({status:'FAIL',records,error:e.stack},null,2));console.error(e);process.exitCode=1;}finally{await browser.close();}
})();
