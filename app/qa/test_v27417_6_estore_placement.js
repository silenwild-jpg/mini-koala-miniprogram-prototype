const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const s01Path = path.join(root, 'prototype', 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const html = fs.readFileSync(s01Path, 'utf8');
const checks = [
  ['E存列表卡组件存在', html.includes('function makeEStoreListCard') && html.includes('考拉E存')],
  ['普通浏览插入第3位', html.includes('const insertAt=Math.min(2,storeCards.length)') && html.includes('storeCards.splice(insertAt,0,makeEStoreListCard())')],
  ['只在普通浏览插入', html.includes("if(state!=='browse') return storeCards.join('')")],
  ['大于5km无门店触发首位兜底', html.includes("km>5 && ids.length===0") && html.includes('makeEStoreListCard({fallbackFirst:true})')],
  ['无门店兜底不显示继续加载', html.includes("$('#loadMore').classList.toggle('hidden',estoreFallback||zeroMatch||remaining===0)")],
  ['E存不复用门店store类', html.includes('class="estore-list-card') && !html.includes('class="store estore-list-card')],
  ['E存点击进入可取消的咨询承接', html.includes('estoreCard.onclick=openS01Estore')],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
