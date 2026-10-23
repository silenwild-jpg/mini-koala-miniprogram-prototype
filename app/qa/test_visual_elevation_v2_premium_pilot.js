const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const cssName='mini_koala_visual_elevation_v2_premium_pilot.css';
const css=fs.readFileSync(path.join(proto,cssName),'utf8');
const targets=[
 'mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'
];
function ok(cond,msg){if(!cond){console.error('FAIL',msg);process.exit(1)}console.log('PASS',msg)}
for(const f of targets){const s=fs.readFileSync(path.join(proto,f),'utf8');ok(s.includes(cssName),`${f} loads premium pilot stylesheet`)}
ok(css.includes('--ve2-deep:#183E30'),'deep premium brand token');
ok(css.includes('--ve2-copper:#C86424'),'restrained copper price token');
ok(css.includes('#newHero .hero-photo'),'H01 editorial hero treatment');
ok(css.includes('#s5 .rplan-price'),'recommendation decision hierarchy');
ok(css.includes('#hero{'),'S02 spatial hero treatment');
ok(css.includes('#inventorySection'),'S02 inventory de-card treatment');
// Scope guard: no transaction/lifecycle pages should load the experimental stylesheet.
const htmls=fs.readdirSync(proto).filter(x=>x.endsWith('.html'));
const unexpected=htmls.filter(f=>!targets.includes(f)&&fs.readFileSync(path.join(proto,f),'utf8').includes(cssName));
ok(unexpected.length===0,'premium pilot stylesheet scoped to exactly three pilot pages');
console.log('VISUAL ELEVATION V2 PREMIUM PILOT GUARD PASS');
