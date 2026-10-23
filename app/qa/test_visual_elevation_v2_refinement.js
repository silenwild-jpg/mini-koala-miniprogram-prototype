const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const cssName='mini_koala_visual_elevation_v2_refinement_patch.css';
const targets=[
 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
 'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
 'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
 'mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html',
 'mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html'
];
function ok(c,m){if(!c){console.error('FAIL',m);process.exit(1)}console.log('PASS',m)}
const css=fs.readFileSync(path.join(proto,cssName),'utf8');
targets.forEach(f=>ok(fs.readFileSync(path.join(proto,f),'utf8').includes(cssName),`${f} loads refinement css`));
ok(css.includes('#s5 .rplan-pricebox'),'recommendation stable price layout present');
ok(css.includes('grid-template-areas'),'recommendation price grid areas present');
ok(css.includes('.estore-list-card'),'EStore emphasis rules present');
ok(css.includes('body:has(#payableTotal) .order-card'),'O01 de-card rules present');
ok(css.includes('body:has(#statusIcon) .order'),'O02 de-card rules present');
ok(css.includes('body:has(#statusTag) .rows'),'O03 recurring rows flattened');
const before=JSON.parse(fs.readFileSync(path.join(__dirname,'v2_refinement_body_before.json'),'utf8'));
const after=JSON.parse(fs.readFileSync(path.join(__dirname,'v2_refinement_body_after.json'),'utf8'));
for(const f of Object.keys(before)) ok(before[f]===after[f],`${f} body byte-identical`);
console.log('VISUAL ELEVATION V2 REFINEMENT GUARD PASS');
