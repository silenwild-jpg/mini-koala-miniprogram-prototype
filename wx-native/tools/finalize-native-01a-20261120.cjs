const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const native=path.resolve(__dirname,'..'),docs=path.join(native,'docs/visual-audit-01a-20261120');
const initialSha='cbffc52201ab61b0896887a46520e4388ac70c70',finalSha='c92fcf0a3b1bffed83f4371c6fb838b30802e876';
const initial=path.join(native,'evidence/next-stage-20261120/INV-DENSITY-02B',initialSha,'initial');
const final=path.join(native,'evidence/next-stage-20261120/INV-DENSITY-FIX-01',finalSha);
const read=f=>fs.readFileSync(f,'utf8'),json=f=>JSON.parse(read(f));
const before=json(path.join(initial,'receipts.json')),after=json(path.join(final,'native-receipts.json'));
for(const r of [...before,...after]){assert.equal(r.receipt.ok,true);assert.notEqual(r.receipt.result?.success,false);}
const shots=(rs,dir)=>rs.filter(r=>r.tool==='simulator_screenshot').map(r=>{const file=path.basename(r.receipt.result.path);return {file,width:r.receipt.result.imageWidth,height:r.receipt.result.imageHeight,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex')};});
const first=shots(before,initial),last=shots(after,final);assert.equal(first.length,40);assert.equal(last.length,8);
const devices=after.filter(r=>r.tool==='automation_runtime_info').map(r=>r.receipt.result.systemInfo.result).map(x=>({width:x.screenWidth,height:x.screenHeight,sdk:x.SDKVersion,model:x.model,fontScale:x.fontSizeScaleFactor}));
assert.deepEqual(devices.map(d=>d.width).sort(),[375,390]);
const consoleText=String(after.findLast(r=>r.tool==='get_simulator_console').receipt.result);assert.ok(!/\[error\]/i.test(consoleText));
const tech=json(path.join(final,'verification.json'));assert.equal(tech.tests.fail,0);assert.equal(tech.smoke.errors,0);
const manifest=json(path.join(final,'source-manifest.json'));
for(const [file,sha]of Object.entries(manifest.files)){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(native,'miniprogram',file))).digest('hex'),sha,file);}
const reviewPath=path.join(final,'agent-review.json');
let reviewed=false;
if(fs.existsSync(reviewPath)){const review=json(reviewPath);assert.equal(review.source_sha,finalSha);for(const shot of last)assert.equal(review.screenshot_hashes[shot.file],shot.sha256);assert.equal(review.result,'PASS_LIMITED_TO_CAPTURED_STATES');reviewed=true;}
const result={date_shanghai:'2026-11-20',task:'INV-DENSITY-FIX-01',source_sha:finalSha,runtime_tree:tech.runtime_tree,technical:tech,
 native:{screenshots:last,devices,console_errors:0,warnings:['7 global custom components may affect lazy code injection','getSystemInfoSync deprecation warning'],coverage:'normal single unit, S01 demand card, actual near combination, render-only sufficient combination fixture',not_covered:['all 40 acceptance cases','custom long content','keyboard','font enlargement','physical iOS/Android','real auth/payment/CRM']},
 previous_candidate:{source_sha:initialSha,screenshots:first,tool_calls:before.length,role:'initial inspection and defect evidence; not blanket acceptance for final SHA'},
 visual_agent_review:reviewed?'PASS_LIMITED_TO_CAPTURED_STATES':'PENDING_REVIEW_OF_FINAL_8_SCREENSHOTS',human_signoff:'NOT_SIGNED',full_site_effective_states:'REACHABILITY_PENDING',experience_upload:'NOT_UPLOADED',main_merge:'NOT_MERGED'};
