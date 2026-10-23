const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const expected={
'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html':'af97dc33fcdec812dcdf26fbd659d80de81fabff503ad5812b3bab64ce8a818a',
'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html':'869bd86e73864f6defbffba3f1c2dd04031e0acde0e78bf11b0c65b44e9715b5',
'mini_storage_renew_rn01_v2_7_4.html':'79f10a622d7f9f4a7690a945c4a79cf7d5df160ebb3d0bdd8c7f67cf850b1d12',
'mini_storage_invoice_iv01_v2_7_4.html':'7fa19c18e70a5f6dda5aebb608a5261d0034b53f975a701c2eae47a360093a82',
'mini_storage_business_b2b01_r113_Visual_V2_7_4.html':'81853eae4a84f9f12a2047da397ecfd039fe244ecedb918f6fbde6a829ca1074'};
for(const [file,record] of Object.entries(require('./phase3b_batch_c_approved_delta.json').runtime))expected[file]=record.body_inner_sha;
function bodyHash(s){const m=s.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);return crypto.createHash('sha256').update(Buffer.from(m?m[1]:'')).digest('hex')}
for(const [f,h] of Object.entries(expected)){const s=fs.readFileSync(path.join(proto,f),'utf8');if(!s.includes('mini_koala_visual_elevation_v2_1_density.css'))throw new Error(f+' missing V2.1 density CSS');if(bodyHash(s)!==h)throw new Error(f+' body changed');}
const css=fs.readFileSync(path.join(proto,'mini_koala_visual_elevation_v2_1_density.css'),'utf8');
for(const token of ['#s2 .scene.selected','#hero + .card','#renewForm','#formCard','.field:has(#typeChips)','#termChips .chip small'])if(!css.includes(token))throw new Error('missing density rule '+token);
console.log('V2.1 density harmonization guard PASS: 5 target bodies frozen; visual rules present.');
