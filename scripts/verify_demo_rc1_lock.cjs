'use strict';
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const lock=JSON.parse(fs.readFileSync(path.join(root,'docs/demo-mk-rc1.lock.json'),'utf8'));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
assert.equal(lock.version,'DEMO-MK-RC1-20261027');
const pinned=lock.freeze_source_commit;
const expectedTree=git('rev-parse',pinned+':app'),actualTree=git('rev-parse','HEAD:app');
assert.equal(actualTree,expectedTree,'RC1 app source/visual tree changed since PR #19: create a new candidate instead');
for(const [file,blob] of Object.entries(lock.source_blobs)){
 const actual=git('rev-parse','HEAD:'+file);
 assert.equal(actual,blob,'Frozen source blob changed: '+file);
}
for(const item of lock.baseline_pr_chain){
 execFileSync('git',['merge-base','--is-ancestor',item.sha,'HEAD'],{cwd:root,stdio:'pipe'});
}
execFileSync('git',['merge-base','--is-ancestor',lock.original_main_commit,'HEAD'],{cwd:root,stdio:'pipe'});
const stores=JSON.parse(fs.readFileSync(path.join(root,'app/data/store_master.json'),'utf8'));
assert.equal(stores.stores.length,126);
assert.equal(stores.meta.size_option_count,766);
const source=fs.readFileSync(path.join(root,'app/prototype/parallel/core-journey-fix-01/demo/fixtures.js'),'utf8');
assert(source.includes("version:'MK_LEGACY_OPTIONS_20260929_02J'"));
assert(source.includes("sessionStorage.getItem('mk_active_catalog_v1')==='MK'"));
const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
assert(html.includes('central-review-02g.html?catalog=mk'));
const summary={version:lock.version,status:'PASS',app_tree:actualTree,source_commit:pinned,pr_ancestors:lock.baseline_pr_chain.length,
 original_store_count:stores.stores.length,original_option_count:stores.meta.size_option_count,
 master_signed_visuals:false,main_merge_authorized:false};
const folder=path.join(root,'release-evidence/merge02l');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'lock-verification.json'),JSON.stringify(summary,null,2));
console.log('RC1_FREEZE_PASS',JSON.stringify(summary));
