'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),base='274c5110aa18af7ed71d92533ab126ebbbd11f75';
const demo='app/prototype/parallel/core-journey-fix-01/demo';
const abs=p=>path.join(root,p),read=p=>fs.readFileSync(abs(p),'utf8'),exists=p=>fs.existsSync(abs(p));
const resolveLocal=(from,raw)=>{
 if(!raw||/^(data:|https?:|\/\/|#|tel:|mailto:|javascript:)/i.test(raw)||raw.includes('$'+'{'))return null;
 const clean=raw.split('?')[0].split('#')[0];if(!clean||clean.endsWith('/'))return null;
 const out=path.posix.normalize(path.posix.join(path.posix.dirname(from),clean));
 return out.startsWith('../')?null:out;
};
const pages=['app/central-review-02g.html',demo+'/index.html',demo+'/home.html',demo+'/cap.html',demo+'/items.html',demo+'/business.html',demo+'/account.html',demo+'/s01-r2-live.html',demo+'/br04/reserve/index.html',demo+'/br04/quick/index.html',demo+'/br04/s5/index.html',demo+'/br04/o01/index.html'];
const css=new Set();let htmlRefs=0,cssRefs=0;
for(const file of pages){assert.ok(exists(file),'ENTRY_MISSING '+file);const s=read(file);
 for(const m of s.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)){const target=resolveLocal(file,m[1]);if(!target)continue;if(/\.css$/i.test(target))css.add(target);if(/\.(css|js|html|json|png|jpe?g|webp|svg|gif|woff2?|ttf)$/i.test(target)){assert.ok(exists(target),'HTML_DEPENDENCY_MISSING '+file+' -> '+m[1]+' ('+target+')');htmlRefs++;}}
}
for(const file of css){for(const m of read(file).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)){const target=resolveLocal(file,m[1]);if(!target)continue;assert.ok(exists(target),'CSS_ASSET_MISSING '+file+' -> '+m[1]+' ('+target+')');cssRefs++;}}
const required=['app/assets/branch01/VIS-11J_用户批准唯一视觉母版.png',demo+'/assets/nav_original_375.png',demo+'/assets/nav_original_390.png',demo+'/assets/s01-r2-a-1.webp',demo+'/assets/s01-r2-a-2.webp',demo+'/assets/brand_corridor_cropped.png',demo+'/br04/s5/assets/estore-existing-scene.webp',demo+'/store-geo.js',demo+'/space-unit.js',demo+'/lifecycle-contract.js',demo+'/lifecycle-ui.js',demo+'/promotion-policy.js',demo+'/m01-order-route-01.js',demo+'/br04/s5/location-ranker.js',demo+'/br04/s5/s5-native-flow.css'];
for(const p of required)assert.ok(exists(p),'REQUIRED_RUNTIME_DEPENDENCY_MISSING '+p);
for(const icon of ['home','stores','calendar','mine'])for(const state of ['active','inactive'])assert.ok(exists(demo+'/assets/nav-current-01c/'+icon+'-'+state+'.svg'),'NAV_ICON_MISSING '+icon+' '+state);
for(const tier of ['mini','small','medium','large']){assert.ok(exists(demo+'/assets/unit-r3/thumb/unit-r3-'+tier+'-336x312.webp'),'UNIT_THUMB_MISSING '+tier);assert.ok(exists(demo+'/assets/unit-r3/cap/unit-r3-'+tier+'-640x480.webp'),'UNIT_CAP_IMAGE_MISSING '+tier);}
const ids=['SIM_BJ01','SIM_BJ02','SIM_BJ03','SIM_BJ04','SIM_BJ05','SIM_BJ06','SIM_BJ07','SIM_BJ08','SIM_BJ09','SIM_SH01','SIM_SH02','SIM_SZ01'];
for(const id of ids){assert.ok(exists(demo+'/assets/store-curated/v1/'+id+'/card.webp'),'STORE_CARD_MISSING '+id);assert.ok(exists(demo+'/assets/store-curated/v1/'+id+'/hero.webp'),'STORE_HERO_MISSING '+id);}
const index=read(demo+'/index.html'),app=read(demo+'/app.js'),fixtures=read(demo+'/fixtures.js'),home=read(demo+'/home.html');
for(const token of ['gift-term-policy.js','promotion-policy.js','store-geo.js','space-unit.js','lifecycle-contract.js','lifecycle-ui.js','s01-r2-content.js','app.js'])assert.ok(index.includes(token),'INDEX_SCRIPT_NOT_WIRED '+token);
for(const token of ['nav-current-01c/','unit-r3/thumb/','s01-r2-live.html','M01'])assert.ok(app.includes(token),'APP_RUNTIME_CONTRACT_MISSING '+token);
assert.ok(index.includes('location-ranker.js'),'S5_RANKER_NOT_WIRED');
for(const token of ['store-curated/v1/','card.webp','hero.webp'])assert.ok(fixtures.includes(token),'CURATED_FIXTURE_MAPPING_MISSING '+token);
for(const token of ['home-bridge.js','home-recommend-policy.js','h01-state-policy-01.js','h01-state-impl-01.js'])assert.ok(home.includes(token),'H01_SCRIPT_NOT_WIRED '+token);
const manifest=read('docs/RC2_CLEAN_MIGRATION_01_MANIFEST_20261113.md');
assert.equal((manifest.match(/^\| (?:ADD|UPDATE) \|/gm)||[]).length,100,'MIGRATION_MANIFEST_ROW_COUNT');
const changed=cp.execFileSync('git',['diff','--name-only',base+'...HEAD'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean),appChanged=changed.filter(p=>p.startsWith('app/'));
assert.equal(appChanged.length,101,'APP_DIFF_NOT_EXACTLY_101_WITH_CANONICAL_PROMOTION_POLICY');
for(const p of appChanged)assert.ok(manifest.includes(p)||p===demo+'/promotion-policy.js','APP_DIFF_NOT_IN_MANIFEST '+p);
assert.ok(read(demo+'/promotion-policy.js').includes('root.SIM_PROMOTION_POLICY={create}'),'CANONICAL_PROMOTION_POLICY_NOT_EXPORTED');
for(const p of changed)assert.ok(!p.startsWith('app/assets/nav/current-four-01b/')&&!p.startsWith('app/assets/nav/nav01e-candidates/')&&!p.startsWith('app/prototype/parallel/core-journey-fix-01/qa/'),'EXCLUDED_FILE '+p);
for(const p of [demo+'/business.html',demo+'/br04/quick/index.html',demo+'/br04/adapter.css']){const old=cp.execFileSync('git',['rev-parse',base+':'+p],{cwd:root,encoding:'utf8'}).trim(),now=cp.execFileSync('git',['rev-parse','HEAD:'+p],{cwd:root,encoding:'utf8'}).trim();assert.equal(now,old,'BASELINE_SHARED_FILE_CHANGED '+p);}
for(const [p,expected] of [[demo+'/cap.html','a1496aa6e4e778da0224b0456ef534c081f9260c'],[demo+'/items.html','8bd6d0b32036b97e3a3f337d159cf8e8cb2588c2']])assert.equal(cp.execFileSync('git',['rev-parse','HEAD:'+p],{cwd:root,encoding:'utf8'}).trim(),expected,'MIGRATED_CAPACITY_PAGE_SOURCE_MISMATCH '+p);
const jsChanged=appChanged.filter(p=>p.endsWith('.js'));for(const p of jsChanged){const r=cp.spawnSync(process.execPath,['--check',p],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,'JS_SYNTAX_FAIL '+p+'\n'+(r.stderr||''));}
assert.ok(!read(demo+'/central-contract.js').includes('U01'),'RETIRED_U01_ROUTE_RETURNED');
console.log(JSON.stringify({status:'PASS',base_sha:base,app_runtime_changes:appChanged.length,manifest_rows:100,entry_pages:pages.length,html_local_refs:htmlRefs,css_local_refs:cssRefs,css_files_checked:css.size,js_syntax_checked:jsChanged.length,curated_store_pairs:ids.length,unit_tiers:4,nav_icons:8,migrated_large_pages:['cap.html','items.html']},null,2));
