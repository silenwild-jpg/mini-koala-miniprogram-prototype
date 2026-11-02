#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const read=f=>fs.readFileSync(path.join(base,f),'utf8');
const app=read('app.js'),view=read('s01-r2-content.js'),bind=read('s01-r2-bind.js'),html=read('s01-r2-live.html');
const parts=[
[/const formal=core\.authorized\(\)&&r\.term_confirmed/,app,'formal price gate'],
[/core\.formalAmounts\(\[u\.id\],r\.term_months\)/,app,'O01 equivalent price source'],
[/amount\?amount\.rent_total:referenceCost\(\[u\.id\]\)/,app,'whole period or unverified monthly'],
[/amount\.monthly_average/,app,'monthly secondary amount'],
[/suffix:amount\?'整期租金':'月租参考'/,app,'unverified price label'],
[/distance:hasVerifiedDistance\?Number\(s\.distance\)\.toFixed\(1\)\+'km':'定位后显示'/,app,'trusted distance gating'],
[/const hasVerifiedDistance=!!F\.distanceVerified/,app,'distance truth source'],
[/priceBox\.dataset\.priceKind=u\.priceKind/,bind,'price status binding'],
[/\.price-secondary/,bind,'secondary binding'],
[/distance\.dataset\.verified/,bind,'location a11y state'],
[/\.price \.price-secondary/,html,'secondary price style'],
[/\.km\[data-verified="false"\]/,html,'unverified distance style']
];
for(const [pattern,text,label] of parts)assert.match(text,pattern,label);
assert.doesNotMatch(view,/index===0\?1\.2|index===1\?3\.6/,'card-order synthetic kilometers forbidden');
assert.doesNotMatch(html,/<span class="km">\s*(?:演示|1\.2|3\.6)/,'hard-coded kilometers forbidden');
assert.equal((html.match(/<div class="filter">/g)||[]).length,4,'S01 four-filter visual frozen');
const master=/s01-r2-a-(?:1|2)\.webp/g;
assert.equal([...html.matchAll(master)].length>=2,true,'approved R2 images still referenced');
console.log('RC2_MERGE_PREP_07_CONTRACT_PASS',JSON.stringify({checks:parts.length+4,formalGate:'PHONE_AND_TERM',main:'FULL_TERM_RENT',secondary:'MONTHLY_AVERAGE',noLocation:'定位后显示',hifi06:'ABANDONED'}));
