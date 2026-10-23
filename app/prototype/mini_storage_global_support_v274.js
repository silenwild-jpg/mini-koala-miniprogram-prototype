(function(){
  function safeBack(fallback){
    let samePrototypeReferrer=false;
    try{
      if(document.referrer){
        const ref=new URL(document.referrer,location.href),current=new URL(location.href);
        const refDir=ref.pathname.slice(0,ref.pathname.lastIndexOf('/')+1);
        const currentDir=current.pathname.slice(0,current.pathname.lastIndexOf('/')+1);
        samePrototypeReferrer=ref.origin===current.origin&&refDir===currentDir;
      }
    }catch(e){}
    if(samePrototypeReferrer){history.back();return}
    location.href=fallback;
  }
  window.MINI_KOALA_NAV={...(window.MINI_KOALA_NAV||{}),safeBack};
  if(document.querySelector('#miniGlobalSupport'))return;
  const style=document.createElement('style');
  style.textContent=`
  .mini-global-support{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:calc(82px + env(safe-area-inset-bottom));z-index:58;display:flex;flex-direction:column;align-items:flex-end;gap:7px;pointer-events:none}.mini-global-support>*{pointer-events:auto}
  .mini-global-support button{width:44px;height:44px;border:1px solid #CFE1D6;border-radius:50%;background:#FFFFFF;color:#2F6B4F;box-shadow:0 5px 18px rgba(31,41,35,.12);font-size:9px;font-weight:900;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:pointer}
  .mini-global-support button i{font-style:normal;font-size:16px;line-height:1}
  .mini-support-mask{position:fixed;inset:0;background:rgba(28,37,32,.36);z-index:118;display:none;align-items:flex-end;justify-content:center}.mini-support-mask.show{display:flex}
  .mini-support-sheet{width:min(430px,100%);background:#FFFFFF;border-radius:20px 20px 0 0;padding:18px 16px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(28,37,32,.15)}
  .mini-support-sheet h3{margin:0;font-size:18px}.mini-support-sheet p{margin:8px 0 14px;font-size:13px;color:#6F7671;line-height:1.6}.mini-support-sheet button{width:100%;height:46px;border:0;border-radius:12px;background:#2F6B4F;color:#fff;font-weight:900}
  .mini-support-actions{display:none;gap:7px;flex-direction:column}.mini-global-support.expanded .mini-support-actions{display:flex}.mini-support-launcher{width:44px!important;height:44px!important;border-radius:50%!important;background:#2F6B4F!important;color:#fff!important;border-color:#2F6B4F!important;transform:none}.mini-global-support.expanded .mini-support-launcher{transform:translateX(0) rotate(45deg)}
  @media(max-width:650px){.mini-global-support{right:10px;bottom:calc(88px + env(safe-area-inset-bottom))}.mini-global-support button{width:44px;height:44px}.mini-support-launcher{width:44px!important;height:44px!important;transform:none}}
  `;
  document.head.appendChild(style);
  const float=document.createElement('div');
  float.id='miniGlobalSupport';float.className='mini-global-support';
  float.innerHTML='<div class="mini-support-actions" id="miniSupportActions"><button id="miniSupportPhone" type="button" aria-label="拨打客服电话 4000358805"><i>☎</i><span>电话</span></button><button id="miniSupportChat" type="button" aria-label="打开微信在线客服"><i>◉</i><span>客服</span></button></div><button id="miniSupportLauncher" class="mini-support-launcher" type="button" aria-label="展开电话和在线客服"><i>＋</i><span>帮助</span></button>';
  const mask=document.createElement('div');
  mask.id='miniSupportMask';mask.className='mini-support-mask';
  mask.innerHTML='<div class="mini-support-sheet"><h3>微信在线客服</h3><p>微信环境将直接调用客服聊天窗口；当前浏览器为功能演示环境，未配置企业微信客服参数时显示此提示。</p><button id="miniSupportClose" type="button">知道了</button></div>';
  document.body.append(float,mask);
  document.querySelector('#miniSupportLauncher').onclick=()=>float.classList.toggle('expanded');
  document.querySelector('#miniSupportPhone').onclick=()=>{float.classList.remove('expanded');location.href='tel:4000358805'};
  function openWechatCustomerService(){
    const config=window.MINI_KOALA_WECHAT_SERVICE||window.__MINI_KOALA_WECHAT_SERVICE__||{};
    const wxApi=window.wx;
    if(wxApi&&typeof wxApi.openCustomerServiceChat==='function'&&config.corpId&&config.url){
      wxApi.openCustomerServiceChat({corpId:config.corpId,url:config.url,success:()=>{},fail:()=>mask.classList.add('show')});
      return true;
    }
    return false;
  }
  document.querySelector('#miniSupportChat').onclick=()=>{
    float.classList.remove('expanded');
    document.dispatchEvent(new CustomEvent('mini-storage-open-wechat-service'));
    if(!openWechatCustomerService())mask.classList.add('show');
  };
  document.querySelector('#miniSupportClose').onclick=()=>mask.classList.remove('show');
  mask.onclick=e=>{if(e.target===mask)mask.classList.remove('show')};

  try{
    const __demoQ=new URLSearchParams(location.search);
    if((__demoQ.get('demoStory')||__demoQ.get('source')==='internal_demo')&&!window.MINI_KOALA_INTERNAL_DEMO_V1){
      const __demoScript=document.createElement('script');
      __demoScript.src='mini_koala_internal_demo_v1.js';
      document.head.appendChild(__demoScript);
    }
  }catch(e){}
  // Page-specific sales request behavior; keep frozen V1.6 screen sources intact.
  if(/mini_storage_(store_list_s01|store_detail_s02|unit_detail_u01|quote_q01)_/.test(location.pathname)){
    const salesPatch=document.createElement('script');
    salesPatch.src='mini_koala_sales_intervention_patch_v1.js';
    document.head.appendChild(salesPatch);
  }
  const acceptanceCss=document.createElement('link');acceptanceCss.rel='stylesheet';acceptanceCss.href=new URL('mini_koala_acceptance_fix_v1.css',document.currentScript.src).href;document.head.appendChild(acceptanceCss);
  const acceptanceScript=document.createElement('script');acceptanceScript.src=new URL('mini_koala_acceptance_fix_v1.js',document.currentScript.src).href;document.head.appendChild(acceptanceScript);
  // Acceptance Fix V1.1: additive, independently removable state patch.
  if(/mini_storage_(store_list_s01|quote_q01)_|space_decision_assistant_/.test(location.pathname)){
    const patchCss=document.createElement('link');patchCss.rel='stylesheet';patchCss.href=new URL('mini_koala_acceptance_v11_state_patch.css',document.currentScript.src).href;document.head.appendChild(patchCss);
    const patchScript=document.createElement('script');patchScript.src=new URL('mini_koala_acceptance_v11_state_patch.js',document.currentScript.src).href;document.head.appendChild(patchScript);
  }
  // Acceptance Fix V1.1 PATCH B: harmonize route fallback and monetary facts.
  if(/mini_storage_(store_list_s01|store_detail_s02|unit_detail_u01|quote_q01|order_o01|order_o02)_/.test(location.pathname)){
    const factsScript=document.createElement('script');
    factsScript.src=new URL('mini_koala_acceptance_v11_facts_patch.js',document.currentScript.src).href;
    document.head.appendChild(factsScript);
  }
  // Acceptance Fix V1.1 PATCH C: customer-facing copy; non-invasive to canonical fixtures.
  const languagePatch=document.createElement('script');
  languagePatch.src=new URL('mini_koala_acceptance_v11_language_patch.js',document.currentScript.src).href;
  document.head.appendChild(languagePatch);
  // Acceptance Fix V1.1 PATCH D: scoped layout/component layer; source pages remain frozen.
  const layoutCss=document.createElement('link');layoutCss.rel='stylesheet';layoutCss.href=new URL('mini_koala_acceptance_v11_layout_patch.css',document.currentScript.src).href;document.head.appendChild(layoutCss);
  const layoutScript=document.createElement('script');layoutScript.src=new URL('mini_koala_acceptance_v11_layout_patch.js',document.currentScript.src).href;document.head.appendChild(layoutScript);
  if(/space_decision_assistant_v4_5_23_/.test(location.pathname)){
    const itemPatch=document.createElement('script');
    itemPatch.src='mini_koala_estimator_item_fallback_p0_v1.js';
    document.head.appendChild(itemPatch);
  }
})();
