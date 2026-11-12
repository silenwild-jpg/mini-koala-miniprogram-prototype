#!/usr/bin/env node
'use strict';
// RC2-UX-DEMO-COPY-02: user-reachable S5/QUICK/BOOKING menu and recorded-lead UX.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const out=path.resolve(__dirname,'../release-evidence/rc2-ux-copy-03-menu');
const origin='http://127.0.0.1:4778',prefix='/prototype/parallel/core-journey-fix-01/demo/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const srv=http.createServer((req,res)=>{
 let p;try{p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,origin).pathname))}catch{return res.writeHead(400).end()}
 if(!p.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(p,(e,b)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'}).end(b))
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>srv.listen(4778,'127.0.0.1',ok));
 const v=JSON.parse(fs.readFileSync(path.join(root,'rc2-uat-version.json'),'utf8'));
 assert.equal(v.source_sha,process.env.GITHUB_SHA,'SHA mismatch');assert.equal(v.source_pr,153,'source PR not the approved predecessor');
 assert.equal(v.source_branch,process.env.GITHUB_REF_NAME,'branch mismatch');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const rows=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const shot=async label=>page.screenshot({path:path.join(out,String(width)+'-'+label+'.png'),fullPage:true});
   const open=async target=>{
    if(target==='S5'){
      await page.goto(origin+prefix+'index.html?page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!!window.SIM_DEMO);
      await page.evaluate(()=>{const b=window.SIM_DEMO;b.core.setRequirement(3,12,true);b.persist();b.navigate('S5')});
    }else await page.goto(origin+prefix+'index.html?page='+target+'&s01_r2=1',{waitUntil:'domcontentloaded'});
    const child=page.frameLocator('#br04-frame');
    await child.locator('body.bridge-ready').waitFor({timeout:20000});
    return child;
   };
   const checkMenu=async (child,trigger,modal,title,tag,dest)=>{
    const b=child.locator(trigger);await b.waitFor({state:'visible',timeout:12000});
    await shot(tag+'-before');await b.click();
    const sheet=child.locator(modal);await sheet.waitFor({state:'visible',timeout:8000});
    const t=await sheet.innerText();assert(t.includes('更多操作'),tag+' sheet title');
    assert(t.includes('附近门店')&&t.includes('我的订单'),tag+' menu options absent');
    assert(!t.includes('内部演示'),tag+' dead toast exposed in sheet');
    const menu=sheet.locator('[data-bridge="navTo"]');assert.equal(await menu.count(),2,tag+' option count');
    assert(!(await child.locator('#toast').isVisible()),tag+' still shows dead toast');
    if(tag==='03-BOOKING'){
      const rect=await child.locator('#selectionMask .selection-popup').boundingBox();
      assert(rect&&rect.y>=-2&&rect.y+rect.height<=height+2&&rect.width>=300,
        'BOOKING popup must be physically visible; not below scrolled artboard '+JSON.stringify(rect));
    }
    await shot(tag+'-open');
    await sheet.locator('[data-bridge="navTo"][data-value="'+dest+'"]').click();
    await page.waitForURL(new RegExp('page='+dest),{timeout:12000});
    if(dest==='M01')await page.locator('.m01-profile').waitFor({state:'visible'});
    rows.push({width,step:tag,after:dest,result:'PASS',menuItems:2});
   };
   const s5=await open('S5');await checkMenu(s5,'.mini-menu','#modal','更多操作','01-S5','S01');
   const quick=await open('QUICK');await checkMenu(quick,'#menu-button','#modal','更多操作','02-QUICK','M01');
   const reserve=await open('BOOKING');await checkMenu(reserve,'#menu','#selectionMask','更多操作','03-BOOKING','S01');
   const lead=await open('BOOKING');
   await lead.locator('#booking-address').fill('北京市朝阳区青年路甲5号院3号楼');
   assert((await lead.locator('.privacy-help').innerText()).includes('用仓地址、联系电话必填'),'mandatory phone text missing');
   await lead.locator('#reserveForm button[type="submit"]').click();
   await lead.locator('#toast').waitFor({state:'visible',timeout:6000});
   assert((await lead.locator('#toast').innerText()).includes('请填写有效联系电话'),'missing phone should yield clear error');
   assert(!(await lead.locator('#success').isVisible()),'lead must not be accepted without valid contact');
   await shot('04-BOOKING-phone-required');
   await lead.locator('#reserve-contact').fill('13800138000');
   await lead.locator('#reserveForm button[type="submit"]').click();
   await lead.locator('#success').waitFor({state:'visible',timeout:10000});
   assert(!(await lead.locator('#toast').isVisible()),'prior field error must clear on valid submission');
   const saved=await page.evaluate(()=>{const z=window.SIM_DEMO.core.state().leads.at(-1);return {phone:z?.phone,status:z?.status,address:z?.address}});
   assert.deepEqual(saved,{phone:'13800138000',status:'saved_locally',address:'北京市朝阳区青年路甲5号院3号楼'},'local lead payload');
   const confirmation=await lead.locator('#success').innerText();
   assert(confirmation.includes('用仓需求已保存')&&confirmation.includes('资料已保存在本机，尚未发送给顾问。'),'live locally saved lead confirmation must be truthful');
   assert(!/模拟|演示/.test(confirmation),'demo-copy leak in lead result');
   await shot('04-BOOKING-recorded');
   rows.push({width,step:'04-BOOKING-recorded',result:'PASS',requiredPhoneGuard:true,savedLead:saved.status,msg:confirmation.slice(0,95)});
   assert.deepEqual(errors,[],'runtime JS errors');
   await context.close();
  }
  const code=fs.readFileSync(path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo/app.js'),'utf8');
  assert(!code.includes('授权后可查看报价；拒绝后仍可浏览门店与设施。'),'stale public price gate remains');
  assert(code.includes('验证手机号后可下单；门店和月租价格无需验证即可浏览。'),'updated guard copy missing');
  const result={sha:v.source_sha,status:'PASS',checks:rows.length,rows};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log('RC2_UX_DEMO_COPY_02_375_390_PASS',rows.length);
 }finally{await browser.close();await new Promise(ok=>srv.close(ok))}
})().catch(e=>{console.error('RC2_UX_DEMO_COPY_02_FAIL',e.stack||String(e));process.exitCode=1;srv.close()});
