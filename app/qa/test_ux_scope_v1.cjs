const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const root=path.join(__dirname,'..');const s=JSON.parse(fs.readFileSync(path.join(__dirname,'ux_simplification_scope_v1.json')));
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
let changed=0, unchanged=0;
for(const [name,baseline] of Object.entries(s.previous_runtime_sha256)){
 const f=path.join(root,name),current=digest(f),allowed=s.approved_runtime_files.includes(name);
 if(allowed){assert.notEqual(current,baseline,`Authorized change missing: ${name}`);changed++}
 else{assert.equal(current,baseline,`Unauthorized runtime modification: ${name}`);unchanged++}
}
assert.equal(changed,7);console.log('PASS runtime scope:',changed,'approved modifications,',unchanged,'unchanged runtime files');
