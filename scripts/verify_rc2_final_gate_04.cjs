#!/usr/bin/env node
'use strict';
// RC2-FINAL-GATE-04: evidence-driven review gate, NOT a merge command.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8'}).trim();
const assertTokens=(source,labels,scope)=>{
  for(const label of labels)assert(source.includes(label),scope+' missing '+label);
};
const app=read('app.js'),home=read('home.html'),
  policy=read('presentation-policy.js'),br04=read('br04/bridge.js'),
  s02css=read('s02-central.css'),s5css=read('br04/s5/s5-native-flow.css');
assertTokens(home,['找附近门店','估大小算价格','为您推荐'],'H01');
assertTokens(app,['交通路线','可选仓位','服务设施','s02Route(s)','s02TravelMode','s02MapSlot','s02-call-400','function choose(ids)','phoneAuth.run'], 'S02/O01');
assertTokens(app,['transit','drive','walk','bike'], 'S02 route modes');
assertTokens(policy,['function tags(','function detailTags(','tagType:typeOf'], 'semantic tags');
assertTokens(br04,['data-s5-buy','s5-store-card','s5-unit-buy','考拉E存','B.order(item.ids)'], 'S5');
assertTokens(s02css,['s02-map','s02-travel-modes','.s02-tag-promotion'], 'S02 style');
assertTokens(s5css,['s5-unit-buy'], 'S5 style');
assert.match(app,/if\(next==='O01'&&!core\.authorized\(\)\)/,'do not remove phone gate');
assert.match(app,/phoneAuth\.run\('ORDER','CHOOSE_UNIT'/,'order must pass auth');
assert(!br04.includes('s5-compare-float'),'comparison UI is permanently removed');
const expectedBase='origin/isolate/rc2-final-visual-review-03-20261112';
const diff=git('diff','--name-only',expectedBase+'...HEAD','--','app/prototype/parallel/core-journey-fix-01/demo');
assert.equal(diff,'','No production changes permitted in FINAL-GATE-04');
const files=git('diff','--name-only','origin/main...HEAD').split('\n').filter(Boolean);
const ahead=Number(git('rev-list','--count','origin/main..HEAD'));
const behind=Number(git('rev-list','--count','HEAD..origin/main'));
const report={
 gate:'RC2-FINAL-GATE-04',test_sha:git('rev-parse','HEAD'),source_branch:git('rev-parse','--abbrev-ref','HEAD'),
 baseline_source_pr:122,baseline_branch:'isolate/rc2-final-visual-review-03-20261112',
 current_runtime_delta_vs_pr122:0,main_ahead_commits:ahead,main_behind_commits:behind,main_changed_files:files.length,
 checks:{h01_frozen_entry:true,three_s02_tabs:true,s02_route_four_modes:true,
  s02_400_call:true,s5_two_cards_and_estore_contract:true,phone_auth_gate:true,
  central_tag_semantics:true,s5_no_compare:true,source_freeze:true},
 prior_exact_source_browser_evidence:{
  full_scroll_375_390:'https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43056450138',
  route_s5_order_375_390:'https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43060809344',
  chinese_font_375_390:'https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43049953252'
 },
 delayed_scope:['37-month term price transition and discount boundary (issue 106)'],
 independent_unaccepted_drafts:['H01 PR123','M01 PR108'],
 unverified:['WeChat/iPhone final pixel signoff','full S5 state matrix on this exact SHA','M01 independent latest branch reconciliation'],
 readiness:{isolated_h01_s01_s02_s5_main_path:'TECHNICAL_PASS',main_merge:'NO_GO',netlify_deploy:'NO_GO',wechat_final_visual:'HOLD'},
 note:'Internal prototype may contain illustrative stores, promotions and distance. Do not validate real commercial authenticity.'
};
assert(ahead>100&&files.length>100,'main diff no longer large; update gate classification after review');
const out=path.resolve(__dirname,'../release-evidence/rc2-final-gate-04');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'gate-results.json'),JSON.stringify(report,null,2)+'\n');
console.log('RC2_FINAL_GATE_04_TECHNICAL_CHECKS_PASS',JSON.stringify({sha:report.test_sha,sourceDelta:0,ahead,mainFiles:files.length,merge:'NO_GO'}));
