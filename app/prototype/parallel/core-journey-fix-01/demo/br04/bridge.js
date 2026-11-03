(function(){
  'use strict';
  const page=document.body.dataset.page;
  const pageIds={s5:'S5',reserve:'BOOKING',quick:'QUICK',o01:'O01'};
  const s5BenefitMarker=page==='s5'?document.querySelector('.benefits span')?.cloneNode(true):null;
  const B=parent.SIM_DEMO;
  const C=parent.SIM_CENTRAL_CONTRACT_V1;
  if(!B){location.replace('../../index.html?page='+pageIds[page]);return;}
  const r2=()=>new URLSearchParams(parent.location.search).get('s01_r2')==='1';
  const clean=()=>{if(r2())parent.S01_R2_CONTENT?.cleanCopy(document.body);};
  const core=B.core,F=core.fixture,presentation=B.presentation,$=id=>document.getElementById(id),$$=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'¥'+Number(n).toLocaleString('zh-CN');
  const r3Thumb=(v)=>'../../assets/unit-r3/thumb/unit-r3-'+(Number(v)<=1.5?'mini':Number(v)<=5?'small':Number(v)<=15?'medium':'large')+'-336x312.webp';
  const store=id=>F.stores.find(x=>x.id===id),unit=id=>F.units.find(x=>x.id===id);
  let allUI={};try{allUI=JSON.parse(sessionStorage.getItem('mk_br04_ui_v2')||'{}');}catch{}
  const advisorMode=page==='reserve'&&(new URLSearchParams(parent.location.search).get('mode')==='advisor'||!!sessionStorage.getItem('mk_advisor_context_v3'));
  const uiKey=advisorMode?'advisor':page,ui=allUI[uiKey]||(allUI[uiKey]={});
  const save=()=>{sessionStorage.setItem('mk_br04_ui_v2',JSON.stringify(allUI));B.persist();};
  const text=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
  const image=(selector,url,alt)=>{const el=document.querySelector(selector);if(el){el.src=url;if(alt)el.alt=alt;}};
  const act=(name,label,value='',primary=false)=>`<button type="button" class="${primary?'bridge-primary':'bridge-option'}" data-bridge="${name}" data-value="${esc(value)}">${esc(label)}</button>`;
  const note=t=>`<p class="bridge-message">${esc(t)}</p>`;
  const codes={SELECT_TERM:'请选择租期',PHONE_REQUIRED:'请先完成微信或短信验证',SELECT_CAPACITY:'请先填写容量',INVALID_TERM:'租期须为1至60个月整数',SELECT_DATE:'请选择有效的用仓开始日期',UNAVAILABLE:'当前方案不可用，请选择其他匹配门店或仓位',INVENTORY_CHANGED:'库存刚刚发生变化，当前方案不可用。已保留容量和租期，请选择其他匹配门店。',PRICE_CHANGED:'价格刚刚发生变化，请核对新的金额后重新确认。',QUOTE_STALE:'报价已失效，请重新确认报价',ENTER_PHONE:'请填写有效联系电话',ENTER_ADDRESS:'请填写用仓地址（不超过120字）'};
  let toastTimer,offerRows=[],selectedOrder=null;
  function toast(t){text('toast',t);$('toast').hidden=false;clean();clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
  const modalIds={s5:['modal','modal-title','modal-body'],quick:['modal','modal-title','modal-content'],reserve:['selectionMask','popupTitle','popupOptions'],o01:['scrim','sheet-title','sheet-content']};
  function sheet(title,html){const [root,head,body]=modalIds[page];text(head,title);$(body).innerHTML=html;$(root).dataset.hasPrice=String(/¥/.test(html));$(root).hidden=false;clean();}
  function close(){if(core.state().auth.status==='pending'){core.resolvePhone('denied');save();refresh();}$(modalIds[page][0]).hidden=true;}
  function guard(fn){try{fn();save();}catch(e){save();refresh();const message=codes[e.message]||'当前操作无法完成，请检查您的选择';toast(message);if(e.message==='INVENTORY_CHANGED')alternatives(message);if(e.message==='PRICE_CHANGED'){$('agreed')&&($('agreed').checked=false);ui.agreed=false;save();}}}
  function amounts(ids){const s=core.state();return core.formalAmounts(ids,s.requirement.term_months);}
  function moneyLines(a){return `<dl class="bridge-fees"><dt>整期租金</dt><dd>${money(a.rent_total)}</dd><dt>月均约</dt><dd>${money(a.monthly_average)}</dd><dt>优惠券</dt><dd>−${money(a.coupon_discount||0)}</dd><dt>押金</dt><dd>${money(a.deposit)}</dd><dt>整单管理费</dt><dd>${money(a.management_fee)}</dd><dt>首次应付</dt><dd>${money(a.payable)}</dd></dl>`;}
  function phone(){return B.requestPhone('QUOTE');}
  function priceReady(){if(!core.authorized()){phone();return false;}if(!core.state().requirement.term_confirmed){toast('请选择租期');return false;}return true;}
  function applyTerm(value){const m=Number(value),s=core.state(),ids=page==='o01'?s.selected:[];core.setTerm(m);if(ids.length&&core.selectionValid(ids))core.select(ids);close();save();refresh();}
  function moreTerms(){sheet('选择租期（1–60个月）',[1,3,6,12,24,36,60].map(m=>act('term',m+'个月',String(m))).join('')+'<label for="custom-months">自定义月份</label><input class="bridge-input" id="custom-months" type="number" min="1" max="60">'+act('customTerm','确认租期','',true));}
  function s5AreaSheet(){const city=core.state().city;const districts=[...new Set(F.stores.filter(s=>s.city===city&&s.status==='open').map(s=>s.district).filter(Boolean))].sort();sheet('选择用仓区域',note('请选择常用区域，未授权定位也可继续查看门店。')+act('s5Area','全城查看','')+districts.map(d=>act('s5Area',d,d)).join(''));}
  function citySheet(){sheet('选择城市',['北京','上海','深圳','杭州','广州'].map(c=>act('city',c,c)).join('')+(page==='s5'?act('s5ChooseArea','选择'+core.state().city+'的区域'):'') );}
  function alternatives(message='当前方案不可用，已保留您的容量和租期。'){
    const exclude=core.state().storeId,offers=B.offers(exclude).slice(0,3);
    sheet('其他匹配门店',note(message)+offers.map(r=>act('store',r.store.name+' · '+r.volume+'m³',r.store.id)).join('')+(!offers.length?note('当前城市暂无满足容量的方案。'):'')+act('booking','联系顾问 / 预约用仓'));
  }
  function fit(){
    if(page==='s5'){const v=$('app-viewport'),board=$('artboard'),scale=v.clientWidth/371,H=Number(board.dataset.designHeight||1145);board.style.transform=`scale(${scale})`;board.style.width='371px';board.style.height=H+'px';board.style.marginBottom=H*(scale-1)+'px';}
    if(page==='reserve'){const v=$('screenViewport'),scale=v.clientWidth/366; $('artboard').style.transform=`scale(${scale})`;$('artboardHolder').style.height=976*scale+'px';}
  }
  function offerPrice(prefix,row){
    const main=prefix==='main',p=presentation.price(row.ids),price=$(main?'main-price':'secondary-price');
    price.dataset.private=String(p.kind!=='term');price.textContent=p.money;
    text(main?'main-unit':'secondary-term',p.kind==='term'?p.suffix:'');
    text(main?'main-monthly':'secondary-monthly',p.kind==='term'?p.average:p.termLabel);
    if(main)document.querySelector('.major-label').textContent=p.caption;
    price.tabIndex=0;price.setAttribute('role','button');price.setAttribute('aria-label',!core.authorized()?'验证手机号查看正式报价':p.kind!=='term'?'请选择租期':'查看费用明细');price.dataset.offer=prefix;
  }
  // S5-UX-REVIEW-02: one rendering contract for seven user-facing match states.
  // Search expansion is not inferred from an untrusted distance label.
  function s5MatchState(rows,requirement){
    if(!(Number(requirement.capacity_m3)>0)||!requirement.term_confirmed)return 'incomplete';
    if(!rows.length)return Number(requirement.capacity_m3)>50?'large':'none';
    const first=rows[0];
    if(Number(requirement.capacity_m3)>50)return 'large';
    if(Number(first.volume)<Number(requirement.capacity_m3))return 'near';
    if(first.combo)return 'combo';
    if(first.expandedSearch===true||first.searchExpanded===true)return 'expanded';
    return 'matched';
  }
  function s5AdvisorNeeded(rows,requirement){
    if(Number(requirement.capacity_m3)>10)return true;
    if(!requirement.term_confirmed||!rows.length)return false;
    // Trigger on the current primary recommended scheme's full-term rent,
    // excluding deposit and management fee; never compare payable or monthly price.
    try{
      const rent=Number(core.amounts(rows[0].ids,requirement.term_months)?.rent_total);
      return Number.isFinite(rent)&&rent>2000;
    }catch{return false;}
  }
  function renderS5(){
    const s=core.state(),r=s.requirement;const candidates=r.capacity_m3&&r.term_confirmed?(B.s5Offers?.()||B.offers()):[];offerRows=candidates.slice(0,2);
    $('capacity').innerHTML=(r.capacity_m3??'—')+'<span>m³</span>';
    document.querySelector('.demand>p').textContent=r.capacity_m3?'按已选容量匹配，可返回修改需求':'填写容量后，为您推荐合适仓位';
    const selectedArea=ui.s5AreaCity===s.city?ui.s5Area:'';
    text('origin-name',s.city+' · '+(selectedArea||'全城门店'));
    $('origin-name').title=selectedArea?'已手动选择区域，非实时定位':'未使用实时定位，可手动选择区域';
    $$('[data-term]').forEach(el=>{const selected=r.term_confirmed&&Number(el.dataset.term)===r.term_months;el.classList.toggle('active',selected);el.setAttribute('aria-pressed',String(selected));});
    const custom=r.term_confirmed&&![1,3,6,12,24].includes(r.term_months);text('more-term',custom?r.term_months+'个月⌄':'更多⌄');$('more-term').classList.toggle('active',custom);$('more-term').setAttribute('aria-pressed',String(custom));
    const match=offerRows.length>0;
    const matchState=s5MatchState(offerRows,r);
    const emptyResult=!match;
    $('artboard').dataset.match=matchState;
    $('artboard').dataset.count=String(emptyResult?0:offerRows.length);
    const existingAdvisorPrimary=emptyResult&&!!document.querySelector('.no-match [data-nm="advisor"]');
    const showAdvisor=match&&!existingAdvisorPrimary&&s5AdvisorNeeded(offerRows,r);
    $('s5-advisor').hidden=!showAdvisor;
    $('artboard').dataset.advisorVisible=String(showAdvisor);
    $('artboard').dataset.designHeight=emptyResult?'858':(showAdvisor?(offerRows.length===1?'1116':'1256'):(offerRows.length===1?'1005':'1145'));
    document.querySelector('.rec-heading h2').textContent='为您推荐 '+offerRows.length+' 个合适的方案';
    document.querySelector('.rec-heading p').textContent=({
      matched:'按容量与租期为您推荐',near:'以下是容量接近的备选方案',
      expanded:'已扩大范围查找可选仓位',combo:'由多个独立仓位组合',
      large:'大容量需求，可请顾问协助确认',none:'',incomplete:''
    })[matchState];
    document.querySelector('.nm-kicker').textContent=matchState==='incomplete'?(r.capacity_m3?'请先确认租期':'先填写容量，再查看推荐'):matchState==='large'&&emptyResult?'大空间需求，顾问协助选仓':'暂无完全匹配的仓位';
    document.querySelector('.no-match>p').textContent=matchState==='incomplete'?
      (r.capacity_m3?'请选择租期后查看仓位推荐。':'请先填写容量并确认租期，完成后将更新推荐。'):
      (matchState==='large'&&emptyResult?'已保留您的容量和租期，可由顾问协助确认大空间方案。':'已保留容量和租期。可调整条件、查看其他门店或联系顾问。');
    offerRows.forEach((row,i)=>{const first=i===0,suffix=first?'main':'secondary',s=row.store;
      document.querySelector(first?'.major-unit h3':'.minor-unit h3').textContent=s.name+' · '+row.volume+'m³'+(row.combo?'组合':'仓');
      const tags=document.querySelector(first?'.unit-tags':'.minor-tags');tags.innerHTML='<span>'+row.volume+'m³</span><span>'+(row.combo?(F.unitIdentityType==='SIZE_OPTION'?row.ids.length+'项仓型组合':row.ids.length+'项组合'):F.unitIdentityType==='SIZE_OPTION'?'仓型选项':'独立仓位')+'</span><span>'+(F.unitIdentityType==='SIZE_OPTION'?'门店确认':'实体门')+'</span>';
      const buyButton=$(first?'main-buy':'secondary-buy');
      buyButton.disabled=false;
      buyButton.textContent=Number(row.volume)>=Number(r.capacity_m3)?'立即下单':'查看门店';
      $(first?'navigate-main':'navigate-secondary').setAttribute('aria-label','查看'+s.name+'地址');$(first?'navigate-main':'navigate-secondary').title='查看'+s.name+'地址';
      // S5 keeps its own frozen physical-attribute tags and benefits row; BR03 promotional-card rules do not replace them.
      if(first){const line=document.querySelector('.benefits');line.replaceChildren(...(s5BenefitMarker?[s5BenefitMarker.cloneNode(true)]:[]),document.createTextNode(' '+[Number(row.volume)<Number(r.capacity_m3)?'容量接近，仍需确认':'容量匹配',...presentation.services(s)].join(' · ')));line.hidden=false;}
      if(first){document.querySelector('.main-photo-badge').textContent=Number(row.volume)<Number(r.capacity_m3)?'容量接近 · 备选':'推荐 · 适合需求';}
      if(first){text('main-distance','门店环境');$('main-distance').hidden=false;}else{const secondaryNav=document.querySelector('.distance-nav');secondaryNav.querySelector('span').textContent='';secondaryNav.hidden=false;}
      offerPrice(suffix,row);
    });
    document.querySelector('.minor-unit').hidden=offerRows.length<2;
    document.querySelector('[data-nm="range"]').innerHTML=matchState==='incomplete'?'选择租期 <span>›</span>':'查看全城门店 <span>›</span>';
    fit();
  }
  function quickState(){const s=core.state();if(!ui.quick)ui.quick={storeId:null,ids:[]};if(ui.quick.storeId&&store(ui.quick.storeId)?.city!==s.city)ui.quick={storeId:null,ids:[]};return ui.quick;}
  function renderQuick(){const s=core.state(),q=quickState(),st=store(q.storeId),rows=q.ids.map(unit).filter(Boolean),chosen=rows.length>0,valid=chosen&&rows.every(u=>u.store_id===q.storeId)&&core.selectionValid(q.ids);
    document.querySelector('.store-row>img').alt='门店场景示意';document.querySelector('.unit-row>img').alt='仓位空间示意';text('city-text',s.city+' · 默认城市');text('store-name',st?.name||'请选择门店');text('store-address',st?.address||(F.stores.some(x=>x.city===s.city&&x.status==='open')?'选择门店后显示地址':'暂无可展示门店'));text('distance-value','');
    if(st)image('.store-row>img','../../assets/'+st.photo,'门店场景示意');
    text('unit-name',chosen?rows.map(u=>u.name).join(' + '):'请选择仓位');text('capacity-value',chosen?rows.reduce((n,u)=>n+u.volume,0)+'m³':'选仓后显示');
    if(chosen)image('.unit-row>img',r3Thumb(rows[0].volume),'仓位空间示意');
    document.querySelector('.badges').innerHTML=chosen?'<span>'+(rows.length>1?rows.length+'项组合':F.unitIdentityType==='SIZE_OPTION'?'仓型选项':'独立仓位')+'</span><span>'+(F.unitIdentityType==='SIZE_OPTION'?'门店确认':'实体门')+'</span><span>空间示意</span>':'<span>请主动选择可用仓位</span>';
    $$('[data-term]').forEach(el=>el.setAttribute('aria-pressed',String(s.requirement.term_confirmed&&Number(el.dataset.term)===s.requirement.term_months)));
    const allowed=core.authorized()&&s.requirement.term_confirmed&&valid,amount=allowed?amounts(q.ids):null;
    text('unit-price',!chosen?'—':!valid?'当前不可用':!core.authorized()||!s.requirement.term_confirmed?money(rows.reduce((n,u)=>n+u.base_month,0))+'/月起':money(amount.rent_total));
    $('unit-price').dataset.private=String(!allowed);text('price-term',allowed?'/ '+s.requirement.term_months+'个月':'');text('monthly-note',allowed?'月均约'+money(amount.monthly_average):'');
    document.querySelector('.estimate-heading').textContent='预计整期租金';
    text('estimate-amount',amount?money(amount.rent_total):!chosen?'选择仓位后显示':!core.authorized()?'授权查看报价':'请选择租期');$('estimate-amount').dataset.private=String(!allowed);text('estimate-months',allowed?'/ '+s.requirement.term_months+'个月':'');text('estimate-monthly',allowed?'月均约'+money(amount.monthly_average):'');
    $('start-date').min=F.demoToday;$('start-date').value=s.startDate||'';text('date-label',s.startDate||'请选择用仓日期');save();
  }
  function chooseStore(){const s=core.state();sheet('更换门店',F.stores.filter(x=>x.city===s.city&&x.status==='open').map(st=>act('quickStore',st.name+' · '+st.address,st.id)).join('')||note('暂无可展示门店，可切换城市或联系顾问。'));}
  function chooseUnit(){const q=quickState();if(!q.storeId){toast('请先选择门店');return;}const singles=core.matchingUnits(q.storeId),combos=core.combinations(q.storeId);sheet('选择仓位',singles.map(u=>act('quickUnit',u.name+' · '+u.dimensions,u.id)).join('')+combos.map(c=>act('quickUnit',c.volume+'m³ · '+c.ids.length+'间组合',c.ids.join(','))).join('')+(!singles.length&&!combos.length?note('本店暂无满足容量的可用仓位。')+act('otherStores','查看其他匹配门店'):'') );}
  function consult(source='advisor'){const s=core.state();sessionStorage.setItem('mk_advisor_context_v3',JSON.stringify({service_source:source,capacity_hint:s.requirement.capacity_m3?s.requirement.capacity_m3+'m³':'',term_hint:s.requirement.term_confirmed?s.requirement.term_months+'个月':''}));B.navigate('BOOKING');}
  function quickNext(){const q=quickState(),s=core.state();if(!q.storeId){toast('请选择门店');return;}if(!q.ids.length){toast('请选择仓位');return;}if(!s.requirement.term_confirmed){toast('请选择租期');return;}if(!s.dateConfirmed){toast('请选择用仓日期');return;}if(!s.requirement.capacity_m3)core.setRequirement(q.ids.map(unit).reduce((n,u)=>n+u.volume,0),s.requirement.term_months,true);core.setStore(q.storeId);core.select(q.ids);save();B.navigate('O01');}
  function renderReserve(){const s=core.state();if(!ui.reserve)ui.reserve={address:'',start_hint:'',preferred_date:s.dateConfirmed?s.startDate:'',items:'',capacity_hint:s.requirement.capacity_m3?s.requirement.capacity_m3+'m³':'',term_hint:s.requirement.term_confirmed?s.requirement.term_months+'个月':'',note:''};const v=ui.reserve;if(v.receipt&&s.leads.find(l=>l.id===v.receipt)?.status==='withdrawn')v.receipt=null;const reqSig=JSON.stringify(s.requirement);if(v.requirementSignature!==reqSig){v.capacity_hint=s.requirement.capacity_m3?s.requirement.capacity_m3+'m³':v.capacity_hint;v.term_hint=s.requirement.term_confirmed?s.requirement.term_months+'个月':v.term_hint;v.requirementSignature=reqSig;}if(v.phone===undefined)v.phone=s.contactPhone||'';
    let advisor;try{advisor=JSON.parse(sessionStorage.getItem('mk_advisor_context_v3')||'null');}catch{}
    if(advisor){for(const key of ['items','capacity_hint','term_hint','note','service_source'])if(typeof advisor[key]==='string')v[key]=advisor[key].slice(0,200);v.receipt=null;v.returnTo=['cap.html','items.html','home.html'].includes(advisor._return)?advisor._return:null;sessionStorage.removeItem('mk_advisor_context_v3');}
    document.title=advisorMode?'顾问咨询':'预约用仓';$('artboard').setAttribute('aria-label',advisorMode?'顾问咨询':'预约用仓');document.querySelector('.form-sheet').setAttribute('aria-label',advisorMode?'顾问咨询表单':'预约用仓表单');document.querySelector('.contact-title').innerHTML=advisorMode?'用仓地址 <span class="not-required">（选填）</span>':'用仓地址 <span class="required">*</span>';$('booking-address').required=!advisorMode;document.querySelector('.privacy-help').textContent=advisorMode?'留下联系电话，顾问将协助核对需求；用仓地址和以下信息可选。':'填写地址即可提交；以下时间和需求信息可选。';document.querySelector('.reserve-contact-field').firstChild.textContent=advisorMode?'联系电话（必填）':'联系电话（选填）';$('reserve-contact').required=advisorMode;text('submit',advisorMode?'提交咨询需求':'提交用仓需求');document.querySelector('.under-submit').textContent='当前仅保存在本机，尚未发送给顾问；不会创建订单。';$('booking-address').value=v.address;const phoneInput=$('reserve-contact');if(phoneInput)phoneInput.value=v.phone||'';$('note').value=v.note;text('counter',v.note.length+'/200');
    text('itemsValue',v.items||'请选择');text('capacityValue',v.capacity_hint||'请选择');text('durationValue',v.term_hint||'请选择');
    $$('[data-term]').forEach(el=>{const selected=v.start_hint===el.dataset.term;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});
    $('dateInput').min=F.demoToday;$('dateInput').value=v.preferred_date||'';text('dateText',v.preferred_date||'选择日期');
    if(v.receipt&&!$('my-needs')){const needs=document.createElement('button');needs.id='my-needs';needs.type='button';needs.textContent='查看我的需求';needs.onclick=()=>parent.location.href=new URL('../../account.html?view=needs',location.href).href;$('success').appendChild(needs);}if(v.receipt){$('success').querySelector('h2').textContent=advisorMode?'咨询需求已保存':'用仓需求已保存';$('success').querySelector('p').textContent='需求 '+v.receipt+' 已保存在本机，尚未发送给顾问。'+(advisorMode?'已记录联系电话；':'已记录用仓地址；')+'不会创建租仓订单。';}$('reserveForm').hidden=!!v.receipt;$('success').hidden=!v.receipt;fit();save();
  }
  function reserveChoice(key){const options={items:['日常物品','搬家家具','文件资料','暂不确定'],capacity:['1m³','3m³','5m³','8m³','暂不确定'],duration:['1个月','3个月','6个月','12个月','暂不确定']};const names={items:'存放物品',capacity:'意向容量',duration:'预计租期'};sheet(names[key],options[key].map(value=>act('reserveOption',value,key+'|'+value)).join(''));}
  function renderOrder(){const s=core.state(),rows=s.selected.map(unit).filter(Boolean),st=store(rows[0]?.store_id),pending=s.orders.find(o=>o.status==='pending'&&JSON.stringify(o.unit_ids)===JSON.stringify(s.selected)),paid=s.orders.find(o=>o.id===ui.pendingOrderId&&o.status==='paid_simulated'&&JSON.stringify(o.unit_ids)===JSON.stringify(s.selected)),authorized=core.authorized(),confirmed=s.requirement.term_confirmed,valid=!!paid||core.selectionValid()||!!(pending&&Date.now()<pending.expiresAt&&pending.unit_ids.every((id,i)=>s.stock[id]==='reserved'&&(s.prices[id]||unit(id).base_month)===pending.price_bases[i])),a=authorized?(paid||pending||(rows.length&&confirmed?amounts(s.selected):null)):null;
    document.querySelector('.store-img').alt='门店场景示意';document.querySelector('.unit-img').alt='仓位空间示意';document.querySelector('.distance').style.visibility='hidden';text('store-name',st?.name||'尚未选择门店');text('store-address',st?.address||'请返回选择仓位');text('unit-name',rows.length?rows.map(u=>u.name).join(' + '):'尚未选择仓位');
    document.querySelector('.capacity').textContent=rows.length?rows.reduce((n,u)=>n+u.volume,0)+'m³':'待选择';
    if(st){image('.store-img','../../assets/'+st.photo,'门店场景示意');document.querySelector('.distance').textContent='';}
    if(rows.length)image('.unit-img',r3Thumb(rows[0].volume),'仓位空间示意');
    document.querySelector('.summary .tags').innerHTML=rows.length>1?'<span>'+rows.length+'项组合</span><span>'+(F.unitIdentityType==='SIZE_OPTION'?'仓型选项':'独立仓位')+'</span><span>空间示意</span>':'<span>'+(F.unitIdentityType==='SIZE_OPTION'?'仓型选项':'独立仓位')+'</span><span>'+(F.unitIdentityType==='SIZE_OPTION'?'门店确认':'实体门')+'</span><span>空间示意</span>';document.querySelectorAll('.fee-row')[2].querySelector('span').textContent=rows.length>1?'押金（各仓月租合计）':'押金（1个月月租）';
    text('period',confirmed?s.requirement.term_months+'个月':'请选择租期');$('period').disabled=!!(pending||paid);$('start-date').disabled=!!(pending||paid);$('start-date').min=F.demoToday;$('start-date').value=s.startDate||'';
    text('phone',authorized?'手机号 · 已验证':s.contactPhone?'联系电话 '+s.contactPhone+' · 价格待授权':'未授权，报价暂不可见');
    const allowed=authorized&&confirmed&&a&&valid;
    document.querySelector('.total>strong').textContent='首次应付';
    text('months-label',confirmed?s.requirement.term_months:'待选');
    ['rent','discount','deposit','service-fee','total'].forEach(id=>text(id,!authorized?'授权后可见':!confirmed?'请选择租期':!a?'选择仓位后显示':!valid?'已失效，待重新报价':money({rent:a.rent_total,discount:a.coupon_discount,deposit:a.deposit,'service-fee':a.management_fee,total:a.payable}[id])));
    $('total').dataset.private=String(!allowed);document.querySelector('.discount-tags').innerHTML='<em>'+(!authorized?'授权后核对优惠':a?.coupon_discount?'已使用 '+esc(core.state().coupons.find(c=>c.id===a.coupon_id)?.name||'租金券'):'暂无适用优惠')+'</em>';let average=$('order-monthly');if(!average){average=document.createElement('p');average.id='order-monthly';document.querySelector('.charges .fee-row').after(average);}average.textContent=allowed&&valid?'整期租金月均约 '+money(a.monthly_average)+'/月'+(a.coupon_discount?' · 券后月均约 '+money(a.monthly_after_coupon)+'/月':''):'';
    $('pay').innerHTML=paid?'查看已付款订单':!valid?'选择其他匹配方案':pending?'继续处理待支付订单':!authorized?'授权手机号查看报价':!confirmed?'请选择租期':'确认并模拟支付 <span id="pay-amount">'+money(a.payable)+'</span>';
    document.querySelector('.payment-note').textContent=paid?'付款已在本地记录，可查看订单和后续服务。':!valid?'当前方案不可用，容量和租期已保留':'模拟提交前会再次核对库存与金额';
    if(ui.agreed===undefined)ui.agreed=false;$('agreed').checked=ui.agreed;
    if(!st)$('pay').textContent='返回选择仓位';
  }
  function paymentSheet(order){selectedOrder=order;ui.pendingOrderId=order.id;save();sheet('确认模拟支付',note('模拟订单 '+order.id+' 已创建，待支付。不会发生真实扣款。')+moneyLines(order)+act('payResult','模拟支付成功','success',true)+act('payResult','模拟支付失败','failed')+act('cancelPay','暂不支付，保留待支付订单'));}
  function orderPay(){return B.guarded('ORDER','SUBMIT_O01',()=>guard(orderPayImpl));}
  function orderPayImpl(){const s=core.state(),paid=s.orders.find(o=>o.id===ui.pendingOrderId&&o.status==='paid_simulated'&&JSON.stringify(o.unit_ids)===JSON.stringify(s.selected));if(paid){B.openOrder(paid.id);return;}const pending=s.orders.find(o=>o.status==='pending'&&JSON.stringify(o.unit_ids)===JSON.stringify(s.selected));if(pending){if(Date.now()>=pending.expiresAt||pending.unit_ids.some((id,i)=>s.stock[id]!=='reserved'||(s.prices[id]||unit(id).base_month)!==pending.price_bases[i])){alternatives('原待支付方案已失效，请从我的订单取消后重新选择。');return;}if(!core.authorized()){phone();return;}if(!$('agreed').checked){toast('请主动勾选服务协议与隐私政策');return;}paymentSheet(pending);return;}if(!s.selected.length){B.navigate('QUICK');return;}if(!core.selectionValid()){alternatives();return;}if(!priceReady())return;if(!s.dateConfirmed){toast('请选择有效的用仓开始日期');$('start-date').focus();return;}if(!$('agreed').checked){toast('请主动勾选服务协议与隐私政策');return;}C.selection(core);const issued=core.quote();const certified=C.quote(core,issued);selectedOrder=core.submit();C.order(core,selectedOrder,certified);save();paymentSheet(selectedOrder);}
  function refresh(){const authorized=core.authorized();const [root,,body]=modalIds[page];if(!authorized&&$(root).dataset.hasPrice==='true'){$(root).hidden=true;$(body).innerHTML='';$(root).dataset.hasPrice='false';}if(page==='s5')renderS5();if(page==='quick')renderQuick();if(page==='reserve')renderReserve();if(page==='o01')renderOrder();if(r2()){const v=B.s01R2Bridge.storeView(core.state().storeId);if(v){const img=document.querySelector('.store-img,.store-row>img');if(img)img.src='../../'+v.photo;const address=document.getElementById('store-address');if(address)address.textContent=v.address;}}clean();B.persist();}
  const actions={estoreBooking(){const s=core.state();sessionStorage.setItem('mk_advisor_context_v3',JSON.stringify({service_source:'estore',capacity_hint:s.requirement.capacity_m3?s.requirement.capacity_m3+'m³':'',term_hint:s.requirement.term_confirmed?s.requirement.term_months+'个月':''}));B.navigate('BOOKING');},locatedAddress(){ui.reserve.address=$('located-address').value.trim();close();save();refresh();},coupon(id){core.setCoupon(id);close();save();refresh();},orderDetail(id){B.openOrder(id);},phoneResult(value){core.resolvePhone(value);close();save();refresh();if(value!=='success')toast(value==='denied'?'未授权，您仍可继续浏览':'授权暂时失败，可继续浏览并稍后重试');},term:applyTerm,customTerm(){applyTerm($('custom-months').value);},city(value){core.setCity(value);ui.quick=null;if(page==='s5'){ui.s5Area='';ui.s5AreaCity=value;}close();save();refresh();if(page==='s5')s5AreaSheet();},s5ChooseArea(){close();s5AreaSheet();},s5Area(value){const city=core.state().city;const valid=new Set(F.stores.filter(s=>s.city===city&&s.status==='open').map(s=>s.district));if(value&&!valid.has(value)){toast('区域暂不可选');return;}ui.s5Area=value;ui.s5AreaCity=city;close();save();refresh();},store(id){close();B.openStore(id,pageIds[page]);},booking(){consult();},quickStore(id){const s=core.state();core.clearSelection();core.setStore(id);ui.quick={storeId:id,ids:[]};close();save();refresh();},quickUnit(value){ui.quick.ids=value.split(',');close();save();refresh();},otherStores(){close();B.navigate('S01');},reserveOption(value){const [key,item]=value.split('|');ui.reserve[{items:'items',capacity:'capacity_hint',duration:'term_hint'}[key]]=item;close();save();refresh();},payResult(value){if(!core.authorized()){phone();return;}const order=selectedOrder||core.state().orders.at(-1);if(!order){toast('暂无待支付的模拟订单');return;}const result=core.pay(order.id,value);save();refresh();sheet(value==='success'?'模拟支付成功':'模拟支付失败，仓位已释放',note('订单 '+result.id+' · '+store(result.store_id).name+' · '+result.term_months+'个月')+act('orderDetail','查看订单与后续服务',result.id,true)+act('browse','继续浏览门店'));},cancelPay(){close();refresh();toast('模拟订单保留为待支付，可从本页继续处理');},browse(){B.navigate('S01');}};
  document.addEventListener('click',e=>{const b=e.target.closest('[data-bridge]');if(b){e.preventDefault();guard(()=>actions[b.dataset.bridge]?.(b.dataset.value));}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key==='Enter'&&e.target.matches('[data-offer]'))e.target.click();});
  for(const id of ['close-modal','modal-close','closePopup','close-sheet'])if($(id))$(id).onclick=close;
  if($('modal-shade'))$('modal-shade').onclick=close;
  if(page==='s5'){
    document.querySelector('.back').onclick=()=>B.navigate('S01');document.querySelector('.mini-menu').onclick=()=>toast('内部演示导航');
    $('modify').onclick=()=>{B.editRequirement();};$('change-origin').onclick=citySheet;
    $$('[data-term]').forEach(el=>el.onclick=()=>guard(()=>applyTerm(el.dataset.term)));$('more-term').onclick=moreTerms;
    ['main','secondary'].forEach((prefix,i)=>{const buy=$(prefix==='main'?'main-buy':'secondary-buy');buy.onclick=()=>guard(()=>{const row=offerRows[i];if(!row)return;if(!core.state().requirement.term_confirmed){toast('请选择租期');return;}
      if(Number(row.volume)<Number(core.state().requirement.capacity_m3)){B.openStore(row.store.id,'S5');return;}
      B.order(row.ids);});$(prefix==='main'?'open-store-main':'open-store-secondary').onclick=()=>offerRows[i]&&B.openStore(offerRows[i].store.id,'S5');$(prefix==='main'?'navigate-main':'navigate-secondary').onclick=()=>toast('路线导航服务尚未接入，可按门店地址查找');$(prefix==='main'?'main-price':'secondary-price').onclick=()=>B.guarded('QUOTE','S5_FEES',()=>{if(priceReady()&&offerRows[i])sheet('费用明细',moneyLines(amounts(offerRows[i].ids)));});});
    $('s5-advisor-action').onclick=()=>consult('advisor');
    $('see-more').onclick=()=>B.navigate('S01');$('open-estore').onclick=()=>sheet('考拉E存',note('上门取送服务的适用范围及方案由顾问确认；此处仍为候选服务入口。')+act('estoreBooking','联系顾问','',true));
    $$('[data-nm]').forEach(el=>el.onclick=()=>{const a=el.dataset.nm;if(a==='capacity')B.editRequirement();else if(a==='advisor')consult();else if(a==='range'&&$('artboard').dataset.match==='incomplete')moreTerms();else B.navigate('S01');});
  }
  if(page==='quick'){
    $('back-button').onclick=()=>B.navigate('S01');$('menu-button').onclick=()=>toast('内部演示导航');$('more-terms').onclick=moreTerms;
    $$('[data-term]').forEach(el=>el.onclick=()=>guard(()=>applyTerm(el.dataset.term)));
    $$('[data-choice]').forEach(el=>el.onclick=()=>el.dataset.choice==='city'?citySheet():el.dataset.choice==='store'?chooseStore():chooseUnit());
    $('store-detail').onclick=()=>quickState().storeId&&B.openStore(quickState().storeId,'QUICK');
    $('start-date').onchange=e=>guard(()=>{core.setDate(e.target.value);save();refresh();});
    $('unit-price').onclick=()=>{if(!core.authorized())phone();};
    $('fee-detail').onclick=()=>{const q=quickState();if(!q.ids.length){toast('请选择仓位');return;}B.guarded('QUOTE','QUICK_FEES',()=>{if(priceReady())sheet('费用明细',moneyLines(amounts(q.ids)));});};
    $('next-button').onclick=()=>guard(quickNext);
  }
  if(page==='reserve'){
    const addressButton=document.createElement('button');addressButton.type='button';addressButton.textContent='使用当前位置';addressButton.className='location-shortcut';$('booking-address').closest('.phone-line').after(addressButton);addressButton.onclick=()=>{if(!navigator.geolocation){toast('当前浏览器不支持定位，请直接填写用仓地址');return;}navigator.geolocation.getCurrentPosition(position=>{sheet('确认用仓地址',note('已获得当前位置 '+position.coords.latitude.toFixed(5)+', '+position.coords.longitude.toFixed(5)+'。地址解析服务尚未接入，请补充详细地址后确认。')+'<label for="located-address">详细用仓地址</label><input id="located-address" class="bridge-input" maxlength="120" value="'+esc(ui.reserve.address)+'">'+act('locatedAddress','确认用仓地址','',true));},()=>toast('未取得定位，您仍可直接填写用仓地址'),{timeout:10000});};const contact=document.createElement('label');contact.className='reserve-contact-field';contact.innerHTML='联系电话（选填）<input id="reserve-contact" type="tel" autocomplete="tel" maxlength="20">';addressButton.after(contact);$('reserve-contact').oninput=e=>{ui.reserve.phone=e.target.value;save();};
    $('back').onclick=()=>{if(ui.reserve?.returnTo)parent.location.href=new URL(ui.reserve.returnTo,parent.location.href).href;else B.navigate('S01');};$('menu').onclick=()=>toast('内部演示导航');
    $('booking-address').oninput=e=>{ui.reserve.address=e.target.value;save();};$('note').oninput=e=>{ui.reserve.note=e.target.value;text('counter',e.target.value.length+'/200');save();};
    $$('[data-term]').forEach(el=>el.onclick=()=>{ui.reserve.start_hint=el.dataset.term;ui.reserve.preferred_date='';save();refresh();});
    $('dateInput').onchange=e=>guard(()=>{if(e.target.value&&!core.validDate(e.target.value))throw new Error('SELECT_DATE');ui.reserve.preferred_date=e.target.value;ui.reserve.start_hint='';save();refresh();});
    $$('[data-choice]').forEach(el=>el.onclick=()=>reserveChoice(el.dataset.choice));
    $('reserveForm').onsubmit=e=>{e.preventDefault();guard(()=>{if(ui.reserve.receipt)return;let lead;if(advisorMode)lead=core.saveAdvisorLead(ui.reserve);else{if(ui.reserve.phone)core.setContact(ui.reserve.phone);lead=core.saveLead(ui.reserve.address,ui.reserve);}ui.reserve.receipt=lead.id;save();refresh();});};
    $('again').onclick=()=>{ui.reserve.receipt=null;save();refresh();};
  }
  if(page==='o01'){
    ui.agreed=false;
    $('back').onclick=()=>B.navigate(sessionStorage.getItem('mk_order_return_v2')||'QUICK');
    $('period').onclick=moreTerms;$('start-date').onchange=e=>guard(()=>{core.setDate(e.target.value);save();refresh();});
    document.querySelector('[data-open="phone"]').onclick=phone;
    document.querySelector('[data-open="coupon"]').onclick=()=>{if(core.state().orders.some(o=>o.status==='pending'&&JSON.stringify(o.unit_ids)===JSON.stringify(core.state().selected))){toast('待支付订单已锁定优惠，取消后可重新选择');return;}if(!core.authorized()){phone();return;}const s=core.state();if(!s.selected.length||!s.requirement.term_confirmed){toast('请先选择仓位和租期');return;}core.claimCoupons();sheet('选择优惠券',act('coupon','自动使用最优优惠','auto')+act('coupon','暂不使用优惠','none')+core.couponOptions(s.selected,s.requirement.term_months).map(c=>c.eligible?act('coupon',c.name+' · '+money(c.amount),c.id):note(c.name+'：'+(c.reason||'不适用于当前订单'))).join(''));};
    $$('[data-legal]').forEach(el=>el.onclick=e=>{e.preventDefault();sheet(el.dataset.legal,note('这里只展示内部模拟条款说明，不签署正式协议，不产生真实扣款。'));});
    $('agreed').onchange=e=>{ui.agreed=e.target.checked;save();};$('pay').onclick=()=>guard(orderPay);
  }
  window.BR04_REFRESH=refresh;window.addEventListener('resize',fit);
  refresh();document.body.classList.add('bridge-ready');
  const scroll=document.querySelector('#app-viewport,#screenViewport,#page-scroll,#scrollpane');
  if(scroll){scroll.scrollTop=ui.scrollTop||0;scroll.addEventListener('scroll',()=>{ui.scrollTop=scroll.scrollTop;save();},{passive:true});}
})();
