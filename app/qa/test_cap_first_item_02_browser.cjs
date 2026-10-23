/* Actual Chrome rendering through local resource interception; HTTP server acceptance is separate. */
const fs=require('fs');
const path=require('path');
const http=require('http');
const {chromium}=require('C:/Users/silence/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'outputs','cap_first_item_02');
fs.mkdirSync(out,{recursive:true});
const actualHttp=process.argv.includes('--http');
let base='http://127.0.0.1:9999/prototype/';
const estimator='space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html';
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const results=[];
async function main(){
  let server;
  if(actualHttp){
    server=http.createServer((request,response)=>{
      const url=new URL(request.url,'http://127.0.0.1');
      const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
        response.writeHead(404);response.end('Not found');return;
      }
      response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
      fs.createReadStream(file).pipe(response);
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    base=`http://127.0.0.1:${server.address().port}/prototype/`;
  }
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'zh-CN'});
      if(!actualHttp)await context.route('http://127.0.0.1:9999/**',async route=>{
        const url=new URL(route.request().url()),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
        if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'Not found'});
        return route.fulfill({status:200,body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
      });
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(String(error)));
      page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`)});
      const check=(name,ok,detail)=>results.push({viewport:`${width}x${height}`,name,result:ok?'PASS':'FAIL',detail});
      const demand=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mini_storage_requirement_current')||'null'));
      const screen=()=>page.locator('.screen.active').getAttribute('id');
      const overflow=()=>page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
      try{
        await page.goto(base+estimator+'?entry=capacity');
        check('capacity empty',await screen()==='s7'&&await page.locator('#knownInput').inputValue()===''&&(await demand())===null,{screen:await screen(),term:await page.evaluate(()=>state.term)});
        await page.screenshot({path:path.join(out,`capacity_empty_${width}.png`)});
        await page.locator('#knownInput').fill('3.5');
        await page.evaluate(()=>{window.__demandWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='mini_storage_requirement_current')window.__demandWrites++;return original.call(this,key,value)}});
        await page.locator('#knownNextBtn').evaluate(button=>{button.click();button.click()});
        const manual=await demand();
        check('manual one click S5 exact capacity no term',await screen()==='s5'&&manual?.target_volume===3.5&&manual?.source==='manual'&&manual?.term_months===0,{manual,screen:await screen()});
        check('double click commits once',await page.evaluate(()=>window.__demandWrites===1),{writes:await page.evaluate(()=>window.__demandWrites)});
        await page.screenshot({path:path.join(out,`s5_manual_no_term_${width}.png`)});
        await page.locator('#termChips [data-term-quick="6"]').click();
        const withTerm=await demand();
        check('S5 term chosen after submission',withTerm?.target_volume===3.5&&withTerm?.term_months===6&&withTerm?.source==='manual',{withTerm});
        await page.locator('#backBtn').click();
        await page.locator('#knownInput').fill('4.5');
        check('draft edit does not overwrite confirmed',Number((await demand())?.target_volume)===3.5,{confirmed:await demand(),draft:await page.locator('#knownInput').inputValue()});
        await page.locator('#capFirstItems').click();
        check('item page hides obsolete four-step header',await page.locator('.estvis05-steps').isHidden(),{screen:await screen()});
        check('authoritative catalog has 40 items',await page.evaluate(()=>Object.keys(items).filter(id=>!id.startsWith('est_custom_')).length===40),{count:await page.evaluate(()=>Object.keys(items).length)});
        check('empty item list cannot submit or overwrite',await page.locator('#toUsageBtn').isDisabled()&&Number((await demand())?.target_volume)===3.5,{screen:await screen(),confirmed:await demand()});
        await page.locator('#capItemNav [data-category="suitcase"]').click();
        await page.locator('#p1List [data-act="plus"]').first().click();
        await page.locator('#capItemNav [data-category="furniture"]').click();
        await page.locator('#p1List [data-act="plus"]').first().click();
        await page.locator('#capCartToggle').click();
        const cart=await page.locator('#capCartRows .cap-cart-row').count();
        check('category change preserves two items',cart===2&&Number((await demand())?.target_volume)===3.5,{cart,confirmed:await demand()});
        await page.screenshot({path:path.join(out,`items_cart_${width}.png`)});
        await page.locator('#toUsageBtn').click();
        const item=await demand();
        check('item one click S5 with range and snapshot',await screen()==='s5'&&item?.source==='item_estimate'&&item?.item_snapshot?.length===2&&item?.min_volume<item?.target_volume&&item?.max_volume>item?.target_volume,{item,screen:await screen()});
        await page.screenshot({path:path.join(out,`s5_item_${width}.png`)});
        await page.goto(base+estimator+'?entry=resume_usage');
        const resumedItem=await demand();
        check('item range survives S5 reload',await screen()==='s5'&&resumedItem?.source==='item_estimate'&&resumedItem?.cap_first_submission_id===item?.cap_first_submission_id&&resumedItem?.min_volume===item?.min_volume&&resumedItem?.max_volume===item?.max_volume,{resumedItem});
        await page.locator('#backBtn').click();
        check('reloaded S5 returns to item editor',await screen()==='s4'&&await page.locator('#capCartToggle').count()===1,{screen:await screen()});
        await page.goto(base+'mini_storage_ai_result_ai02_v1_demo_patch.html');
        const beforeAi=await demand();
        await page.locator('#stores').click();
        const afterAi=await demand();
        check('fixed AI demo cannot commit',beforeAi?.cap_first_submission_id===afterAi?.cap_first_submission_id&&page.url().includes('entry=item'),{beforeAi,afterAi,url:page.url()});
        await page.screenshot({path:path.join(out,`ai_demo_fallback_${width}.png`)});
        await page.locator('#p1List [data-act="plus"]').first().click();
        await page.locator('#backBtn').click();
        check('item cancel keeps last confirmed',await screen()==='s7'&&(await demand())?.cap_first_submission_id===afterAi?.cap_first_submission_id,{confirmed:await demand()});
        for(const value of ['4.9','5','5.1','50']){
          await page.goto(base+estimator+'?entry=capacity');
          await page.locator('#knownInput').fill(value);
          await page.locator('#knownNextBtn').click();
          const current=await demand();
          check(`capacity ${value} uses S5`,await screen()==='s5'&&current?.target_volume===Number(value),{screen:await screen(),source:current?.source});
        }
        await page.goto(base+estimator+'?entry=resume_usage');
        await page.locator('#backBtn').click();
        check('S5 reload returns to submitted source',await screen()==='s7'&&(await demand())?.target_volume===50,{screen:await screen(),confirmed:await demand()});
        await page.goto(base+estimator+'?entry=resume_usage');
        await page.locator('#capacityPlus').click();
        const adjusted=await demand();
        check('explicit S5 capacity edit updates manual source',adjusted?.target_volume===50.5&&adjusted?.source==='manual'&&Array.isArray(adjusted?.item_snapshot)&&adjusted.item_snapshot.length===0,{adjusted});
        await page.goto(base+'mini_storage_home_H01_Visual_V2_7_4_SSOT.html?state=new');
        await page.evaluate(()=>localStorage.clear());
        await page.reload();
        await page.waitForTimeout(250); // Location demo sheet may mount just after DOMContentLoaded.
        if(await page.locator('.mk-location-mask').isVisible())await page.locator('.mk-location-mask [data-permission="denied"]').click();
        await page.locator('#estimateBtn').click();
        await page.waitForURL(url=>url.pathname.endsWith(estimator)&&url.searchParams.get('entry')==='capacity');
        check('H01 estimate opens capacity',page.url().includes(estimator)&&await screen()==='s7'&&await page.locator('#knownInput').inputValue()==='',{url:page.url(),screen:await screen()});
        await page.goto(base+'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html?state=browse&entry=browse_nearby');
        await page.locator('#estimateStrip').click();
        await page.waitForURL(url=>url.pathname.endsWith(estimator)&&url.searchParams.get('returnTo')==='S01');
        check('S01 estimate opens capacity with return',page.url().includes(estimator)&&await screen()==='s7'&&new URL(page.url()).searchParams.get('returnTo')==='S01',{url:page.url()});
        await page.goto(base+'mini_storage_home_H01_Visual_V2_7_4_SSOT.html?state=new');
        await page.evaluate(()=>localStorage.clear());
        await page.goto(base+'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html?state=browse&store=jianguo');
        await page.locator('#browseEstimator').click();
        await page.waitForURL(url=>url.pathname.endsWith(estimator)&&url.searchParams.get('returnTo')==='S02');
        check('S02 estimate opens capacity with store return',page.url().includes(estimator)&&await screen()==='s7'&&new URL(page.url()).searchParams.get('returnStore')==='jianguo'&&await page.locator('#knownInput').inputValue()==='',{url:page.url(),screen:await screen(),input:await page.locator('#knownInput').inputValue()});
        await page.goto(base+'mini_storage_home_H01_Visual_V2_7_4_SSOT.html?state=new');
        await page.evaluate(()=>localStorage.clear());
        await page.goto(base+estimator+'?entry=capacity');
        await page.locator('#capFirstItems').click();
        await page.locator('#capItemNav [data-category="furniture"]').click();
        await page.locator('#p1List [data-act="plus"]').first().click();
        await page.locator('#toUsageBtn').click();
        const noTermItem=await demand();
        check('item route reaches S5 without fabricated term',await screen()==='s5'&&noTermItem?.source==='item_estimate'&&noTermItem?.term_months===0,{noTermItem});
        await page.locator('#termChips [data-term-quick="3"]').click();
        check('item term can be chosen on S5',(await demand())?.term_months===3&&(await demand())?.source==='item_estimate',{confirmed:await demand()});
        check('no browser exceptions or missing assets',errors.length===0,{errors,overflow:await overflow()});
      }catch(error){
        check('scenario execution',false,{error:String(error),url:page.url(),screen:await screen().catch(()=>null),errors});
      }
      await context.close();
    }
  }finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve))}
  fs.writeFileSync(path.join(out,actualHttp?'results_http.json':'results.json'),JSON.stringify(results,null,2));
  for(const row of results)console.log(`${row.result} ${row.viewport} ${row.name}`);
  if(results.some(row=>row.result!=='PASS'))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1});
