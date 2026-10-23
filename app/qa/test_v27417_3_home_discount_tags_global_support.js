const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const proto=path.join(root,'prototype');
const home=fs.readFileSync(path.join(proto,'mini_storage_home_H01_Visual_V2_7_4_SSOT.html'),'utf8');
const support=fs.readFileSync(path.join(proto,'mini_storage_global_support_v274.js'),'utf8');
const data=require(path.join(root,'data','mini_koala_data.js'));
assert(home.includes('const HOME_DEFAULT_DISPLAY_DISCOUNT_FACTOR=.65;'));
assert(home.includes("'MK_BJ_E56D0702':['近地铁','搬运方便','电梯直达']"));
assert(home.includes("'MK_BJ_E68EC5FF':['社区仓','特价仓','24小时存取']"));
assert(home.includes("'MK_BJ_04547515':['混合仓','仓型丰富','停车方便']"));
assert(home.includes('const v=homeDiscountedUnitPrice(raw);'));
assert(home.includes('首页默认65折展示'));
assert.strictEqual(data.sourceMonthlyPriceBasis,'pre_discount_base_price');
assert.strictEqual(data.homeDefaultDisplayDiscountFactor,0.65);
assert.strictEqual(data.meta.source_monthly_price_basis,'pre_discount_base_price');
const unit=(name)=>{const p=data.stores.find(x=>x.store_name===name);return data.storeUnitPriceFrom(p.store_id)};
assert.strictEqual(Math.round(unit('三元桥店')*.65),88);
assert.strictEqual(Math.round(unit('大山子店')*.65),65);
assert.strictEqual(Math.round(unit('安贞店')*.65),102);
assert(support.includes('tel:4000358805'));
assert(support.includes('openCustomerServiceChat'));
function walk(dir){let out=[];for(const n of fs.readdirSync(dir)){const p=path.join(dir,n),st=fs.statSync(p);if(st.isDirectory())out=out.concat(walk(p));else if(n.endsWith('.html'))out.push(p)}return out}
const htmls=walk(proto);
for(const p of htmls){assert(fs.readFileSync(p,'utf8').includes('mini_storage_global_support_v274.js'),`global support missing: ${p}`)}
for(const n of ['index.html','START_HERE.html']) assert(fs.readFileSync(path.join(root,n),'utf8').includes('prototype/mini_storage_global_support_v274.js'));
console.log('PASS V2.7.4.17.3: frozen demo tags, 65% home pricing, confirmed pre-discount basis, global phone + WeChat support');
