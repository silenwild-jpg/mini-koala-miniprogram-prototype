#!/usr/bin/env node
'use strict';
// RESTORE-05: inspect the actual isolated demo source without treating archived prototypes as active routes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const dir='app/prototype/parallel/core-journey-fix-01/demo/';
const app=read(dir+'app.js'),live=read(dir+'s01-r2-live.html'),vis=read(dir+'visual-align.css'),central=read(dir+'central-contract.js'),br=read(dir+'br04/bridge.js'),s5=read(dir+'br04/s5/index.html'),current=read('docs/CURRENT_RULES.md');
const checks={
 s01_three_labels:/<div class="filter">排序/.test(live)&&/<div class="filter">距离/.test(live)&&/<div class="filter">服务/.test(live)&&!/<div class="filter">价格/.test(live),
 s01_three_columns:/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(live)&&/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(vis),
 s01_no_hidden_price_filter:!/data-action="priceFilter"|setPrice\(v\)/.test(app)&&/visual\.price='all'/.test(app),
 s01_service_events:/filter\(index\)\{if\(!\[0,1,2\]\.includes\(index\)/.test(app),
 u01_excluded_from_central:!/(?:^|[,{])\s*U01\s*:/.test(central),
 s02_direct_checkout:/function unitRow\(u\)/.test(app)&&/data-action="choose"/.test(app),
 order_guards:/DIRECT_ORDER_NOT_ALLOWED/.test(central)&&/phoneAuth\.run\('ORDER'/.test(app),
 s5_second_navigation_present:/secondaryNav\.hidden=false/.test(br)&&/id="navigate-secondary"/.test(s5),
 s5_no_synthetic_distance_in_initial_markup:!/地图导航至海上世界店，距离3\.5公里|<span>3\.5km<\/span>/.test(s5),
 renewal_invalid_input_feedback:/累计租期不得超过60个月/.test(app)&&/id='renew-error'/.test(app),
 payment_failed_recovery:/recoverFailedOrder/.test(app)&&/payment_failed/.test(app),
 latest_rules_recorded:/PROTO-RULE-RESTORE-04/.test(current)&&/排序、距离、服务/.test(current),
 hifi06_not_bundled:/HIFI06_ABANDONED/.test(read('scripts/build_rc2_isolated_demo.py')),
 s01_two_modes_explicit:/const r2Mode=\(\)=>new URLSearchParams\(location\.search\)\.get\('s01_r2'\)==='1'/.test(app),
};
const failed=Object.keys(checks).filter(k=>!checks[k]);
const visual={
 H01:'HOLD_APPROVED_SOURCE_SAME_IMAGE_AND_RUN_SCREEN_NOT_CLOSED',
 S01:'HOLD_THREE_FILTER_LAYOUT_PASS_FULL_PAGE_APPROVED_IMAGE_MISSING',
 S02:'TECHNICAL_ONLY',
 CAP:'TECHNICAL_ONLY',
 ITEMS:'TECHNICAL_ONLY',
 S5:'TECHNICAL_ONLY',
 O01:'TECHNICAL_ONLY',
 O03:'TECHNICAL_ONLY'
};
const receipt={status:failed.length?'FAIL':'STATIC_PASS',commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:base,encoding:'utf8'}).trim(),checks,visual,open_gate:['S01_TWO_PARALLEL_RENDER_MODES','H01_LATEST_APPROVED_MASTER_PHYSICAL_SIGNOFF','S01_FULL_PAGE_APPROVED_MASTER_SIGNOFF','MAIN_MERGE_AND_DEPLOY_NOT_APPROVED']};
const out=path.join(base,'release-evidence/rule-restore-05');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'static.json'),JSON.stringify(receipt,null,2)+'\n');
console.log('PROTO_RULE_RESTORE_05_STATIC',JSON.stringify(receipt));assert.equal(failed.length,0,'RESTORE_05_FAILED: '+failed.join(','));
