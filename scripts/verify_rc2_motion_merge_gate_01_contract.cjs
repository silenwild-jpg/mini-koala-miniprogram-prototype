#!/usr/bin/env node
/* RC2-MOTION-MERGE-GATE-01 | Immutable navigation visual source + existing motion business runtime. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const navSHA='831d95f0cd930f0c30736d701037791df5a72ec1';
const motionSHA='725add5970fb865cc88c661caf64d6a541d1946e';
const prefix='app/prototype/parallel/core-journey-fix-01/demo/';
const get=rel=>fs.readFileSync(path.join(root,prefix,rel));
const prior=(sha,rel)=>cp.execFileSync('git',['show',sha+':'+prefix+rel],{cwd:root,maxBuffer:20*1024*1024});
const same=(a,b,reason)=>assert(a.equals(b),reason);
const pinned=[
  'home.html','visual-align.css','h01-state-impl-01.js','h01-state-impl-01.css',
  'assets/nav_original_375.png','assets/nav_original_390.png',
  'assets/nav-current-01c/home-active.svg','assets/nav-current-01c/home-inactive.svg',
  'assets/nav-current-01c/stores-active.svg','assets/nav-current-01c/stores-inactive.svg',
  'assets/nav-current-01c/calendar-active.svg','assets/nav-current-01c/calendar-inactive.svg',
  'assets/nav-current-01c/mine-active.svg','assets/nav-current-01c/mine-inactive.svg'
];
for(const file of pinned)same(get(file),prior(navSHA,file),'NAV_VISUAL_SOURCE_DRIFT: '+file);
const app=get('app.js').toString('utf8'),old=prior(navSHA,'app.js').toString('utf8');
function footer(src){
  const start=src.indexOf('function footer(){'),end=src.indexOf('function visualDemand(){',start);
  assert(start>=0&&end>start,'footer source bounds unavailable');return src.slice(start,end);
}
assert.equal(footer(app),footer(old),'BOTTOM_NAV_RUNTIME_DRIFT');
assert(app.includes("['home','首页','home']")&&app.includes("['go','附近门店','stores','S01']"),'missing four-entry bottom nav');
const h01=get('h01-state-impl-01.js').toString('utf8')+get('h01-state-impl-01.css').toString('utf8');
assert(!/h01FlowContext|h01StageProgress|h01SceneImage|h01-scene-image|h01-stage-progress/.test(h01),'H01_REJECTED_AC_RETURNED');
assert(app.includes('function s5OriginDistances()'),'S5 selected origin not inherited by S01');
assert(app.includes('S5_SELECTED_ORIGIN_PROPERTY'),'S01 location source key missing');
assert(get('br04/bridge.js').toString('utf8').includes('ui.s5MapOrigin=origin'),'S5 map location missing');
assert(get('s01-r2-bind.js').toString('utf8').includes('s01-motion-micro-01b.css'),'S01 micro-interaction missing');
const delta=cp.execFileSync('git',['diff','--name-only',motionSHA,'HEAD','--','app/'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(delta,'','APP_RUNTIME_CHANGED_AFTER_PR168');
console.log(JSON.stringify({status:'PASS',navSourceSHA:navSHA,motionBaseSHA:motionSHA,
  pinnedBinaryAndTextAssets:pinned.length,footerSource:'identical',appDeltaFromPR168:'none',
  h01RejectedAC:'absent',s5ToS01MapOrigin:'preserved'}));
