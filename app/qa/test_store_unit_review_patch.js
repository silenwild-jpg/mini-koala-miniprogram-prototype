const fs=require('fs');
const path=require('path');
const assert=require('assert');

const proto=path.resolve(__dirname,'../prototype');
const read=name=>fs.readFileSync(path.join(proto,name),'utf8');
const s01=read('mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const s02=read('mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const u01=read('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
const a01=read('mini_storage_access_a01_v2_self_service_Visual_V2_7_4.html');
const estimator=read('space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
const data=fs.readFileSync(path.resolve(__dirname,'../data/mini_koala_data.js'),'utf8');

assert(s01.includes('id="sortSelect"')&&s01.includes('id="distanceSelect"'),'S01 uses compact dropdown controls');
assert(s01.includes('id="filterSheet"')&&s01.includes('id="filterBtn"'),'S01 restores the service filter tool');
for(const label of ['24小时存取','大件进出','电梯直达','停车便利'])assert(s01.includes(label),`S01 service filter includes ${label}`);
assert(s01.includes('<option value="price">价格较低</option>')&&s01.includes('data-distance-km="5"'),'S01 keeps price sort and core distance options');

assert(s02.includes('function openEstimatorWithReturnContext(returnState=state)')&&s02.includes("returnTo:'S02'")&&s02.includes("returnStore:storeId"),'S02 estimate entry opens the estimator home through the shared return-context protocol and remembers the current store');
assert(!s02.includes("entry:'estimate',source:'store_detail'"),'S02 does not skip to the scene screen');
assert(s02.includes('returnTarget')&&s02.includes('returnTerm')&&s02.includes('returnCustomer')&&s02.includes('returnFromS01State'),'S02 preserves demand context for estimator cancel and return');
assert(s02.includes('24小时自助存取 · 大件进出方便 · 可预约搬运'),'S02 restores the demo service promise line');
assert(s02.includes('门口可短暂停靠')&&s02.includes('<span>货梯</span><b>有</b>'),'S02 restores demo arrival and moving facts');
assert(!s02.includes('unit-cost-link')&&!s02.includes('unitCostSheet'),'S02 removes the inline fee-preview entry and sheet');
const unitList=s02.indexOf('id="unitList"'),inline=s02.indexOf('id="allUnitsInline"'),more=s02.indexOf('id="allUnits"'),compact=s02.indexOf('id="compactOffer"');
assert(unitList<inline&&inline<more&&more<compact,'S02 more button follows the last visible unit-card region');
assert(s02.includes('allUnitsVisibleCount+3')&&s02.includes("allUnitsVisibleCount>=remaining.length"),'S02 expands three units at a time and hides the button at completion');

assert(!u01.includes('id="unitPlain"')&&!u01.includes('面积及长宽按'),'U01 removes the long capacity explanation');
assert(u01.includes('修改租期')&&u01.includes('border:2px solid #AFCDBA'),'U01 strengthens the modify-term action visually');
assert(data.includes('simulatedDoor')&&data.includes("door_estimate_status: 'simulated_from_volume'")&&data.includes('simulatedShape'),'unit adapter fills demo door and shape data');

assert(a01.includes('id="homeEntry"')&&a01.includes('返回首页'),'A01 exposes a return-home entry');
assert(a01.includes('MINI_STORAGE_REPO_V242.saveCurrent(o)')&&a01.includes("state=active&source=access_home&orderNo="),'A01 carries the paid current order to active home state');

const finalStyle=estimator.indexOf('id="estimator-estore-layout-fix"');
const lastSheet=estimator.lastIndexOf('mini_koala_visual_elevation_v2_1_secondary_density.css');
assert(finalStyle>lastSheet,'EStore repair loads after the visual styles that caused the collision');
assert(estimator.includes('#s5 .estore-feature{display:block!important;padding:16px!important')&&estimator.includes("grid-template-areas:'eterm elabel' 'emonth eprice'"),'EStore uses a stable full-width price row');

console.log('PASS store/unit review patch: dropdown and service filters, complete estimator context, progressive units, U01 term emphasis, active-home return, and EStore layout');
