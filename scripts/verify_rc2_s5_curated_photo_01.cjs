#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../release-evidence/rc2-final-admission-01/site/prototype/parallel/core-journey-fix-01/demo');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/store-curated/v1/mapping_manifest.json'),'utf8'));
const all=Object.entries(manifest.sim_store_mappings),failures=[];
for(const [id,x] of all){
 const asset=path.join(root,x.variants.hero.relative);
 if(!fs.existsSync(asset)){failures.push(id+':missing');continue;}
 const b=fs.readFileSync(asset),hash=crypto.createHash('sha256').update(b).digest('hex');
 if(hash!==x.variants.hero.sha256)failures.push(id+':sha256');
 if(b.subarray(0,4).toString()!=='RIFF'||b.subarray(8,12).toString()!=='WEBP')failures.push(id+':encoding');
 if(x.variants.hero.dimensions[0]!==1152||x.variants.hero.dimensions[1]!==720)failures.push(id+':not_landscape');
}
console.log(JSON.stringify({pass:!failures.length,photos:all.length,source:'PR57 user-provided photos',identity_verified:false,failures}));
if(failures.length||all.length!==12)process.exitCode=1;
