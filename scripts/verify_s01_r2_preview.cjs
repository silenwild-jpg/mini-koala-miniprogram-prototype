'use strict';
const fs=require('node:fs'), assert=require('node:assert/strict'), cp=require('node:child_process');
const git=(...xs)=>cp.execFileSync('git',xs,{encoding:'utf8'}).trim();
const base='274c5110aa18af7ed71d92533ab126ebbbd11f75', root='app/prototype/parallel/core-journey-fix-01/';
assert.equal(process.env.CONTEXT,'deploy-preview','Preview context required');
assert.equal(process.env.REVIEW_ID,'33','Only PR #33 can build S01 R2 candidate');
assert.equal(process.env.BRANCH,'isolate/proto-merge-02b-s01-r2-rc1p1-20261030');
assert.equal(process.env.MK_REVIEW_VERSION,'DEMO-MK-S01-R2-CANDIDATE-20261030');
assert.equal(git('merge-base',base,'HEAD'),base);
const expected=[
'app/central-review-02g.html',
root+'demo/app.js',root+'demo/assets/s01-r2-a-1.webp',root+'demo/assets/s01-r2-a-2.webp',
root+'demo/br04/bridge.js',root+'demo/index.html',root+'demo/phone-auth.js',root+'demo/review-clean.css',
root+'demo/s01-r2-bind.js',root+'demo/s01-r2-content.js',root+'demo/s01-r2-live.html',
root+'qa/prepare_vis03c.py',root+'qa/test_vis_rebuild_03b.cjs',root+'qa/test_vis_rebuild_03c.cjs',
].sort();
const actual=git('diff','--name-only',base,'HEAD','--','app').split('\n').filter(Boolean).sort();
assert.deepEqual(actual,expected,'Unapproved app changes in preview');
for(const p of [
'data/store_master.json','prototype/parallel/core-journey-fix-01/demo/demo-core.js',
'prototype/parallel/core-journey-fix-01/demo/fixtures.js','prototype/parallel/core-journey-fix-01/demo/phone-gate.js',
'prototype/parallel/core-journey-fix-01/demo/central-contract.js','prototype/parallel/core-journey-fix-01/demo/br03-policy.js',
'prototype/parallel/core-journey-fix-01/demo/cap-bridge.js','prototype/parallel/core-journey-fix-01/demo/items-bridge.js',
'prototype/parallel/core-journey-fix-01/demo/br04/s5/index.html'
])assert.equal(git('rev-parse','HEAD:app/'+p),git('rev-parse',base+':app/'+p),'Protected source changed: '+p);
const js=fs.readFileSync(root+'demo/app.js','utf8');
assert(js.includes("const CENTRAL_DEMO_BASE=new URL('.',document.currentScript.src)"));
assert(js.includes("window.location.assign(new URL(itemsFlow?'items.html':'cap.html',CENTRAL_DEMO_BASE).href)"));
assert(js.includes('s01-r2-frame'));
const s=fs.readFileSync(root+'demo/s01-r2-live.html','utf8');
assert(s.includes('.order{background:#0daf72'));
assert(!s.includes('linear-gradient(100deg,#15b584 0%,#0aa869 100%)'));
assert.equal((s.match(/class="store-card"/g)||[]).length,2);
assert.equal((s.match(/class="unit"/g)||[]).length,4);
assert.equal((s.match(/class="filter"/g)||[]).length,3);
assert(s.includes('演示 1.2km')&&s.includes('演示 3.6km'));
console.log('PROTO_MERGE_02E_R1_PREVIEW_GUARD_PASS',git('rev-parse','HEAD'));
