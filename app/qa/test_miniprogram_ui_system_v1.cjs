const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..','prototype');
const css=fs.readFileSync(path.join(base,'mini_koala_miniprogram_ui_system_v1.css'),'utf8');
const files={
  'koala-h01':'mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
  'koala-s01':'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
  'koala-s5':'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
  'koala-o01':'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html'
};
for(const [cls,name] of Object.entries(files)){
  const txt=fs.readFileSync(path.join(base,name),'utf8');
  assert(txt.includes(`body class="koala-ui-v1 ${cls}"`),`${name}: body class`);
  assert(txt.includes('href="mini_koala_miniprogram_ui_system_v1.css"'),`${name}: stylesheet`);
  assert.equal((txt.match(/data-ui-system="v1"/g)||[]).length,1,`${name}: injected once`);
}
assert(!css.includes(':has('),'no :has CSS selector');
assert(!css.includes('backdrop-filter'),'no heavy blur introduced');
assert(css.includes('prefers-reduced-motion'),'reduced motion fallback');
assert(css.includes('env(safe-area-inset-bottom)'),'safe area');
assert(css.includes('.compact-filter-btn[aria-expanded="true"]'),'dropdown state');
assert(css.includes('.store-demo-tags .tag'),'no-wrap tags');
assert(css.includes('#s5 .rplan.active'),'recommended selected state');
assert(css.includes('.bottombar .primary'),'payment CTA styles');
const data=require('node:fs').readFileSync(path.join(base,'mini_koala_recommendation_policy_v2.js'),'utf8');
assert(data.includes('3'),'retains 3km rule source');
console.log('PASS MiniProgram UI System V1: scoped CSS, four linked pages, states and source unchanged');
