#!/usr/bin/env node
'use strict';
// Visible-route copy guard; separate from QA-only historical artifacts elsewhere in the repo.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,process.argv.includes('--packaged')?'../release-evidence/rc2-final-admission-01/site':'../app');
const runtime='prototype/parallel/core-journey-fix-01/demo/';
const files=[
 'central-review-02g.html',
 runtime+'app.js',runtime+'index.html',runtime+'home.html',runtime+'cap.html',
 runtime+'br04/s5/index.html',runtime+'br04/o01/index.html',runtime+'br04/bridge.js'
];
const banned=/模拟|演示|待核验|参考价/g,failures=[];
for(const name of files){
 // cap.html's 1.6 MB legacy toast is removed by the tracked build transform; validate it in packaged mode.
 if(!process.argv.includes('--packaged')&&name.endsWith('/cap.html'))continue;
 const target=path.join(root,name);
 if(!fs.existsSync(target)){failures.push({file:name,issue:'FILE_MISSING'});continue}
 const text=fs.readFileSync(target,'utf8');
 const terms=[...new Set([...text.matchAll(banned)].map(m=>m[0]))];
 if(terms.length)failures.push({file:name,terms});
}
console.log(JSON.stringify({pass:failures.length===0,root,checked:files.length-(process.argv.includes('--packaged')?0:1),failures},null,2));
if(failures.length)process.exitCode=1;
