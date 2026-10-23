'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'prototype/mini_koala_acceptance_v11_language_patch.js'),'utf8');
function boot(page='mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html', opts={}){
  const texts=(opts.texts||[]).map(v=>({nodeType:3,nodeValue:v,parentElement:{closest:()=>null}}));
  const body={nodeType:1,matches:()=>false};
  const inserted=[];let observer;
  const doc={body,head:{appendChild:el=>inserted.push(el)},createElement:tag=>({tagName:tag,style:{},set id(v){this.__id=v},get id(){return this.__id}}),querySelector:()=>null,createTreeWalker:()=>{let i=0;return{nextNode:()=>texts[i++]||null}}};
  class Observer{constructor(cb){observer=cb}observe(){} }
  const sandbox={document:doc,window:{},location:{pathname:'/prototype/'+page,search:opts.search||''},URLSearchParams,MutationObserver:Observer,NodeFilter:{SHOW_TEXT:4}};
  vm.runInNewContext(source,sandbox,{filename:'mini_koala_acceptance_v11_language_patch.js'});
  return {texts,inserted,mutate:()=>observer&&observer([{type:'characterData',target:texts[0]}]),api:sandbox.window.MINI_KOALA_LANGUAGE_V11};
}
let passed=0;
function check(name,cb){cb();passed++;console.log('PASS C-'+String(passed).padStart(2,'0')+': '+name)}
const a=boot(undefined,{texts:['订单 O-DEMO-ACTIVE；方案 Q-DEMO-CANONICAL','term_months','开票金额基于实际已支付交易记录，不使用重新计算金额。','10/8/2026, 12:09:48 PM','2026/10/18','支付完成并已进行演示仓位分配；核验通过']});
check('original DEMO identifiers retain display-only deterministic aliases',()=>{assert.match(a.texts[0].nodeValue,/O-20261008-\d{5}/);assert.match(a.texts[0].nodeValue,/Q-20261008-\d{5}/);assert.equal(a.api.publicAlias('O-DEMO-ACTIVE'),a.api.publicAlias('O-DEMO-ACTIVE'))});
check('internal data labels mapped to human readable text',()=>assert.equal(a.texts[1].nodeValue,'租用月数'));
check('invoice wording has no unsupported SLA',()=>assert.equal(a.texts[2].nodeValue,'发票金额以所选付款记录中的实际支付金额为准。'));
check('US locale date and 12-hour clock become Chinese date with 24-hour clock',()=>assert.equal(a.texts[3].nodeValue,'2026年10月8日 12:09:48'));
check('YYYY/MM/DD date normalization is display-only',()=>assert.equal(a.texts[4].nodeValue,'2026年10月18日'));
check('transaction wording no longer claims simulated assignment as real locking',()=>assert.equal(a.texts[5].nodeValue,'支付完成后会确认具体仓位；核验通过'));
check('user pages hide review-only data, preserving opt-in QA',()=>assert.match(a.inserted.map(e=>e.textContent).join('|'),/review-only,.review,.stagebar,.review-tools\{display:none/));
check('QA query leaves review-only visible for testers',()=>{const b=boot(undefined,{search:'?showQA=1',texts:['Q-DEMO']});assert.equal(b.inserted.length,0);assert.match(b.texts[0].nodeValue,/Q-20261008-/)});
check('mutation patch handles dynamically rendered status without touching data',()=>{a.texts[0].nodeValue='原型仅记录验证结果状态，不收集身份证号码、照片或其他身份证要素。';a.mutate();assert.equal(a.texts[0].nodeValue,'此处仅展示身份验证结果，不收集身份证号码或照片。')});
check('internal demo launcher copy is not rewritten',()=>{const b=boot('product_demo_hub_v1.html',{texts:['内部演示 · O-DEMO-ACTIVE']});assert.equal(b.texts[0].nodeValue,'内部演示 · O-DEMO-ACTIVE')});
check('tech fields embedded in URLs are not replaced',()=>assert.equal(a.api.formatText('https://example.com/?shareId=abc&orderNo=O-DEMO-ACTIVE'),'https://example.com/?shareId=abc&orderNo=O-DEMO-ACTIVE'));
check('coupon, pricing, deposit amounts and accepted rule statements untouched',()=>{for(const t of ['¥3,440 − 新客券 ¥200 + 押金 ¥573 + 管理费 ¥50 = ¥3,863','押金用于租赁期间的履约保障；退仓后按租赁协议及仓位核验结果办理退还。','1–60个月'])assert.equal(a.api.formatText(t),t)});
check('absolute superiority claim removed without fabricating certification',()=>assert.equal(a.api.formatText('高新企业认证（行业唯一）'),'高新企业认证'));
check('appointment titles use one customer-facing term',()=>assert.equal(a.api.formatText('看仓预约'),'预约看仓'));
check('contract remains clearly illustrative, not turned into binding contract',()=>assert.match(a.api.formatText('本页仅用于交互原型，不能作为真实法律文本。正式上线需由业务和法务共同确认完整合同。'),/说明示例.*正式协议/));
check('legacy disabled service pages have plain-language copy',()=>assert.equal(a.api.formatText('该能力未纳入 V2.4.2 生命周期主链，本页仅用于承接旧原型入口，避免出现无效链接。当前版本不会在这里伪造未完成的业务流程。'),'当前页面暂不提供在线办理，您可返回首页继续浏览。'));
check('PATCH C script loaded through existing global support without removing A/B hooks',()=>{const g=fs.readFileSync(path.join(root,'prototype/mini_storage_global_support_v274.js'),'utf8'); for(const f of ['mini_koala_acceptance_v11_state_patch.js','mini_koala_acceptance_v11_facts_patch.js','mini_koala_acceptance_v11_language_patch.js'])assert.ok(g.includes(f))});
check('core HTML not edited by PATCH C source injection',()=>{const prior=path.resolve(root,'../../koala_patchB/Mini_Koala_Acceptance_Fix_V1_1_PATCH_AB/prototype');for(const f of ['mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html','mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html','mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html','mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html','mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html']){const actual=fs.readFileSync(path.join(root,'prototype',f));const laterApproved=require('./phase3b_batch_d_approved_delta.json').authorized_runtime[f];if(laterApproved){const digest=require('node:crypto').createHash('sha256').update(actual).digest('hex');assert.equal(laterApproved.before_sha256,require('./phase3b_batch_c_approved_delta.json').protected_unchanged['prototype/'+f]);assert.equal(laterApproved.after_sha256,require('./phase3c_batch_a_approved_delta.json').authorized_runtime[f].before_sha256);assert.equal(digest,require('./phase3c_unified_approved_delta.json').authorized_runtime[f].after_sha256,`Phase 3C-A authorized release ${f}`);continue;}if(fs.existsSync(path.join(prior,f)))assert.equal(actual.toString('utf8'),fs.readFileSync(path.join(prior,f),'utf8'),f);else{const manifest=JSON.parse(fs.readFileSync(path.join(root,'qa/acceptance_v11/abc_core_html_sha256.json'),'utf8'));const digest=require('node:crypto').createHash('sha256').update(actual).digest('hex');assert.equal(digest,require('./phase3b_batch_c_approved_delta.json').runtime[f]?.full_sha||require('./phase3b_approved_delta.json').runtime[f]?.full_sha||manifest[f],f)}}});
console.log('RESULT '+passed+'/'+passed+' PATCH C focused checks PASSED (DOM harness, not browser E2E)');
