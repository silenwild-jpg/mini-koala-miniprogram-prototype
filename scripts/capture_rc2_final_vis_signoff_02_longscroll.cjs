#!/usr/bin/env node
'use strict';
// Sequential visual evidence, including actual inner scroll containers; never infer full-page coverage from a viewport screenshot.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo'),out=path.resolve(__dirname,'../release-evidence/rc2-final-vis-signoff-02-longscroll');
const base='http://127.0.0.1:4704',mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}catch{res.writeHead(400).end();return;}if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,bytes)=>err?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes));});
async function reposition(target,fraction){
 return target.evaluate((html,p)=>{
  const root=document.scrollingElement||document.documentElement;
  const options=[root,...document.querySelectorAll('*')].filter(el=>{
    const style=getComputedStyle(el);
    return el.scrollHeight-el.clientHeight>75&&(el===root||/auto|scroll/.test(style.overflowY));
  });
  options.sort((a,b)=>(b.scrollHeight-b.clientHeight)-(a.scrollHeight-a.clientHeight));
  const el=options[0]||root,extent=Math.max(0,el.scrollHeight-el.clientHeight);
  el.scrollTop=Math.round(extent*p);
  if(el===root)window.scrollTo(0,Math.round(extent*p));
  return {tag:el.tagName,id:el.id||'',className:typeof el.className==='string'?el.className.slice(0,80):'',extent,requested:p};
 },fraction);
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(4704,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROME_PATH?{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}:{})});
 const cases=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const capture=async(name,frameSelector)=>{
    const doc=frameSelector?page.frameLocator(frameSelector).locator('html'):page.locator('html');
    for(const [fraction,label] of [[0,'top'],[0.5,'middle'],[1,'bottom']]){
     const layout=await reposition(doc,fraction);await page.waitForTimeout(150);
     const nameFull=name+'-'+label+'-'+width+'.png';
     await page.screenshot({path:path.join(out,nameFull)});
     cases.push({page:name,width,position:label,...layout,file:nameFull});
    }
   };
   try{
    await page.goto(base+'/home.html',{waitUntil:'domcontentloaded'});
    await page.locator('#h01FlowPrimary').waitFor({state:'attached'});
    await capture('01-H01',null);
    await page.goto(base+'/index.html?page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
    await page.frameLocator('#s01-r2-frame').getByText('排序',{exact:true}).first().waitFor();
    await capture('02-S01','#s01-r2-frame');
    const selected=await page.evaluate(()=>window.SIM_DEMO.core.fixture.stores.find(s=>s.city==='北京'&&s.status==='open')?.id);
    assert(selected,'no Beijing demo store');
    await page.goto(base+'/index.html?page=S02&store='+encodeURIComponent(selected),{waitUntil:'domcontentloaded'});
    await page.locator('.unit-row').first().waitFor();
    await capture('03-S02',null);
    await page.evaluate(()=>{const d=window.SIM_DEMO,c=d.core;c.setRequirement(3,12,true);d.persist();d.navigate('S5');});
    await page.frameLocator('#br04-frame').locator('#artboard').waitFor();
    await capture('04-S5','#br04-frame');
    await page.evaluate(()=>window.SIM_DEMO.navigate('M01'));
    await page.locator('.m01-profile').waitFor();
    await capture('05-M01',null);
    assert.deepEqual(errors,[],'JavaScript errors during long-scroll review');
   }finally{await ctx.close();}
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sha:process.env.GITHUB_SHA||'',captured:cases.length,cases},null,2));
  console.log('RC2 FINAL VISUAL LONG SCROLL CAPTURED '+cases.length+' screenshots');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
