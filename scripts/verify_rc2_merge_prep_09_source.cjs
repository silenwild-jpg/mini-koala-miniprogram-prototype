#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..'),out=path.join(repo,'release-evidence/rc2-merge-prep-09');
fs.mkdirSync(out,{recursive:true});
const git=(...args)=>cp.execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const read=p=>fs.readFileSync(path.join(repo,p),'utf8');
const cfg=JSON.parse(read('docs/RC2_MERGE_PREP_02_SOURCE_GATE.json'));
const chain=[
 [36,'33174a2d35e350a587c2128c86dda944f75df7e7'],
 [37,'370eba5ec7043834ce39d1d618e5fcf81a9641dd'],
 [39,'2c0eeed791bc176225b3f9c8ff1c840e775b3a2b'],
 [40,'e0bb05634223416f49cac695d50004ff75f70d86'],
 [41,'6897057f73ad12b473254ae7a57934ab2febfe52'],
 [42,'83f3c072820aee9d41bd6ef2434a33bb4661eab1'],
 [43,'26d066479f7072bce50cccfceabb0c4eafeb19ee'],
 [44,'225b781070c5cb79d2e03f813981bc93d4c63bb5']
];
for(const [pr,sha] of chain){
 assert.equal(git('cat-file','-t',sha),'commit','missing source commit PR'+pr);
 cp.execFileSync('git',['merge-base','--is-ancestor',sha,'HEAD'],{cwd:repo});
}
const sourceAssets={};
for(const file of ['assets/s01-r2-a-1.webp','assets/s01-r2-a-2.webp']){
 const rel='app/prototype/parallel/core-journey-fix-01/demo/'+file;
 const actual=git('rev-parse','HEAD:'+rel);
 assert.equal(actual,git('rev-parse',cfg.baseline_commit+':'+rel),'approved S01 photo drift');
 sourceAssets[file]=actual;
}
const homepage='app/prototype/parallel/core-journey-fix-01/demo/home.html';
// VIS-11J is user-selected; exactly two text labels and one intrusive pseudo-overlay are approved repairs.
const sourceHome=git('show',cfg.baseline_commit+':'+homepage);
const overlayToken='.fidelity-hero .task-hotspots button:nth-child(2)::after{';
const start=sourceHome.indexOf(overlayToken),end=sourceHome.indexOf('}',start)+1;
assert(start>=0&&end>start,'approved legacy H01 overlay not found');
const authorizedHome=(sourceHome.slice(0,start)+sourceHome.slice(end))
  .replaceAll('aria-label="估大小算价格"','aria-label="估算大小"')
  .replace('<b data-edit>估大小算价格</b>','<b data-edit>估算大小</b>')
  .replace('<h2 data-edit>推荐门店</h2>','<h2 data-edit>附近推荐门店</h2>');
