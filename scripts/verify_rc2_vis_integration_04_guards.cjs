#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const R2=require(path.join(root,'s01-r2-content.js'));
assert.equal(R2.distanceOf({distance:1.2}), '', 'Unknown distance must not display');
assert.equal(R2.distanceOf({distance:1.2},false), '', 'Unverified distance must not display');
assert.equal(R2.distanceOf({distance:1.2},true), '1.2km', 'Verified distance must display');
assert.equal(R2.distanceOf({distance:null},true), '', 'Missing verified distance must not display');
assert.equal(R2.view({district:'朝阳区',address:'真实地址',serviceTags:[],photo:'x.webp',distance:10},0).distance,'','R2 view leaked synthetic kilometers');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'s01-r2-live.html'),'utf8');
assert(app.includes('distanceFilterEnabled:!!F.distanceVerified'), 'Unverified radius UI enabled');
assert(app.includes('if(visual.sort===\'distance\'&&F.distanceVerified)'), 'Distance sort guard missing');
assert(app.includes('if(r2Filters.maxKm!==null&&F.distanceVerified)'), 'Radius filter guard missing');
assert(app.includes('R2.distanceOf(s,true)'), 'Verified distance comparator missing');
assert(!app.includes('STABLE_DEMO_DISTANCE'), 'Fake distance source still advertised');
assert(html.includes('object-fit:cover;object-position:center'), 'S01 warehouse photos are stretched');
console.log('RC2_VIS_INTEGRATION_04_STATIC_SOURCE_GUARDS_PASS');
