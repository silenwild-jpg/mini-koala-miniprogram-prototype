'use strict';
const assert=require('node:assert/strict');
const base='../app/prototype/parallel/core-journey-fix-01/demo/';
const flow=require(base+'lead-flow.js'),CORE=require(base+'demo-core.js');require(base+'lifecycle-ui.js');
const forbidden=/本机演示记录|尚未发送给顾问|待产品签收|真实服务端办理|sessionStorage|request_key|模拟账本|SUBMITTING|FAILED_RETRYABLE|UNKNOWN_RESULT|STORAGE_ERROR|RETURN_RESTORE/;
for(const text of Object.values(flow.messages))assert.doesNotMatch(text,forbidden);
assert.equal(flow.messages.UNKNOWN_RESULT,'提交结果暂未确认，请勿重复提交。');
assert.match(flow.messages.STORAGE_ERROR,/刷新或离开页面可能丢失内容/);
assert.equal(flow.successCopy('booking').title,'预约需求已保存');
assert.equal(flow.successCopy('advisor').title,'咨询需求已保存');
assert.equal(flow.successCopy('enterprise').title,'企业需求已保存');
assert.equal(flow.successCopy('enterprise',true).title,'企业需求已更新');
for(const kind of ['booking','advisor','enterprise'])for(const updated of [false,true]){
 const copy=flow.successCopy(kind,updated);assert.doesNotMatch(copy.title+copy.detail,forbidden);assert.doesNotMatch(copy.title+copy.detail,/联系您|顾问已收到|提交成功|已发送/);
}
const core=CORE.create();core.setScenario('lifeRefund');const id=core.state().orders.at(-1).id;
core.lifecycleDemoRefund(id,'failed',true);
const tools=reviewMode=>({reviewMode,esc:s=>String(s??'').replace(/[&<>"']/g,''),button:(action,text)=>'<button data-action="'+action+'">'+text+'</button>',title:text=>'<h1>'+text+'</h1>',money:n=>'¥'+n});
let user=MK_LIFECYCLE_UI_V1.render('DP01',core,id,tools(false)),review=MK_LIFECYCLE_UI_V1.render('DP01',core,id,tools(true));
assert.doesNotMatch(user,forbidden);assert.doesNotMatch(user,/demoRefund|reviewRefund|演示|评审/);assert.match(user,/退款处理暂未完成/);assert.match(review,/REFUND_FAILED/);assert.match(review,/demoRefundResume/);
const payment=core.lifecycleView(id).payments[0],invoice=core.lifecycleRequestInvoice(id,payment.id,{kind:'personal',title:'合成抬头',email:'qa@example.invalid'});
core.lifecycleDemoInvoice(id,invoice.id,'failed',true);
user=MK_LIFECYCLE_UI_V1.render('IV01',core,id,tools(false));review=MK_LIFECYCLE_UI_V1.render('IV01',core,id,tools(true));
assert.doesNotMatch(user,forbidden);assert.doesNotMatch(user,/demoInvoice|演示|评审|不代表实际开票成功/);assert.match(user,/更正资料后重新提交/);assert.match(user,/原申请记录已保留/);assert.match(review,/待签收演示状态/);
const before=core.lifecycleView(id).invoices;core.lifecycleRetryInvoice(id,invoice.id,{title:'更正合成抬头',email:'retry@example.invalid'});const after=core.lifecycleView(id).invoices;
assert.equal(after.length,1);assert.equal(after[0].id,before[0].id);assert.equal(after[0].payment_id,before[0].payment_id);assert.equal(after[0].status,'PROCESSING');
console.log('01C_UX_COPY_01_UNIT_PASS: user copy, scenario receipts, reviewer separation, unchanged invoice identity');
