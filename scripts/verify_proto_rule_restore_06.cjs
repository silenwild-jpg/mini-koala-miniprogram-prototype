#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir='app/prototype/parallel/core-journey-fix-01/demo/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gate=JSON.parse(read('docs/RC2_MERGE_PREP_02_SOURCE_GATE.json'));
const master=path.join(root,gate.h01.approved_master_repo_path);
const checksum=crypto.createHash('sha256').update(fs.readFileSync(master)).digest('hex');
assert.equal(checksum,gate.h01.approved_master_sha256,'H01 VIS-11J source SHA mismatch');
assert.equal(gate.h01.approved_master_git_blob,'ba9995b7ca50079549d3e69ffde2bb3bdb7e4ee3');
assert.equal(gate.h01.next_final_visual,'VIS-11J');assert.equal(gate.h01.status,'HIFI06_ABANDONED');
const home=read(dir+'home-bridge.js'),app=read(dir+'app.js'),shell=read('app/central-review-02g.html'),items=read(dir+'items-bridge.js');
const s01=read(dir+'s01-r2-live.html'),contract=read(dir+'central-contract.js');
for(const w of [375,390]){
 for(const prefix of ['hero_original','tasks_display','below_original','nav_original']){
  const filename=prefix+'_'+w+'.png';
  assert(fs.statSync(path.join(root,dir,'assets',filename)).size>1000,'H01 runtime slice absent '+filename);
  assert(home.includes(filename.replace('_'+w,'.png','_${suffix}.png')),'H01 not using source slice '+filename);
 }
}
assert.equal(gate.s01.filter_count,3);
assert.equal(gate.s01.single_entry,'R2_HIFI_S01_ONLY');
assert.match(app,/function canonicalS01Url\(/);
assert.match(app,/if\(next==='S01'\|\|r2Mode\(\)\)q\.set\('s01_r2','1'\)/);
assert.match(shell,/if\(page==='S01'\)url\+=/);
assert.doesNotMatch(shell,/\['0','1'\]\.includes\(p\.get\('s01_r2'\)\)/);
assert.equal((home.match(/index\.html\?page=S01&s01_r2=1/g)||[]).length,2);
assert.match(home,/index\.html\?page=S02&store='\+card\.dataset\.simStore\+'&s01_r2=1'/);
assert.match(items,/index\\\.html\\\?page=S01\(\?:&s01_r2=1\)\?/);
assert.match(s01,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert(!/<div class="filter">价格/.test(s01));
assert(!/(?:^|[,{])\s*U01\s*:/.test(contract));
const receipt={result:'SOURCE_PASS',source_commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),h01:{approved_master_file:gate.h01.approved_master_repo_path,sha256:checksum,source_bytes:fs.statSync(master).size,source_integrity:'PASS',runtime_slices:'EIGHT_PRESENT',full_page_signoff:'HOLD'},s01:{active_entry:'R2_HIFI_ONLY',filters:['排序','距离','服务'],legacy_renderer:'UNREACHABLE_ARCHIVE',full_page_approved_image:'NOT_RECEIVED',full_page_visual_signoff:'HOLD'},no_main_merge:true,no_deployment:true};
const out=path.join(root,'release-evidence/rule-restore-06');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'source-visual-gate.json'),JSON.stringify(receipt,null,2)+'\n');
console.log('PROTO_RULE_RESTORE_06_SOURCE_PASS',JSON.stringify(receipt));
