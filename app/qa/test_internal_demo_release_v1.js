const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const hub=fs.readFileSync(path.join(proto,'product_demo_hub_v1.html'),'utf8');
const runtime=fs.readFileSync(path.join(proto,'mini_koala_internal_demo_v1.js'),'utf8');
const support=fs.readFileSync(path.join(proto,'mini_storage_global_support_v274.js'),'utf8');
function has(src,x,msg){assert(src.includes(x),msg+' -> '+x)}
for(const x of ["new_rental:{title:'Story 01｜第一次租仓'","stores_first:{title:'Story 02｜先找附近门店'","urgency:{title:'Story 03｜库存紧迫感促成交'","coupon:{title:'Story 04｜优惠券与权益'","lifecycle:{title:'Story 05｜支付后完整生命周期'","exception:{title:'Story 06｜异常与恢复'"])has(runtime,x,'six guided story configs');
for(const x of ['上一步','下一步','重置本故事','返回 Demo Hub','demoStory','demoStep','localStorage.clear()'])has(runtime,x,'story navigation/reset runtime');
for(const x of ['¥3,863','¥3,440','¥3,240','-¥200','真实 / 已确认基础','演示补充能力','仍待生产确认'])has(hub,x,'internal demo framing');
has(support,"__demoQ.get('demoStory')",'business pages conditionally load demo ribbon');
has(support,"mini_koala_internal_demo_v1.js",'shared support loads demo runtime only for internal demo');
assert(!support.includes("__demoQ.get('demoStory')||__demoQ.get('source')==='internal_demo')&&!window.MINI_KOALA_INTERNAL_DEMO_V1){\n      const __demoScript=document.createElement('script');\n      __demoScript.src='https://"),'runtime is local-only and does not introduce external dependency');
console.log('PASS Internal Demo Release V1: 6 guided stories, state reset, cross-page ribbon, role framing, canonical coupon amounts');
