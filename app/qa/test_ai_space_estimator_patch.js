const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','prototype');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const files={
  estimator:'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
  ai01:'mini_storage_ai_photo_ai01_v1_demo_patch.html',
  loading:'mini_storage_ai_loading_ai01_l_v1_demo_patch.html',
  result:'mini_storage_ai_result_ai02_v1_demo_patch.html',
  s01:'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
  s02:'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
  home:'mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
  mine:'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html'
};
for(const [key,name] of Object.entries(files)){
  if(!fs.existsSync(path.join(root,name)))throw new Error(`${key} missing: ${name}`);
}
const estimator=read(files.estimator),ai01=read(files.ai01),loading=read(files.loading),result=read(files.result),s01=read(files.s01),s02=read(files.s02),home=read(files.home),mine=read(files.mine);
const checks=[
  [estimator.includes('data-entry="ai"'),'Estimator AI entry'],
  [estimator.includes(files.ai01),'Estimator to AI01'],
  [ai01.includes(files.loading),'AI01 to loading'],
  [loading.includes(files.result),'loading to AI02'],
  [result.includes('2–3m³')&&result.includes('1.6–1.8m³'),'AI02 fixed estimate'],
  [result.includes('<details class="card tips"'),'AI02 expanded tips'],
  [result.includes('ai_estimator')&&result.includes("min:'2'")&&result.includes("max:'3'"),'AI02 query carry-over'],
  [s01.includes('AI已估算：约')&&s01.includes('匹配您的空间需求'),'S01 AI carry-over'],
  [s01.includes("p.set('ai','1')")&&s01.includes("p.set('min',aiMin.toFixed(1))"),'S01 to S02 carry-over'],
  [s02.includes('按约2–3m³需求推荐')&&s02.includes("qp.get('ai')==='1'"),'S02 AI recommendation'],
  [ai01.includes('max-width:480px')&&loading.includes('max-width:480px')&&result.includes('max-width:480px'),'mobile layouts'],
  [home.includes("$('#estimateBtn').onclick=()=>goEstimator();")&&home.includes("$('#navFind').onclick=()=>goEstimator();"),'home estimate entries show Estimator start'],
  [s01.includes("estimatorFile+'?source=bottom_find'")&&mine.includes("estimatorFile+'?source=bottom_find'"),'bottom Find tabs show Estimator start'],
  [s01.includes('预约看仓')&&s01.includes('viewingFile')&&s01.includes('openStoreViewing'),'S01 store cards include viewing entry'],
  [s01.includes("$('#editDemand').onclick=()=>openSheet('#requirementSheet')")&&s01.includes("$('#applyRequirement').onclick=()=>")&&!s01.includes("$('#editDemand').onclick=()=>{location.href"),'S01 demand edit stays in current-page sheet']
];
const failed=checks.filter(x=>!x[0]).map(x=>x[1]);
if(failed.length)throw new Error('AI patch QA failed: '+failed.join(', '));
console.log(`AI patch QA passed (${checks.length} checks)`);
