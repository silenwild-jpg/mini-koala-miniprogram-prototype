from pathlib import Path
R=Path(__file__).resolve().parent/'demo'
def edit(name,pairs):
 p=R/name;s=p.read_text(encoding='utf-8')
 for a,b in pairs:
  assert a in s,(name,a[:100]);s=s.replace(a,b)
 p.write_text(s,encoding='utf-8')
edit('br04/bridge.js',[("$('booking-address').after(addressButton);", "$('booking-address').closest('.phone-line').after(addressButton);"),("$('booking-address').parentNode.appendChild(contact);", "addressButton.after(contact);"),("$('artboardHolder').style.height=872*scale+'px';", "$('artboardHolder').style.height=976*scale+'px';")])
css='''
/* F01: preserve the approved header; give address, location helper, and phone separate rows. */
body[data-page="reserve"] .artboard{height:976px}
body[data-page="reserve"] .address-entry{width:100%;flex:1;min-width:0}
body[data-page="reserve"] .location-shortcut{position:absolute;top:94px;right:19px;min-height:32px;margin:0;padding:4px 10px;font-size:12px}
body[data-page="reserve"] .privacy-help{top:130px;right:19px}
body[data-page="reserve"] .reserve-contact-field{position:absolute;top:165px;left:19px;right:19px;margin:0;font-size:12px;line-height:18px}
body[data-page="reserve"] .reserve-contact-field input{display:block;width:100%;height:38px;margin-top:6px;padding:8px 10px;font-size:13px}
body[data-page="reserve"] .time-title{top:237px}
body[data-page="reserve"] .term-pills{top:265px}
body[data-page="reserve"] .date-control,body[data-page="reserve"] .date-input{top:311px}
body[data-page="reserve"] .request-title{top:373px}
body[data-page="reserve"] .option-list{top:402px}
body[data-page="reserve"] .note-field{top:528px}
body[data-page="reserve"] .submit{top:637px}
body[data-page="reserve"] .under-submit{top:692px}
'''
p=R/'br04/adapter.css';p.write_text(p.read_text(encoding='utf-8')+css,encoding='utf-8')
p=R/'account.js';s=p.read_text(encoding='utf-8');start=s.index('  function renew(){');end=s.index('\n  function exit(){',start)
s=s[:start]+'''  function renewalPrice(o){const q=o.service.renewalQuote;return q?'<h3>续租即时价格</h3><p><b>本次续租 '+q.months+'个月</b></p><dl><dt>原到期日</dt><dd>'+esc(q.previous_end_date)+'</dd><dt>续租后到期日</dt><dd>'+esc(q.new_end_date)+'</dd></dl>'+amounts(q)+button('payRenew','确认本地续租付款',id):'<p id="renewal-hint" role="status">请确认续租月份并重新核价。</p><button type="button" data-act="payRenew" data-value="'+esc(id)+'" disabled>确认本地续租付款</button>';}
  function renew(){const o=serviceOrder(),r=o.service.renewalQuote,period=core.rentalPeriod(id),draft=o.service.renewalDraft??r?.months??'';return panel('续租需求',headerOrder(o)+'<p>累计已付款租期 <b>'+period.total_months+'个月</b> · 当前到期日 <b>'+esc(period.end_date)+'</b></p><label for="renew-months">续租月份（1–60个月，无默认值）</label><input id="renew-months" type="number" min="1" max="60" inputmode="numeric" value="'+esc(draft)+'">'+button('renewQuote','重新核价',id)+'<section id="renewal-price" aria-live="polite">'+renewalPrice(o)+'</section><h3>已续租记录</h3>'+o.service.renewals.map(p=>'<p>'+p.months+'个月 · '+esc(p.id)+(p.new_end_date?' · 续租后到期日 '+esc(p.new_end_date):'')+'</p>').join(''));}''' +s[end:]
old="payRenew(){core.payRenewal(id);render();notify('续租付款已在本地记录');}"
new="payRenew(){try{const payment=core.payRenewal(id,Number($('renew-months').value));render();notify('续租'+payment.months+'个月付款已在本地记录，到期日 '+payment.new_end_date);}catch(e){render();throw e;}}"
assert old in s;s=s.replace(old,new)
old="  let previous=state().auth.status;"
new="""  document.addEventListener('input',event=>{if(event.target.id!=='renew-months')return;action(()=>{core.setRenewalMonths(id,event.target.value);$('renewal-price').innerHTML=renewalPrice(core.orderDetail(id));});});
  let previous=state().auth.status;"""
