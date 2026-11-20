const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const native=path.resolve(__dirname,'..'),sha=process.argv[2];assert.match(sha,/^[a-f0-9]{40}$/);
const out=path.join(native,'evidence/next-stage-20261120/COLLAB-SETUP-01',sha),docs=path.join(native,'docs/collab/COLLAB-SETUP-01');
const json=f=>JSON.parse(fs.readFileSync(f,'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const csv=rows=>rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
const tech=json(path.join(out,'verification.json'));assert.equal(tech.tests.fail,0);assert.equal(tech.python_static.errors.length,0);assert.equal(tech.smoke.errors,0);assert.equal(tech.smoke_orders.errors,0);assert.equal(tech.wxml.exit_code,0);
const manifest=json(path.join(out,'source-manifest.json'));assert.equal(Object.keys(manifest.files).length,421);for(const [f,h]of Object.entries(manifest.files))assert.equal(hash(path.join(native,'miniprogram',f)),h,f);
const records=fs.readdirSync(out).filter(f=>/^shots-(?:(?:supplement|home)-)?(?:375|390)\.json$/.test(f)||/^shots-edge-\d+-(before|after)\.json$/.test(f)||f==='shots-reused.json').flatMap(f=>json(path.join(out,f)));
assert.equal(new Set(records.map(r=>r.file)).size,records.length);
const reviewPath=path.join(out,'self-check.json'),review=fs.existsSync(reviewPath)?json(reviewPath):{screenshots:{}};
const requestedUrls=new Map();
for(const dir of new Set(records.map(r=>path.dirname(path.join(out,r.file))))){
 for(const file of fs.readdirSync(dir).filter(f=>/receipts.*\.json$/.test(f))){
  let url='';for(const r of json(path.join(dir,file))){
   if(r.tool==='automation_navigate'){const i=r.parameters.indexOf('--url');if(i>=0)url=r.parameters[i+1];}
   if(r.tool==='simulator_screenshot'&&r.receipt.ok){const i=r.parameters.indexOf('--path');if(i>=0)requestedUrls.set(path.basename(r.parameters[i+1]),url);}
  }
 }
}
const headers=['file','scene_id','page_id','route_with_query','fixture_id','login_state','pre_actions','logical_size','env','device_model','wechat_version','sdk_version','runtime_sha','design_ref','rule_ids','self_check','self_check_note','dpr','image_size','capture_scale','screenshot_sha256'];
const rows=records.map(r=>{
 const d=r.observation.info,b=fs.readFileSync(path.join(out,r.file)),w=b.readUInt32BE(16),h=b.readUInt32BE(20),digest=hash(path.join(out,r.file));assert.equal(w,r.image_width);assert.equal(h,r.image_height);
 if(r.runtime_sha!==sha){assert.ok(r.reuse_reason);const proof=json(path.join(out,'reuse-proof.json'));assert.equal(proof.original_sha,r.runtime_sha);assert.deepEqual(proof.changed_files,['pages/store/detail.wxss']);assert.notEqual(r.page_id,'S02');}const rv=review.screenshots[r.file];if(rv)assert.equal(rv.sha256,digest);
 const member=!['C01','C02','C03','C05','C11','C12'].includes(r.scene_id);
 const requested=requestedUrls.get(path.basename(r.file))||'',route='/'+r.observation.route;
 const url=requested.split('?')[0]===route?requested:route;
 return [r.file,r.scene_id,r.page_id,url,r.fixture_id,member?'local-demo-member':'guest',r.pre_actions,d.screenWidth+'x'+d.screenHeight,'sim',d.model,d.version+' (devtools reported)',d.SDKVersion,r.runtime_sha,'NONE','UNKNOWN',rv?.result||'NOT_CHECKED',(rv?.note||'Pending self-check; raw capture is scaled; independent review pending')+(r.reuse_reason?' | reused: '+r.reuse_reason:''),d.pixelRatio,w+'x'+h,(w/d.screenWidth).toFixed(6),digest];
});
fs.writeFileSync(path.join(out,'shots.csv'),csv([headers,...rows]));
const primary=[...new Map(records.filter(r=>Number(r.scene_id.slice(1))<=6).map(r=>[r.scene_id+':'+r.observation.info.screenWidth,r])).values()];assert.equal(primary.length,12,'Expected six-state two-width sample');
const summary={source_sha:sha,runtime_tree:tech.runtime_tree,technical:tech,shots:rows.map(r=>Object.fromEntries(headers.map((k,i)=>[k,r[i]]))),primary_sample_count:primary.length,primary_sample_files:primary.map(r=>r.file),total_shots:records.length,raw_capture_1to1:rows.every(r=>Number(r[19])===1),dpr_note:'Device DPR is reported separately; raw simulator screenshot pixel dimensions reflect capture scale, not device DPR raster size',independent_g_vis:'PENDING_INDEPENDENT_REVIEW',real_devices:'NOT_TESTED_NOT_REQUIRED_THIS_PACKET',main_merge:'NOT_MERGED',experience_upload:'NOT_UPLOADED'};
summary.self_check_counts=Object.fromEntries(['PASS','FAIL','NOT_CHECKED'].map(k=>[k,rows.filter(r=>r[15]===k).length]));
summary.reused_capture_count=records.filter(r=>r.runtime_sha!==sha).length;
summary.current_sha_capture_count=records.filter(r=>r.runtime_sha===sha).length;
summary.edge_check=fs.existsSync(path.join(out,'edge-check-result.json'))?json(path.join(out,'edge-check-result.json')):{status:'NOT_RUN'};
fs.writeFileSync(path.join(out,'native-verification.json'),JSON.stringify(summary,null,2)+'\n');
const rel=f=>path.relative(docs,path.join(out,f)).replaceAll('\\','/');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
fs.writeFileSync(path.join(docs,'review.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>COLLAB-SETUP-01</title><style>body{font:15px/1.6 system-ui;background:#f5f7f6;color:#1f2a24;margin:0}main{max-width:1200px;margin:auto;padding:24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}figure{margin:0;background:white;padding:12px}img{width:100%;height:auto}figcaption,code{overflow-wrap:anywhere}a{color:#0b7a48}</style><main><h1>COLLAB-SETUP-01</h1><p>运行时<code>${sha}</code>。技术${tech.tests.pass}项测试、Python静态0错误、完整模拟与订单冒烟0异常、60模板编译通过。</p><p>六状态双尺寸12图＋补充${records.length-primary.length}图。全部为微信开发者工具sim；实际手机本轮不要求。</p><p>原图保留实际像素，设备DPR与捕获缩放分开记录。1:1捕获：${summary.raw_capture_1to1?'YES':'NOT_ACHIEVED'}，不能进行严格像素级设计签收。冻结稿未绑定；独立G-VIS等待Claude评审。</p><p><a href="STATUS.md">任务状态</a> · <a href="review-dispositions.csv">问题处置</a> · <a href="${rel('shots.csv')}">截图索引</a> · <a href="${rel('native-verification.json')}">证据汇总</a></p><div class="grid">${rows.map(r=>`<figure><figcaption>${esc(r[0])}<br>${esc(r[15])} · ${esc(r[16])}；${esc(r[18])}；scale ${esc(r[19])}</figcaption><a href="${rel(r[0])}"><img src="${rel(r[0])}" loading="lazy" alt="${esc(r[0])}"></a></figure>`).join('')}</div></main></html>`);
console.log(JSON.stringify({source_sha:sha,tests:tech.tests.pass,primary:primary.length,total:records.length,one_to_one:summary.raw_capture_1to1,self_checked:rows.filter(r=>r[15]!=='NOT_CHECKED').length}));