const cleanupPath=path.join(final,'cleanup-status.json');
if(fs.existsSync(cleanupPath))result.post_capture_cleanup=json(cleanupPath);
fs.writeFileSync(path.join(final,'native-verification.json'),JSON.stringify(result,null,2)+'\n');
function parseCsv(text){let rows=[],row=[],v='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){v+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(v);v='';}else if(c==='\n'&&!quoted){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v='';}else v+=c;}if(row.length||v){row.push(v);rows.push(row);}return rows;}
const matrix=parseCsv(read(path.join(native,'docs/next-stage-20261120/ACCEPTANCE_MATRIX.csv'))).slice(1);assert.equal(matrix.length,40);
const coverage={
 D01:['NATIVE_SCREENSHOT_REVIEWED','D01-stores-browse','默认浏览卡；未做所有紧凑卡滚动检查','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D02:['NATIVE_SCREENSHOT_REVIEWED','D02-stores-demand','3.1m³游客态；进入详情路径有回执','confirm-stores'],
 D03:['PARTIAL_NATIVE','D03-stores-member','正式价已渲染；没有特制大金额fixture','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D05:['ANALOGUE_NATIVE','D05-match-near','实际30.1m³需求与26m³组合，不是矩阵10/8单仓fixture；发现合计体积遗漏','confirm-near-combo'],
 D06:['NATIVE_SCREENSHOT_REVIEWED','D06-match-guest','3.1m³足额/更大游客方案','confirm-normal'],
 D07:['NATIVE_SCREENSHOT_REVIEWED','D07-match-member','登录后正式价和升级差额','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D08:['NOT_RUN_AS_PLANNED','','最终仅用31m³合计的view-model渲染fixture确认标题，未走该fixture下单','confirm-enough-combo-fixture'],
 D09:['NOT_RUN_AS_PLANNED','D09-store-no-match','文件是S02实际无匹配；不是矩阵S5的10/5单仓fixture','NOT_RUN'],
 D10:['NATIVE_SCREENSHOT_REVIEWED','D10-store-dims;D10-store-member','尺寸/面积与价格可读；未覆盖全部滚动行','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D13:['RENDER_FIXTURE_REVIEWED','D13-store-soldout-fixture','只改页面隔离副本状态并调用真实paint；不是服务端库存变化','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D14:['PARTIAL_NATIVE','D14-store-route','交通路线及复制入口；未覆盖服务页签完整状态','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D15:['PARTIAL_NATIVE','D15-visit-form','表单可见；未唤起软键盘','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D16:['PARTIAL_NATIVE','D16-visit-validation','验证空电话错误；失败保留/超时幂等由原有Node测试覆盖，本轮未做原生注入','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D17:['PARTIAL_NATIVE','D17-store-sheet','真实演示目录选择层；未做额外长地址fixture','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D18:['RENDER_FIXTURE_REVIEWED','D18-store-sheet-soldout-fixture','页面副本全部reserved；暂无可租且起价为空','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D19:['LOCAL_DEMO_FLOW_REVIEWED','D19-quick-guest;D19-login','演示取号事件后留QUICK并显示报价；未真实微信授权','NOT_RECAPTURED_FOR_FINAL_SHA'],
 D20:['PARTIAL_NATIVE','D20-quick-member;D20-quick-fees','整期3120/应付3430示例；非特制超长金额','NOT_RECAPTURED_FOR_FINAL_SHA'],
 P01:['PARTIAL_NATIVE','H01-guest','首页默认与定位提示；未验证全部拒绝/回退交互','NOT_RECAPTURED_FOR_FINAL_SHA'],
 P03:['PARTIAL_NATIVE','','3.01归一3.1通过CAP进入S5；其他边界由Node覆盖，不是完整原生矩阵','confirm-normal'],
 P04:['LOCAL_DEMO_FLOW_REVIEWED','D05-match-near','30.01归一30.1并继续到接近组合，无强制顾问','confirm-near-combo']
};
const csv=rows=>rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
fs.writeFileSync(path.join(docs,'CASE_EXECUTION.csv'),csv([['场景ID','阶段','原计划前置','初轮实际状态','初轮截图前缀','覆盖限制','最终候选确认截图前缀','人工签收'],...matrix.map(r=>{const c=coverage[r[0]]||['NOT_RUN','','本轮未执行该场景','NOT_RUN'];return [r[0],r[1],r[5],...c,'NOT_SIGNED'];})]));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const url=(dir,file)=>path.relative(docs,path.join(dir,file)).replaceAll('\\','/');
const cards=(items,dir)=>items.map(x=>`<figure><figcaption>${esc(x.file)}</figcaption><a href="${url(dir,x.file)}"><img loading="lazy" src="${url(dir,x.file)}" alt="${esc(x.file)}"></a></figure>`).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>01A审计与库存密度验证</title><style>body{font:15px/1.6 system-ui,sans-serif;background:#f5f7f6;color:#1f2a24;margin:0}main{max-width:1180px;margin:auto;padding:28px 20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}figure{margin:0;background:white;padding:12px}img{display:block;width:100%;height:auto}figcaption,code{overflow-wrap:anywhere}a{color:#0b7a48}h2{margin-top:36px}</style><main><h1>01A审计与库存密度验证</h1><p>最新源码 <code>${finalSha}</code>。160项测试、35页/22组件模拟运行零异常、60个WXML模板编译通过。逻辑尺寸375×812 / 390×844，以工具systemInfo为准。</p><p>最终8图：单仓控制、S01控制、实际接近组合、31m³足额组合渲染fixture。后者只测显示，不是有效下单数据。全站状态/长内容/键盘/字体放大/真机与人工签收未完成。</p><p><a href="AUDIT.md">审计报告</a> · <a href="CASE_EXECUTION.csv">40场景实际执行对照</a> · <a href="${url(final,'native-verification.json')}">最终候选证据</a></p><h2>最小修复后的确认</h2><div class="grid">${cards(last,final)}</div><h2>初轮检查（修复前SHA ${initialSha.slice(0,7)}，不继承为新SHA全站签收）</h2><div class="grid">${cards(first,initial)}</div></main></html>`;
const cleanupNotice=result.post_capture_cleanup?.ok===false?'<p>收尾状态：最后恢复普通推荐页的导航遇到本地7892代理拒绝，模拟器可能仍停在渲染fixture。截图已保存；恢复连接并刷新工程会重新读取正常演示数据。<a href="EXECUTION_STATUS.md">最新执行与收尾记录</a></p>':'';
fs.writeFileSync(path.join(docs,'review.html'),html.replace('<h2>最小修复后的确认</h2>',cleanupNotice+'<h2>最小修复后的确认</h2>'));
console.log(JSON.stringify({source_sha:finalSha,initial_screenshots:first.length,confirmation_screenshots:last.length,devices,case_rows:matrix.length,native_errors:0,review:result.visual_agent_review}));
