#!/usr/bin/env node
'use strict';
// S01-DISCOUNT-SIGNOFF-07 | independent pricing-policy evidence.
// This is an AUDIT, not a tacit approval of the business discount schedule.
// It intentionally fails the policy gate on unapproved price inversions, while
// keeping CI green to make the audit report artifact available for adjudication.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const fixture=require(path.join(base,'fixtures.js'));
const {create}=require(path.join(base,'demo-core.js'));
const core=create();
const out=path.resolve(__dirname,'../release-evidence/s01-discount-signoff-07');
fs.mkdirSync(out,{recursive:true});
assert(Array.isArray(fixture.pricing?.termRules));
const rules=fixture.pricing.termRules;
const ruleFor=n=>rules.find(x=>n>=x.min&&n<=x.max);
assert.equal(rules[0].min,1);assert.equal(rules.at(-1).max,60);
for(let n=1;n<=60;n++)assert(ruleFor(n),'uncovered month '+n);
const sample=fixture.units.filter(u=>Number(u.base_month)>0).slice(0,Math.min(60,fixture.units.length));
assert(sample.length>=10,'not enough unit cases');
const declines=[],plateaus=[],miscalculated=[];
const activePrices=core.state().prices||{};
for(const u of sample){
 const baseMonthly=Number(activePrices[u.id]??u.base_month);
 let prevRent=null;
 for(let n=1;n<=60;n++){
  const amt=core.amounts([u.id],n), factor=Number(ruleFor(n).factor);
  const discountedMonthly=Math.round((baseMonthly*factor+Number.EPSILON)*100)/100;
  const expectedTotal=Math.round((discountedMonthly*n+Number.EPSILON)*100)/100;
  if(Math.abs(expectedTotal-amt.rent_total)>.011||Math.abs(amt.monthly_average-discountedMonthly)>.011)
   miscalculated.push({unitId:u.id,months:n,got:amt.rent_total,expected:expectedTotal});
  if(prevRent!==null){
    const delta=Math.round((amt.rent_total-prevRent+Number.EPSILON)*100)/100;
    const entry={unitId:u.id,monthsBefore:n-1,monthsAfter:n,before:prevRent,after:amt.rent_total,delta,factorBefore:ruleFor(n-1).factor,factorAfter:factor};
    if(delta<-.011)declines.push(entry);
    else if(Math.abs(delta)<=.011)plateaus.push(entry);
  }
  prevRent=amt.rent_total;
 }
}
assert.deepEqual(miscalculated,[],'core monthly/term arithmetic deviates from table');
const centralExample=declines.find(v=>v.monthsBefore===36);
const preview=(rows,n)=>rows.slice(0,n);
const baseVerified=false; // No signed marketing price-basis evidence in this repo.
const businessTermRulesSigned=false; // No authorized tariff signoff found in PR data.
const policyGate=declines.length||!baseVerified||!businessTermRulesSigned?'HOLD':'READY';
const report={
  source:'GitHub PR#99 branch pricing fixture + core.amounts()',
  auditDate:'2026-11-11',
  technicalArithmetic:'PASS',
  fixtureSynthetic:fixture.synthetic===true,
  unitSampleSize:sample.length,monthCount:60,
  testedPriceCombinations:sample.length*60,
  configuredTiers:rules.map(r=>({months:[r.min,r.max],factor:r.factor,discountLabel:Number((r.factor*10).toFixed(1))+'折'})),
  boundarySummary:{
   '12→13':plateaus.find(v=>v.monthsBefore===12)||null,
   '36→37':centralExample||null
  },
  decreasesTotal:declines.length,
  plateausTotal:plateaus.length,
  decreaseExamples:preview(declines,8),plateauExamples:preview(plateaus,8),
  priceMathAnomalies:miscalculated,
  marketingBasePriceVerified:baseVerified,
  tariffPolicyBusinessSigned:businessTermRulesSigned,
  releasePolicyGate:policyGate,
  gates:{technicalArithmetic:'PASS',visualScreenshot:'PENDING_HUMAN_SIGNOFF',
    releasePricing:'HOLD',deployment:'NO_DEPLOY',mainMerge:'NO_MERGE'},
  remediation:'Business must approve 1–60 month schedule, 36→37 inverse boundary, 12→13 plateau, price comparison base, plus S01/S02/S5/O01 pricing rules before any final marketing signoff.'
};
fs.writeFileSync(path.join(out,'policy-audit.json'),JSON.stringify(report,null,2));
const md=[
 '# S01-DISCOUNT-SIGNOFF-07 | 2026-11-11',
 '## 独立核验裁定',
 '- 程序报价公式：PASS；每档折扣匹配价源：PASS。',
 '- 正式经营折扣政策：HOLD，缺少业务批准记录和真实比较价依据。',
 '- 检测价格倒挂：'+declines.length+'个仓位-租期边界样本，其中36→37个月整期价下降。',
 '- 12→13个月平价样本：'+plateaus.filter(v=>v.monthsBefore===12).length+'。平价不必然错误，但需业务确认。',
 '- 比较价格营销：不可把基础月租直接称作历史原价。当前不展示划线价。',
 '## 价格示例（从实际核心代码计算）',
 centralExample?'- 36个月 '+centralExample.before+'元 → 37个月 '+centralExample.after+'元；差额 '+centralExample.delta+'元，样本仓位 '+centralExample.unitId:'- 尚未找到倒挂样例。',
 '## 完成归并前的待确认项',
 '1. 负责定价人员批准所有1–60个月折扣档位以及跨档边界，给出有效日期。',
 '2. 财务/市场确认打折比较基准、是否属于正式常规销售价及公示文案。',
 '3. H01/S01/S02/S5/O01价格口径同源、管理费押金/券后应付分别表达。',
 '4. 375/390首屏与极值截图人工视觉签收、真实微信环境回归。',
 '',
 '见 policy-audit.json 中逐项复算记录。'
].join('\n');
fs.writeFileSync(path.join(out,'README.md'),md);
console.log('S01_SIGNOFF_07_TECH_PASS_POLICY_'+policyGate+' '+JSON.stringify({
 units:sample.length,combos:sample.length*60,declines:declines.length,plateaus:plateaus.length,example:centralExample
}));
