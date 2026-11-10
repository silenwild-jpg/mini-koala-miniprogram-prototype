'use strict';
/**
 * RC2-BUSINESS-REBUILD-01 deterministic, Node-only business contract checks.
 * Run: node scripts/verify_rc2_business_rebuild_01.cjs
 * No Playwright, deploy, network request, or live customer data.
 */
const assert=require('node:assert/strict');
const base='../app/prototype/parallel/core-journey-fix-01/demo/';
const F=require(base+'fixtures.js');
const {create}=require(base+'demo-core.js');
const P=require(base+'presentation-policy.js');
const R=require(base+'recommendation-policy.js');
const Home=require(base+'home-recommend-policy.js');
const Central=require(base+'central-contract.js');
const precision=n=>Math.round((n+Number.EPSILON)*100)/100;
const test=(name,fn)=>{fn();console.log('PASS',name);};
const available=F.units.filter(u=>u.status==='available');
const a=available[0];
assert(a,'Fixture must provide a sellable warehouse');

test('P03/P01 discounted MONTHLY price * term, full-term rent, one-month deposit',()=>{
  const core=create();
  for(const months of [1,3,6,12,36,60]){
    const factor=F.pricing.termRules.find(r=>months>=r.min&&months<=r.max).factor;
    const monthly=precision(a.base_month*factor),amount=core.amounts([a.id],months);
    assert.equal(amount.monthly_average,monthly);
    assert.equal(amount.rent_total,precision(monthly*months));
    assert.equal(amount.deposit,monthly);
    assert.equal(amount.management_fee,50);
    assert.equal(amount.payable,precision(amount.rent_total+monthly+50));
  }
});

test('C01 same-store cross-type combo, combined deposit, one fee',()=>{
  const pairs=[];
  for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++)
    if(available[i].store_id===available[j].store_id&&available[i].volume!==available[j].volume)
      pairs.push([available[i],available[j]]);
  assert(pairs.length,'No available cross-size combination in fixture');
  const [left,right]=pairs[0],core=create(),months=6;
  const b=core.amounts([left.id,right.id],months);
  const expectedMonthly=precision(precision(left.base_month*.7)+precision(right.base_month*.7));
  assert.equal(b.deposit,expectedMonthly);
  assert.equal(b.monthly_average,expectedMonthly);
  assert.equal(b.rent_total,precision(expectedMonthly*6));
  assert.equal(b.management_fee,50);
});

test('P04 duration discount + cash coupon + moving benefit trace independently',()=>{
  const core=create();
  core.claimCoupons();
  core.setCoupon('CPN-002');
  const b=core.amounts([a.id],12);
  assert.equal(b.coupon_id,'CPN-002');
  assert.equal(b.coupon_discount,300);
  assert.equal(b.moving_benefit_pending_id,'CPN-003');
  assert.equal(b.payable,precision(b.rent_total-b.coupon_discount+b.deposit+50));
  assert.equal(b.deposit,b.monthly_average);
  core.setCoupon('none');
  const c=core.amounts([a.id],12);
  assert.equal(c.coupon_discount,0);
  assert.equal(c.moving_benefit_pending_id,'CPN-003');
});

test('P02 published per-store cubic rate uses only currently available units',()=>{
  const core=create(),p=P.create({core,fixture:F,unitPolicy:{}});
  const st=F.stores.find(s=>available.filter(u=>u.store_id===s.id).length>=2);
  assert(st,'Need store with >=2 available units');
  const rows=F.units.filter(u=>u.store_id===st.id&&core.available(u));
  const price=()=>p.cubicReference(st);
  const expected=Math.min(...rows.map(u=>core.amounts([u.id],F.pricing.homeReferenceTerm).monthly_average/u.volume));
  assert.equal(price().value,Number(expected.toFixed(2)));
  const cheapest=rows.slice().sort((x,y)=>
    core.amounts([x.id],12).monthly_average/x.volume-core.amounts([y.id],12).monthly_average/y.volume)[0];
  core.markUnavailable(cheapest.id);
  const after=price();
  assert(after===null||after.value>=Number(expected.toFixed(2)));
});

