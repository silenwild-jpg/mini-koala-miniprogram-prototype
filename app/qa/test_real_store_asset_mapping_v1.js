const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const manifestPath=path.join(root,'assets','real_store_demo','real_store_asset_manifest_v1.json');
assert(fs.existsSync(manifestPath),'asset manifest exists');
const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert.equal(m.version,'real_store_demo_mapping_v1');
const expected={MK_BJ_E56D0702:'green_gloss',MK_BJ_E68EC5FF:'black_yellow',MK_BJ_04547515:'white',MK_BJ_2CDB7BEE:'charcoal',MK_BJ_9A80090D:'green_teal'};
for(const [id,color] of Object.entries(expected)){
  assert(m.stores[id],`${id} mapping exists`);
  assert.equal(m.stores[id].color_family,color,`${id} color family frozen`);
  for(const [k,v] of Object.entries(m.stores[id])) if(k.endsWith('_asset')) assert(fs.existsSync(path.join(root,v)),`${id} ${k} exists`);
}
const h01=fs.readFileSync(path.join(root,'prototype','mini_storage_home_H01_Visual_V2_7_4_SSOT.html'),'utf8');
const s01=fs.readFileSync(path.join(root,'prototype','mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const s02=fs.readFileSync(path.join(root,'prototype','mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),'utf8');
assert(h01.includes('real-store-asset-mapping-v1-home'),'H01 real asset style exists');
assert(h01.includes('MK_BJ_E56D0702/home_featured.webp'),'H01 first card uses approved real asset');
assert(s01.includes('real-store-asset-mapping-v1-s01'),'S01 mapping style exists');
for(const id of Object.keys(expected)) assert(s01.includes(`data-id="${id}"`)||s01.includes(`[data-id="${id}"]`),`S01 maps ${id}`);
assert(s02.includes('real-store-asset-mapping-v1-s02'),'S02 mapping style exists');
assert(s02.includes('real_store_asset_mapping_v1.js'),'S02 uses external mapping helper');
const before=JSON.parse(fs.readFileSync(path.join(root,'qa','real_asset_mapping_body_before.json'),'utf8'));
const currentFreeze=JSON.parse(fs.readFileSync(path.join(root,'qa','v15_current_body_freeze.json'),'utf8'));
const crypto=require('crypto');
for(const f of Object.keys(before)){
 const html=fs.readFileSync(path.join(root,'prototype',f),'utf8');
 const body=(html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)||[])[1]||'';
 const sha=crypto.createHash('sha256').update(Buffer.from(body,'utf8')).digest('hex');
 const expected=(require('./phase3b_approved_delta.json').runtime[f]?.body_inner_sha)||(currentFreeze[f]||before[f]).sha256;
 assert.equal(sha,expected,`${f} body matches accepted freeze`);
}
console.log('PASS real store asset mapping v1: 5 color families, assets, H01/S01/S02 wiring, bodies frozen');
