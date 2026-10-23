#!/usr/bin/env node
/* H01-007-S4 historical return-context contracts, updated for the 2026-10-19
   user rule: nearby stores become matched when confirmed demand exists.
   Run: node qa/test_h01_007_s4_entry_contracts.cjs */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'prototype', f), 'utf8');
const H01 = read('mini_storage_home_H01_Visual_V2_7_4_SSOT.html');
const S01 = read('mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const S02 = read('mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const SSOT = read('mini_storage_business_ssot_v274.js');
const CONTINUITY = read('mini_storage_requirement_continuity_v1.js');
let pass = 0, fail = 0;
function t(name, ok, note) { if (ok) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name + (note ? '  -- ' + note : '')); } }
function fnBody(src, name) { const i = src.indexOf('function ' + name + '('); if (i < 0) return ''; let depth = 0, j = src.indexOf('){', i) + 1; for (let k = j; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}') { depth--; if (depth === 0) return src.slice(i, k + 1); } } return ''; }

// ---- D-01: H01 ----
const goStores = fnBody(H01, 'goStores');
t('H01 goStores exists', goStores.length > 0);
const shortcutIdx = goStores.indexOf('if(opts.nearbyShortcut && !Number(carried.target_volume))'), carriedIdx = goStores.indexOf('Number(carried.target_volume)>0&&Number(carried.term_months)>0');
t('H01 goStores: no-demand nearby browse precedes carried-demand matching', shortcutIdx > 0 && carriedIdx > 0 && shortcutIdx < carriedIdx && /if\(opts\.nearbyShortcut && !Number\(carried\.target_volume\)\)/.test(goStores), `shortcut@${shortcutIdx} carried@${carriedIdx}`);
t('H01 goStores: no-demand shortcut yields browse + entry=browse_nearby', /p\.set\('state','unlocated'\)[\s\S]*?p\.set\('state','browse'\);p\.set\('entry','browse_nearby'\)/.test(goStores));
t('H01 goStores never deletes or rewrites the saved requirement', !/removeItem\(REQUIREMENT_KEY\)|setItem\(REQUIREMENT_KEY/.test(goStores));
const goStoreDetail = fnBody(H01, 'goStoreDetail');
t('H01 goStoreDetail: confirmed demand or explicit mode enters matched', /const matched=mode==='matched'\|\|Number\(r\.target_volume\)>0;/.test(goStoreDetail));
t('H01 store cards are wired with their data-mode (browse by default)', /\$\$\('\.unified-store'\)\.forEach\(card=>card\.onclick=\(\)=>goStoreDetail\(card\.dataset\.storeId,card\.dataset\.mode\|\|'browse'\)\)/.test(H01));
t('H01 markup: no store card is declared data-mode="matched"', !/data-mode="matched"/.test(H01));
for (const id of ['#storeLink', '#navStores', '#b2bStoreLink', '#allNearbyStores']) t(`H01 ${id} routes through goStores({nearbyShortcut:true})`, new RegExp(id.replace(/[#]/g, '\\$&') + "'\\)(\\.onclick=|;if\\(el\\)el\\.onclick=)\\(\\)=>goStores\\(\\{nearbyShortcut:true").test(H01) || new RegExp("\\$\\('" + id.replace('#', '#') + "'\\)\\.onclick=\\(\\)=>goStores\\(\\{nearbyShortcut:true").test(H01) || new RegExp("el=\\$\\('" + id + "'\\);if\\(el\\)el\\.onclick=\\(\\)=>goStores\\(\\{nearbyShortcut:true").test(H01));
const goFind = fnBody(H01, 'goFind');
t('H01 继续找仓 (goFind) keeps the S1 validTerm guard and routes a term-less requirement to term selection', /if\(!hsiValidTerm\(r\.term_months\)\)\{[\s\S]*?requireTerm:'1'/.test(goFind) && /state:'estimated'/.test(goFind));
t("H01 #continueFind is the only home control bound to goFind (plus the matched-list link)", (H01.match(/onclick=goFind/g) || []).length === 2 && /\$\('#continueFind'\)\.onclick=goFind/.test(H01));
t('H01 hsiValidTerm matches SSOT validTerm range 1..60 integers', /Number\.isInteger\(n\)&&n>=1&&n<=60/.test(H01) && /validTerm/.test(SSOT));
t('H01 S3 payment-failed task card logic untouched (hsiValidPending still accepts PAYMENT_FAILED)', /function hsiValidPending\(o\)\{return !!\(o\?\.unit_id&&o\.order_no&&\['PENDING','PENDING_PAYMENT','PAYMENT_FAILED'\]\.includes\(o\.status\)\)\}/.test(H01));

// ---- D-01: S01 browse entry ----
t('S01 entry=browse_nearby forces the browse state even if state=estimated is also present', /if\(entryMode==='browse_nearby' && state!=='unlocated'\)\{\s*state='browse'/.test(S01));
t('S01 browse strip offers immediate matching when a requirement is saved', /if\(entryMode==='browse_nearby' && r\)/.test(S01) && /a\.textContent='立即匹配'/.test(S01));
t('S01 strip switch keeps the S1 validTerm guard', /termRequiredEstimatorUrl\(r,'s01_browse_strip_term_required'\)/.test(S01));

// ---- D-02: S01 -> S02 -> S01 ----
const openStoreDetail = fnBody(S01, 'openStoreDetail');
t('S01 openStoreDetail hands sort / distance / services to S02', /p\.set\('sort',sortMode\);p\.set\('distance',String\(browseDistanceKm\)\);p\.set\('services'/.test(openStoreDetail));
t('S01 openStoreDetail hands loaded count and scroll offset to S02', /p\.set\('loaded',String\(visibleStoreCount\)\);p\.set\('scroll',String\(\$\('#page'\)\.scrollTop\|\|0\)\)/.test(openStoreDetail));
t('S01 restores the loaded count for every list state', /\{const restoredLoaded=Number\(qp\.get\('loaded'\)\|\|0\);[\s\S]*?visibleStoreCount=Math\.max\(STORE_PAGE_SIZE,Math\.min\(window\.MINI_KOALA_DATA\.stores\.length,restoredLoaded\)\);\}/.test(S01));
t('S01 restores sort / distance / services from the URL', /sortMode=\['recommended','distance','price'\]\.includes\(qp\.get\('sort'\)\)\?qp\.get\('sort'\):'recommended'/.test(S01) && /if\(\['any','3','5','10'\]\.includes\(qp\.get\('distance'\)\)\)browseDistanceKm=qp\.get\('distance'\)/.test(S01) && /const restoredServices=String\(qp\.get\('services'\)\|\|''\)\.split\(','\)/.test(S01));
t('S01 re-applies the scroll offset after deferred layout helpers (load + rAF)', /const restoreListScroll=\(\)=>\{\$\('#page'\)\.scrollTop=Number\(qp\.get\('scroll'\)\)\};setTimeout\(restoreListScroll,0\);\s*window\.addEventListener\('load',\(\)=>requestAnimationFrame\(restoreListScroll\),\{once:true\}\)/.test(S01));
const backIdx = S02.indexOf("$('#backBtn').onclick=()=>{"); const backEnd = S02.indexOf('};', S02.indexOf('window.location.href=s01File', backIdx)); const backBlock = S02.slice(backIdx, backEnd + 2);
t('S02 back button exists', backIdx > 0);
t('S02 back passes sort / distance / services / loaded / scroll straight back to S01', /for\(const key of \['sort','distance','services','loaded','scroll'\]\)if\(incoming\.has\(key\)\)p\.set\(key,incoming\.get\(key\)\)/.test(backBlock));
t('S02 back returns a browse visit as the browse list (entry=browse_nearby)', /if\(returnState==='browse'\)p\.set\('entry','browse_nearby'\)/.test(backBlock));
t('S02 back still returns the estimated / extended / far states by fromS01State', /const returnState=state==='browse'\?'browse':\(fromS01State\|\|'estimated'\)/.test(backBlock));
t('S02 browse entry from S01 keeps state=browse without target/term', /if\(\['browse','unlocated'\]\.includes\(state\)\)\{\s*p\.set\('state','browse'\)/.test(openStoreDetail));

// ---- guard rails: business rules untouched by S4 ----
t('S4 touched no price / deposit / management-fee / coupon rule (SSOT has no H01-007-S4 marker)', !/H01-007-S4/.test(SSOT));
t('confirmed demand normalizer enters matched S01 and S02 states', /p\.set\('state','estimated'\)/.test(CONTINUITY) && /p\.set\('state','matched'\)/.test(CONTINUITY));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
