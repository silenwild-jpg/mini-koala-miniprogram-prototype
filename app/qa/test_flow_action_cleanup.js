const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..','prototype');
const estimator=fs.readFileSync(path.join(root,'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
const s02=fs.readFileSync(path.join(root,'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),'utf8');
const u01=fs.readFileSync(path.join(root,'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'),'utf8');
const checks=[
  [!estimator.includes('上方独立仓位方案展示的是当前租期的估算租金'),'recommendation-card fee note removed'],
  [!estimator.includes('总租金不含押金（1个月租金）和管理费 ¥50；仓位详情会列出预计本次应付。'),'price-calculation extra fee note removed'],
  [estimator.includes('id="storeNeedEditor"')&&estimator.includes('data-store-term="60"'),'store unit list has inline size and term editor'],
  [estimator.includes('id="backToRecommend">返回推荐'),'recommendation return action renamed'],
  [estimator.includes("source:'estimator_unit_list'")&&s02.includes("entrySource==='estimator_unit_list'"),'store detail returns to estimator unit list'],
  [!u01.includes('和您的需求匹配')&&!u01.includes('id="matchHeading"'),'U01 demand-match block removed'],
  [u01.includes('id="advisorBtn" type="button">需要帮助')&&u01.includes('id="confirm">继续租用'),'U01 retains help and rental actions'],
  [u01.includes("$('#helpViewing').onclick")&&u01.includes("$('#helpAdvisor').onclick"),'U01 help chooser keeps viewing and advisor branches']
];
let failed=0;
for(const [ok,label] of checks){if(ok)console.log('PASS '+label);else{failed++;console.error('FAIL '+label)}}
if(failed)process.exit(1);
console.log(`All ${checks.length} flow action cleanup checks passed.`);
