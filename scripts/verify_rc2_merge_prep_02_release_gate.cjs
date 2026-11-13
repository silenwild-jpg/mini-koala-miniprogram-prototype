#!/usr/bin/env node
'use strict';
// RC2 candidate premerge and postdeploy must not be conflated.
// Retired H01 HIFI-06 must NEVER be a required artifact or an acceptable homepage source.
const fs=require('node:fs'),path=require('node:path');
const cfg=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/RC2_MERGE_PREP_02_SOURCE_GATE.json'),'utf8'));
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const phase=process.env.RC2_GATE_PHASE||'premerge';
if(!['premerge','postdeploy'].includes(phase))throw Error('INVALID_RELEASE_PHASE');
if(cfg.h01.status!=='HIFI06_ABANDONED')throw Error('HIFI06_RETIREMENT_NOT_RECORDED');
const blockers=[],warnings=[];
const routeFiles=[['CAP','cap.html'],['ITEMS','items.html']];
for(const [name,file] of routeFiles){
 const filepath=path.join(root,file);
 const bytes=fs.existsSync(filepath)?fs.statSync(filepath).size:0;
 if(bytes<100)blockers.push(name+'_HTML_NOT_IMPLEMENTED_OR_EMPTY ('+bytes+' bytes)');
}
if(cfg.h01.next_final_visual==='NOT_SELECTED')warnings.push('H01_VISUAL_MOTHERBOARD_NOT_SELECTED; current H01 is demonstration-only');
if(cfg.h01.final_signoff!=='PASSED')blockers.push('H01_FINAL_VISUAL_NOT_SIGNED_OFF (does not require retired HIFI-06)');
if(cfg.s01.visual_state!=='FINAL_SIGNED_OFF')blockers.push('S01_FOUR_FILTER_VISUAL_MANUAL_SIGNOFF_PENDING');
if(cfg.release.allow_merge_main!==true)blockers.push('EXPLICIT_MERGE_AUTHORIZATION_MISSING');
if(cfg.release.allow_deploy!==true)blockers.push('EXPLICIT_DEPLOY_AUTHORIZATION_MISSING');
if(phase==='postdeploy'&&!cfg.release.postdeploy_commit_sha)blockers.push('POSTDEPLOY_COMMIT_SHA_NOT_VERIFIED');
const result={id:'RC2-MERGE-PREP-04',phase,status:blockers.length?'HOLD':'PASS',blockers,warnings,
 hifi06:'ABANDONED_NOT_A_REQUIRED_SOURCE',rc1_original_freeze:'UNCHANGED',
 isolated_business_qa:cfg.release.allow_isolated_business_qa===true?'ALLOWED':'HOLD',
 merge_permitted:blockers.length===0&&cfg.release.allow_merge_main===true,
 deploy_permitted:blockers.length===0&&cfg.release.allow_deploy===true};
const target=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-04/release-gate.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));if(blockers.length)process.exitCode=2;
