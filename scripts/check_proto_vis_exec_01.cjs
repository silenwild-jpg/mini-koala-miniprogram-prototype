#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'docs/PROTO_VIS_EXEC_01_CONTRACT.json'),'utf8'));
const active=contract.pages.S02.active_file;
const strict=process.argv.includes('--strict');
const event=(()=>{try{return JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'))}catch{return {}}})();
function git(args){return cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim()}
function changePaths(){
 if(process.env.VIS_GUARD_CHANGED_FILES)return process.env.VIS_GUARD_CHANGED_FILES.split(/\r?\n/).filter(Boolean);
 const base=process.env.VIS_GUARD_BASE_SHA||event.pull_request?.base?.sha;
 // On pull_request Actions checks out a synthetic merge commit. Compare the actual PR
 // head against its base so independent changes already on main are not misattributed.
 const head=process.env.VIS_GUARD_HEAD_SHA||event.pull_request?.head?.sha||'HEAD';
 if(base){try{return git(['diff','--name-only',base+'...'+head]).split(/\r?\n/).filter(Boolean)}catch{}}
 try{return git(['diff','--name-only','HEAD~1','HEAD']).split(/\r?\n/).filter(Boolean)}catch{return []}
}
function isVisualFile(file){
 return /(^|\/)(app|prototype|assets|styles|pages)(\/|$)/.test(file) &&
        /\.(html|jsx?|tsx?|vue|css|scss|svg|png|jpe?g|webp)$/.test(file);
}
function assessS02(source){
 const issues=[];
 const begin=source.indexOf('function renderS02(){');
 const end=source.indexOf('function amountLines(',begin);
 if(begin<0||end<begin){issues.push('S02活动渲染器未找到；可能意外切换到历史独立页面');return issues}
 const renderer=source.slice(begin,end);
 const required=['可选仓位','服务设施','交通路线','s02MainTabs','s02Demand()','s02HotRibbon(s)','s02AccessHours(s)','data-action="detailTab"'];
 for(const token of required)if(!renderer.includes(token))issues.push('S02缺少已批准结构：'+token);
 if(renderer.includes('s02-lower-tabs'))issues.push('S02仍使用页面底部的旧版服务/交通双选项卡');
 if(!renderer.includes("visual.tab==='交通路线'?s02Route(s):visual.tab==='服务设施'?s02Services(s):"))issues.push('S02未按三选项卡互斥切换内容');
 const bannerStart=source.indexOf('function s02HotRibbon(s){');
 const bannerEnd=source.indexOf('function s02Route(s){',bannerStart);
 if(bannerStart<0||bannerEnd<=bannerStart){issues.push('热门仓型横幅渲染器缺失')}
 else {
   const banner=source.slice(bannerStart,bannerEnd);
   if(/<button|data-action="s02ToUnits"|查看仓位/.test(banner))issues.push('热门仓型横幅擅自新增CTA');
   if(/const urgent=low.length>0/.test(banner) && /<strong>热门仓型余量紧张/.test(banner) && !/urgent?/.test(banner.slice(banner.indexOf('return'))))issues.push('热门横幅对非低库存门店仍固定显示余量紧张');
   if(/charCodeAt(0).{0,140}位用户预订|位用户预订.{0,140}charCodeAt(0)/s.test(banner))issues.push('预订人数由门店ID推算，缺少独立数据契约');
 }
 const styles=path.join(root,'app/prototype/parallel/core-journey-fix-01/demo/s02-central.css');
 if(fs.existsSync(styles)){
  const css=fs.readFileSync(styles,'utf8');
  if(!css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'))issues.push('三个选项卡未配置等宽布局');
  if(css.includes('s02-lower-tabs'))issues.push('旧版底部选项卡样式残留');
 }
 return issues;
}
function sectionChanged(relativePath,sectionName){
  const base=process.env.VIS_GUARD_BASE_SHA||event.pull_request?.base?.sha;
  if(!base)return true; // no trustworthy comparison; fail safely
  const full=path.join(root,relativePath);
  if(!fs.existsSync(full))return true;
  let old;
  try{old=git(['show',base+':'+relativePath])}catch{return true}
  const current=fs.readFileSync(full,'utf8');
  function body(source){
   const begin=source.indexOf('function '+sectionName+'(){');
   if(begin<0)return null;
   const next=source.indexOf('\n  function ',begin+12);
   return source.slice(begin,next<0?undefined:next);
  }
  return body(old)!==body(current);
}
function assessS01(source){
 const issues=[];
 const begin=source.indexOf('function renderS01(){'),end=source.indexOf('function renderS02(){',begin);
 if(begin<0||end<begin)return issues; // Historic renderer may use other module names.
 const renderer=source.slice(begin,end);
 const bar=renderer.match(/<div class="filter-bar"[^>]*>([\s\S]*?)<\/div>/);
 if(bar){
  const n=(bar[1].match(/class="filter-btn/g)||[]).length;
  if(n!==3)issues.push('S01筛选栏必须是排序、距离、服务三列，当前按钮数：'+n);
  if(/data-action="priceFilter"|价格区间/.test(bar[1]))issues.push('S01出现已删除的独立价格筛选');
  if(!/服务/.test(bar[1]))issues.push('S01第三项应为服务筛选');
 }
 return issues;
}
function reportEvidence(body,isDraft){
 const statuses={};
 for(const status of ['G-TECH','VIS_SIGNED','DEPLOYED']){
  statuses[status]=(body.match(new RegExp(status+':\\s*(PASS|HOLD|NOT_TESTED)'))||[])[1]||null;
 }
 const issues=[];
 if(!isDraft){
  if(statuses['G-TECH']!=='PASS')issues.push('非草稿视觉PR须标记G-TECH: PASS并提供实测证据');
  if(statuses.VIS_SIGNED!=='PASS')issues.push('非草稿视觉PR必须获得人工视觉签收VIS_SIGNED: PASS');
 }
 return {statuses,issues};
}
function checkPRBody(body){
 const missing=[];
 const fields=['基线 Commit','活动页面','获批视觉','变更对照','375','390','视觉签收','回滚'];
 for(const f of fields)if(!body.includes(f))missing.push(f);
 if(!/VIS_SIGNED:\s*(PASS|HOLD|NOT_TESTED)/.test(body))missing.push('VIS_SIGNED: PASS/HOLD/NOT_TESTED');
 if(!/G-TECH:\s*(PASS|HOLD|NOT_TESTED)/.test(body))missing.push('G-TECH: PASS/HOLD/NOT_TESTED');
 if(!/DEPLOYED:\s*(PASS|HOLD|NOT_TESTED)/.test(body))missing.push('DEPLOYED: PASS/HOLD/NOT_TESTED');
 return missing;
}
function verifyFixture(){
 const fixture='function renderS02(){ const tabs="可选仓位 服务设施 交通路线 s02MainTabs s02Demand() s02HotRibbon(s) s02AccessHours(s) data-action=\"detailTab\"";const content=visual.tab===\'交通路线\'?s02Route(s):visual.tab===\'服务设施\'?s02Services(s):"units"; }function amountLines(){}function s02HotRibbon(s){return "<div>🔥 热门仓型</div>";}function s02Route(s){}';
 const ok=assessS02(fixture),bad=assessS02(fixture.replace('s02MainTabs','s02-lower-tabs').replace('热门仓型</div>','热门仓型<button>查看仓位</button></div>'));
 if(ok.length||!bad.some(s=>s.includes('CTA'))||!bad.some(s=>s.includes('s02MainTabs')))throw Error('visual guard self-test failed: '+JSON.stringify({ok,bad}));
 const invented=assessS02(fixture.replace('return "<div>🔥 热门仓型</div>"','const low=[];const urgent=low.length>0;return "<strong>热门仓型余量紧张</strong>"'));
 if(!invented.some(x=>x.includes('余量紧张')))throw Error('fake stock urgency not rejected');
 const g=reportEvidence('G-TECH: PASS\nVIS_SIGNED: HOLD\nDEPLOYED: HOLD',false);
 if(!g.issues.some(x=>x.includes('视觉签收')))throw Error('unapproved ready PR unexpectedly allowed');
 const g2=reportEvidence('G-TECH: PASS\nVIS_SIGNED: HOLD\nDEPLOYED: HOLD',true);
 if(g2.issues.length)throw Error('draft review should remain allowed');
 console.log('PROTO-VIS-EXEC-01 self-test: PASS');return;
}
if(process.argv.includes('--self-test')){
 verifyFixture();
 if(isVisualFile('.github/pull_request_template.md'))throw Error('governance-only metadata treated as a page visual');
 if(!isVisualFile('app/prototype/parallel/core-journey-fix-01/demo/s02-central.css'))throw Error('visual CSS not flagged');
 process.exit(0);
}
const changed=changePaths();
const visual=changed.filter(isVisualFile);
const issues=[],warnings=[];
if(!fs.existsSync(path.join(root,'docs/VISUAL_MANIFEST.md')))issues.push('批准视觉清单缺失');
if(!fs.existsSync(path.join(root,'docs/PROTO_VIS_EXEC_01.md')))issues.push('治理规则缺失');
if(changed.includes(active)){
 const source=fs.readFileSync(path.join(root,active),'utf8');
 if(sectionChanged(active,'renderS02'))issues.push(...assessS02(source));
 else warnings.push('本次未修改S02渲染器；历史S02债务不会阻断无关页面修改');
 if(sectionChanged(active,'renderS01'))issues.push(...assessS01(source));
 else warnings.push('本次未修改S01渲染器；历史S01债务不会阻断无关页面修改');
}
if(visual.length){
 const body=event.pull_request?.body||'';
 if(event.pull_request){
  const evidence=reportEvidence(body,!!event.pull_request.draft);
  issues.push(...evidence.issues);
 }
 if(!body)warnings.push('当前 PR 缺少双门禁证据字段；需要按新模板补充。');
 else {
  const missing=checkPRBody(body);
  if(missing.length)warnings.push('PR 证据字段不完整：'+missing.join('、'));
 }
 warnings.push('视觉人工签收尚不能由 CI 推断；需独立审核视觉原图 SHA 与状态截图。');
}
const report={
 task:'PROTO-VIS-EXEC-01',base:event.pull_request?.base?.sha||null,
 head:event.pull_request?.head?.sha||process.env.GITHUB_SHA||null,
 checkout_head:process.env.GITHUB_SHA||null,
 changed_files:changed,visual_files:visual,
 technical_contract:issues.length?'FAIL':'PASS',
 visual_signoff:'NOT_AUTOMATABLE',deployment_provenance:'NOT_AUTOMATABLE',
 issues,warnings,strict,
 result:issues.length?'FAIL':(warnings.length?'REVIEW_REQUIRED':'PASS')
};
const out=path.join(root,'release-evidence/proto-vis-exec-01');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'visual-guard-report.json'),JSON.stringify(report,null,2));
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(issues.length||(strict&&visual.length&&warnings.some(w=>w.includes('PR 证据字段不完整')||w.includes('缺少双门禁证据'))))process.exitCode=1;
