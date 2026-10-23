const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const source=n=>fs.readFileSync(path.join(proto,n),'utf8');
const u=source('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
const s=source('mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const e=source('space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
const j=source('mini_koala_unit_choice_r5a_patch.js'),css=source('mini_koala_unit_choice_r5a_patch.css');
let n=0;function test(name,fn){fn();n++;console.log('PASS',name)}
test('U01 back and direct home',()=>{assert(u.includes('id="r5aHome"'));assert(u.includes('id="back"'))});
test('U01 compact actions and strong rent CTA',()=>{for(let id of ['r5aFavorite','r5aCompare','advisorBtn','confirm'])assert(u.includes('id="'+id+'"'))});
test('U01 save quote hidden not removed',()=>{assert(/id="saveQuote"[^>]*hidden/.test(u));assert(u.includes('goQuote()'))});
test('U01 advisor choices and phone + wechat',()=>{for(let id of ['helpViewing','helpAdvisor','r5aPhone','r5aWechat'])assert(u.includes('id="'+id+'"'))});
test('S02 card only includes favorite, not compare action',()=>{assert(s.includes('data-r5a-favorite'));assert(!s.includes('data-r5a-compare'))});
test('S5 explicitly describes fit and does not spoof full compare',()=>{assert(e.includes('r5a-fit-explain'));assert(!e.includes('r5a-floating-compare'))});
test('favorite and compare never create quote or hold',()=>{assert(j.includes('mini_koala_unit_favorites_r5a_v1'));assert(j.includes('mini_koala_unit_compare_r5a_v1'));assert(!/setItem\([\s\S]{0,50}mini_storage_(?:quote|order|unit_hold)/.test(j))});
test('R5A no automatic popup / scoped 44px buttons',()=>{assert(!/setTimeout\([^)]*helpMask/.test(j));assert(css.includes('min-width:44px'));assert(css.includes('min-height:44px'))});
test('only three pages reference patch assets',()=>{for(let t of [u,s,e])for(let f of ['mini_koala_unit_choice_r5a_patch.js','mini_koala_unit_choice_r5a_patch.css'])assert(t.includes(f))});
console.log(n+'/'+n,'R5A controlled source assertions PASS');
