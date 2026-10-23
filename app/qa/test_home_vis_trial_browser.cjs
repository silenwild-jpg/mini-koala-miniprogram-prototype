const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/silence/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'outputs/home_vis_trial_browser');
const origin='http://127.0.0.1:4173';
const intercept=process.env.MINI_KOALA_INTERCEPT==='1';
const requirement={target_volume:4.8,min_volume:4.3,max_volume:5.5,term_months:6,source:'manual',cap_first_submission_id:'HOME-VIS-QA'};
const cases=[['organize','个人存储'],['suitcase','行李寄存'],['furniture','家庭收纳'],['business','企业存储'],['all','更多服务']];
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
  const report=[];
  try{
    for(const viewport of [{width:375,height:812},{width:390,height:844}]){
      const context=await browser.newContext({viewport,deviceScaleFactor:2});
      if(intercept)await context.route('**/*',async route=>{
        const u=new URL(route.request().url());
        const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
        if(!file.startsWith(root+path.sep))return route.abort();
        try{
          const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'};
          await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
        }catch{await route.fulfill({status:404,body:'Not found'})}
      });
      const page=await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      const home=origin+'/prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html?state=estimated&loc=precise';
      await page.goto(home,{waitUntil:'domcontentloaded'});
      await page.evaluate(value=>localStorage.setItem('mini_storage_requirement_current',JSON.stringify(value)),requirement);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForSelector('#mkHomeVisQuick button');
      const inspect=await page.evaluate(()=>{
        const banner=document.querySelector('.mk-home-vis-banner');
        const rect=banner.getBoundingClientRect();
        const quick=document.querySelector('#mkHomeVisQuick');
        const search=document.querySelector('#mkHomeSearchAWrap');
        const searchRect=search.getBoundingClientRect();
        const quickButtons=[...quick.querySelectorAll('button')];
        const quickTops=quickButtons.map(button=>button.getBoundingClientRect().top);
        return {bannerLoaded:banner.complete&&banner.naturalWidth===1774,bannerRatio:rect.width/rect.height,
          quickCount:quick.querySelectorAll('button').length,searchCount:document.querySelectorAll('#mkHomeSearchAWrap').length,
          searchOverlapsBanner:searchRect.top<rect.bottom&&searchRect.bottom>rect.bottom,
          quickSingleRow:Math.max(...quickTops)-Math.min(...quickTops)<1,
          cityAction:!!document.querySelector('#mkHomeSearchCity'),searchAction:!!document.querySelector('#mkHomeSearchA'),
          order:!!(search.compareDocumentPosition(quick)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(quick.compareDocumentPosition(document.querySelector('.dual-task-grid'))&Node.DOCUMENT_POSITION_FOLLOWING),
          overflow:document.documentElement.scrollWidth>window.innerWidth+1};
      });
      assert(inspect.bannerLoaded&&Math.abs(inspect.bannerRatio-2)<.02);
      assert.equal(inspect.quickCount,5);assert.equal(inspect.searchCount,1);assert(inspect.order);assert.equal(inspect.overflow,false);
      assert(inspect.searchOverlapsBanner&&inspect.quickSingleRow&&inspect.cityAction&&inspect.searchAction);
      const size=`${viewport.width}x${viewport.height}`;
      await page.screenshot({path:path.join(out,`H01_${size}.png`),fullPage:true});
      await page.locator('#newHero .mk-home-vis-contact').click();
      assert(await page.locator('#homeHelpSheet').evaluate(el=>el.classList.contains('show')));
      await page.locator('#homeHelpClose').click();
      await page.locator('#mkHomeSearchA').click();
      await page.waitForURL(/mini_storage_store_list_s01/);
      assert.equal(new URL(page.url()).searchParams.get('state'),'estimated','search preserves confirmed demand matching');
      await page.goto(home,{waitUntil:'domcontentloaded'});
      await page.locator('#mkHomeSearchCity').click();
      await page.waitForURL(/mini_storage_store_list_s01/);
      const cityRoute=new URL(page.url());
      assert.equal(cityRoute.searchParams.get('source'),'home_location');
      assert.equal(cityRoute.searchParams.get('openLocation'),'1');
      for(const [category,label] of cases){
        await page.goto(home,{waitUntil:'domcontentloaded'});
        await page.locator(`#mkHomeVisQuick [data-focus-category="${category}"]`).click();
        await page.waitForURL(/space_decision_assistant/);
        await page.waitForSelector(`#capItemNav [data-category="${category}"].active`);
        const state=await page.evaluate(()=>({confirmed:JSON.parse(localStorage.getItem('mini_storage_requirement_current')||'{}'),selected:[...document.querySelectorAll('#capCartRows [data-cart-id]')].length}));
        assert.equal(state.confirmed.cap_first_submission_id,'HOME-VIS-QA');
        assert.equal(state.selected,0,'quick entry must not preselect an item');
        report.push({viewport:size,quick:label,category,confirmedPreserved:true});
        if(category==='business')await page.screenshot({path:path.join(out,`ITEM_BUSINESS_${size}.png`),fullPage:true});
      }
      await page.goto(home,{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>localStorage.removeItem('mini_storage_requirement_current'));
      await page.goto(origin+'/prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html?state=new&loc=precise',{waitUntil:'domcontentloaded'});
      await page.waitForSelector('#mkHomeVisQuick button');
      await page.screenshot({path:path.join(out,`H01_NEW_${size}.png`),fullPage:true});
      assert.deepEqual(errors,[],`page errors at ${size}`);
      report.push({viewport:size,inspect,errors});
      await context.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({mode:intercept?'resource-intercepted':'HTTP',report},null,2));
    console.log(`PASS ${intercept?'resource-intercepted':'HTTP'} HOME VIS dual-size banner-overlap search, one-row scenes, split city/search routes, five entry routes, preserved requirement, no preselection`);
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
