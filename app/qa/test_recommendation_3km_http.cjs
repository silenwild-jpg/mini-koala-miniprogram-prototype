const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const origin=process.env.MINI_KOALA_PREVIEW_ORIGIN||'http://127.0.0.1:4173';
const chrome=process.env.MINI_KOALA_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const output=path.resolve(__dirname,'../outputs/recommendation_3km_http');
const intercepted=process.env.MINI_KOALA_INTERCEPT==='1';
const sourceRoot=path.resolve(__dirname,'..');
fs.mkdirSync(output,{recursive:true});
const demand={target_volume:4.8,min_volume:4.3,max_volume:5.5,term_months:6,size_mode:'about',search_origin_key:'guomao',travel_mode:'drive',cap_first_submission_id:'QA-3KM'};

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']});
  const results=[];
  try{
    for(const viewport of [{width:375,height:812},{width:390,height:844}]){
      const context=await browser.newContext({viewport,deviceScaleFactor:2});
      if(intercepted){
        await context.route('**/*',async route=>{
          const url=new URL(route.request().url());
          const file=path.resolve(sourceRoot,'.'+decodeURIComponent(url.pathname));
          if(!file.startsWith(sourceRoot+path.sep))return route.abort();
          try{
            const data=fs.readFileSync(file);
            const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
            await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:data});
          }catch{await route.fulfill({status:404,body:'Not found'})}
        });
      }
      await context.addInitScript(value=>localStorage.setItem('mini_storage_requirement_current',JSON.stringify(value)),demand);
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const suffix=`${viewport.width}x${viewport.height}`;
      await page.goto(origin+'/prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>typeof HOME_RECOMMENDATIONS!=='undefined'&&HOME_RECOMMENDATIONS.length>0);
      const home=await page.evaluate(()=>({rows:HOME_RECOMMENDATIONS.slice(0,2).map(x=>({id:x.id,price:x.price,km:x.route?.km})),badges:HOME_RECOMMENDATION_META.slice(0,2).map(x=>x.badge)}));
      assert.equal(home.badges[0],'离您最近');
      if(['区域低价','稍远更省'].includes(home.badges[1]))assert(home.rows[1].price<home.rows[0].price);
      await page.screenshot({path:path.join(output,`H01_${suffix}.png`),fullPage:true});

      await page.goto(origin+'/prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html?state=estimated&target=4.8&term=6&loc=precise&searchOriginKey=guomao',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>typeof filteredOrder==='function'&&document.querySelector('#storeList')?.children.length>0);
      const s01=await page.evaluate(()=>({ids:filteredOrder().slice(0,2),badges:{...window.__s01Highlights},sort:sortMode}));
      assert.equal(s01.sort,'recommended');
      assert(s01.ids.length>0);
      if(['区域低价','稍远更省'].includes(s01.badges[s01.ids[1]]))assert(await page.evaluate(ids=>cardPrice(ids[1])<cardPrice(ids[0]),s01.ids));
      await page.screenshot({path:path.join(output,`S01_${suffix}.png`),fullPage:true});

      await page.goto(origin+'/prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html?entry=resume_usage',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#r113PlanCards')?.querySelectorAll('[data-r113-plan]').length>0);
      const s5=await page.evaluate(()=>({cards:[...document.querySelectorAll('#r113PlanCards [data-r113-plan]')].map(el=>({tag:el.querySelector('.ux-a3-cardtag')?.textContent||'',price:el.querySelector('.ux-a3-price-left b')?.textContent||''})),text:document.querySelector('#r113PlanCards')?.textContent||''}));
      assert(s5.cards.length>0&&s5.cards.length<=2);
      assert.match(s5.text,/6个月 · 整期总租金/);
      await page.screenshot({path:path.join(output,`S5_${suffix}.png`),fullPage:true});
      assert.deepEqual(errors,[],`page errors at ${suffix}`);
      results.push({viewport:suffix,home,s01,s5,errors});
      await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
    console.log(`PASS ${intercepted?'resource-intercepted':'HTTP'} Chrome H01/S01/S5 375x812 and 390x844; evidence:`,output);
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
