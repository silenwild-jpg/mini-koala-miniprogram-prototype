const fs=require('fs');const crypto=require('crypto');
const p='prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html';
const s=fs.readFileSync(p,'utf8');
function pass(ok,msg){if(!ok){console.error('FAIL',msg);process.exit(1)}console.log('PASS',msg)}
pass(s.includes('id="sprint1b-estimator-hifi-v1"'),'Sprint 1B visual override layer present');
pass(s.includes('--primary:#2F6B4F!important'),'Design System V1 brand green applied');
pass(s.includes('--orange:#D56A1C!important'),'Design System V1 price orange applied');
pass(s.includes('#s2 .scene[data-id="moving"] .icon'),'scene emoji replaced visually by scoped line-icon family');
pass(s.includes('#s4 .kv,#s4 .kv.prior'),'confirm-items cards scoped to white-card hierarchy');
pass(s.includes('#s7 .input-row input'),'known-size input row has explicit mobile sizing guard');
const body=s.slice(s.indexOf('<body'));
const hash=crypto.createHash('sha256').update(body).digest('hex');
pass(hash==='168035d316cd50388a4b8c8f78ff8c7d24eea06042d7016d95372d9997a31ede','Estimator body/copy/interaction markup matches the Phase 3A V1.1 authorized estimator markup');
console.log('SPRINT 1B ESTIMATOR VISUAL QA PASS');
