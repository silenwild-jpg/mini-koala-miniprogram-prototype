const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets','real_store_demo','real_store_gallery_manifest_v2.json'),'utf8'));
assert.equal(manifest.version,'real_store_demo_gallery_v2');
const expected={MK_BJ_E56D0702:'green_gloss',MK_BJ_E68EC5FF:'black_yellow',MK_BJ_04547515:'white',MK_BJ_2CDB7BEE:'charcoal',MK_BJ_9A80090D:'green_teal'};
for(const [sid,color] of Object.entries(expected)){
  const s=manifest.stores[sid]; assert(s,`${sid} exists`); assert.equal(s.color_family,color,`${sid} color family frozen`);
  assert.equal(s.s02_gallery.length,4,`${sid} S02 has 4 gallery assets`);
  for(const asset of [...s.s02_gallery,s.u01_unit_entry,s.u01_unit_environment]){
    assert(asset.includes(`/v1/${sid}/`),`${sid} role asset stays inside same store color-family folder`);
    assert(fs.existsSync(path.join(root,asset)),`${sid} asset exists: ${asset}`);
  }
}
const css=fs.readFileSync(path.join(root,'assets','real_store_demo','v2','real_store_gallery_v2.css'),'utf8');
const js=fs.readFileSync(path.join(root,'assets','real_store_demo','v2','real_store_gallery_v2.js'),'utf8');
for(const sid of Object.keys(expected)){
  for(let i=0;i<4;i++) assert(css.includes(`data-real-store="${sid}"][data-s02-photo="${i}"]`),`${sid} S02 photo ${i} CSS exists`);
  for(let i=0;i<2;i++) assert(css.includes(`data-real-store="${sid}"][data-u01-photo="${i}"]`),`${sid} U01 photo ${i} CSS exists`);
}
assert(js.includes("data-s02-photo"),'S02 gallery state helper exists');
assert(js.includes("data-u01-photo"),'U01 photo state helper exists');
const targets=['mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html','mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'];
for(const f of targets){const html=fs.readFileSync(path.join(root,'prototype',f),'utf8');assert(html.includes('real_store_gallery_v2.css'),`${f} links V2 CSS`);assert(html.includes('real_store_gallery_v2.js'),`${f} links V2 JS`)}
const currentFreeze=JSON.parse(fs.readFileSync(path.join(root,'qa','v15_current_body_freeze.json'),'utf8'));
for(const [f,meta] of Object.entries(currentFreeze)){
  const html=fs.readFileSync(path.join(root,'prototype',f),'utf8');
  const body=(html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)||[])[1]||'';
  const sha=crypto.createHash('sha256').update(Buffer.from(body,'utf8')).digest('hex');
  assert.equal(sha,require('./phase3b_batch_c_approved_delta.json').runtime[f]?.body_inner_sha||require('./phase3b_approved_delta.json').runtime[f]?.body_inner_sha||meta.sha256,`${f} body matches approved Phase 3B or historical freeze`);
}
console.log('PASS real store gallery v2: 5 stores, 4-photo S02 galleries, 2-photo U01 heroes, single-color-family rule, frozen bodies');
