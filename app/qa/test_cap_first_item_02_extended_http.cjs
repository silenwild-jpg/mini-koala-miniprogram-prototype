/* Cross-page Chrome checks over actual localhost HTTP. AI remains demo-only. */
const fs=require('fs');
const path=require('path');
const http=require('http');
const {chromium}=require('C:/Users/silence/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs','cap_first_item_02');
const estimator='space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html';
const home='mini_storage_home_H01_Visual_V2_7_4_SSOT.html';
const s01='mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html';
const s02='mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html';
const u01='mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html';
const o01='mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html';
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const rows=[];
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const server=http.createServer((request,response)=>{
    const url=new URL(request.url,'http://127.0.0.1');
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      response.writeHead(404);response.end('Not found');return;
    }
    response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/prototype/`;
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      async function scenario(name,run){
        const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'zh-CN'});
        const page=await context.newPage(),errors=[];
        page.on('pageerror',error=>errors.push(String(error)));
        page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`)});
        const check=(label,ok,detail={})=>rows.push({viewport:`${width}x${height}`,scenario:name,check:label,result:ok?'PASS':'FAIL',detail});
        const demand=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_requirement_current')||'null'));
        const screen=()=>page.locator('.screen.active').getAttribute('id');
        try{await run({page,check,demand,screen,base});
          check('no browser errors',errors.length===0,{errors});
        }catch(error){check('scenario completes',false,{error:String(error),url:page.url(),errors})}
        await context.close();
      }
      await scenario('S01 browse return',async({page,check,demand,screen,base})=>{
        await page.goto(base+s01+'?state=browse&entry=browse_nearby&sort=price&distance=5&loaded=16&services=24h&searchOriginKey=wangjing');
        const start=await page.evaluate(()=>({state,sortMode,browseDistanceKm,visibleStoreCount,service:document.querySelector('#filterSheet [data-value="24h"]').classList.contains('active')}));
        check('browse filters loaded',start.state==='browse'&&start.sortMode==='price'&&start.browseDistanceKm==='5'&&start.visibleStoreCount>=16&&start.service,{start});
        await page.locator('#estimateStrip').click();
        await page.waitForURL(url=>url.pathname.endsWith(estimator));
        check('no-demand estimate empty',await screen()==='s7'&&await page.locator('#knownInput').inputValue()===''&&(await demand())===null,{url:page.url()});
        await page.locator('#backBtn').click();
        await page.waitForURL(url=>url.pathname.endsWith(s01));
        const returned=await page.evaluate(()=>({state,sortMode,browseDistanceKm,visibleStoreCount,service:document.querySelector('#filterSheet [data-value="24h"]').classList.contains('active')}));
        check('return restores S01',returned.state==='browse'&&returned.sortMode==='price'&&returned.browseDistanceKm==='5'&&returned.visibleStoreCount>=16&&returned.service&&(await demand())===null,{returned,url:page.url()});
      });
      await scenario('S02 browse and direct order',async({page,check,demand,screen,base})=>{
        await page.goto(base+s02+'?state=browse&store=jianguo&travel=walk&searchOriginKey=wangjing&searchMin=8&searchKm=3.2');
        await page.locator('#browseEstimator').click();
        await page.waitForURL(url=>url.pathname.endsWith(estimator));
        check('S02 no-demand estimate empty',await screen()==='s7'&&await page.locator('#knownInput').inputValue()===''&&(await demand())===null,{url:page.url()});
        await page.locator('#backBtn').click();
        await page.waitForURL(url=>url.pathname.endsWith(s02));
        const route=new URL(page.url()).searchParams;
        check('S02 browse return context',route.get('state')==='browse'&&route.get('store')==='jianguo'&&route.get('travel')==='walk'&&(await demand())===null,{url:page.url()});
        await page.locator('#unitList .unit-card[data-soldout="0"][data-under-min="0"] .unit-cta').first().click();
        await page.waitForURL(url=>url.pathname.endsWith(u01));
        check('browse reaches U01 directly',page.url().includes(u01),{url:page.url()});
        await page.locator('[data-quick="6"]').first().click();
        await page.locator('#confirm').click();
        await page.waitForURL(url=>url.pathname.endsWith(o01));
        check('U01 reaches O01 without estimator',new URL(page.url()).searchParams.get('term')==='6',{url:page.url()});
      });
      await scenario('U01 independent estimate and return',async({page,check,demand,screen,base})=>{
        await page.goto(base+s02+'?state=browse&store=jianguo&travel=walk&searchOriginKey=wangjing');
        await page.locator('#unitList .unit-card[data-soldout="0"][data-under-min="0"] .unit-cta').first().click();
        await page.waitForURL(url=>url.pathname.endsWith(u01));
        const original=new URL(page.url()).search;
        await page.locator('#estimateCapacity').click();
        await page.waitForURL(url=>url.pathname.endsWith(estimator));
        check('U01 no-demand estimator starts empty',await screen()==='s7'&&await page.locator('#knownInput').inputValue()===''&&(await demand())===null,{url:page.url()});
        await page.locator('#backBtn').click();
        await page.waitForURL(url=>url.pathname.endsWith(u01));
        check('U01 cancel preserves unit context and no demand',new URL(page.url()).search===original&&(await demand())===null,{url:page.url(),original});
        await page.locator('#estimateCapacity').click();
        await page.waitForURL(url=>url.pathname.endsWith(estimator));
        await page.locator('#knownInput').fill('4.5');
        await page.locator('#knownNextBtn').click();
        const saved=await demand(),unitParams=new URLSearchParams(original);
        check('U01 estimate commits only on submit and reaches S5',await screen()==='s5'&&saved?.target_volume===4.5,{url:page.url()});
        check('U01 submission retains originating unit',saved?.entry_context?.originPage==='U01'&&saved.entry_context.storeId===unitParams.get('store')&&saved.entry_context.unitId===unitParams.get('unit'),{entry:saved?.entry_context});
      });
      await scenario('confirmed demand nearby matching',async({page,check,demand,screen,base})=>{
        await page.goto(base+estimator+'?entry=capacity');
        await page.locator('#knownInput').fill('3.5');
        await page.locator('#knownNextBtn').click();
        await page.locator('#termChips [data-term-quick="6"]').click();
        const saved=await demand();
        await page.goto(base+home+'?state=estimated');
        await page.locator('#navStores').click();
        await page.waitForURL(url=>url.pathname.endsWith(s01));
        check('H01 nearby becomes matched with confirmed demand',new URL(page.url()).searchParams.get('state')==='estimated'&&new URL(page.url()).searchParams.get('target')==='3.5'&&(await demand())?.cap_first_submission_id===saved.cap_first_submission_id,{url:page.url()});
        await page.goto(base+home+'?state=estimated');
        await page.locator('.unified-store').first().click();
        await page.waitForURL(url=>url.pathname.endsWith(s02));
        check('H01 store card becomes matched with confirmed demand',new URL(page.url()).searchParams.get('state')==='matched'&&new URL(page.url()).searchParams.get('target')==='3.5'&&(await demand())?.target_volume===3.5,{url:page.url()});
        await page.goto(base+estimator+'?entry=capacity');
        check('capacity prefill uses latest confirmed',await screen()==='s7'&&await page.locator('#knownInput').inputValue()==='3.5'&&(await page.evaluate(()=>state.term))===6,{url:page.url()});
        await page.goto(base+s02+'?state=matched&store=jianguo&target=3.5&term=6');
        await page.locator('#unitList .unit-card[data-soldout="0"][data-under-min="0"] .unit-cta').first().click();
        await page.waitForURL(url=>url.pathname.endsWith(u01));
        const unitUrl=page.url();
        await page.locator('#estimateCapacity').click();
        await page.waitForURL(url=>url.pathname.endsWith(estimator));
        check('U01 with confirmed demand prefills size and term',await screen()==='s7'&&await page.locator('#knownInput').inputValue()==='3.5'&&(await page.evaluate(()=>state.term))===6,{url:page.url()});
        await page.locator('#backBtn').click();
        await page.waitForURL(url=>url.pathname.endsWith(u01));
        check('U01 confirmed edit cancel preserves unit and demand',page.url()===unitUrl&&(await demand())?.cap_first_submission_id===saved.cap_first_submission_id,{url:page.url()});
      });
      await scenario('item draft and variant resume',async({page,check,demand,screen,base})=>{
        await page.goto(base+estimator+'?entry=capacity');
        await page.locator('#knownInput').fill('4.5');
        await page.locator('#knownNextBtn').click();
        await page.locator('#termChips [data-term-quick="6"]').click();
        const saved=await demand();
        await page.locator('#backBtn').click();
        await page.locator('#capFirstItems').click();
        await page.locator('#capItemNav [data-category="furniture"]').click();
        const variant=page.locator('#p1List .variant button').last();
        const itemId=await variant.getAttribute('data-id'),variantId=await variant.getAttribute('data-vid');
        await variant.click();
        await page.locator(`#p1List [data-act="plus"][data-id="${itemId}"]`).click();
        const selected=await page.evaluate(id=>({qty:state.quantities[id],variant:state.variants[id]}),itemId);
        await page.locator('#backBtn').click();
        check('item cancel preserves confirmed',await screen()==='s7'&&(await demand())?.cap_first_submission_id===saved.cap_first_submission_id,{selected});
        await page.locator('#capFirstItems').click();
        const samePage=await page.evaluate(id=>({qty:state.quantities[id],variant:state.variants[id]}),itemId);
        check('item draft resumes on same page',samePage.qty===1&&samePage.variant===variantId,{samePage});
        await page.goto(base+home+'?state=estimated');
        await page.goto(base+estimator+'?entry=item');
        const reloaded=await page.evaluate(id=>({qty:state.quantities[id],variant:state.variants[id]}),itemId);
        check('item draft resumes after navigation',await screen()==='s4'&&reloaded.qty===1&&reloaded.variant===variantId&&(await demand())?.target_volume===4.5,{reloaded});
      });
      await scenario('reference image and over 50',async({page,check,demand,screen,base})=>{
        await page.goto(base+estimator+'?entry=capacity');
        await page.locator('#knownInput').fill('3.5');
        const image=page.locator('#cap09bPreview .cap09b-scene');
        check('3.5 uses small reference image',await image.isVisible()&&(await image.getAttribute('src')).endsWith('/small.jpg')&&await page.locator('#knownInput').inputValue()==='3.5',{src:await image.getAttribute('src')});
        await page.locator('#knownNextBtn').click();
        check('S5 retains 3.5',await screen()==='s5'&&(await demand())?.target_volume===3.5,{saved:await demand()});
        await page.goto(base+estimator+'?entry=capacity');
        await page.locator('#knownInput').fill('50.1');
        check('50.1 has no representative image',await image.isHidden()&&await page.locator('#cap09bPreview .cap09b-note').isVisible(),{});
        await page.locator('#knownNextBtn').click();
        check('50.1 reaches S5',await screen()==='s5'&&(await demand())?.target_volume===50.1,{saved:await demand()});
      });
      await scenario('S5 to order preview',async({page,check,demand,screen,base})=>{
        await page.goto(base+estimator+'?entry=capacity');
        await page.locator('#knownInput').fill('3.5');
        await page.locator('#knownNextBtn').click();
        await page.locator('#termChips [data-term-quick="6"]').click();
        const saved=await demand();
        check('S5 has actual pricing preview',await screen()==='s5'&&saved?.pricing_preview?.term_months===6&&Number(saved?.pricing_preview?.rent_total)>0,{pricing:saved?.pricing_preview});
        await page.locator('#usageChooseBtn').click();
        await page.waitForURL(url=>url.pathname.endsWith(u01)||url.pathname.endsWith(s02));
        if(new URL(page.url()).pathname.endsWith(s02)){
          await page.locator('#unitList .unit-card[data-soldout="0"][data-under-min="0"] .unit-cta').first().click();
          await page.waitForURL(url=>url.pathname.endsWith(u01));
        }
        check('S5 recommendation reaches U01',page.url().includes(u01)&&(await demand())?.target_volume===3.5,{url:page.url()});
        await page.locator('#confirm').click();
        await page.waitForURL(url=>url.pathname.endsWith(o01));
        const orderQuery=new URL(page.url()).searchParams;
        check('O01 retains exact target and term',orderQuery.get('target')==='3.5'&&orderQuery.get('term')==='6'&&Number(orderQuery.get('rentTotal'))>0,{url:page.url()});
        check('O01 renders payment preview',!!(await page.locator('#payableTotal').textContent()).trim()&&(await demand())?.target_volume===3.5,{payable:await page.locator('#payableTotal').textContent()});
      });
    }
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
  fs.writeFileSync(path.join(out,'extended_http_results.json'),JSON.stringify(rows,null,2));
  for(const row of rows)console.log(`${row.result} ${row.viewport} ${row.scenario}: ${row.check}`);
  if(rows.some(row=>row.result!=='PASS'))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1});
