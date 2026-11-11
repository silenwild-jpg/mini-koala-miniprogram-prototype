(function(root){
'use strict';
function render(page,core,selectedId,tools){
 const {esc,button,title,money,reviewMode,renewalDraft}=tools;
 const orders=core.state().orders.filter(o=>o.status==='paid_simulated');
 const id=selectedId||orders.at(-1)?.id;
 const match=orders.some(o=>o.id===id);
 const names={RN01:'续租申请',EX01:'退租与到期',DP01:'押金处理',IV01:'发票申请'};
 const stateLabel=s=>({
   upcoming:'待起租',active:'租用中',returning:'退租办理中',ended:'已退租',
   HELD:'押金保管中',held:'押金保管中',REFUND_PENDING:'退款处理中',REFUNDED:'已退还',
   QUOTE_PENDING:'报价确认中',QUOTE_READY:'待确认续租',COMPLETED:'已完成',
   REQUESTED:'已提交',WAITING_INSPECTION:'待验仓',INSPECTION_FAILED:'需重新验仓',INSPECTION_PASSED:'验仓通过',
   SUBMITTED:'已提交',personal:'个人',enterprise:'企业',INITIAL:'首期租金',RENEWAL:'续租费用',
   expiry:'到期退租',early:'提前退租'
 }[s]||'办理中');
 const publicOrder=id=>{
   const suffix=String(id||'').match(/[0-9]+$/)?.[0];
   if(suffix)return 'KL'+suffix.padStart(8,'0');
   return 'KL'+Array.from(String(id||'')).reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))>>>0,0).toString().padStart(10,'0').slice(-10);
 };
 let body='<div class="detail-blank">';
 if(!match)return title(names[page]||'租后管理','O03')+body+'<p>没有可办理租后服务的订单，请从我的订单进入。</p>'+button('go','返回订单','M01','outline')+'</div>';
 const v=core.lifecycleView(id);
 const sourceOrder=core.state().orders.find(o=>o.id===id);
 const cabinIds=(sourceOrder?.unit_ids||[]).map(unitId=>
   core.fixture.units.find(u=>u.id===unitId)?.demo_cabin_no).filter(Boolean);
 body+='<p>订单号：'+esc(publicOrder(id))+'</p>'
   +(cabinIds.length?'<p>仓号：'+esc(cabinIds.join('、'))+'</p>':'')
   +'<p>租期：'+esc(v.total_months)+'个月 · '+esc(v.start_date)+' 至 '+esc(v.end_date)+'</p>';
 body+='<p>租赁状态：'+esc(stateLabel(v.lease_status))+'</p>';
 if(page==='RN01'){
  body+='<h3>续租报价申请</h3><p>续租价格必须单独确认，不自动沿用当前月租。续租金额经确认后生效。</p>';
  for(const r of v.renewal_requests){
   body+='<p>'+esc(r.months)+'个月 · '+esc(stateLabel(r.status))+'</p>';
   if(r.status==='QUOTE_PENDING'&&reviewMode){
    body+='<label>评审演示月租（¥） <input id="renew-review-price" type="number" min="0.01" step="0.01"></label>'+button('reviewRenewal','模拟审核报价',r.id,'outline');
   }
   if(r.status==='QUOTE_READY')body+='<p>续租整期金额：'+money(r.quote_total)+' / 整期</p>'+button('confirmRenewal','确认续租',r.id);
   if(r.status==='COMPLETED')body+='<p>续租已完成：'+money(r.quote_total)+'</p>';
  }
  if(['active','upcoming'].includes(v.lease_status)&&v.total_months<60&&!v.renewal_requests.some(r=>['QUOTE_PENDING','QUOTE_READY'].includes(r.status))){
   body+='<label>续租月数（1–60，累计租期不超过60） <input id="renew-months" type="number" min="1" max="60" value="'+esc(renewalDraft===null||renewalDraft===undefined?'3':String(renewalDraft))+'"></label>'+button('requestRenewal','提交续租需求');
  }else body+='<p>当前状态暂不接受新的续租申请。</p>';
 }else if(page==='EX01'){
  body+='<h3>退租安排</h3><p>退租费用与验仓结果以门店办理结果为准。</p>';
  if(!v.exit&&v.lease_status==='active'){
   body+='<label>退租类型 <select id="exit-type"><option value="expiry">到期退租</option><option value="early">提前退租</option></select></label><label>计划取空日期 <input id="exit-date" type="date"></label>'+button('requestExit','提交退租安排');
  }else if(v.exit){
   body+='<p>退租：'+esc(stateLabel(v.exit.type))+' · '+esc(v.exit.date)+' · '+esc(stateLabel(v.exit.status))+'</p>';
   if(['REQUESTED','INSPECTION_FAILED'].includes(v.exit.status))
    body+='<p>请确认物品全部取出、仓位清空并锁好。</p>'+button('requestInspection','确认清空并申请验仓');
   if(v.exit.status==='WAITING_INSPECTION')
    body+='<p>等待门店验仓；用户不能自行确认验仓通过。</p>'+(reviewMode?button('reviewInspectPass','评审模拟验仓通过','','outline')+button('reviewInspectFail','评审模拟验仓不通过','','outline'):'');
   if(v.exit.status==='INSPECTION_PASSED')body+='<p>验仓已通过；订单访问资格关闭。</p>';
  }else body+='<p>当前租赁状态不能开始退租。</p>';
 }else if(page==='DP01'){
  body+='<h3>押金进度</h3><p>状态：'+esc(stateLabel(v.deposit_status))+'</p>';
  body+='<p>押金退还金额与到账时间以实际办理结果为准。</p>';
  if(v.deposit_status==='REFUND_PENDING'&&reviewMode)body+=button('reviewRefund','评审模拟退款完成','','outline');
 }else if(page==='IV01'){
  body+='<h3>发票申请</h3><p>选择对应的付款记录填写开票信息。</p>';
  for(const inv of v.invoices)body+='<p>'+'发票申请 · '+esc(stateLabel(inv.status))+'</p>';
  const available=v.payments.filter(p=>!v.invoices.some(i=>i.payment_id===p.id));
  if(available.length){
   body+='<label>付款记录 <select id="invoice-payment">'+available.map(p=>'<option value="'+esc(p.id)+'">'+esc(stateLabel(p.type))+' · '+money(p.amount)+'</option>').join('')+'</select></label>';
   body+='<label>类型 <select id="invoice-kind"><option value="personal">个人</option><option value="enterprise">企业</option></select></label>';
   body+='<label>抬头 <input id="invoice-title" maxlength="120"></label><label>邮箱 <input id="invoice-email" type="email"></label><label>企业税号（企业时必填） <input id="invoice-tax" maxlength="50"></label>';
   body+=button('requestInvoice','提交发票申请');
  }else body+='<p>暂无可申请的付款记录。</p>';
 }
 body+=button('go','返回订单详情','O03','outline')+'</div>';
 return title(names[page]||'租后管理','O03')+body;
}
root.MK_LIFECYCLE_UI_V1={render};
})(typeof window==='object'?window:globalThis);
