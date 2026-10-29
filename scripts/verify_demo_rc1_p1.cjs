'use strict';
// SITE-ACCESS-03D: preserve historical RC1 lock while permitting only approved S5 navigation hotfix.
// Does NOT rewrite scripts/verify_demo_rc1_lock.cjs or frozen original manifest.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const base='46cfdc8e8026098e20f988b8007c96b8f2be4789';
const approved='fece53d5f10a0146f2506b02f79f88289466a6d5';
const lock=JSON.parse(fs.readFileSync(path.join(root,'docs/demo-mk-rc1.lock.json'),'utf8'));
assert.equal(lock.version,'DEMO-MK-RC1-20261027');
assert.equal(git('rev-parse',base+':app'),git('rev-parse',lock.freeze_source_commit+':app'),'Original RC1 frozen app tree changed');
const app='app/prototype/parallel/core-journey-fix-01/demo/app.js';
const qa='app/prototype/parallel/core-journey-fix-01/qa/test_site_access_03c_browser.cjs';
const changed=git('diff','--name-only',base,'HEAD','--','app').split('\n').filter(Boolean).sort();
assert.deepEqual(changed,[app,qa].sort(),'Only approved S5 runtime file and accompanying test may differ from frozen RC1');
const normalize=s=>s.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
const original=normalize(git('show',base+':'+app));
const needle="  const KEY='mk_independent_sim_v1',UIKEY='mk_independent_sim_ui_v1';";
const intro=needle+"\n  // Resolve edit-demand navigation against this central runtime script, never an S5 child frame.\n  const CENTRAL_DEMO_BASE=new URL('.',document.currentScript.src);";
const from="location.href=itemsFlow?'items.html':'cap.html';";
const to="window.location.assign(new URL(itemsFlow?'items.html':'cap.html',CENTRAL_DEMO_BASE).href);";
assert.equal(original.split(needle).length,2,'Expected original constant only once');
assert.equal(original.split(from).length,2,'Expected original edit-demand route only once');
const expected=original.replace(needle,intro).replace(from,to);
const actual=normalize(fs.readFileSync(path.join(root,app),'utf8')).trimEnd();
assert.equal(actual,expected.trimEnd(),'S5 hotfix differs from approved minimal two-hunk change');
assert.equal(git('rev-parse','HEAD:'+qa),git('rev-parse',approved+':'+qa),'S5 QA source must match 03C verified PR');
for(const file of ['app/data/store_master.json','app/prototype/parallel/core-journey-fix-01/demo/fixtures.js','app/central-review-02g.html']){
 assert.equal(git('rev-parse','HEAD:'+file),git('rev-parse',base+':'+file),'Core RC1 catalog or central entry changed: '+file);
}
const record={version:'DEMO-MK-RC1-P1-20261029',status:'PASS',frozen_main:base,frozen_tree:git('rev-parse',base+':app'),approved_head:approved,changed_app_paths:changed,head:git('rev-parse','HEAD')};
const output=path.join(root,'release-evidence/site-access-03d');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'rc1-p1-integrity.json'),JSON.stringify(record,null,2));
console.log('RC1_P1_INTEGRITY_PASS',JSON.stringify(record));
