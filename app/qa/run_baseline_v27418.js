const {spawnSync}=require('child_process');const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),qa=__dirname;
const runtime={
 'test_ssot.js':['prototype/mini_storage_business_ssot_v274.js'],
 'test_o01_runtime.js':['prototype/mini_storage_business_ssot_v274.js','prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html'],
 'test_viewing_runtime.js':['prototype/mini_storage_business_ssot_v274.js','prototype/mini_storage_viewing_v01_v1_14_self_service_synced.html','prototype/mini_storage_viewing_v02_v1_14_self_service_synced.html']
};
const files=fs.readdirSync(qa).filter(x=>/^test_.*\.js$/.test(x)).sort();let failed=[];
for(const f of files){const args=[path.join(qa,f),...(runtime[f]||[]).map(x=>path.join(root,x))];const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});process.stdout.write(`\n=== ${f} ===\n${r.stdout||''}${r.stderr||''}`);if(r.status!==0)failed.push(f)}
if(failed.length){console.error(`\nBASELINE FAIL ${failed.length}: ${failed.join(', ')}`);process.exit(1)}
console.log(`\nBASELINE PASS: ${files.length} authoritative JS tests green`);
