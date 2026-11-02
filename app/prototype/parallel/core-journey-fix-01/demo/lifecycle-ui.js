(function(root){
'use strict';
function render(page,core,selectedId,tools){
 const {esc,button,title,money,reviewMode}=tools;
 const orders=core.state().orders.filter(o=>o.status==='paid_simulated');
 const id=selectedId||orders.at(-1)?.id;
 const match=orders.some(o=>o.id===id);
 const names={RN01:'续租申请',EX01:'退租与到期',DP01:'押金处理',IV01:'发票申请'};
 let body='<div class="detail-blank">';
 if(!match)return title(names[page]||'租后管理','O03')+body+'<p>没有可操作的有效模拟已支付订单。</p>'+button('go','返回订单','M01','outline')+'</div>';
 const v=core.lifecycleView(id);
 body+='<p>订单：'+esc(id)+'</p><p>租期：'+esc(v.total_months)+'个月 · '+esc(v.start_date)+' 至 '+esc(v.end_date)+'</p>';
 body+='<p>租赁状态：'+esc(v.lease_status)+'</p>';
 if(page==='RN01'){
  body+='<h3>续租报价申请</h3><p>续租价格必须单独确认，不自动沿用当前月租。所有操作仅为内部演示。</p>';
  for(const r of v.renewal_requests){
   body+='<p>'+esc(r.id)+' · '+esc(r.months)+'个月 · '+esc(r.status)+'</p>';
   if(r.status==='QUOTE_PENDING'&&reviewMode){
    body+='<label>评审演示月租（¥） <input id="renew-review-price" type="number" min="0.01" step="0.01"></label>'+button('reviewRenewal','模拟审核报价',r.id,'outline');
   }
   if(r.status==='QUOTE_READY')body+='<p>人工演示报价：'+money(r.quote_total)+' / 整期</p>'+button('confirmRenewal','确认演示续租',r.id);
   if(r.status==='COMPLETED')body+='<p>模拟续租确认完成：'+money(r.quote_total)+'</p>';
  }
  if(['active','upcoming'].includes(v.lease_status)&&v.total_months<60&&!v.renewal_requests.some(r=>['QUOTE_PENDING','QUOTE_READY'].includes(r.status))){
   body+='<label>续租月数（1–60，累计租期不超过60） <input id="renew-months" type="number" min="1" max="60" value="3"></label>'+button('requestRenewal','提交续租需求');
  }else body+='<p>当前状态暂不接受新的续租申请。</p>';
 }else if(page==='EX01'){
  body+='<h3>退租安排</h3><p>不自动计算提前退租退款或扣款金额；验仓只能由评审后台模拟。</p>';
  if(!v.exit&&v.lease_status==='active'){
   body+='<label>退租类型 <select id="exit-type"><option value="expiry">到期退租</option><option value="early">提前退租</option></select></label><label>计划取空日期 <input id="exit-date" type="date"></label>'+button('requestExit','提交退租安排');
  }else if(v.exit){
   body+='<p>退租：'+esc(v.exit.type)+' · '+esc(v.exit.date)+' · '+esc(v.exit.status)+'</p>';
   if(['REQUESTED','INSPECTION_FAILED'].includes(v.exit.status))
    body+='<p>请确认物品全部取出、仓位清空并锁好。</p>'+button('requestInspection','确认清空并申请验仓');
   if(v.exit.status==='WAITING_INSPECTION')
    body+='<p>等待门店验仓；用户不能自行确认验仓通过。</p>'+(reviewMode?button('reviewInspectPass','评审模拟验仓通过','','outline')+button('reviewInspectFail','评审模拟验仓不通过','','outline'):'');
   if(v.exit.status==='INSPECTION_PASSED')body+='<p>验仓已通过；订单访问资格关闭。</p>';
  }else body+='<p>当前租赁状态不能开始退租。</p>';
 }else if(page==='DP01'){
  body+='<h3>押金进度</h3><p>状态：'+esc(v.deposit_status)+'</p>';
  body+='<p>押金金额和退款时效以实际合同及后台核实为准，本演示不自动生成扣款或退款金额。</p>';
  if(v.deposit_status==='REFUND_PENDING'&&reviewMode)body+=button('reviewRefund','评审模拟退款完成','','outline');
 }else if(page==='IV01'){
  body+='<h3>发票申请</h3><p>按已发生的模拟付款记录选择；申请不代表真实开票。</p>';
  for(const inv of v.invoices)body+='<p>'+esc(inv.id)+' · '+esc(inv.payment_id)+' · '+esc(inv.status)+'</p>';
  const available=v.payments.filter(p=>!v.invoices.some(i=>i.payment_id===p.id));
  if(available.length){
   body+='<label>付款记录 <select id="invoice-payment">'+available.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.type)+' · '+esc(p.id)+' · '+money(p.amount)+'</option>').join('')+'</select></label>';
   body+='<label>类型 <select id="invoice-kind"><option value="personal">个人</option><option value="enterprise">企业</option></select></label>';
   body+='<label>抬头 <input id="invoice-title" maxlength="120"></label><label>邮箱 <input id="invoice-email" type="email"></label><label>企业税号（企业时必填） <input id="invoice-tax" maxlength="50"></label>';
   body+=button('requestInvoice','提交模拟发票申请');
  }else body+='<p>暂无可申请的付款记录。</p>';
 }
 body+=button('go','返回订单详情','O03','outline')+'</div>';
 return title(names[page]||'租后管理','O03')+body;
}
root.MK_LIFECYCLE_UI_V1={render};
})(typeof window==='object'?window:globalThis);