assert.equal(read(homepage).trim(),authorizedHome.trim(),'unapproved H01 change beyond VIS11J fidelity repair');
assert.doesNotMatch(read('app/prototype/parallel/core-journey-fix-01/demo/home-bridge.js'),/了解考拉服务与存放说明/,'unapproved extra bottom branding link');
assert.equal(cfg.h01.status,'HIFI06_ABANDONED');
assert.equal(fs.existsSync(path.join(repo,'app/prototype/mk-h01-central-route-connect03.js')),false,'retired H01 adapter must not exist in central main integration candidate');
assert.equal(cfg.h01.next_final_visual,'VIS-11J');
assert.equal(cfg.h01.effective_h01_visual,'VIS11J_USER_APPROVED_FINAL_VISUAL_20261102');
assert.equal(cfg.h01.approved_master_sha256,'30749d1700c025423a4d54fb3e34e99e9516bf299fac2a2cf073a9e1b0560660');
assert.equal(cfg.h01.physical_source_received,true);
assert.equal(cfg.h01.approved_visual_embedded_in_repo,true);
assert.equal(cfg.h01.approved_master_repo_path,'app/assets/branch01/VIS-11J_用户批准唯一视觉母版.png');
assert.equal(git('rev-parse','HEAD:'+cfg.h01.approved_master_repo_path),cfg.h01.approved_master_git_blob,'approved VIS11J image blob drift');
assert.equal(cfg.h01.implementation_signed_off,false);
const approvedOldHomepage=read(homepage);
assert.match(approvedOldHomepage,/VIS-11J/);
assert.match(approvedOldHomepage,/让城市生活/);
assert.match(approvedOldHomepage,/找附近门店/);
assert.match(approvedOldHomepage,/590\+/);
assert.equal(cfg.s01.filter_count,4);
assert.equal(cfg.s01.distance_sort_demo_allowed_without_verified_location,true);
assert.equal(cfg.s01.verified_location_required_in_live_mode,true);
assert.equal(cfg.release.allow_isolated_business_qa,true);
assert.equal(cfg.release.allow_merge_main,false);
assert.equal(cfg.release.allow_deploy,false);
const central=read('app/central-review-02g.html'),index=read('app/prototype/parallel/core-journey-fix-01/demo/index.html'),js=read('app/prototype/parallel/core-journey-fix-01/demo/app.js'),route=read('app/prototype/parallel/core-journey-fix-01/demo/central-contract.js');
for(const [name,s] of [['central wrapper',central],['demo index',index],['demo app',js]]){
 assert.doesNotMatch(s,/mk-h01-central-route-connect03\.js|HIFI_06\.zip|BR01_H01_CONNECT_05\.zip/i,'retired HIFI06 referenced in '+name);
}
assert.doesNotMatch(route,/\bU01\s*:|\bQ01\s*:/,'retired U01/Q01 routing revived');
assert.match(js,/distanceSortSource:F\.distanceVerified\?'VERIFIED_LOCATION'/);
assert.match(js,/F\.synthetic===true\)handlers\.setSort\('distance'\)/);
assert.match(js,/core\.formalAmounts\(\[u\.id\],r\.term_months\)/);
assert.match(js,/const formal=core\.authorized\(\)&&r\.term_confirmed/);
assert.match(index,/s01-r2-content\.js/);
const head=git('rev-parse','HEAD'),main=git('rev-parse','origin/main');
const changed=parseInt(git('rev-list','--count','origin/main..HEAD'),10);
const missing=parseInt(git('rev-list','--count','HEAD..origin/main'),10);
const blockers=[
  'H01_VIS11J_OLD_VISUAL_SELECTED_RUNTIME_MATCH_NOT_SIGNED_OFF',
  'S01_FOUR_FILTER_VISUAL_FINAL_APPROVAL_PENDING',
  'EXPLICIT_MAIN_MERGE_AUTHORIZATION_MISSING',
  'EXPLICIT_DEPLOY_AUTHORIZATION_MISSING'
];
const obj={
 task:'RC2-MERGE-PREP-10',status:'ISOLATED_SOURCE_PASS_FORMAL_MERGE_HOLD',candidate_commit:head,
 main_commit:main,ahead:changed,behind:missing,
 integrated_pr_chain:chain.map(([number,source_commit])=>({number,source_commit})),
 discarded_prs:[34,38],hifi06:'ABANDONED',
 retired_h01_adapter:'REMOVED_FROM_GATE_READY_02_MAIN_CANDIDATE',
 s01_approved_webp_git_blobs:sourceAssets,
 h01_current_visual:'VIS11J_SELECTED_OLD_HOME_RUNTIME_MATCH_PENDING',
 s01_visual_review:'375_390_TECHNICAL_SCREENSHOTS_REVIEWED_NOT_SIGNED_OFF',
 source_checks:'PASS',isolated_package_allowed:true,merge_allowed:false,deploy_allowed:false,
 blockers
};
fs.writeFileSync(path.join(out,'source-audit.json'),JSON.stringify(obj,null,2)+'\n');
console.log('RC2_MERGE_PREP_10_SOURCE_AUDIT_PASS',JSON.stringify({head,main,ahead:changed,behind:missing,sourcePrs:chain.map(x=>x[0]),blockers}));
