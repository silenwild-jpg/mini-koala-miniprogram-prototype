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
[/suffix:amount\?'整期租金':'\/月起'/,app,'public monthly label'],
[/distance:hasVerifiedDistance\?Number\(s\.distance\)\.toFixed\(1\)\+'km':v\.distance/,app,'fixture distance for visual display'],
[/const hasVerifiedDistance=!!F\.distanceVerified/,app,'distance truth source'],
[/priceBox\.dataset\.priceKind=u\.priceKind/,bind,'price status binding'],
[/\.price-secondary/,bind,'secondary binding'],
[/distance\.dataset\.verified/,bind,'location a11y state'],
[/\.price \.price-secondary/,html,'secondary price style'],
[/\.km\[data-verified="false"\]/,html,'unverified distance style']
];
for(const [pattern,text,label] of parts)assert.match(text,pattern,label);
assert.match(view,/index===0\?1\.2:index===1\?3\.6/,'demo kilometers must render');
assert.doesNotMatch(html,/演示\s*[0-9]+\.[0-9]+km/,'no demo disclaimers in user interface');
assert.equal((html.match(/<div class="filter">/g)||[]).length,4,'S01 four-filter visual frozen');
for(const [name,str] of [['app',app],['bridge',bind],['html',html]]) assert.doesNotMatch(str,/参考价|仅供参考|月租参考|定位后显示/,name+' should not show disclaimer');
for(const name of ['assets/s01-r2-a-1.webp','assets/s01-r2-a-2.webp']){
  const bytes=fs.readFileSync(path.join(base,name));
  assert(bytes.length>5000,'approved R2 photo is missing or unexpectedly small: '+name);
  assert.equal(bytes.toString('ascii',0,4),'RIFF','approved R2 photo header');
  assert.equal(bytes.toString('ascii',8,12),'WEBP','approved R2 photo encoding');
}
assert.match(bind,/photo\.src=s\.photo/,'source-preserved photos must be runtime bound');
console.log('RC2_MERGE_PREP_07_CONTRACT_PASS',JSON.stringify({checks:parts.length+4,formalGate:'PHONE_AND_TERM',main:'FULL_TERM_RENT',secondary:'MONTHLY_AVERAGE',noLocation:'PRESET_DEMO_KILOMETERS',hifi06:'ABANDONED'}));
