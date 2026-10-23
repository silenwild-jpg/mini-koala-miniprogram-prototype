(function(){
  const $=selector=>document.querySelector(selector);
  const page=location.pathname.split('/').pop();
  const phoneKey='mini_storage_lead_phone';
  const contextKey='mini_storage_lead_context';

  if(/store_list_s01|store_detail_s02/.test(page)){
    let request=null;
    $('#leadWxBtn').textContent='使用微信手机号提交协助需求';
    $('.lead-note').textContent='手机号仅用于本次咨询联系。';
    if(/store_detail_s02/.test(page))$('#nomatchAdvisor').textContent='请顾问跨店查找';

    window.openLeadCapture=function(cfg={}){
      request=cfg;
      const saved=leadPhone();
      $('#leadWxBtn').textContent=saved?`使用已确认手机号提交 ${maskPhone(saved)}`:'使用微信手机号提交协助需求';
      $('#leadModalTitle').textContent=cfg.node==='S01_ZERO_MATCH'?'顾问协助继续查找':cfg.title||'选仓顾问协助';
      $('#leadModalDesc').textContent=cfg.desc||'会带上您已填写的需求，不需要重新描述。';
      $('#leadSkipBtn').style.display=cfg.allowSkip===false?'none':'block';
      $('#leadPhoneInput').value='';
      $('#leadMask').classList.add('show');
    };
    window.finishLeadCapture=function(phone){
      if(!request)return;
      const digits=String(phone||'').replace(/\D/g,'');
      if(digits.length<7){toast('请检查手机号');return}
      const cfg=request;
      leadStorageSet(phoneKey,digits);
      leadStorageSet(contextKey,JSON.stringify({phone_capture_node:cfg.node||'UNKNOWN',...cfg.context,status:'PENDING',submitted_at:new Date().toISOString()}));
      request=null;
      leadClose();
      toast('已提交选仓顾问协助需求');
      if(cfg.onSuccess)cfg.onSuccess(digits);
    };
    // The frozen page's demo WeChat button supplies a sample number. Reuse the
    // confirmed number when present and stop its original click listener.
    $('#leadWxBtn').addEventListener('click',event=>{
      event.stopImmediatePropagation();
      window.finishLeadCapture(leadPhone()||'13800138000');
    },true);
    $('#leadSkipBtn').addEventListener('click',event=>{
      event.stopImmediatePropagation();
      const cfg=request;request=null;leadClose();
      if(cfg&&cfg.onSkip)cfg.onSkip();
    },true);
    return;
  }

  if(/unit_detail_u01/.test(page)){
    const help=$('#helpAdvisor');
    const details={
      oversize:'顾问协助大件用仓安排',
      multiple_units:'协助比较多个仓位的组合',
      enterprise:'协助确认企业用仓安排',
      high_contract_rent:'协助比较当前仓位、租期和总费用'
    };
    function updateHelp(){
      const state=advisorState();
      help.querySelector('span').textContent=details[state.reason]||'帮您比较仓位大小、价格和门店';
      help.setAttribute('aria-label',`选仓顾问协助：${advisorReasonCopy(state)}`);
    }
    updateHelp();
    $('#advisorBtn').addEventListener('click',updateHelp);
    return;
  }

  if(/quote_q01/.test(page)){
    const section=$('#contactSection');
    section.querySelector('summary b').textContent='保存方案与选仓协助';
    $('#contactHint').textContent='手机号用于保存和找回方案；填写后不会自动提交顾问协助需求。您可以继续自行下单。';
    const button=document.createElement('button');
    button.id='quoteAdvisorRequest';button.type='button';button.className='quick-phone';
    button.textContent='请选仓顾问协助确认方案';
    const status=document.createElement('div');
    status.id='quoteAdvisorStatus';status.hidden=true;
    section.querySelector('.quote-secondary-body').append(button,status);
    const style=document.createElement('style');
    style.textContent='#quoteAdvisorRequest{width:100%;margin-top:10px}#quoteAdvisorStatus{margin-top:8px;color:#2F6B4F;font-size:12px;line-height:1.5}';
    document.head.appendChild(style);
    function renderRequest(){
      let ctx={};try{ctx=JSON.parse(qGet(contextKey)||'{}')}catch(e){}
      const pending=ctx.phone_capture_node==='Q01_ADVISOR'&&ctx.quote_id===qid&&ctx.status==='PENDING';
      status.hidden=!pending;
      if(pending){status.textContent='当前方案的协助需求已提交，您仍可继续自行下单。';section.open=true}
    }
    button.addEventListener('click',()=>{
      const input=$('#phone').value.trim();
      if(input&&!savePhone(input,'Q01_QUOTE')){toast('请检查手机号');return}
      const phone=input?String(input).replace(/\D/g,''):qGet(phoneKey);
      if(!phone){section.open=true;$('#phone').focus();toast('请先填写手机号，方便顾问确认当前方案');return}
      qSet(contextKey,JSON.stringify({
        phone_capture_node:'Q01_ADVISOR',status:'PENDING',submitted_at:new Date().toISOString(),
        quote_id:qid,store_id:storeId,unit_id:representativeUnitNo,
        size_option_id:sizeOptionId,term_months:term,total_rent:total,customer_type:customerType
      }));
      renderContact();renderRequest();toast('已提交选仓顾问协助需求');
    });
    renderRequest();
  }
})();
