#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'..'),rt=path.join(repo,'app/prototype/parallel/core-journey-fix-01/demo');
const base=path.join(rt,'assets/store-curated/v1');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'mapping_manifest.json'),'utf8'));
assert.equal(manifest.version,'RC2-STORE-IMAGE-MAP-01');
assert.equal(manifest.no_production_store_claim,true);
const keys=Object.keys(manifest.sim_store_mappings);
assert.equal(keys.length,12);
const sourceFiles=new Set(),origins=new Set();
for(const [id,row] of Object.entries(manifest.sim_store_mappings)){
 assert.equal(row.identity_verified,false,id);
 assert.equal(row.role,'GENERIC_BRAND_WAREHOUSE_ENVIRONMENT_DEMO',id);
 assert(!sourceFiles.has(row.source),'duplicated selected source image '+row.source);
 sourceFiles.add(row.source);
 for(const kind of ['card','hero']){
  const v=row.variants[kind];
  const fp=path.join(rt,v.relative);
  assert.equal(path.resolve(fp).startsWith(path.resolve(rt)+path.sep),true);
  assert(fs.existsSync(fp),'missing source asset '+fp);
  const b=fs.readFileSync(fp);
  assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WEBP');
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),v.sha256,'hash drift '+fp);
  assert.equal(b.length,v.bytes,'byte drift '+fp);
  assert(v.dimensions[0]>300&&v.dimensions[1]>300);
  origins.add(v.relative);
 }
}
require(path.join(rt,'fixtures.js'));
const data=globalThis.SIM_FIXTURES;
for(const id of keys){
 const row=data.stores.find(s=>s.id===id); assert(row,id);
 assert.equal(row.photo,'store-curated/v1/'+id+'/card.webp');
 assert.equal(row.photoDetail,'store-curated/v1/'+id+'/hero.webp');
 assert.deepEqual(row.photoGallery,[row.photoDetail]);
 assert.equal(row.photo_identity_verified,false);
 assert.equal(row.photo_source,'USER_SUPPLIED_ENVIRONMENT_GENERIC_DEMO_NOT_PHYSICAL_STORE_VERIFIED');
 assert(row.photoLegacy&&/^store_/.test(row.photoLegacy));
}
const assetsDir=path.join(rt,'assets/store-curated/v1');
const allAssets=fs.readdirSync(assetsDir,{recursive:true}).filter(x=>x.endsWith('.webp'));
assert.equal(allAssets.length,24);
const home=fs.readFileSync(path.join(rt,'home-bridge.js'),'utf8');
const s01=fs.readFileSync(path.join(rt,'s01-r2-content.js'),'utf8');
const s02=fs.readFileSync(path.join(rt,'app.js'),'utf8');
assert(home.includes('assets/${x.photo}'));
assert(s01.includes('store-curated'));
assert(s02.includes('s.photoGallery'));
assert(s02.includes("photos.length===1?'hidden'"));
console.log('RC2_STORE_IMAGE_MAP_01_SOURCE_PASS',JSON.stringify({stores:keys.length,photos:sourceFiles.size,derivatives:origins.size,identityVerified:false}));
