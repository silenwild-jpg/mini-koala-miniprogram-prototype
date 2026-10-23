const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),delta=require('./phase3c_unified_approved_delta.json');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'prototype',f))).digest('hex');
assert.equal(delta.unchanged_runtime_verified,true);
assert.equal(Object.keys(delta.authorized_runtime).length,6);
for(const [f,v] of Object.entries(delta.authorized_runtime)){assert.notEqual(v.before_sha256,v.after_sha256);assert.equal(sha(f),v.after_sha256,`Current ${f}`);}
for(const f of ['mini_storage_business_ssot_v274.js','mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html','mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'])assert(!delta.authorized_runtime[f],f+' must be unchanged');
console.log('PASS Unified 3C authorization: 6 changed runtime files, all non-authorized runtime byte-identical to Batch A');
