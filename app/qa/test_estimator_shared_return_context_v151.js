const fs=require('fs'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const s01=read('prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const s02=read('prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const estimator=read('prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');

assert(s01.includes("returnTo:'S01'") && s01.includes("returnContextVersion:'1.5.1'"),'S01 declares shared return target/version');
assert(s02.includes('function openEstimatorWithReturnContext(returnState=state)'),'S02 uses one shared estimator entry builder');
assert(s02.includes("returnTo:'S02'") && s02.includes("returnContextVersion:'1.5.1'"),'S02 declares shared return target/version');
assert(s02.includes("$('#browseEstimator').onclick=()=>openEstimatorWithReturnContext('browse')"),'S02 browse estimator uses shared builder');
assert(s02.includes("$('#deepEstimate').onclick=()=>openEstimatorWithReturnContext(state)"),'S02 re-estimate entry uses shared builder');
assert(estimator.includes("const returnTo=(params.get('returnTo')||'').toUpperCase()"),'Estimator parses explicit return target');
assert(estimator.includes("returnTo==='S02'||params.get('source')==='store_detail'"),'Estimator supports S02 target with legacy compatibility');
assert(estimator.includes("returnTo==='S01'||params.get('source')==='store_list'"),'Estimator supports S01 target with legacy compatibility');
assert(estimator.includes("loaded:Number(params.get('returnLoaded')||8)"),'Estimator carries S01 loaded-store count');

console.log('PASS shared estimator return context v1.5.1: S01 and S02 use one explicit return-target protocol with backward compatibility');
