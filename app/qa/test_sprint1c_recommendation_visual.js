const fs=require('fs');const crypto=require('crypto');
const p='prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html';
const s=fs.readFileSync(p,'utf8');
function pass(ok,msg){if(!ok){console.error('FAIL',msg);process.exit(1)}console.log('PASS',msg)}
pass(s.includes('id="sprint1c-recommendation-hifi-v1"'),'Sprint 1C recommendation visual override present');
pass(s.includes('#s5 .rplan-price{'),'Recommendation total-rent hero price rule present');
pass(s.includes('font-size:30px!important'),'Contract total receives primary visual scale');
pass(s.includes('#s5 .rplan-monthly{'),'Monthly rent has secondary visual rule');
pass(s.includes('#s5 .recommend-location span'),'Usage address has single-line truncation guard');
pass(s.includes('#s5 .estore-points span{'),'EStore tags have explicit visual rules');
pass(s.includes('white-space:nowrap!important'),'Non-wrapping tag/address guards present');
pass(s.includes('#s5 .r113-zero-match{'),'NOMATCH recovery visual state present');
const body=s.slice(s.indexOf('<body'));
const hash=crypto.createHash('sha256').update(body).digest('hex');
pass(hash==='168035d316cd50388a4b8c8f78ff8c7d24eea06042d7016d95372d9997a31ede','Estimator body/copy/state/interaction markup matches the Phase 3A V1.1 authorized estimator markup');
console.log('SPRINT 1C RECOMMENDATION VISUAL QA PASS');
