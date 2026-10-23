const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const cssName='mini_koala_visual_elevation_v2_controlled_rollout.css';
const targets=[
 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html','mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
 'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html','mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html','mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html','mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html',
 'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html','mini_storage_renew_rn01_v2_7_4.html','mini_storage_exit_ex01_v2_7_4.html','mini_storage_deposit_dp01_v2_7_4.html','mini_storage_order_history_oh01_v2_7_4.html','mini_storage_invoice_iv01_v2_7_4.html','mini_storage_business_b2b01_r113_Visual_V2_7_4.html'
];
function ok(c,m){if(!c){console.error('FAIL',m);process.exit(1)}console.log('PASS',m)}
const css=fs.readFileSync(path.join(proto,cssName),'utf8');
targets.forEach(f=>ok(fs.readFileSync(path.join(proto,f),'utf8').includes(cssName),`${f} loads controlled rollout css`));
ok(css.includes('--ve2-deep:#183E30'),'premium deep green token retained');
ok(css.includes('--ve2-copper:#C86424'),'premium copper price token retained');
ok(css.includes('body:has(#storeList)'),'S01 rollout rules present');
ok(css.includes('body:has(#contractTotal)'),'U01 rollout rules present');
ok(css.includes('body:has(#payableTotal)'),'transaction rollout rules present');
ok(css.includes('body:has(#primaryAssets)'),'lifecycle rollout rules present');
ok(css.includes('body:has(#contactName)'),'B2B rollout rules present');
const before=JSON.parse(fs.readFileSync(path.join(__dirname,'controlled_rollout_body_before.json'),'utf8'));
const after=JSON.parse(fs.readFileSync(path.join(__dirname,'controlled_rollout_body_after.json'),'utf8'));
for(const f of targets) ok(before[f]===after[f],`${f} body byte-identical`);
ok(fs.existsSync(path.join(root,'docs/visual/VISUAL_ELEVATION_V2_ASSET_DIRECTION.md')),'asset direction document present');
ok(fs.existsSync(path.join(root,'assets_direction/asset_manifest_v2.json')),'asset manifest present');
console.log('VISUAL ELEVATION V2 CONTROLLED ROLLOUT GUARD PASS');
