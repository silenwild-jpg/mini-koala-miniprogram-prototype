const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const read=file=>fs.readFileSync(path.join(proto,file),'utf8');
const h01=read('mini_storage_home_H01_Visual_V2_7_4_SSOT.html');
const est=read('space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html');
const s01=read('mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const s02=read('mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const u01=read('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html');
const b2b=read('mini_storage_business_b2b01_r113_Visual_V2_7_4.html');
const o01=read('mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html');
const data=require(path.join(root,'data','mini_koala_data.js'));

assert(h01.includes('/月/m³起')&&h01.includes('常见存储场景')&&h01.includes('考拉E存 · 上门取送'));
assert(!est.includes('符合需求仓位区间')&&est.includes('匹配仓位 ${x.matchedCount}个')&&est.includes('整期租金')&&est.includes('顾问协助'));
assert(est.includes('MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274.recommend')&&!est.includes('当前演示可选')&&!est.includes('附近没有一个单仓完全匹配时'));
assert(!est.includes('价格怎么计算？')&&!est.includes('收藏保管'));

assert(s01.includes('不确定需要多大空间？')&&s01.includes('立即估算'));
assert(s01.includes('剩余仓位')&&s01.includes('仓体容量')&&s01.includes("state!=='browse'&&index===0"));
assert(s01.includes("profile.storage_type==='社区仓'?'社区仓':'超级仓'"));
assert(!s01.includes('1–60个月月租参考'));

for(const removed of ['以下信息以本店实际情况为准','下面是当前门店可以确认的设施和服务。','带物品到店前建议确认','当前没有仓位落在您的需求范围内','查看全部'])assert(!s02.includes(removed),removed);
assert(s02.indexOf('<b>到店与搬运</b>')<s02.indexOf('<b>设施与服务</b>'));
assert(s02.includes('section section-collapsible"><summary')&&!s02.includes('section section-collapsible" open')&&s02.includes('查看更多仓位')); // Phase 3B long services folded by default
assert(s02.includes('支持远程/实地看仓，免费预约')&&s02.includes('直观比较真实仓位大小、通道、电梯、停车和搬运等条件。'));
assert(s02.includes('推荐 · 需求接近')&&s02.includes("unitCard(roomy,'更宽裕'")&&s02.includes("role==='更宽裕 · 存取更方便'?'更宽裕 · 符合需求'")); // ungrounded convenience claim removed
assert(!u01.includes('和您的需求匹配'));

for(const text of ['商家/企业用户快捷选仓','可多选','id="otherType"','赠送免费首次搬运','您的称呼','预计用仓时间','补充信息','data-term="60"','entry=b2b_recommend'])assert(b2b.includes(text),text);
assert(!b2b.includes('当前需求可继续匹配方案'));
assert(est.includes("entry==='b2b_recommend'"));

assert(!o01.includes('<h2>联系方式</h2>'));
assert(o01.includes('id="phoneAuthSheet"')&&o01.includes('id="phoneAuthAllow"'));
assert(o01.includes('用仓时间')&&o01.includes('到期时间')&&o01.includes('leaseEndDate'));
assert(o01.includes('退仓后按租赁协议及仓位核验结果办理退还'));
assert(!o01.includes('请确认开始日期：租期从这一天起算，付款后仓位立即锁定。'));

assert.strictEqual(data.areaConversionAssumedHeightM,2.5);
assert(data.options.every(x=>x.length_m>0&&x.width_m>0&&x.height_m===2.5));
assert(!data.areaText(5).includes('模拟'));
assert(Number.isInteger(data.storeUnitPriceFrom('jianguo')));

const support=read('mini_storage_global_support_v274.js');
assert(support.includes('4000358805')&&support.includes('mini-storage-open-wechat-service'));
for(const file of fs.readdirSync(proto).filter(x=>x.endsWith('.html'))){
  const html=read(file);
  if(!html.includes('</body>'))continue;
  assert(html.includes('mini_storage_global_support_v274.js'),`${file} lacks global support`);
}
console.log('PASS V2.7.4.11 pricing, copy, B2B, store/unit, checkout authorization, dimensions, and global support requirements');
