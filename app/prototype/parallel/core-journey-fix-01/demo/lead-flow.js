(function(root){
  'use strict';
  const messages={EDITING:'',SUBMITTING:'正在提交，请稍候。',FAILED_RETRYABLE:'暂时无法提交，请重试或返回修改。',UNKNOWN_RESULT:'提交结果暂未确认，请勿重复提交。',SUCCESS:'需求已保存。',STORAGE_ERROR:'暂时无法保存，请保留已填写内容并重试。刷新或离开页面可能丢失内容。',RETURN_RESTORE:'已恢复上次填写的信息，请核对后继续。'};
  function successCopy(kind,updated=false){
    return {title:kind==='enterprise'?(updated?'企业需求已更新':'企业需求已保存'):kind==='advisor'?'咨询需求已保存':'预约需求已保存',detail:kind==='enterprise'?(updated?'本次修改已保存，可继续查看需求。':'可继续补充信息，或查看已保存的需求。'):'可在“我的需求”中查看。'};
  }
  function create({core,kind,packet={},persist,onChange=()=>{},delay=350}){
    let busy=false,scenario='success',attempts=0;
    if(packet.status==='SUBMITTING')packet.status='UNKNOWN_RESULT';
    const emit=()=>onChange(packet);
    function write(){try{persist();return true;}catch{packet.status='STORAGE_ERROR';emit();return false;}}
    return {
      packet,
      scenario(value){scenario=value;attempts=0;},
      reset(){if(busy||packet.status==='UNKNOWN_RESULT')return false;Object.keys(packet).forEach(k=>delete packet[k]);packet.status='EDITING';write();emit();return true;},
      async submit(input){
        if(busy||packet.status==='SUCCESS')return;
        // Validate through the existing domain methods, without changing live state.
        const check=root.SIM_CORE.create({state:core.state()});
        if(!packet.input||packet.status!=='UNKNOWN_RESULT'){
          if(kind==='enterprise')check.saveEnterpriseLead(input);
          else if(kind==='advisor')check.saveAdvisorLead(input);
          else check.saveLead(input.address,input);
          packet.input=JSON.parse(JSON.stringify(input));
        }
        packet.key=packet.key||('LOCAL_REQUEST_'+(root.crypto?.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2)));
        busy=true;packet.status='SUBMITTING';
        if(!write()){busy=false;return;}emit();
        try{
          await new Promise(resolve=>setTimeout(resolve,delay));
          const old=core.state().leadRequestResults?.[packet.key];
          if(!old&&scenario==='fail_once'&&attempts++===0){packet.status='FAILED_RETRYABLE';write();emit();return;}
          const result=old||core.submitLeadRequest(packet.key,kind,packet.input,()=>{
            // Persist the domain transaction before acknowledging success.
            persist();
          });
          packet.result=result;
          packet.status=!old&&scenario==='timeout_saved'?'UNKNOWN_RESULT':'SUCCESS';
          write();emit();
          // duplicate_success represents the same transport response delivered twice.
          if(scenario==='duplicate_success'&&packet.status==='SUCCESS')emit();
        }catch(e){packet.status='STORAGE_ERROR';packet.error=e.message;emit();}
        finally{busy=false;}
      },
      edited(){if(!busy&&!['EDITING','SUCCESS','UNKNOWN_RESULT'].includes(packet.status)){packet.status='EDITING';emit();}},
      saved:write
    };
  }
  function controls(doc,host,flow,review){
    const wrap=doc.createElement('div');wrap.className='lead-flow-status';
    const status=doc.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const retry=doc.createElement('button');retry.type='button';retry.textContent='重试提交';retry.dataset.leadRetry='';
    wrap.append(status,retry);host.append(wrap);
    let reviewText;
    if(review){const label=doc.createElement('label');reviewText=doc.createTextNode('');label.append(reviewText);const select=doc.createElement('select');select.dataset.leadScenario='';for(const [v,t] of [['success','正常保存'],['fail_once','首次失败再成功'],['timeout_saved','已保存但回执超时'],['duplicate_success','重复成功回调']]){const option=doc.createElement('option');option.value=v;option.textContent=t;select.append(option);}select.onchange=()=>flow.scenario(select.value);label.append(select);wrap.append(label);}
    return {retry,element:wrap,render(packet){status.textContent=messages[packet.status]||'';wrap.dataset.state=packet.status||'EDITING';if(reviewText)reviewText.textContent='评审模式 · '+(packet.status||'EDITING')+'：本机模拟，未发送至顾问服务。';retry.hidden=!['FAILED_RETRYABLE','UNKNOWN_RESULT','STORAGE_ERROR'].includes(packet.status);retry.textContent=packet.status==='UNKNOWN_RESULT'?'核对提交结果':'重试提交';}};
  }
  // Keep the shell usable when writes are denied. Lead acknowledgement still
  // uses raw storage and reports STORAGE_ERROR; this memory is never durable.
  function shellStorage(){const memory=new Map();return {
    getItem(key){if(memory.has(key))return memory.get(key);try{return root.sessionStorage.getItem(key);}catch{return null;}},
    setItem(key,value){memory.set(key,String(value));try{root.sessionStorage.setItem(key,value);}catch{}},
    removeItem(key){memory.set(key,null);try{root.sessionStorage.removeItem(key);}catch{}}
  };}
  root.MK_LEAD_FLOW={create,controls,messages,successCopy,shellStorage};
  if(typeof module==='object'&&module.exports)module.exports=root.MK_LEAD_FLOW;
})(typeof window==='object'?window:globalThis);
