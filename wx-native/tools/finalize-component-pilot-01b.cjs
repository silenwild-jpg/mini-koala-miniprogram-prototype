const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const native=path.resolve(__dirname,'..'),docs=path.join(native,'docs/component-pilot-01b-20261120');
const firstSha='96692b8bb555087760b8bc48f47fa5fc8afacd90',lastSha='f125158d64371e84877d5e445f70f528c39ac1e4';
const firstDir=path.join(native,'evidence/next-stage-20261120/COMPONENT-PILOT-01B',firstSha),lastDir=path.join(native,'evidence/next-stage-20261120/COMPONENT-PILOT-01B-FINAL',lastSha);
const read=f=>fs.readFileSync(f,'utf8'),json=f=>JSON.parse(read(f)),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const unwrap=v=>{while(v&&typeof v==='object'&&Object.hasOwn(v,'result'))v=v.result;return v;};
const csv=rows=>rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
const first=json(path.join(firstDir,'native-receipts.json')),last=[...json(path.join(lastDir,'native-receipts.json')),...json(path.join(lastDir,'native-receipts-390.json'))],metrics=json(path.join(lastDir,'metrics-geometry-receipts.json'));
const failedEdge=json(path.join(lastDir,'metrics-native-receipts.json')).filter(r=>r.receipt.ok!==true);
assert.equal(failedEdge.length,1);assert.match(failedEdge[0].receipt.message,/App.CDPEnable unimplemented/);
const toolingFailures=last.filter(r=>r.receipt.ok!==true);
assert.equal(toolingFailures.length,1);
assert.equal(toolingFailures[0].tool,'automation_evaluate');
assert.ok(toolingFailures[0].parameters.some(p=>p.includes("getApp().onLaunch()")));
assert.match(toolingFailures[0].receipt.message,/timeout waiting for automator response/);
for(const r of [...first,...last.filter(r=>r.receipt.ok===true),...metrics]){assert.equal(r.receipt.ok,true);assert.notEqual(r.receipt.result?.success,false);}
const screenshots=(rs,dir)=>rs.filter(r=>r.tool==='simulator_screenshot').map(r=>{const file=path.basename(r.receipt.result.path);return {file,sha256:hash(path.join(dir,file)),pixel_width:r.receipt.result.imageWidth,pixel_height:r.receipt.result.imageHeight};});
const a=screenshots(first,firstDir),b=screenshots(last,lastDir);assert.equal(a.length,94);assert.equal(b.length,24);
const observations=first.filter(r=>r.tool==='automation_evaluate').map(r=>unwrap(r.receipt.result)).filter(v=>v?.capture?.startsWith('page-'));
assert.equal(observations.length,70);assert.equal(observations.filter(v=>v.sys).length,0);
const firstManifest=json(path.join(firstDir,'source-manifest.json')),lastManifest=json(path.join(lastDir,'source-manifest.json'));
const changed=Object.keys(lastManifest.files).filter(f=>firstManifest.files[f]!==lastManifest.files[f]);
assert.deepEqual(changed.sort(),['pages/store/detail.wxml','pages/store/detail.wxss']);
for(const [f,h]of Object.entries(lastManifest.files))assert.equal(hash(path.join(native,'miniprogram',f)),h,f);
const bounds=metrics.filter(r=>r.tool==='automation_evaluate').map(r=>unwrap(r.receipt.result)).filter(v=>v?.close&&v?.purpose);
assert.equal(bounds.length,2);for(const x of bounds){assert.ok(x.close.width>=48&&x.close.height>=48);assert.ok(/95\s*,\s*107\s*,\s*101|#5f6b65/i.test(x.purpose.color));}
const edge={status:'NOT_VERIFIED',reason:failedEdge[0].receipt.message,receipt:'metrics-native-receipts.json'};
const consoleLog=String(metrics.findLast(r=>r.tool==='get_simulator_console').receipt.result);assert.ok(!/\[error\]/i.test(consoleLog));
const technical=json(path.join(lastDir,'verification.json'));assert.equal(technical.tests.tests,164);assert.equal(technical.tests.fail,0);assert.equal(technical.smoke.errors,0);
const parentTech=json(path.join(firstDir,'verification.json'));assert.equal(parentTech.smoke.pages,35);assert.equal(parentTech.smoke.errors,0);
const devices=last.filter(r=>r.tool==='automation_runtime_info').map(r=>r.receipt.result.systemInfo.result).map(d=>({width:d.screenWidth,height:d.screenHeight,sdk:d.SDKVersion,fontScale:d.fontSizeScaleFactor}));assert.deepEqual(devices.map(d=>d.width).sort(),[375,390]);
let review='PENDING_AGENT_REVIEW';const reviewFile=path.join(lastDir,'agent-review.json');if(fs.existsSync(reviewFile)){const v=json(reviewFile);assert.equal(v.source_sha,lastSha);for(const shot of b)assert.equal(v.screenshot_hashes[shot.file],shot.sha256);review=v.result;}
const result={source_sha:lastSha,runtime_tree:technical.runtime_tree,technical,initial_candidate:{source_sha:firstSha,screenshots:a,page_default_screenshots:70,targeted_screenshots:24,full_smoke:parentTech.smoke,limitations:['375 used a prior m2/1-month draft; targeted capacity screenshots are not valid for their intended m3/12-month cases','initial visit-validation file is actually local-demo success with a verified phone','S02 address clamp ghost required a local fix']},final_confirmation:{screenshots:b,devices,fixture_preconditions:'m3 and 12 months asserted before every capacity submit; invalid phone123 used for client validation; page-only render fixtures'},source_change_after_full_sweep:changed,unchanged_other_runtime_files:Object.keys(lastManifest.files).length-changed.length,close_geometry:bounds,expanded_edge_clicks:edge,login_purpose_computed_color:bounds.map(v=>v.purpose.color),declared_secondary_on_white_contrast:5.56,native_console_errors:0,agent_visual_review:review,human_signoff:'NOT_SIGNED',real_devices:'NOT_TESTED',all_effective_states:'NOT_ALL_EXECUTED',experience_upload:'NOT_UPLOADED',main_merge:'NOT_MERGED'};
result.recovered_tooling_failures=toolingFailures.map(r=>({tool:r.tool,parameters:r.parameters,message:r.receipt.message,time:r.time,recovery:'390 resumed after navigation readiness; original failure receipt preserved'}));
fs.writeFileSync(path.join(lastDir,'native-verification.json'),JSON.stringify(result,null,2)+'\n');
const app=json(path.join(native,'miniprogram/app.json')),routes=app.pages.concat(...app.subpackages.map(s=>s.pages.map(p=>s.root+'/'+p)));
const pageRows=routes.map(route=>{
 const shots=[375,390].map(w=>'page-'+route.replaceAll('/','-')+'-'+w+'.png');
 for(const f of shots)assert.ok(a.some(s=>s.file===f));
 return [route,firstSha,...shots,route==='pages/store/detail'?'FIXED_LOCAL_ADDRESS_CLAMP_IN_FINAL_CANDIDATE':'NO_RUNTIME_FILE_CHANGE_FOR_THIS_PAGE_OR_SHARED_CODE_AFTER_SWEEP',route==='pages/store/detail'?'target-store-header;target-full-address;target-store-near8-render;target-store-combo31-render':'NOT_RECAPTURED_AT_FINAL_SHA','default first viewport only; no full-state or real-device claim'];
});
fs.writeFileSync(path.join(docs,'NATIVE_PAGE_COVERAGE.csv'),csv([['路由','默认截图源码SHA','375截图','390截图','末次变更影响','最终候选原生确认前缀','边界'],...pageRows]));
const scenarios=[
 ['D04/D14','长地址','NODE_PASS_AND_NATIVE_PATH_RENDER','target-full-address','摘要进入原路线页签；全文查询；复制行为由Node验证；长门店名未加fixture'],
 ['D05','10m³对8m³','NODE_PASS_AND_NATIVE_RENDER','target-near8-render','登录态渲染；游客正式价门槛由Node验证；未用fixture下单'],
 ['D08','30m³对16+15m³','NODE_PASS_AND_NATIVE_RENDER','target-combo31-render','组合总容量和编号；未用fixture下单'],
 ['D09','10m³对单个5m³','NODE_PASS_AND_NATIVE_RENDER','target-none5-render','无匹配；不是实际服务端库存变更'],
 ['D11','S02近似8m³','NODE_PASS_AND_NATIVE_PAINT','target-store-near8-render','页面副本paint；尺寸配合fixture；不改真实库存'],
 ['D12','S02组合31m³','NODE_PASS_AND_NATIVE_PAINT','target-store-combo31-render','页面副本paint；未提交订单'],
 ['D15','看仓表单','NATIVE_RENDER_REVIEW','target-visit','键盘尚未唤起；非真实CRM'],
 ['D16','看仓错误手机号','CLIENT_VALIDATION_NATIVE','target-visit-validation','错误123不提交；超时幂等/失败保留仅Node证据'],
 ['D19','登录与关闭','LOCAL_DEMO_AND_MEASURED_HIT_AREA','target-login','演示取号；公开SelectorQuery测量；坐标点击API不支持，边缘点击未验；非真实授权'],
 ['D20','QUICK费用','NATIVE_RENDER_REVIEW','target-quick-fees;target-quick-member','12个月常规金额；特制超长金额尚未执行']
];
fs.writeFileSync(path.join(docs,'KEY_STATE_COVERAGE.csv'),csv([['计划场景','用例','本批覆盖','最终截图前缀','限制'],...scenarios]));
const link=(dir,file)=>path.relative(docs,path.join(dir,file)).replaceAll('\\','/'),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const imgs=(shots,dir)=>shots.map(s=>`<figure><figcaption>${esc(s.file)}</figcaption><a href="${link(dir,s.file)}"><img loading="lazy" src="${link(dir,s.file)}" alt="${esc(s.file)}"></a></figure>`).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>01B组件试点与验证</title><style>body{font:15px/1.6 system-ui,sans-serif;margin:0;background:#f5f7f6;color:#1f2a24}main{max-width:1180px;margin:auto;padding:30px 20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}figure{margin:0;background:white;padding:12px}img{display:block;width:100%;height:auto}figcaption,code{overflow-wrap:anywhere}a{color:#0b7a48}details{margin-top:36px}summary{cursor:pointer;font-size:20px;font-weight:600}</style><main><h1>01B组件试点与验证</h1><p>最终源码 <code>${lastSha}</code>。164项测试、60个WXML模板编译和S02定向模拟运行通过。</p><p>父候选完成35页双尺寸默认态共70图＋24关键图；集中修复仅改S02模板/样式两文件，最终24图重验受影响路径与纠正后的fixture。其余419文件哈希相同，父候选截图仍标原SHA，不冒充最终SHA全站签收。</p><p>关闭命中区实测：${bounds.map(x=>x.close.width+'×'+x.close.height).join(' / ')}逻辑像素，边缘点击未验证（开发者工具坐标接口不支持）；正常登录用途文字计算色为${esc(bounds[0].purpose.color)}。</p><p>渲染fixture不是真实库存或有效订单。未完成：全部有效状态、字体放大/键盘/读屏、真机、人工签收与正式服务。</p><p><a href="STATUS.md">执行结果</a> · <a href="KEY_STATE_COVERAGE.csv">关键状态覆盖</a> · <a href="NATIVE_PAGE_COVERAGE.csv">35页证据边界</a> · <a href="${link(lastDir,'native-verification.json')}">原生证据</a></p><h2>最终确认：${lastSha.slice(0,7)}</h2><div class="grid">${imgs(b,lastDir)}</div><details><summary>初轮35页默认态：${firstSha.slice(0,7)}</summary><p>默认态不是全部状态；375与390采用的草稿不同，已在最终关键fixture中锁定m³/12个月。S02残影见初轮，最终另验。</p><div class="grid">${imgs(a.filter(s=>s.file.startsWith('page-')),firstDir)}</div></details><details><summary>初轮关键图（保留测试前置问题）</summary><div class="grid">${imgs(a.filter(s=>s.file.startsWith('target-')),firstDir)}</div></details></main></html>`;
fs.writeFileSync(path.join(docs,'review.html'),html.replace('两次扩展边缘点击均关闭','边缘点击未验证（开发者工具坐标接口不支持）'));
console.log(JSON.stringify({source_sha:lastSha,first_screenshots:a.length,final_screenshots:b.length,default_pages:routes.length,changed_runtime_files:changed,close_sizes:bounds.map(v=>[v.close.width,v.close.height]),edge_clicks:edge.status,visual_review:review}));
