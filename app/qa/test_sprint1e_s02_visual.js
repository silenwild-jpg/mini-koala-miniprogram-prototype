const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'prototype','mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const html=fs.readFileSync(file,'utf8');
const body=html.slice(html.indexOf('<body>'));
const sha=crypto.createHash('sha256').update(body).digest('hex');
const expected=require('./phase3b_approved_delta.json').runtime['mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'].body_with_tag_sha; // Phase 3B authorized S02 body
function ok(cond,msg){if(!cond){console.error('FAIL',msg);process.exit(1)}console.log('PASS',msg)}
ok(sha===expected,'S02 body matches the accepted store-detail interaction baseline');
ok(html.includes('id="sprint1e-s02-high-fidelity-visual-closure-v1"'),'Sprint 1E visual-only style layer exists');
ok(html.includes('--bg:#FDFBF7!important')&&html.includes('--primary:#2F6B4F!important')&&html.includes('--v274-orange:#D56A1C!important'),'S02 maps to frozen Visual Design System colors');
ok(html.includes('.store-overview{margin:10px 12px 0!important')&&html.includes('border-radius:16px!important'),'store identity is a high-fidelity fact surface');
ok(html.includes('.store-detail-address{max-width:245px!important')&&html.includes('text-overflow:ellipsis!important'),'detailed address remains visible and safely truncated');
ok(html.includes('.role.special-price{background:#FFF0E2!important')&&html.includes('white-space:nowrap!important'),'browse second-unit special-price tag is single-line and price-coded');
ok(html.includes('.unit-price{font-size:21px!important')&&html.includes('color:#D56A1C!important'),'unit monthly price has a clear warm-orange hierarchy');
ok(html.includes('#allUnits{margin:13px auto 0!important')&&html.includes('border-radius:999px!important'),'view-more-units stays centered under default unit cards');
ok(html.includes('.term-option.active{border-color:#B8D2C1!important')&&html.includes('.term-option small{right:-3px!important'),'term selector and discount badges follow the frozen component language');
ok(html.includes('.bottombar{height:74px!important')&&html.includes('.bottombar .primary{border:1px solid #2F6B4F!important'),'bottom decision actions retain one primary hierarchy');
