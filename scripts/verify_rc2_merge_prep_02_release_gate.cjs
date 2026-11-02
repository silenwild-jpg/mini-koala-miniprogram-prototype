#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const cfg=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/RC2_MERGE_PREP_02_SOURCE_GATE.json'),'utf8'));
const blockers=[];
if(cfg.h01.status!=='SOURCE_VERIFIED')blockers.push('H01 approved HIFI-06 HTML+WebP original not physically received');
if(!cfg.h01.verified_html_sha256||!cfg.h01.verified_webp_assets?.length)blockers.push('H01 signed source hashes missing');
if(cfg.release.allow_merge_main!==true)blockers.push('Explicit final merge authorization missing');
if(cfg.release.allow_deploy!==true)blockers.push('Explicit private deployment authorization missing');
if(!cfg.release.official_rc2_deployment_sha)blockers.push('RC2 real deployed commit not yet identified; post-deploy gate only');
const status={id:'RC2-MERGE-PREP-02',scope:'RELEASE_GATE',status:blockers.length?'HOLD':'PASS',blockers,
note:'Do not modify or relax frozen RC1-P1 checks. Draft QA may pass while release gate remains HOLD.'};
const out=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-02/release-gate.json');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(status,null,2));
console.log(JSON.stringify(status));if(blockers.length)process.exitCode=1;
