#!/usr/bin/env node
'use strict';
// RC2-GATE-05 collects evidence. Successful audit does NOT imply release GO.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), http=require('node:http'), assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/rc2-final-gate-05');
const base='http://127.0.0.1:4715';
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const tiers=[['mini','迷你仓','0.5–1.5m³','0.8 / 1.5m³'],['small','小型仓','1.6–5m³','3.5 / 5m³'],['medium','中型仓','6–15m³','8 / 12m³'],['large','大型仓','16–50m³','16 / 35m³']];
const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
const images=tiers.map(([tier,name,range,examples])=>{
 const thumb='assets/unit-r3/thumb/unit-r3-'+tier+'-336x312.webp';
 const cap='assets/unit-r3/cap/unit-r3-'+tier+'-640x480.webp';
 const a=fs.readFileSync(path.join(root,thumb)),b=fs.readFileSync(path.join(root,cap));
 return {tier,name,range,examples,thumb,cap,thumbBytes:a.length,capBytes:b.length,thumbSha256:sha256(a),capSha256:sha256(b)};
});
assert.equal(new Set(images.map(x=>x.thumbSha256)).size,4,'four class assets should differ');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const bridge=fs.readFileSync(path.join(root,'br04/bridge.js'),'utf8');
const s5=fs.readFileSync(path.join(root,'br04/s5/index.html'),'utf8');
const source={
 fourTierMapping:app.includes("tier=n<=1.5?'mini':n<=5?'small':n<=15?'medium':'large'"),
 s5EnforcesUpstreamInputs:app.includes("if(next==='S5'&&!core.requirementReady())"),
 s5RetainsIncompleteState:bridge.includes("'incomplete'")||bridge.includes('"incomplete"'),
 s5OldTermSelector:/term-selector|term-months|s5-term-edit|s5-term-select/.test(s5)
};
assert(source.fourTierMapping,'unrecognized S02 image routing');
const css="*{box-sizing:border-box}body{margin:0;padding:14px;background:#f5f8f6;color:#1b4635;font-family:Arial,'Noto Sans CJK SC',sans-serif}h1{font-size:20px;margin:0 0 6px}p.note{font-size:12px;line-height:1.6;color:#718577;margin:0 0 16px}.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:920px;margin:auto}.card{background:#fff;border-radius:9px;padding:12px;min-width:0}.row{display:flex;gap:10px;align-items:center;border-bottom:1px solid #e4ebe6;padding-bottom:10px}.row img{width:88px;height:88px;object-fit:cover;flex:none}.labels{display:flex;flex-direction:column;gap:5px}.labels strong{font-size:17px}.labels span{font-size:12px;color:#718577}figure{margin:10px 0 0;text-align:center}figure img{width:100%;height:auto;max-width:336px;aspect-ratio:336/312;object-fit:contain}figcaption{font-size:12px;color:#708778;margin-top:6px}@media(max-width:480px){body{padding:12px}.cards{grid-template-columns:1fr}}";
function html(){
 const cards=images.map(x=>'<article class="card"><div class="row"><img src="/'+x.thumb+'" alt="'+x.name+'88像素图"><div class="labels"><strong>'+x.name+'</strong><span>'+x.range+'</span><span>示例 '+x.examples+'</span><span>S02 列表 88px</span></div></div><figure><img src="/'+x.thumb+'" alt="'+x.name+'原始缩略图"><figcaption>独立缩略图 336×312px</figcaption></figure></article>').join('');
 return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><h1>S02 四档容量图片质量检查</h1><p class="note">内部证据专用：同档共用图不代表不同体积仓位的精确实拍尺寸；本页不属于小程序正式UI。</p><div class="cards">'+cards+'</div></body></html>';
}
const server=http.createServer((req,res)=>{
 const pn=new URL(req.url,base).pathname;
 if(pn==='/__gate05_units'){res.writeHead(200,{'Content-Type':mime['.html']});res.end(html());return;}
 let fp;try{fp=path.resolve(root,'.'+decodeURIComponent(pn));}catch{res.writeHead(400).end();return;}
 if(!fp.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(fp,(e,data)=>e?res.writeHead(404).end('missing'):res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream'}).end(data));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(ok=>server.listen(4715,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROME_PATH?{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}:{})});
 const evidence=[];
 try{
  for(const [width,height] of [[375,812],[390,844],[980,900]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base+'/__gate05_units',{waitUntil:'networkidle'});
    const size=await page.locator('.card').evaluateAll(cards=>cards.map(c=>[...c.querySelectorAll('img')].map(i=>({width:i.naturalWidth,height:i.naturalHeight}))));
    assert.equal(size.length,4);assert(size.every(row=>row.length===2&&row.every(x=>x.width===336&&x.height===312)),'asset natural size wrong');
    const shot='S02-FOUR-TIER-'+width+'.png';await page.screenshot({path:path.join(out,shot),fullPage:true});
    evidence.push({width,shot,type:'S02-four-source-tiers',size});
    if(width<500){
      await page.goto(base+'/index.html?page=S5',{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(350);
      const current=new URL(page.url()),framed=await page.locator('#br04-frame').count();
      const body=framed?await page.frameLocator('#br04-frame').locator('body').innerText().catch(()=>''):'';
      const s5Shot='S5-MISSING-REQUIREMENT-DEEP-LINK-'+width+'.png';
      await page.screenshot({path:path.join(out,s5Shot),fullPage:true});
      evidence.push({width,shot:s5Shot,type:'S5-fresh-deep-link',url:current.pathname+current.search,redirectedToCapacity:/\/(cap|items)\.html$/.test(current.pathname),hasS5Iframe:!!framed,bodyPreview:body.slice(0,320)});
    }
    assert.deepEqual(errors,[],'page JS errors '+width);
   }finally{await context.close();}
  }
  const direct=evidence.filter(x=>x.type==='S5-fresh-deep-link');
  const blockers=[];
  if(!direct.every(x=>x.redirectedToCapacity))blockers.push('S5_DEEP_LINK_NOT_ROUTED_TO_CAPACITY_FOR_MISSING_REQUIRED_INPUTS');
  if(source.s5RetainsIncompleteState)blockers.push('S5_RETIRED_INCOMPLETE_BRANCH_REMAINS');
  if(!source.s5EnforcesUpstreamInputs)blockers.push('CENTRAL_GO_S5_NOT_GATED_ON_CONFIRMED_REQUIREMENT');
  if(source.s5OldTermSelector)blockers.push('S5_OLD_TERM_EDITOR_MUST_BE_RECONCILED');
  const result={audit:'PASS',releaseDecision:blockers.length?'HOLD':'FURTHER_REVIEW',sha:process.env.GITHUB_SHA||'',source,images,evidence,blockers};
  fs.writeFileSync(path.join(out,'gate.json'),JSON.stringify(result,null,2));
  console.log('RC2-FINAL-GATE-05 EVIDENCE PASS; release='+result.releaseDecision+'; screenshots='+evidence.length);
  blockers.forEach(x=>console.log('NO_GO '+x));
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