test('R01 inventory-first nearest; cheaper second may be chosen only in nearby radius',()=>{
  const rows=[
    {store:{id:'A',distance:1},cost:100},
    {store:{id:'B',distance:2},cost:110},
    {store:{id:'C',distance:14},cost:1}
  ];
  assert.deepEqual(R.rank(rows,{distanceVerified:true,costOf:r=>r.cost}).items.slice(0,2).map(r=>r.store.id),['A','B']);
  const cheaper=[...rows,{store:{id:'D',distance:3},cost:90}];
  assert.deepEqual(R.rank(cheaper,{distanceVerified:true,costOf:r=>r.cost}).items.slice(0,2).map(r=>r.store.id),['A','D']);
});

test('H01 stable demo distance may rank but never flag it as verified',()=>{
  const r=Home.rank([{id:'D',distance:4,status:'open',teaserCubicPrice:20},
    {id:'N',distance:1,status:'open',teaserCubicPrice:30}],
    {distanceVerified:false,allowDemoDistance:true});
  assert.equal(r.cards[0].id,'N');
  assert.equal(r.nearestClaimAllowed,false);
});

test('L01/L02 booking requires both phone and full address',()=>{
  const core=create();
  assert.throws(()=>core.saveLead('用仓地址',{phone:''}),/ENTER_PHONE/);
  assert.throws(()=>core.saveLead('',{phone:'13800138000'}),/ENTER_ADDRESS/);
  const lead=core.saveLead('北京市朝阳区某小区',{phone:'13800138000'});
  assert.equal(lead.phone,'13800138000');
  assert.equal(lead.address,'北京市朝阳区某小区');
  assert.equal(lead.follow_up_owner,'sales_pending_sync');
  assert.equal(lead.status,'saved_locally');
});

test('Date validator checks injected UTC+8 business clock, not Oct-2026 fixture',()=>{
  const core=create({now:()=>Date.parse('2026-11-10T01:00:00Z')});
  assert.equal(core.today(),'2026-11-10');
  assert.equal(core.validDate('2026-11-09'),false);
  assert.equal(core.validDate('2026-11-10'),true);
  assert.equal(core.validDate('2026-11-31'),false);
});

test('ITEMS estimates can reach S5 before rental term is confirmed',()=>{
  const c=create();
  c.setEstimate({source:'known_capacity_in_items_flow',target_volume:3,term_months:null,term_confirmed:false});
  assert.equal(c.state().requirement.capacity_m3,3);
  assert.equal(c.state().requirement.term_confirmed,false);
  c.setEstimate({source:'items_estimate',estimated_volume:3.5,target_volume:3.5,
    term_months:null,term_confirmed:false,items:[{id:'box',variant:'normal',quantity:1}]});
  assert.equal(c.state().requirement.capacity_m3,3.5);
  assert.equal(c.state().requirement.term_confirmed,false);
});

test('Enterprise lead uses the same pricing and stock state (lead-only scope)',()=>{
  const core=create(),before=core.amounts([a.id],6),stockBefore=core.stockCount(a);
  const lead=core.saveEnterpriseLead({phone:'13800138000',capacity_m3:3,storage_types:['库存']});
  assert.equal(lead.customer_type,'enterprise');
  assert.deepEqual(core.amounts([a.id],6),before);
  assert.equal(core.stockCount(a),stockBefore);
});

test('O01 central same-cents quote → combination snapshot → payment failure release',()=>{
  const c=create();
  const rows=F.units.filter(u=>u.status==='available'&&u.store_id===a.store_id);
  assert(rows.length,'Needs an available store');
  c.setRequirement(a.volume,12,true);
  c.setStore(a.store_id);
  c.setDate(c.today());
  c.requestPhone();
  c.resolvePhone('success',{phone:'13800138000'});
  c.select([a.id]);
  c.claimCoupons();
  c.setCoupon('CPN-002');
  const quote=c.quote();
  const signed=Central.quote(c,quote);
  const order=c.submit();
  const certified=Central.order(c,order,signed);
  assert.equal(certified.order_id,order.id);
  assert.equal(order.rent_total,c.amounts([a.id],12).rent_total);
  assert.equal(order.deposit,order.monthly_average);
  assert.equal(order.moving_benefit_pending_id,'CPN-003');
  const failed=c.pay(order.id,'failed');
  assert.equal(failed.status,'payment_failed');
  assert.equal(c.available(a),true);
});

console.log('RC2 business unit contracts complete. No browser/WeChat/CRM verification implied.');
