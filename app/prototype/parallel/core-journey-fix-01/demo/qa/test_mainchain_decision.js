'use strict';
const assert=require('node:assert/strict'),{create}=require('../demo-core'),F=require('../fixtures');
const {create:presentation}=require('../presentation-policy');
let groups=0;
const check=(name,fn)=>{fn();groups++;console.log('PASS '+name);};
const verify=(c,method='sms',phone='13800000000')=>{c.requestPhone();c.resolvePhone('success',{method,phone});};
const p=c=>presentation({core:c,fixture:F,unitPolicy:{facts:()=>({})}});
check('monthly references stay public before verification and do not register an account',()=>{
 const c=create();c.setRequirement(3.5,6,true);
 const v=p(c).price(['SIM_BJ01_U03']);assert.equal(v.kind,'reference');assert.equal(v.amounts,null);assert.equal(c.state().account,null);assert.equal(c.state().quote,null);
 assert.throws(()=>c.formalAmounts(['SIM_BJ01_U03'],6),/PHONE_REQUIRED/);
});
check('manual contact and consultation never register or unlock an order',()=>{
 const c=create();c.setContact('13800000000');c.saveAdvisorLead({phone:'13800000000'});
 assert(!c.authorized());assert.equal(c.state().account,null);assert.throws(()=>c.submit(),/PHONE_REQUIRED/);
});
for(const method of ['wechat','sms'])check(method+' verification registers an account and unlocks formal pricing and order submission',()=>{
 const c=create();c.setRequirement(3.5,6,true);c.setDate(F.demoToday);c.select(['SIM_BJ01_U03']);verify(c,method);
 const a=c.state().account;assert(a.id);assert.equal(a.phone,'13800000000');assert.deepEqual(a.methods,[method]);
 assert.equal(p(c).price(['SIM_BJ01_U03']).kind,'term');c.quote();const o=c.submit();assert.equal(o.term_months,6);assert.equal(c.state().orders.length,1);
});
check('denial failure cancellation outcomes and invalid numbers never register',()=>{
 for(const result of ['denied','failed']){const c=create();c.requestPhone();c.resolvePhone(result,{phone:'13800000000'});assert.equal(c.state().account,null);assert(!c.authorized());}
 const c=create();c.requestPhone();assert.throws(()=>c.resolvePhone('success',{phone:'bad',method:'sms'}),/ENTER_PHONE/);assert.equal(c.state().account,null);
});
check('same phone login preserves account identity across methods and reload; expiry gates prices',()=>{
 let now=10;const c=create({now:()=>now});verify(c);const a=c.state().account;c.revokePhone();now=20;verify(c,'wechat');
 assert.equal(c.state().account.id,a.id);assert.equal(c.state().account.createdAt,a.createdAt);assert.deepEqual(c.state().account.methods,['sms','wechat']);
 const d=create({state:c.state(),now:()=>now});assert(d.authorized());assert.equal(d.state().account.id,a.id);
 now+=30*60*1000;assert(!d.authorized());assert.equal(d.state().account.id,a.id);assert.equal(p(d).price(['SIM_BJ01_U03']).kind,'reference');assert.throws(()=>d.submit(),/PHONE_REQUIRED/);
});
check('advisor requires valid phone while address is optional, without store unit order or account binding',()=>{
 const c=create();c.setRequirement(4,6,true);c.setStore('SIM_BJ03');
 for(const phone of ['', '123'])assert.throws(()=>c.saveAdvisorLead({phone}),/ENTER_PHONE/);
 const l=c.saveAdvisorLead({phone:'13800000000',items:'行李箱×2',capacity_hint:'4m³',term_hint:'6个月',store_id:'SIM_BJ03',unit_ids:['SIM_BJ03_U03']});
 assert.equal(l.type,'ADVISOR_CONSULTATION');assert.equal(l.address,'');assert.equal(l.items,'行李箱×2');assert.equal(l.capacity_m3,4);assert.equal(l.term_months,6);assert.equal(l.status,'saved_locally');
 assert.equal(l.store_id,undefined);assert.equal(l.unit_ids,undefined);assert.equal(c.state().orders.length,0);assert.equal(c.state().account,null);
});
check('advisor address editing preserves contact and intention, and withdrawal blocks editing',()=>{
 const c=create();const l=c.saveAdvisorLead({phone:'13800000000',address:'北京',note:'原备注'});c.editLead(l.id,{address:'',note:'修改'});
 const v=c.state().leads[0];assert.equal(v.address,'');assert.equal(v.phone,l.phone);assert.equal(v.note,'修改');c.withdrawLead(l.id);assert.throws(()=>c.editLead(l.id,{address:'北京'}),/LEAD_WITHDRAWN/);
});
check('personal address-only booking and independent enterprise validation remain distinct',()=>{
 const c=create();assert.throws(()=>c.saveLead(''),/ENTER_ADDRESS/);const l=c.saveLead('北京市西城区');assert.equal(l.phone,null);assert.equal(l.type,'SIMULATED_BOOKING_LEAD');assert.throws(()=>c.editLead(l.id,{address:''}),/ENTER_ADDRESS/);
 assert.throws(()=>c.saveEnterpriseLead({}),/ENTER_BUSINESS_PHONE/);assert.equal(c.state().enterpriseLeads.length,0);
});
check('unconfirmed lease remains unconfirmed after verification or advisor submission',()=>{
 const c=create();verify(c);c.saveAdvisorLead({phone:'13800000000'});assert.equal(c.state().requirement.term_confirmed,false);assert.equal(p(c).price(['SIM_BJ01_U03']).kind,'reference');assert.throws(()=>c.formalAmounts(['SIM_BJ01_U03'],6),/SELECT_TERM/);
});
check('existing verified prototype sessions adopt an account without registering unverified contacts',()=>{
 const c=create();verify(c);const old=c.state();delete old.account;const migrated=create({state:old});assert(migrated.state().account);assert.equal(migrated.state().account.phone,old.auth.phone);
 const fresh=create();fresh.setContact('13800000000');const plain=fresh.state();delete plain.account;assert.equal(create({state:plain}).state().account,null);
});
check('displayed addresses exclude spreadsheet formula fragments and duplicate city prefixes',()=>{
 assert(F.stores.every(s=>!s.address.includes('+J41:J59')&&!s.address.includes('北京市北京')));assert.equal(F.stores.filter(s=>s.city==='北京').length,30);
});
console.log(JSON.stringify({groups,result:'PASS',scope:'MAIN_CHAIN_20261027'}));
