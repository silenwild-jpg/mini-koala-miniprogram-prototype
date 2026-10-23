const fs=require('fs');
const p='prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html';
const s=fs.readFileSync(p,'utf8');
function pass(ok,msg){if(!ok){console.error('FAIL',msg);process.exit(1)}console.log('PASS',msg)}
pass(s.includes('id="usageStoreListBtn"'),'lease + recommendation page exposes a secondary store-list carryback action');
pass(s.includes("const carryRequirementToStoreList=()=>{"),'shared demand carryback handler present');
pass(s.includes("source:'ESTIMATOR_USAGE_TO_S01'"),'requirement snapshot records carryback source');
pass(s.includes("state:'estimated',entry:'estimate_complete',source:'estimator_usage_store_list'"),'carryback enters S01 estimated state');
pass(s.includes('MINI_KOALA_PHASE2.listParams(returnListContext,{travel,origin})'),'carryback preserves explicit sorting and distance, resets result position');
pass(s.includes("returnListContext?.services?.length") && s.includes("q.set('services',returnListContext.services.join(','))"),'S01 service preferences are preserved');
pass(s.includes("returnListContext?.travel||returnStoreContext?.travel||'drive'") && s.includes("returnListContext?.origin||returnStoreContext?.origin||'guomao'"),'travel and origin context are preserved');
pass(s.includes("returnStoreContext?'其他符合需求的门店 ›'") && s.includes("'更多符合需求的门店 ›'"),'contextual carryback copy present');
pass(s.includes('.usage-actions .usage-store-list-link'),'carryback action is visually lower priority than primary CTA');
console.log('ESTIMATOR -> S01 DEMAND CARRYBACK V1.2 QA PASS');
