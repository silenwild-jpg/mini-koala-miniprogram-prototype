(function(global){
  'use strict';
  function recommendationRole(row, nearest, fallback){
    if(fallback)return '容量接近的备选';
    if(row.storeId===nearest?.storeId)return '离您最近';
    return Number(row.total)<Number(nearest?.total)?'整期租金更省':'另一家匹配门店';
  }
  function listParams(context, active){
    return {travel:active.travel,searchOriginKey:active.origin,sort:context?.sort||'recommended',distance:context?.distance||'any',access:context?.access||'unknown',scroll:'0'};
  }
  function withinDistance(km,limit){return limit==='any'||Number(km)<=Number(limit);}
  function dialog(title){
    const prior=document.querySelector('.mk-phase2-dialog');
    if(prior)prior.close();
    const el=document.createElement('dialog');
    el.className='mk-phase2-dialog';
    el.setAttribute('aria-label',title);
    const heading=document.createElement('h2');heading.textContent=title;el.append(heading);
    document.body.append(el);
    el.addEventListener('close',()=>el.remove(),{once:true});
    el.addEventListener('click',e=>{if(e.target===el){const r=el.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)el.close();}});
    return el;
  }
  function paragraph(el,copy){const p=document.createElement('p');p.textContent=copy;el.append(p);return p;}
  function button(el,label,action,primary=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=primary?'mk-primary':'';b.onclick=action;el.append(b);return b;}
  function actions(el){const row=document.createElement('div');row.className='mk-actions';el.append(row);return row;}
  function locationPicker({origin,names,onApply}){
    const el=dialog('用仓位置');
    paragraph(el,'请选择演示支持的位置；当前未接通真实定位。');
    const input=document.createElement('input');input.placeholder='搜索位置';input.setAttribute('aria-label','搜索用仓位置');el.append(input);
    const select=document.createElement('select');select.size=5;select.setAttribute('aria-label','可选位置');el.append(select);
    const keys=['guomao','wangjing','shuangjing','sanyuanqiao','zhongguancun','outside'].filter(k=>names[k]);
    function fill(query){select.replaceChildren();keys.filter(k=>names[k].includes(query)).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=names[k];select.append(o)});select.value=keys.includes(origin)&&names[origin].includes(query)?origin:'';}
    fill('');input.oninput=()=>fill(input.value.trim());
    const error=paragraph(el,'');error.setAttribute('role','status');
    const row=actions(el);button(row,'取消',()=>el.close());button(row,'使用这个位置',()=>{if(!keys.includes(select.value)){error.textContent='请选择下方位置；当前演示暂不支持其他地址。';return;}const key=select.value;el.close();onApply(key,names[key]);},true);
    el.showModal();
  }
  function capacityPicker({value,original,mode='about',onApply}){
    const el=dialog('调整找仓容量');
    paragraph(el,mode==='atleast'?'容量至少（m³）':mode==='within'?'容量不超过（m³）':'您想找多大的空间？（m³）');
    const row=actions(el),input=document.createElement('input');input.type='number';input.min='.5';input.max='200';input.step='.1';input.value=value;input.setAttribute('aria-label','找仓容量，立方米');
    button(row,'−',()=>{input.value=Math.max(.5,Number(input.value)-.5).toFixed(1);update()});row.append(input);button(row,'＋',()=>{input.value=Math.min(200,Number(input.value)+.5).toFixed(1);update()});
    const note=paragraph(el,'');note.setAttribute('role','status');
    function update(){note.textContent=original&&Number(input.value)<original?'找仓容量小于原估算，请确认物品可以放下':'';}
    input.oninput=update;update();
    const buttons=actions(el);button(buttons,'取消',()=>el.close());button(buttons,'按这个容量找仓',()=>{const next=Number(input.value);if(!Number.isFinite(next)||next<.5||next>200){note.textContent='请输入0.5–200m³之间的容量';return;}el.close();if(next!==Number(value))onApply(next);},true);
    el.showModal();
  }
  function estore({context,request}){
    const el=dialog('考拉E存方案咨询');
    paragraph(el,'提供上门取送的存储方案，与自行到店使用实体仓不同。服务范围、套餐和费用需进一步确认。');
    paragraph(el,`容量：${context.target_volume?context.target_volume+'m³':'待确认'} · 租期：${context.term_months?context.term_months+'个月':'待确认'}`);
    paragraph(el,'用仓位置：'+(context.usage_location||'待确认'));
    paragraph(el,'当前为内部演示，咨询不会发送给真实顾问。');
    const row=actions(el);button(row,'继续看其他方案',()=>el.close());button(row,'咨询E存方案',()=>{el.close();request({...context,service:'ESTORE',demo_only:true});},true);el.showModal();
  }
  function estoreSaved(context){
    const record={...context,service:'ESTORE',status:'DEMO_SAVED',saved_at:new Date().toISOString()};
    try{localStorage.setItem('mini_koala_estore_demo_request',JSON.stringify(record));}catch(e){global.__miniKoalaEstoreDemoRequest=record;}
    const el=dialog('咨询演示记录');paragraph(el,'已保存E存咨询演示记录；当前未发送给顾问');button(actions(el),'继续比较方案',()=>el.close(),true);el.showModal();
  }
  global.MINI_KOALA_PHASE2={recommendationRole,listParams,withinDistance,locationPicker,capacityPicker,estore,estoreSaved};
})(window);
