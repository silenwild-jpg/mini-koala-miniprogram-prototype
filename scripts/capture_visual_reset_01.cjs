// Read-only product capture. Test data stays in a disposable browser context.
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process');
const {chromium}=require('playwright');
const SOURCE='0a687932d3daef8b559101e5c5df387ada388fbd';
const root=path.resolve(__dirname,'../app');
const output=path.resolve(__dirname,'../release-evidence/visual-reset-01');
const base='http://127.0.0.1:4899/prototype/parallel/core-journey-fix-01/demo/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(p,(e,b)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'}).end(b));});
const report={source_sha:SOURCE,qa_sha:process.env.GITHUB_SHA||cp.execSync('git rev-parse HEAD').toString().trim(),mode:'WEB_PROTOTYPE_ONLY',screenshots:[],errors:[],limitations:['State previews are seeded through existing demo APIs; they do not by themselves prove user interaction paths.','No native WeChat, backend or production service validation.']};
async function stable(page){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});for(const f of page.frames().slice(1))await f.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));}).catch(()=>{});}
(async()=>{
fs.mkdirSync(output,{recursive:true});await new Promise(r=>server.listen(4899,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const [width,height] of [[375,812],[390,844]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push({width,url:page.url(),message:e.message}));
 async function capture(name,url,setup){
  await page.goto(base+url,{waitUntil:'networkidle'});if(setup){await setup();await page.reload({waitUntil:'networkidle'});}await stable(page);
  const file=width+'-'+name+'.png';await page.screenshot({path:path.join(output,file),animations:'disabled'});
  const observation=await page.evaluate(()=>({title:document.title,text:document.body.innerText.slice(0,18000),horizontalOverflow:document.documentElement.scrollWidth>innerWidth,images:[...document.images].filter(i=>i.getBoundingClientRect().width>0).map(i=>({src:i.getAttribute('src')?.startsWith('data:')?'embedded-data-image':i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,renderWidth:i.clientWidth,renderHeight:i.clientHeight}))}));
  report.screenshots.push({width,height,name,file,url:page.url(),...observation});console.log('CAPTURE',file);
 }
 await capture('01-H01-new','home.html');
 await capture('02-CAP-empty','cap.html');
 await capture('03-ITEMS-empty','items.html');
 await capture('04-S01-browse','index.html?page=S01&s01_r2=1');
 await capture('05-S02-browse','index.html?page=S02&store=SIM_BJ01');
 await capture('06-BOOKING-empty','index.html?page=BOOKING');
 await capture('07-QUICK-empty','index.html?page=QUICK');
 await capture('08-BUSINESS-empty','business.html');
 await capture('09-ADVISOR-empty','index.html?page=BOOKING&mode=advisor');
 await capture('10-M01-new','index.html?page=M01');
 const seed=await page.evaluate(()=>{const b=window.SIM_DEMO,c=b.core;c.setScenario('normal');c.setRequirement(3,12,true);c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});c.select([c.matchingUnits('SIM_BJ01')[0].id]);c.setDate(c.today());b.persist();return {store:c.state().storeId,requirement:c.state().requirement};});
 report.seed=seed;
 await capture('11-S5-matched','index.html?page=S5');
 await capture('12-S01-matched','index.html?page=S01&s01_r2=1');
 await capture('13-S02-matched','index.html?page=S02&store=SIM_BJ01');
 await page.evaluate(()=>{const b=window.SIM_DEMO;b.core.quote();b.persist();});
 await capture('14-O01-quote','index.html?page=O01');
 let orderId=await page.evaluate(()=>{const b=window.SIM_DEMO,o=b.core.submit();b.persist();return o.id;});
 await capture('15-O03-pending','index.html?page=O03&order='+encodeURIComponent(orderId));
 await page.evaluate(id=>{const b=window.SIM_DEMO;b.core.pay(id,'success');b.core.identity(id,'success');b.core.enterStorage(id);b.persist();},orderId);
 for(const [id,name] of [['M01','16-M01-active'],['O03','17-O03-paid'],['OH01','18-OH01-records'],['RN01','19-RN01-renew'],['EX01','20-EX01-exit'],['DP01','21-DP01-deposit'],['IV01','22-IV01-invoice']])await capture(name,'index.html?page='+id+'&order='+encodeURIComponent(orderId));
 for(const [i,view] of ['profile','needs','favorites','messages','coupons','identity','access','transport','referral','support','brand'].entries())await capture(String(23+i)+'-ACCOUNT-'+view,'account.html?view='+view+'&id='+encodeURIComponent(orderId));
 await context.close();
}
}finally{await browser.close();server.close();fs.writeFileSync(path.join(output,'capture-report.json'),JSON.stringify(report,null,2));}
if(report.errors.length)process.exitCode=1;
})().catch(e=>{report.errors.push({message:String(e.stack||e)});fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'capture-report.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;server.close();});
