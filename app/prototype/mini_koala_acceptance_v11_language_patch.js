/* Acceptance Fix V1.1 / PATCH C — user-facing copy only.
 * Preserve underlying canonical fixtures, identifiers, pricing, dates, and workflows.
 * Internal QA views use ?showQA=1; user-visible aliases MUST NOT become lookup keys.
 */
(function(){
  'use strict';
  const path=(typeof location==='object'&&location.pathname||'').split('/').pop();
  const internalEntry=/^(?:index(?:_|\.)|product_demo_hub|mini_storage_demo_d01|mini_storage_sales_share_demo)/.test(path);
  const pad=n=>String(n).padStart(2,'0');
  const calendar=(y,m,d)=>`${Number(y)}年${Number(m)}月${Number(d)}日`;
  function publicAlias(full){
    // Stable, display-only surrogate; original DEMO ID remains in stored records and URL routing.
    const type=full[0];let h=0;
    for(const ch of full){h=(h*31+ch.charCodeAt(0))%100000;}
    return `${type}-20261008-${String(h).padStart(5,'0')}`;
  }
  function formatText(text){
    if(!text||typeof text!=='string')return text;
    // Do not corrupt navigable URLs or internal query parameter names present in text.
    if(/https?:\/\/|file:\/\/|\?orderNo=|\.html\?|\bshareId=/.test(text))return text;
    let s=text;
    const literal=[
      ['原型仅记录验证结果状态，不收集身份证号码、照片或其他身份证要素。','此处仅展示身份验证结果，不收集身份证号码或照片。'],
      ['当前仅记录验证状态，不在此原型填写或保存身份证要素。','此处仅展示身份验证结果，无需在本页填写身份证资料。'],
      ['当前原型不自行补充未确认规则。','具体处理方式以订单约定和实际处理结果为准。'],
      ['当前原型展示权益状态，可联系客服继续确认安排。','您可在此查看权益状态，具体安排请联系客服确认。'],
      ['当前原型未接地图搜索，请选择热门位置或使用当前位置','暂未找到该地址，请选择热门位置或使用当前位置'],
      ['当前内部原型使用演示分配。','具体仓位以订单确认结果为准。'],
      ['支付后已完成演示仓位分配；','具体仓位已锁定；'],
      ['支付完成并已进行演示仓位分配；','具体仓位已锁定；'],
      ['当前原型使用演示分配，不代表生产实时库存锁定。','具体仓位以支付完成后的分配结果为准。'],
      ['开票金额基于实际已支付交易记录，不使用重新计算金额。','发票金额以所选付款记录中的实际支付金额为准。'],
      ['当前不承诺具体开票时效；提交后保留申请状态供后续查询。','提交后可在本页查看申请进度，具体处理时间以实际办理结果为准。'],
      ['当前原型未冻结各档位具体金额阈值，因此这里不自行补充。','具体奖励条件与适用金额以活动说明为准。'],
      ['本原型生成一条可演示的好友受邀入口。','您可以复制邀请信息，发送给好友。'],
      ['正式小程序可在这里调用微信分享。',''],
      ['正式上线前还需明确图片保存周期与授权说明。','请仅上传不涉及个人隐私的物品照片。'],
      ['演示版使用固定案例，不上传真实图片。','当前展示示例识别流程，不会上传您拍摄的照片。'],
      ['演示版不提交真实线索','此处不会提交联系信息'],
      ['演示素材预览位','示例图片区域'],
      ['替换真实照片后不改变页面结构','可根据识别结果核对物品清单'],
      ['AI 识别完成','物品识别示例'],
      ['《迷你仓租赁服务协议》原型摘要','《迷你仓租赁服务协议》条款说明示例'],
      ['本页仅用于交互原型，不能作为真实法律文本。正式上线需由业务和法务共同确认完整合同。','本页展示的条款为说明示例，正式协议应在签署前提供并由双方确认。'],
      ['租赁期限按月计算，以用户确认的开始日期和 term_months 为准。','租赁期限按月计算，以确认的开始日期和租用月数为准。'],
      ['到期续租、退租和物品取出规则应在正式协议中明确。','续租、退租与物品取出安排以双方确认的协议为准。'],
      ['正式版应提供完整禁止存储清单。','具体禁存物品以门店规则与协议为准。'],
      ['提前退租、逾期未取、续租价格和费用处理方式需要在正式合同中按真实业务规则写明。','提前退租、逾期未取、续租价格及费用处理以双方确认的协议为准。'],
      ['这里采用“先确认协议，再支付”的交易顺序。','请确认相关条款后再继续支付。'],
      ['（演示预填）',''],['（演示指引）',''],['（演示）',''],
      ['标准矩形（模拟）','标准矩形'],
      ['（行业唯一）',''],
      ['其他租期（1–60个月任意整数月）','其他租期（1–60个月）'],
      ['1–60个月任意整数月','1–60个月'],
      ['1-60个月任意整数月','1–60个月'],
      ['看仓预约','预约看仓'],
      ['Sales Share Mode','顾问分享入口'],
      ['shareId','分享编号'],
      ['term_months','租用月数']
    ];
    for(const [from,to] of literal){if(s.includes(from))s=s.split(from).join(to);}
    if(/该能力未纳入 V2\.4\.2 生命周期主链|该入口仅用于内部版本对照/.test(s))s='当前页面暂不提供在线办理，您可返回首页继续浏览。';
    if(s.includes('返回 V2.4.2 总入口'))s=s.replaceAll('返回 V2.4.2 总入口','返回首页');
    // Never replace quoted URL query parameters or source code. Only called for plain DOM text.
    if(!/https?:\/\/|\?orderNo=|\.html\?|\bshareId=/.test(s)){
      s=s.replace(/\b[OQ]-DEMO(?:-[A-Z0-9]+)*\b/g,publicAlias);
    }
    // Display-only time conversion; do not mutate input values, stored dates or URL params.
    s=s.replace(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)\b/gi,(_all,m,d,y,h,min,sec,ampm)=>{
      let hour=Number(h)%12;if(ampm.toUpperCase()==='PM')hour+=12;
      return `${calendar(y,m,d)} ${pad(hour)}:${min}${sec?':'+sec:''}`;
    });
    s=s.replace(/\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?=\b)/g,(_all,y,m,d)=>calendar(y,m,d));
    s=s.replace(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g,(_all,m,d,y)=>calendar(y,m,d));
    return s;
  }
  if(typeof window==='object')window.MINI_KOALA_LANGUAGE_V11={version:'PATCH_C',formatText,publicAlias};
  if(internalEntry||typeof document==='undefined'||!document.body)return;
  const params=new URLSearchParams(typeof location==='object'?location.search:'');
  const showQA=params.get('showQA')==='1';
  if(!showQA){
    const style=document.createElement('style');style.id='acceptance-v11-language-qa-visibility';
    // Preserve inspector data for QA with ?showQA=1; never delete source fields or state controls.
    style.textContent='.review-only,.review,.stagebar,.review-tools{display:none!important}';document.head.appendChild(style);
  }
  const oldPages=/^(?:mini_storage_transport_t0[12]_v4_self_service|mini_storage_quote_q0[23]_v4_self_service|mini_storage_order_o0[12]_v1_[12]_contract_linked)\.html$/.test(path);
  if(oldPages){
    const ref=document.querySelector('a[href="index_visual_v2_7_4.html"]');
    if(ref)ref.href='mini_storage_home_H01_Visual_V2_7_4_SSOT.html';
  }
  function excluded(node){
    const p=node.parentElement;
    return !p||!!p.closest('script,style,noscript,textarea,template,code,pre,[contenteditable="true"],.review-only,.review,.stagebar,.review-tools');
  }
  function patchNode(node){
    if(!node||node.nodeType!==3||excluded(node))return;
    let current=node.nodeValue||'';
    if(!current.trim()||current.length>1700)return;
    const next=formatText(current);
    if(next!==current)node.nodeValue=next;
  }
  function walk(node){
    if(!node)return;
    if(node.nodeType===3){patchNode(node);return;}
    if(node.nodeType!==1||node.matches('script,style,noscript,textarea,template,code,pre,.review-only,.review,.stagebar,.review-tools'))return;
    const w=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    let t;while((t=w.nextNode()))patchNode(t);
  }
  walk(document.body);
  if(typeof MutationObserver!=='undefined'){
    const observer=new MutationObserver(records=>{
      for(const r of records){
        if(r.type==='characterData')patchNode(r.target);
        else for(const n of r.addedNodes)walk(n);
      }
    });
    observer.observe(document.body,{subtree:true,characterData:true,childList:true});
  }
})();
