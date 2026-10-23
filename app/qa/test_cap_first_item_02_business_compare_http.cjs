/* Compare mother and controlled candidate on the same confirmed demand over actual HTTP. */
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('C:/Users/silence/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'c2/outputs/cap_first_item_02');
const estimator='space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html';
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
async function main(){
  const server=http.createServer((request,response)=>{
    const url=new URL(request.url,'http://127.0.0.1'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end('Not found');return}
    response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const rows=[];
  try{
    for(const [width,height] of [[375,812],[390,844]])for(const target of [3.5,5.1,50.1]){
      const observations={};
      for(const branch of ['m','c2']){
        const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'zh-CN'});
        const page=await context.newPage(),errors=[];
        page.on('pageerror',error=>errors.push(String(error)));
        page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`)});
        await page.goto(`${base}/${branch}/prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html?state=new`);
        await page.evaluate(value=>localStorage.setItem('mini_storage_requirement_current',JSON.stringify({requirement_id:'COMPARE-01',target_volume:value,min_volume:value*.92,max_volume:value*1.08,term_months:6,customer_type:'personal',scene:'',travel_mode:'drive',search_origin_key:'guomao',usage_location:'北京市朝阳区建国门外大街',source:'manual',size_mode:'about',item_snapshot:[],item_constraints:[],fit_status:'VOLUME_ONLY',calculation_model:'DIRECT_CAPACITY_INPUT',cap_first_submission_id:'COMPARE-CAP-01'})),target);
        await page.goto(`${base}/${branch}/prototype/${estimator}?entry=resume_recommend`);
        observations[branch]=await page.evaluate(()=>{
          const d=JSON.parse(localStorage.getItem('mini_storage_requirement_current')||'{}');
          return {screen:document.querySelector('.screen.active')?.id,target:d.target_volume,min:d.min_volume,max:d.max_volume,term:d.term_months,pricing:d.pricing_preview||null,planText:document.querySelector('#r113PlanCards')?.innerText.trim()||'',estoreText:document.querySelector('#r113EstoreCard')?.innerText.trim()||'',waitlistText:document.querySelector('#r113WaitlistCard')?.innerText.trim()||'',action:document.querySelector('#usageActions')?.dataset.actionState||''};
        });
        observations[branch].errors=errors;
        await context.close();
      }
      const m=observations.m,c=observations.c2;
      const samePricing=JSON.stringify(m.pricing)===JSON.stringify(c.pricing);
      const normalizePlan=value=>value.replaceAll('容量匹配当前需求范围，可查看具体仓位确认存放条件。\n','').trim();
      const sameRecommendation=normalizePlan(m.planText)===normalizePlan(c.planText)&&m.estoreText===c.estoreText&&m.waitlistText===c.waitlistText&&m.action===c.action;
      const ok=m.screen==='s5'&&c.screen==='s5'&&m.target===target&&c.target===target&&samePricing&&sameRecommendation&&m.errors.length===0&&c.errors.length===0;
      rows.push({viewport:`${width}x${height}`,target,result:ok?'PASS':'FAIL',samePricing,sameRecommendation,mother:m,candidate:c});
    }
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
  fs.writeFileSync(path.join(out,'business_compare_http_results.json'),JSON.stringify(rows,null,2));
  for(const row of rows)console.log(`${row.result} ${row.viewport} target=${row.target} pricing=${row.samePricing} recommendation=${row.sameRecommendation}`);
  if(rows.some(row=>row.result!=='PASS'))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1});
