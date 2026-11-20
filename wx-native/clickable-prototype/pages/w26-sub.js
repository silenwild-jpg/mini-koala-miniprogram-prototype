/* W26 · 订阅消息授权层（总表 A1）
 * 任意页面追加 ?sub=ask | accepted | declined
 *   ask       用户点提交按钮时弹出的微信一次性订阅授权框（按微信原生样式画；允许或取消都继续提交）
 *   accepted  已允许：结果页写一句「已开启微信通知」
 *   declined  已取消：不影响提交；结果页把「会通知您」改成去「消息」查看，并留一个「开启通知」入口
 * 一次性订阅每次授权只能发一条，所以入口挂在用户主动点按的按钮上（提交预约、提交续租需求、开启通知）。
 * 消息名称（预约进度提醒 / 续租报价提醒）是设计侧暂用名，正式名称以微信后台申请到的模板为准。 */
(function(){
  const sub=new URLSearchParams(location.search).get('sub');if(!sub)return;
  const PAGE=document.body.dataset.page;
  const CTX={BOOKING:{name:'预约进度提醒',ok:'已开启微信通知，预约有进展时会提醒您。',no:'未开启微信通知，可在「消息」查看预约进度。'},
             RN01:{name:'续租报价提醒',ok:'已开启微信通知。',no:'未开启微信通知。'},
             /* W27：验仓结果（点「申请验仓」时触发）、到期提醒（点「确认支付」时触发；订单详情显示结果）。名称为设计侧暂用名 */
             EX01:{name:'验仓结果提醒',ok:'已开启微信通知，验仓有结果时会提醒您。',no:'未开启微信通知，可在「消息」查看验仓结果。',anchor:true},
             O03:{name:'租期到期提醒',ok:'已开启到期提醒，租期到期前会通过微信提醒您。',no:'未开启到期提醒，可在「消息」查看到期通知。',anchor:true}}[PAGE];
  if(!CTX)return;
  const el=h=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild;};
  const CHECK='<svg class="ico sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>';
  document.body.dataset.sub=sub;
  if(sub==='ask'){
    const root=document.getElementById('overlay-root')||document.body;
    root.append(el('<div class="scrim w26subscrim" role="dialog" aria-modal="true" aria-label="微信订阅消息授权"><div class="sheet w9native w26sub"><div class="w9app"><i></i>迷你考拉仓<span>申请</span></div><h4>发送一次以下消息</h4><div class="opt on"><span class="r">'+CTX.name+'</span>'+CHECK+'</div><div class="cbox w26keep" role="checkbox" tabindex="0" aria-checked="false"><span class="box"></span><span>总是保持以上选择，不再询问</span></div><div class="acts"><button type="button" class="btn neutral" data-action="subDeny">取消</button><button type="button" class="btn primary" data-action="subAllow">允许</button></div></div></div>'));
    return;
  }
  const line=sub==='accepted'?'<p class="w26subline ok" role="status">'+CHECK+'<span>'+CTX.ok+'</span></p>':'<p class="w26subline" role="status"><span>'+CTX.no+'</span><button type="button" class="btn text sm" data-action="subAsk">开启通知</button></p>';
  let n=0;(function place(){
    const res=document.querySelector('.result'),note=[...document.querySelectorAll('.card.notice .s')].find(x=>/通知您/.test(x.textContent));
    if(CTX.anchor){const h=document.querySelector('.shead');if(h){const c=el('<section class="card notice w27subcard"></section>');c.append(el(line));h.after(c);}else if(n++<30)return setTimeout(place,50);}
    else if(res){const acts=res.querySelector('.acts');acts?res.insertBefore(el(line),acts):res.append(el(line));}
    else if(note){if(sub==='declined')note.textContent=note.textContent.replace(/后会通知您/,'后可在「消息」查看');note.parentNode.append(el(line));}
    else if(n++<30)return setTimeout(place,50);
  })();
  window.__W26SUB={sub,page:PAGE};
})();
