const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const pages=[
 'mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
 'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'
];
const expectedBody={
 'mini_storage_home_H01_Visual_V2_7_4_SSOT.html':'8c759f6e12932a37aef4a3c6bc403301510a632581dda6aae269304a4ddd2d94',
 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html':'af97dc33fcdec812dcdf26fbd659d80de81fabff503ad5812b3bab64ce8a818a',
 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html':'380d92f2b1632c93eaea496dc33e031e3dab52cd1a3fade6f6cab252e8413ff8',
 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html':'f9f9907af9b7460a75d032b8fcc6dc0c750e1dc5e4948d1ec8247d7883830ebf',
 'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html':'869bd86e73864f6defbffba3f1c2dd04031e0acde0e78bf11b0c65b44e9715b5'
};
// Keep original historical hashes above; overlay only the two explicitly approved Phase 3B pages.
const phase3b=require('./phase3b_approved_delta.json');
for(const [file,record] of Object.entries(phase3b.runtime))expectedBody[file]=record.body_inner_sha;
for(const [file,record] of Object.entries(require('./phase3b_batch_c_approved_delta.json').runtime))expectedBody[file]=record.body_inner_sha;
function bodyHash(s){const m=s.match(/<body\b[^>]*>([\s\S]*)<\/body>/);if(!m)throw new Error('body missing');return crypto.createHash('sha256').update(m[1]).digest('hex')}
for(const f of pages){
 const s=fs.readFileSync(path.join(proto,f),'utf8');
 if(!s.includes('mini_storage_visual_harmonization_v1.css')||!s.includes('mini_storage_visual_harmonization_v1.js'))throw new Error(`${f}: harmonization assets missing`);
 if(bodyHash(s)!==expectedBody[f])throw new Error(`${f}: body changed`);
 const head=s.split('</head>')[0];
 if(/#8A938E/i.test(head))throw new Error(`${f}: old tertiary token remains in head`);
}
const css=fs.readFileSync(path.join(proto,'mini_storage_visual_harmonization_v1.css'),'utf8');
const js=fs.readFileSync(path.join(proto,'mini_storage_visual_harmonization_v1.js'),'utf8');
if(!css.includes('#6D7671'))throw new Error('tertiary token missing');
if(!css.includes('#FFF0E2')||!css.includes('#B85A16'))throw new Error('promotion semantics missing');
for(const k of ['mk-icon-pin','mk-icon-drive','mk-icon-bike','mk-icon-walk'])if(!css.includes(k))throw new Error(`icon css missing ${k}`);
for(const k of ["'🚗':'drive'","'🚲':'bike'","'🚶':'walk'","'📍':'pin'"])if(!js.includes(k))throw new Error(`icon decorator mapping missing ${k}`);
if(!js.includes("includes('特价')"))throw new Error('promo decorator missing');
console.log('PASS sprint1g core visual harmonization: body frozen, tertiary/promo/icon semantics unified');