assert old in s;s=s.replace(old,new)
old="(l.status!=='withdrawn'?'<div class=\"button-row\">'+button('editLead'"
new="(l.status!=='withdrawn'?'<div class=\"button-row\">'+(l.type==='ENTERPRISE_REQUIREMENT'?'<a class=\"outline\" href=\"business.html?lead='+encodeURIComponent(l.id)+'\">补充企业资料</a>':'')+button('editLead'"
assert old in s;s=s.replace(old,new);p.write_text(s,encoding='utf-8')
edit('business-bridge.js',[
 ("const fresh=()=>({size:null", "const fresh=()=>({lead_id:null,size:null"),
 ("  const contact=core.state().contactPhone;const draft=read(DRAFT);let form=draft?.version===1?{...fresh(),...draft.value}:fresh();", """  const contact=core.state().contactPhone,draft=read(DRAFT),requestedId=new URLSearchParams(location.search).get('lead');
  const requested=requestedId?core.state().enterpriseLeads.find(l=>l.id===requestedId):null;
  let form=draft?.version===1?{...fresh(),...draft.value}:fresh(),invalidRequested=!!requestedId&&!requested;
  if(requested){form={...fresh(),lead_id:requested.id,size:requested.capacity_m3,band:requested.capacity_band||'',custom:!requested.capacity_band&&requested.capacity_m3!==null,term:requested.term_months,types:requested.storage_types||[],move:requested.moving_support||'待确认',location:requested.location||'',contact_name:requested.contact_name||'',company:requested.company||'',phone:requested.phone||'',expected_start_date:requested.expected_start_date||'',notes:requested.notes||'',storage_type_other:requested.storage_type_other||''};}"""),
 ("if(form.requirementSignature!==JSON.stringify(r)||!draft)", "if(!form.lead_id&&(form.requirementSignature!==JSON.stringify(r)||!draft))"),
 ("  function persist(){", """  const editContext=document.createElement('div');editContext.className='enterprise-edit-context';editContext.innerHTML='<p id="enterprise-edit-status" role="status"></p><button type="button" id="new-enterprise">新建企业需求</button><a href="account.html?view=needs">查看我的需求</a>';$('businessAddress').closest('.field').before(editContext);
  function updateEditContext(){const existing=form.lead_id?core.state().enterpriseLeads.find(l=>l.id===form.lead_id):null,blocked=invalidRequested||!!form.lead_id&&(!existing||existing.status==='withdrawn');$('enterprise-edit-status').textContent=blocked?'原需求不存在或已撤回；可明确新建另一条需求。':form.lead_id?'正在补充企业需求 '+form.lead_id+'；保存后更新原记录。':'新企业需求；首次保存后可继续补充。';$('submit').disabled=blocked;$('submit').textContent=form.lead_id?'保存企业需求更新':'邀请顾问协助';}
  $('new-enterprise').onclick=()=>{form={...fresh(),size:r.capacity_m3,term:r.term_confirmed?r.term_months:null,custom:r.capacity_m3!==null,phone:core.state().contactPhone||''};invalidRequested=false;for(const [id,key] of Object.entries(fields))$(id).value=form[key]||'';history.replaceState({},'',location.pathname);result.hidden=true;refresh();};
  function persist(){"""),
 ("    $('transportGift').classList.toggle('show',form.move==='需要');persist();", "    $('transportGift').classList.toggle('show',form.move==='需要');updateEditContext();persist();"),
 ("    try{const lead=core.saveEnterpriseLead({phone:form.phone", "    try{const updating=!!form.lead_id;const lead=core.saveEnterpriseLead({lead_id:form.lead_id||undefined,phone:form.phone"),
 ("notes:form.notes});persist();$('business-result-text').textContent='需求编号 '+lead.id+'，可返回继续补充信息。';result.hidden=false;", "notes:form.notes});form.lead_id=lead.id;persist();updateEditContext();$('business-result-title').textContent=updating?'企业需求已更新':'企业需求已保存';$('business-result-text').textContent=(updating?'已更新原需求 ':'需求编号 ')+lead.id+'，继续补充仍使用同一编号。';result.hidden=false;"),
 ("const messages={ENTER_BUSINESS_PHONE:", "const messages={LEAD_NOT_FOUND:'原需求不存在，请从我的需求打开或明确新建',LEAD_WITHDRAWN:'该需求已撤回，可明确新建其他需求',ENTER_BUSINESS_PHONE:")
])
p=R/'business-adapter.css';p.write_text(p.read_text(encoding='utf-8')+'''\n.enterprise-edit-context{padding:12px;background:#edf5ef;border:1px solid #d5e3d9;border-radius:10px;margin:15px 0;font-size:12px;line-height:1.6}.enterprise-edit-context p{margin:0 0 9px}.enterprise-edit-context button{font:inherit;min-height:36px;padding:7px 11px;border:1px solid #a3c3af;border-radius:7px;background:white;color:#23563c;margin-right:12px}.enterprise-edit-context a{color:#225e42}#submit:disabled{opacity:.5;cursor:default}\n''',encoding='utf-8')
for name in ['index.html','home-bridge.js']:
 p=R/name;s=p.read_text(encoding='utf-8').replace('PRODUCT-REVIEW-01','CORE-JOURNEY-FIX-01');p.write_text(s,encoding='utf-8')
print('Three priority fixes applied to candidate')
