/* VIS-REDESIGN-01A · W7-F 新增页面 binder · 2026-11-17
 *   ESTORE    考拉E存独立页（D-80）        estore.html?state=default
 *   AGREEMENT 协议文本页（R-A-29）         agreement.html?doc=storage|privacy|user
 *   ENT       企业服务（D-77）             ent.html?view=cert|titles|batch&state=…
 * 业务未给口径的内容（E存服务范围与收费、协议正文、认证审核时限、发票是否含押金）只留显示位，不写数字。 */
(function(){
'use strict';
const q=new URLSearchParams(location.search),PAGE=document.body.dataset.page,F=window.SIM_FIXTURES,W=window.MK_W7;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const el=h=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild;};
const ico=(id,cls='ico')=>'<svg class="'+cls+'" aria-hidden="true"><use href="#'+id+'"/></svg>';
const money=n=>'¥'+Math.round(Number(n)).toLocaleString('zh-CN');
const body=()=>document.getElementById('body');
const btn=(label,cls,action,extra='')=>'<button type="button" class="btn '+cls+'" data-action="'+esc(action)+'"'+extra+'>'+esc(label)+'</button>';
const link=(label,cls,href)=>'<a class="btn '+cls+'" href="'+esc(href)+'">'+esc(label)+'</a>';
function actbar(html,cls=''){document.getElementById('screen').classList.add('has-actbar');document.getElementById('actbar-root').append(el('<div class="actbar'+(cls?' '+cls:'')+'" role="region" aria-label="底部操作区">'+html+'</div>'));}
function dialog(title,p,acts){document.getElementById('overlay-root').append(el('<div class="scrim center" role="alertdialog" aria-modal="true"><div class="dialog"><h4>'+esc(title)+'</h4><p>'+p+'</p><div class="acts">'+acts+'</div></div></div>'));}
function toast(msg){document.getElementById('toast-root').append(el('<div class="toastwrap" role="status"><div class="toast">'+esc(msg)+'</div></div>'));}
const kv=(k,v,cls='')=>'<div class="kv"><span class="k">'+esc(k)+'</span><span class="v'+(cls?' '+cls:'')+'">'+v+'</span></div>';
const field=(label,inner,err,opt)=>'<div class="field"><label>'+esc(label)+(opt?'<span class="opt">（可选）</span>':'')+'</label>'+inner+(err?'<div class="ferr">'+esc(err)+'</div>':'')+'</div>';
const input=(val,ph,err)=>'<div class="input'+(err?' err':'')+'" role="textbox" aria-label="'+esc(ph)+'"><span class="ph'+(val?' filled':'')+'">'+esc(val||ph)+'</span></div>';
const stag=(text,t)=>'<span class="tag status '+t+'">'+esc(text)+'</span>';
const card=(label,inner,cls='')=>el('<section class="card '+cls+'" aria-label="'+esc(label)+'">'+inner+'</section>');
const head=(title,tag,sub)=>el('<section class="w7f-head"><div class="row"><h2>'+esc(title)+'</h2>'+(tag||'')+'</div>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</section>');
const empty=(icon,title,sub,acts)=>el('<section class="card empty" role="status"><div class="pic">'+ico(icon)+'</div><h4>'+esc(title)+'</h4>'+(sub?'<p>'+esc(sub)+'</p>':'')+(acts?'<div class="acts">'+acts+'</div>':'')+'</section>');
const steps=(items,cur,fail)=>'<ol class="steps">'+items.map((it,i)=>{const n=i+1,cls=fail===n?'fail':n<cur?'done':n===cur?'cur':'';return '<li class="'+cls+'"><span class="dot">'+(cls==='done'?ico('i-check'):cls==='fail'?ico('i-close'):'')+'</span><div><div class="t">'+esc(it[0])+'</div>'+(it[1]?'<div class="s">'+esc(it[1])+'</div>':'')+'</div></li>';}).join('')+'</ol>';
const unknown=(key,obj)=>document.body.prepend(el('<p style="padding:16px;color:#B42318">未知状态 '+esc(key)+'；可用：'+Object.keys(obj).join(' / ')+'</p>'));
const setTitle=t=>{document.getElementById('tb-title').textContent=t;document.title='迷你考拉仓 · '+t+' · W7 高保真（可编辑）';};
const PENDING='请咨询客服',C=window.MK_CONTRACT,ct=k=>{const t=C.t(k);return esc(t==='待业务提供'?PENDING:t);}; /* W20：业务未给口径的显示位统一写「请咨询客服」，不露内部字样 */
const kvl=(k,v,cls='')=>'<div class="kv long"><span class="k">'+esc(k)+'</span><span class="v'+(cls?' '+cls:'')+'">'+v+'</span></div>';
const COMPANY={name:'安贞商贸有限公司',tax:'91110105MA01K7XQ3R',contact:'王经理',phone:'138****0000',email:'caiwu@163.com',bank:'招商银行北京安贞支行',account:'6222 **** **** 0000',addr:'北京市朝阳区安贞西里三区 12 号楼'}; /* 合成演示数据，与 W6 企业需求示例同一家 */

/* ======================= ESTORE 考拉E存（D-80） ======================= */
function renderESTORE(){
  setTitle('考拉E存');document.body.dataset.state='default';
  const b=body();
  b.append(el('<section class="w7f-hero"><img src="../assets/mini_split.jpg" alt="考拉E存上门取送服务"><div class="cap"><div class="k">上门取送</div><h2>考拉E存</h2><p>不用自己到店：预约上门取件、入库保管，需要时再预约送回。</p></div></section>'));
  b.append(card('与自助仓的区别','<div class="sec-title">与自助仓怎么选</div><div class="w7f-cmp"><div><div class="t">自助仓</div><ul><li>自己到店存取</li><li>按仓位容量和租期计费</li><li>线上选仓、下单、付款</li></ul><a class="btn neutral md" href="s01.html">去找自助仓</a></div><div><div class="t">考拉E存</div><ul><li>上门取件与送回</li><li>方案与费用由顾问确认</li><li>提交需求后电话沟通</li></ul></div></div>'));
  b.append(card('服务流程','<div class="sec-title">服务流程</div>'+steps([['提交需求','填写地址、物品和预计存放时间'],['顾问确认',W.LEAD_COPY.inHours+'，确认方案与费用'],['上门取件',''],['入库保管',''],['预约送回','']],0)));
  b.append(card('服务说明','<div class="sec-title">服务说明</div>'+kvl('服务范围',ct('estore.scope'))+kvl('收费方式',ct('estore.fee'))+kvl('物品限制',ct('estore.limit')+' <a href="agreement.html?doc=usage#att2">查看禁存清单</a>')+kvl('运输',ct('estore.carriers'))+kv('套餐与价格','<span class="muted">'+ct('estore.price')+'</span>')+'<p class="w7f-fine">完整条款见'+esc(C.docName('usage'))+'，具体方案以顾问确认为准。'+W.LEAD_COPY.hoursNote+'。</p>'));
  actbar(link('咨询考拉E存','primary block','booking.html?mode=advisor&source=estore'),'stack');
  window.__W7F={page:'ESTORE'};
}

/* ======================= AGREEMENT 协议文本页（R-A-29） ======================= */
const DOCS=C.docs,DOC_ALIAS={storage:'usage',privacy:'register',user:'register'}; /* W8：协议名称与正文取自合同文本模块；旧链接 storage / privacy / user 仍可用 */
function renderAGREEMENT(){
  let key=q.get('doc')||q.get('state')||'usage';key=DOC_ALIAS[key]||key;const d=DOCS[key];if(!d)return unknown(key,DOCS);
  setTitle(d.short);document.body.dataset.state=key;const b=body();
  b.append(head(d.title,'',''));
  {const has=v=>v&&!/^待/.test(v),vr=[has(C.meta.version)?kv('版本',esc(C.meta.version)):'',has(C.meta.effectiveDate)?kv('生效日期',esc(C.meta.effectiveDate)):''].join('');if(vr)b.append(card('版本信息',vr));} /* W20：版本号与生效日期未提供时不显示这张卡 */
  if(d.status==='pending'){b.append(el('<section class="notice" role="note"><div class="t">协议正文暂未上线</div><div class="s">如需了解协议内容，请联系客服。</div></section>'));window.__W7F={page:'AGREEMENT',doc:key};return;}
  const secs=d.sections,toc=secs.map((s,i)=>({i:i+1,t:s.title,id:/^附件\s?(\d)/.test(s.title)?'att'+RegExp.$1:'sec'+(i+1)})).filter(x=>x.t);
  if(toc.length>1)b.append(card('目录','<div class="sec-title">目录</div><ol class="w7f-toc">'+toc.map((x,n)=>'<li><a href="#'+x.id+'"><span>'+(n+1)+'</span>'+esc(x.t)+ico('i-chev','ico chev')+'</a></li>').join('')+'</ol>'));
  const para=p=>p.startsWith('### ')?'<h4>'+esc(p.slice(4))+'</h4>':'<p>'+esc(p)+'</p>';
  b.append(card('正文','<div class="sec-title">正文</div>'+secs.map((s,i)=>{const x=toc.find(t=>t.i===i+1);return '<div class="w7f-sec"'+(x?' id="'+x.id+'"':'')+'>'+(s.title?'<h3>'+esc(s.title)+'</h3>':'')+s.paras.map(para).join('')+'</div>';}).join(''),'w7f-doc'));
  b.append(el('<p class="w7f-fine pad">如对协议内容有疑问，请联系客服。</p>'));
  window.__W7F={page:'AGREEMENT',doc:key};
  if(location.hash){const t=document.getElementById(location.hash.slice(1));if(t)t.scrollIntoView();}
}

/* ======================= ECONTRACT 电子合同查看页（W26 A9，D-148） =======================
   econtract.html?state=signed|empty。订单取 lifeActive 演示订单；签署人与确认订单页签署弹层同一演示值。
   合同编号、签署存证、下载 / 发送邮箱等随第三方电子签工具定（D-176），本页不画；协议正文走协议页，不改写原文。 */
const SIGNER={name:'*明',no:'110***********0012'},PARTY_A='迷你考拉仓（北京）仓储服务有限公司'; /* 甲方取自使用协议「协议说明」北京地区提供方 */
function renderECONTRACT(){
  const key=q.get('state')||'signed';if(!['signed','empty'].includes(key))return unknown(key,{signed:1,empty:1});
  setTitle('电子合同');document.body.dataset.state=key;const b=body();
  if(key==='empty'){b.append(empty('i-shield','暂无电子合同','签署使用协议并完成下单后，可在这里查看。',link('返回订单','neutral md','oh01.html')));window.__W7F={page:'ECONTRACT',state:key};return;}
  const core=window.SIM_CORE.create({});core.setScenario('lifeActive');const o=core.state().orders[0],v=core.lifecycleView(o.id),s=F.stores.find(x=>x.id===o.store_id),units=(o.unit_ids||[]).map(id=>F.units.find(u=>u.id===id));
  const p2=n=>String(n).padStart(2,'0'),ts=new Date(Number(o.createdAt)+8*3600*1000).toISOString(),signedAt=ts.slice(0,10)+' '+ts.slice(11,16);
  const d=ts.slice(0,10).replace(/-/g,''),m=String(o.id).match(/[0-9]+$/),no='MK'+d+String(m?Number(m[0])%10000:Array.from(String(o.id)).reduce((x,ch)=>(Math.imul(x,31)+ch.charCodeAt(0))>>>0,0)%10000).padStart(4,'0'); /* 与订单详情 orderNo 同一算法 */
  b.append(head(DOCS.usage.short,stag('已签署','ok'),'签署后生成，内容以签署时的协议为准。'));
  b.append(card('签署信息','<div class="sec-title">签署信息</div>'+kvl('提供方（甲方）',esc(PARTY_A))+kv('使用方（乙方）',esc(SIGNER.name))+kv('证件号码',esc(SIGNER.no))+kv('签署时间',esc(signedAt))+kv('签署方式','线上签署'),'ec-sign'));
  b.append(card('订单与仓位','<div class="sec-title">订单与仓位</div>'+kv('订单号',esc(no))+kvl('门店',esc(s.name))+kv('仓位',esc(units.map(u=>u.demo_cabin_no?u.demo_cabin_no+' · '+u.volume+'m³':u.name).join(' + ')))+kv('租期',o.term_months+'个月')+kv('起止日期',esc(v.start_date+' 至 '+v.end_date)),'ec-order'));
  const row=(k,val,href)=>'<a class="lrow" href="'+esc(href)+'"><span class="k">'+esc(k)+'</span><span class="v">'+esc(val)+'</span>'+ico('i-chev','ico chev')+'</a>';
  b.append(card('协议文件','<div class="sec-title">协议文件</div>'+row(C.docName('usage'),'已签署','agreement.html?doc=usage')+row(C.docName('notice'),'已确认','agreement.html?doc=notice')+row('违法违规违禁物品清单','附件','agreement.html?doc=usage#att2'),'ec-docs'));
  b.append(el('<p class="w7f-fine pad">如对合同内容有疑问，请联系客服 '+esc(C.t('service.hotline'))+'。</p>'));
  actbar(link('查看协议全文','primary block','agreement.html?doc=usage'),'stack');
  window.__W7F={page:'ECONTRACT',state:key,order:no};
}

/* ======================= ENT 企业服务（D-77） ======================= */
const V={};
const CERT_STEPS=[['提交资料',''],['资料审核','审核时限'+PENDING],['认证完成','']];
V.cert={title:'企业认证',states:{empty:{},filled:{v:1},invalid:{v:1,err:1},submitting:{v:1,busy:1},reviewing:{done:1},verified:{done:2},failed:{done:1,fail:1}},
  render(key,c){const b=body();
    if(c.done){
      const t=c.fail?['认证未通过','未通过','err']:c.done===2?['企业认证已完成','已认证','ok']:['资料审核中','审核中','warn'];
      b.append(head(t[0],stag(t[1],t[2]),c.fail?'请按原因更正后重新提交。':c.done===2?'可使用企业开票抬头与批量开票。':'审核结果会通过消息通知您。'));
      b.append(card('认证进度','<div class="sec-title">认证进度</div>'+steps(CERT_STEPS,c.done===2?4:2,c.fail?2:0)));
      if(c.fail)b.append(el('<section class="notice err"><div class="t">原因：—</div><div class="s">以审核反馈为准。可修改企业名称、统一社会信用代码或重新上传营业执照。</div></section>'));
      b.append(card('企业信息','<div class="sec-title">企业信息</div>'+kv('企业名称',esc(COMPANY.name))+kv('统一社会信用代码',esc(COMPANY.tax))+kv('联系人',esc(COMPANY.contact)+' '+esc(COMPANY.phone))));
      if(c.fail)actbar(btn('更正资料后重新提交','primary block','retry')+link('联系顾问','neutral block','acc.html?view=support'),'stack');
      else if(c.done===2){b.append(card('企业服务','<div class="sec-title">企业服务</div><a class="lrow" href="ent.html?view=titles&state=list"><span class="k">开票抬头管理</span><span class="v ph"></span>'+ico('i-chev','ico chev')+'</a><a class="lrow" href="ent.html?view=batch&state=select"><span class="k">批量开票</span><span class="v ph"></span>'+ico('i-chev','ico chev')+'</a>'));}
      return;}
    b.append(el('<section class="notice"><div class="t">认证后可使用</div><div class="s">企业开票抬头、多笔订单批量开票。认证不影响找仓和下单。</div></section>'));
    const v=c.v?COMPANY:{};
    b.append(card('企业资料','<div class="sec-title">企业资料</div>'+field('企业名称',input(v.name,'请输入营业执照上的企业名称'))+field('统一社会信用代码',input(c.err?'9111010':v.tax,'18 位代码',c.err),c.err?'请填写 18 位统一社会信用代码':'')+field('营业执照','<div class="w7f-upload'+(c.v?' done':'')+'" role="button" aria-label="上传营业执照">'+(c.v?ico('i-check')+'<span>已上传 1 张</span>':ico('i-cam')+'<span>上传营业执照照片</span>')+'</div>')));
    b.append(card('联系人','<div class="sec-title">联系人</div>'+field('姓名',input(v.contact,'请输入联系人姓名'))+field('手机号',input(v.phone,'请输入手机号'))));
    const ready=c.v&&!c.err;
    actbar((ready||c.busy?'':'<p class="w7f-need">还需填写：'+(c.err?'统一社会信用代码':'企业名称、统一社会信用代码、营业执照、联系人')+'</p>')+btn(c.busy?'提交中…':'提交认证','primary block'+(ready&&!c.busy?'':' disabled'),'submitCert',ready&&!c.busy?'':' disabled aria-disabled="true"'),'stack');}};
const TITLE_ROWS=[{type:'企业',name:COMPANY.name,tax:COMPANY.tax,def:true,email:COMPANY.email},{type:'个人',name:'王**',tax:'',def:false,email:'w***@163.com'}];
V.titles={title:'开票抬头管理',states:{empty:{},list:{rows:1},add:{form:1},edit:{form:1,v:1},invalid:{form:1,v:1,err:1},delete:{rows:1,dlg:1}},
  render(key,c){const b=body();
    if(c.form){const v=c.v?COMPANY:{};
      b.append(card('抬头信息','<div class="sec-title">抬头信息</div>'+field('抬头类型','<div class="seg" role="radiogroup"><button type="button" role="radio" aria-checked="true" class="on">企业</button><button type="button" role="radio" aria-checked="false">个人</button></div>')+field('企业名称',input(v.name,'请输入企业名称'))+field('纳税人识别号',input(c.err?'9111':v.tax,'请输入纳税人识别号',c.err),c.err?'请填写有效的纳税人识别号':'')+field('接收邮箱',input(v.email,'用于接收电子发票'))));
      b.append(card('专票信息','<div class="sec-title">专票信息</div>'+field('开户银行',input(v.bank,'请输入开户银行'),'',1)+field('银行账号',input(v.account,'请输入银行账号'),'',1)+field('注册地址与电话',input(v.addr,'请输入注册地址与电话'),'',1)+'<p class="w7f-fine">需要专用发票时请填写本段。</p>'));
      b.append(card('默认','<div class="kv"><span class="k">设为默认抬头</span><span class="v"><span class="w7f-switch'+(c.v?' on':'')+'" role="switch" aria-checked="'+(!!c.v)+'"></span></span></div>'));
      actbar(btn('保存抬头','primary block'+(c.v&&!c.err?'':' disabled'),'saveTitle',c.v&&!c.err?'':' disabled aria-disabled="true"')+(c.v?btn('删除抬头','danger block','deleteTitle'):''),'stack');return;}
    if(!c.rows){b.append(empty('i-ticket','还没有开票抬头','添加后，申请发票和批量开票时可直接选择。',btn('添加抬头','primary','add')));return;}
    TITLE_ROWS.forEach(r=>b.append(el('<article class="card w7f-title"><div class="head"><div class="t">'+esc(r.name)+'</div>'+(r.def?stag('默认','ok'):'')+'</div><div class="line">'+esc(r.type)+(r.tax?' · 税号 '+esc(r.tax):'')+'</div><div class="line">接收邮箱 '+esc(r.email)+'</div><div class="acts">'+btn('编辑','neutral md','edit')+(r.def?'':btn('设为默认','neutral md','setDefault'))+'</div></article>')));
    actbar(btn('添加抬头','primary block','add'),'stack');
    if(c.dlg)dialog('删除这个抬头？','删除后不影响已开具的发票。',btn('暂不删除','neutral','close')+btn('确认删除','danger','confirmDelete'));}};
/* 批量开票：可开票记录用合成演示订单，租金按定价规则（MK_W7.rentTotal）计算；是否含押金待财务确认，只列租金与管理费 */
const batchRows=()=>{const pick=[['SIM_BJ01',2,12,'2026-09-01','0012'],['SIM_BJ01',5,6,'2026-10-08','0031'],['SIM_BJ03',3,12,'2026-10-20','0044']];
  return pick.map(([sid,i,m,d,n])=>{const s=F.stores.find(x=>x.id===sid),us=F.units.filter(x=>x.store_id===sid&&Number(x.volume)>0),u=us[i%us.length];return {no:'MK'+d.replace(/-/g,'')+n,store:s.name,unit:(u.demo_cabin_no||u.code)+' · '+u.volume+'m³',term:m,date:d,rent:W.rentTotal(u,m),fee:F.pricing.managementFee};});};
const BATCH_STEPS=[['提交申请',''],['开票处理','处理时限'+PENDING],['已开具','发送到接收邮箱']];
V.batch={title:'批量开票',states:{gate:{gate:1},empty:{none:1},select:{},selected:{sel:[0,1]},all:{sel:[0,1,2]},confirm:{sel:[0,1],confirm:1},submitting:{sel:[0,1],confirm:1,busy:1},submitted:{sel:[0,1],done:2},issued:{sel:[0,1],done:4},failed:{sel:[0,1],done:2,fail:1}},
  render(key,c){const b=body(),rows=batchRows(),sel=(c.sel||[]).map(i=>rows[i]),sum=sel.reduce((a,r)=>a+r.rent+r.fee,0);
    if(c.gate){b.append(empty('i-shield','批量开票需要先完成企业认证','认证通过后，可把多笔订单合并申请发票。',link('去企业认证','primary','ent.html?view=cert&state=empty')));b.append(el('<p class="w7f-fine pad">单笔订单开票不需要企业认证，可在订单详情里申请。</p>'));return;}
    if(c.none){b.append(empty('i-ticket','暂无可开票的订单','已付款且未开票的订单会出现在这里。',link('查看订单','neutral','oh01.html')));return;}
    if(c.done){const t=c.fail?['开票未成功','未成功','err']:c.done===4?['发票已开具','已开具','ok']:['开票申请已提交','处理中','warn'];
      b.append(head(t[0],stag(t[1],t[2]),c.fail?'':c.done===4?'已发送到 '+COMPANY.email:'开具后发送到 '+COMPANY.email));
      b.append(card('开票进度','<div class="sec-title">开票进度</div>'+steps(BATCH_STEPS,c.done,c.fail?2:0)));
      if(c.fail)b.append(el('<section class="notice err"><div class="t">原因：—</div><div class="s">以财务反馈为准。可更换抬头或接收邮箱后重新提交。</div></section>'));
      b.append(card('开票内容','<div class="sec-title">开票内容</div>'+kv('抬头',esc(COMPANY.name))+kv('订单',sel.length+' 笔')+kv('开票金额','<b>'+money(sum)+'</b>')+sel.map(r=>'<div class="w7f-line"><span>'+esc(r.no)+'</span><span>'+money(r.rent+r.fee)+'</span></div>').join('')));
      if(c.fail)actbar(btn('修改后重新提交','primary block','retry')+link('联系顾问','neutral block','acc.html?view=support'),'stack');
      else if(c.done===4)actbar(btn('下载发票','primary block','download')+btn('重新发送到邮箱','neutral block','resend'),'stack');
      else actbar(link('返回订单','neutral block','oh01.html'),'stack');
      return;}
    if(c.confirm){
      b.append(card('开票抬头','<div class="sec-title">开票抬头</div><a class="lrow" href="ent.html?view=titles&state=list"><span class="k">'+esc(COMPANY.name)+'</span><span class="v ph">更换</span>'+ico('i-chev','ico chev')+'</a>'+kv('纳税人识别号',esc(COMPANY.tax))+kv('接收邮箱',esc(COMPANY.email))));
      b.append(card('开票内容','<div class="sec-title">开票内容（'+sel.length+' 笔）</div>'+sel.map(r=>'<div class="w7f-ord ro"><div><div class="t">'+esc(r.store)+'</div><div class="s">'+esc(r.unit)+' · '+r.term+'个月 · '+esc(r.no)+'</div><div class="s">租金 '+money(r.rent)+' · 管理费 '+money(r.fee)+'</div></div><b>'+money(r.rent+r.fee)+'</b></div>').join('')+'<p class="w7f-fine">本页列出租金与管理费；押金开票事宜请咨询客服。</p>'));
      actbar('<div class="w7f-sum"><span>开票金额</span><b>'+money(sum)+'</b></div>'+btn(c.busy?'提交中…':'提交开票申请','primary block'+(c.busy?' disabled':''),'submitBatch',c.busy?' disabled aria-disabled="true"':''),'stack');return;}
    b.append(el('<section class="notice"><div class="t">选择要合并开票的订单</div><div class="s">只列出已付款且未开票的订单。</div></section>'));
    const allOn=(c.sel||[]).length===rows.length;
    b.append(card('可开票订单','<div class="w7f-all" role="checkbox" aria-checked="'+allOn+'"><span class="w7f-box'+(allOn?' on':'')+'">'+ico('i-check')+'</span><span>全选（'+rows.length+' 笔）</span></div>'+rows.map((r,i)=>{const on=(c.sel||[]).includes(i);return '<div class="w7f-ord" role="checkbox" aria-checked="'+on+'"><span class="w7f-box'+(on?' on':'')+'">'+ico('i-check')+'</span><div><div class="t">'+esc(r.store)+'</div><div class="s">'+esc(r.unit)+' · '+r.term+'个月</div><div class="s">'+esc(r.no)+' · 付款 '+esc(r.date)+'</div></div><b>'+money(r.rent+r.fee)+'</b></div>';}).join('')));
    actbar('<div class="w7f-sum"><span>已选 '+sel.length+' 笔</span><b>'+(sel.length?money(sum):'¥0')+'</b></div>'+(sel.length?'':'<p class="w7f-need">请至少选择 1 笔订单</p>')+btn('下一步：确认开票信息','primary block'+(sel.length?'':' disabled'),'next',sel.length?'':' disabled aria-disabled="true"'),'stack');}};
function renderENT(){
  const view=q.get('view')||'cert',def=V[view];if(!def)return unknown(view,V);
  const key=q.get('state')||Object.keys(def.states)[0],c=def.states[key];if(!c)return unknown(key,def.states);
  document.body.dataset.view=view;document.body.dataset.state=key;setTitle(def.title);def.render(key,c);
  window.__W7F={page:'ENT',view,state:key};
}
window.W7F_STATES={estore:['default'],agreement:Object.keys(DOCS),ent:Object.fromEntries(Object.entries(V).map(([k,v])=>[k,Object.keys(v.states)]))};
if(PAGE==='ECONTRACT')renderECONTRACT();else if(PAGE==='ESTORE')renderESTORE();else if(PAGE==='AGREEMENT')renderAGREEMENT();else renderENT();
})();
