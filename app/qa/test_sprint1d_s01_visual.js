const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'prototype','mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const html=fs.readFileSync(file,'utf8');
const body=html.slice(html.indexOf('<body>'));
const sha=crypto.createHash('sha256').update(body).digest('hex');
const expected=require('./phase3b_approved_delta.json').runtime['mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'].body_with_tag_sha; // Phase 3B authorized S01 body
function ok(cond,msg){if(!cond){console.error('FAIL',msg);process.exit(1)}console.log('PASS',msg)}
ok(sha===expected,'S01 body matches the accepted service-filter interaction baseline');
ok(html.includes('id="sprint1d-s01-high-fidelity-visual-closure-v1"'),'Sprint 1D visual-only style layer exists');
ok(html.includes('--bg:#FDFBF7!important') && html.includes('--primary:#2F6B4F!important') && html.includes('--v274-orange:#D56A1C!important'),'S01 maps to frozen Visual Design System colors');
ok(html.includes('.location-context.location-search-combined{margin:10px 16px 0!important'),'location + search uses one high-fidelity discovery surface');
ok(html.includes('.v274-demand-state .demand-price{position:relative!important'),'demand price footer uses aligned recommendation hierarchy');
ok(html.includes('.v274-demand-state .demand-total{grid-area:total!important') && html.includes('font-size:28px!important') && html.includes('color:#D56A1C!important'),'contract total remains the dominant demand-card price');
ok(html.includes('.estore-list-card .estore-list-badge') && html.includes('white-space:nowrap!important'),'EStore labels remain single-line');
ok(html.includes('.zero-match-recovery{margin:0 0 10px!important'),'NOMATCH recovery visual treatment exists');
