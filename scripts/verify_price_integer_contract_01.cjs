'use strict';
const assert=require('node:assert/strict'),base='../app/prototype/parallel/core-journey-fix-01/demo/';
const F=require(base+'fixtures.js'),{create}=require(base+'demo-core.js');
const P=require(base+'presentation-policy.js'),Central=require(base+'central-contract.js');
const units=F.units.filter(x=>x.status==='available'),a=units[0],b=units.find(x=>x.id!==a.id&&x.store_id===a.store_id&&x.volume!==a.volume);
assert(a&&b,'Need available same-store different-size units');
const fields=['monthly_average','rent_total','rent_after_coupon','deposit','management_fee','coupon_discount','payable'];
const expected=(u,m)=>Math.trunc(u.base_month*F.pricing.termRules.find(x=>m>=x.min&&m<=x.max).factor+1e-9);
function check(c,ids,m,renewal=false){
 const x=c.amounts(ids,m,{renewal}),monthly=ids.reduce((n,id)=>n+expected(F.units.find(u=>u.id===id),m),0);
 assert.equal(x.monthly_average,monthly,'per-unit truncation');
 assert.equal(x.rent_total,x.monthly_average*m,'monthly × whole term');
 assert.equal(x.deposit,renewal?0:monthly,'deposit');
 assert.equal(x.management_fee,renewal?0:50,'management');
 assert.equal(x.rent_after_coupon,x.rent_total-x.coupon_discount,'coupon');
 assert.equal(x.payable,x.rent_after_coupon+x.deposit+x.management_fee,'first payment');
 for(const k of fields)assert(Number.isInteger(x[k]),m+'m billed field '+k);
 return x;
}
for(let m=1;m<=60;m++){
 const c=create();check(c,[a.id],m);check(c,[a.id,b.id],m);check(c,[a.id,b.id],m,true);
}
{
 const c=create();c.claimCoupons();
 for(const m of [1,3,6,12,24,36,37,60])
 for(const choice of ['none','auto','CPN-001','CPN-002']){
  c.setCoupon(choice);check(c,[a.id],m);check(c,[a.id,b.id],m);
 }
}
{
 const c=create(),p=P.create({core:c,fixture:F,unitPolicy:{}});
 for(const m of [1,12,37,60]){
  c.setRequirement(a.volume,m,true);
  const v=p.price([a.id]),x=c.amounts([a.id],m);
  assert.equal(v.money,'¥'+x.rent_total.toLocaleString('zh-CN'));
  assert.equal(v.average,'¥'+x.monthly_average.toLocaleString('zh-CN')+'/月 × '+m+'个月');
  assert.deepEqual(v.amounts,x);
 }
 const s=F.stores.find(x=>x.id===a.store_id),r=p.cubicReference(s);
 if(r)assert(/^¥[\d,]+$/.test(r.money),'public teaser in integer yuan');
}
{
 const c=create();c.setRequirement(a.volume,37,true);c.setStore(a.store_id);
 c.setDate(c.today());c.requestPhone();c.resolvePhone('success',{phone:'13800138000'});
 c.select([a.id]);c.claimCoupons();c.setCoupon('CPN-002');
 const quote=c.quote(),snapshot=Central.quote(c,quote),order=c.submit();
 assert.equal(Central.order(c,order,snapshot).order_id,order.id);
 assert.equal(order.rent_total,order.monthly_average*37);assert(Number.isInteger(order.payable));
 const paid=c.pay(order.id,'success');assert.equal(paid.status,'paid_simulated');
 const request=c.lifecycleRequestRenewal(order.id,1);
 const reviewed=c.lifecycleReviewQuote(order.id,request.id,123.99,true);
 assert.equal(reviewed.quote_monthly,123);assert.equal(reviewed.quote_total,123);
 const renewal=c.renewalQuote(order.id,6);
 assert.equal(renewal.deposit,0);assert.equal(renewal.management_fee,0);
 assert.equal(renewal.rent_total,renewal.monthly_average*6);
 assert(Number.isInteger(renewal.payable));
}
console.log('PRICE-INTEGER-CONTRACT-01: 1–60m, combo, coupon, order, renewal PASS');
