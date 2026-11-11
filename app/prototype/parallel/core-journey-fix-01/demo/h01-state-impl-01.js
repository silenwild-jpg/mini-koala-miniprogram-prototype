(function(){
  "use strict";
  if(!window.H01_STATE_POLICY||!window.SIM_CORE)return;
  const root=document.querySelector(".page");
  if(!root||!document.querySelector("#storeRail"))return;
  const SOURCE="mk_independent_sim_v1", PREF="mk_h01_view_pref_01";
  const read=(key)=>{try{return JSON.parse(sessionStorage.getItem(key)||"null");}catch(_){return null}};
  const save=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value));}catch(_){}};
  let model=null,view="business";
  const el=document.createElement("section");
  el.id="h01-flow";el.className="h01-flow-layer";
  el.innerHTML='<div class="h01-flow-head" id="h01FlowHead"><strong class="h01-flow-brand">迷你考拉仓</strong><button type="button" class="h01-flow-city" data-h01="city" id="h01FlowCity"></button></div>'+
  '<div class="h01-flow-tabs" id="h01FlowTabs"><button type="button" data-h01="business" role="tab">我的仓位</button><button type="button" data-h01="browse" role="tab">找新仓</button></div>'+
  '<div class="h01-flow-market-return" id="h01FlowReturn"><button type="button" data-h01="business">‹ 返回当前任务</button></div>'+
  '<div class="h01-flow-content" id="h01FlowContent"><div class="h01-flow-kicker-row"><span class="h01-flow-kicker" id="h01FlowKicker">当前任务</span><button type="button" class="h01-flow-quick-browse" id="h01FlowQuickBrowse" data-h01="browse">找新仓 ›</button></div><article class="h01-flow-task" id="h01FlowTask">'+
  '<div class="h01-flow-title"><strong id="h01FlowTitle"></strong><span class="h01-flow-badge" id="h01FlowBadge"></span></div>'+
  '<div class="h01-flow-store" id="h01FlowStore"></div><p class="h01-flow-sub" id="h01FlowSub"></p><p class="h01-flow-address" id="h01FlowAddress" hidden></p>'+
  '<div class="h01-flow-facts" id="h01FlowFacts"></div><div class="h01-flow-buttons">'+
  '<button type="button" class="h01-flow-primary" data-h01="primary" id="h01FlowPrimary"></button>'+
  '<button type="button" class="h01-flow-secondary" data-h01="secondary" id="h01FlowSecondary"></button></div></article>'+
  '<section class="h01-flow-services" id="h01FlowServices"><h2>仓位服务</h2><div class="h01-flow-service-grid">'+
  '<button type="button" data-h01="renew">续租</button><button type="button" data-h01="more">更多服务 ›</button></div></section>'+
  '<div class="h01-flow-other" id="h01FlowOther"><button type="button" data-h01="allorders">我的订单 <span>›</span></button></div>'+
  '<button type="button" class="h01-flow-browse" id="h01FlowBrowse" data-h01="browse">浏览其他门店 ›</button>'+
  '<p class="h01-flow-note" id="h01FlowNote"></p>'+
  '<section class="h01-flow-help" id="h01FlowHelp" hidden><div class="h01-flow-help-top"><strong id="h01FlowHelpTitle"></strong><button type="button" data-h01="help" id="h01FlowHelpAction">查看须知 ›</button></div><p id="h01FlowHelpText"></p></section>'+
  '<div class="h01-flow-promo" id="h01FlowPromo" hidden><span id="h01FlowPromoTitle"></span><button data-h01="promo" type="button">了解活动 ›</button></div></div>';
  root.insertBefore(el,root.firstChild);
  const one=s=>el.querySelector(s);
  function getState(){
    const saved=read(SOURCE);
    let core=null;
    try{core=window.SIM_CORE.create(saved?{state:saved}:{});}catch(_){}
    // Expiration is enforced by the shared order engine, then persisted before deriving the visible task.
    if(core&&core.expirePendingOrders()>0)save(SOURCE,core.state());
    const state=core?core.state():(saved||{});
    return {state,task:window.H01_STATE_POLICY.derive(state,core)};
  }
  function render(){
    const next=getState();model=next;const t=next.task,s=next.state;
    const pref=read(PREF);
    // A previously remembered marketing view must not obscure a time-critical unpaid order.
    if(t.key!=="pending"&&pref&&pref.key===t.key&&pref.orderId===t.orderId&&pref.view==="market")view="market";
    if(t.key==="pending"&&pref?.view==="market")save(PREF,null);
    else if(pref&&(pref.key!==t.key||pref.orderId!==t.orderId)){view="business";save(PREF,null);}
    if(t.isMarketing)view="market";
    const business=!t.isMarketing&&view!=="market";
    document.body.classList.add("h01-state-adapter-ready");
    document.body.classList.toggle("h01-flow-business",business);
    document.body.classList.toggle("h01-flow-marketing",!business);
    one("#h01FlowHead").hidden=!business;
    one("#h01FlowContent").hidden=!business;
    one("#h01FlowReturn").hidden=business||t.isMarketing;
    // Variant B: the existing marketing H01 is one lightweight link, not permanent tabs.
    one("#h01FlowTabs").hidden=true;
    one("#h01FlowQuickBrowse").hidden=!business;
    const tabs=one("#h01FlowTabs").querySelectorAll("button");
    tabs[0].setAttribute("aria-selected",business?"true":"false");
    tabs[1].setAttribute("aria-selected",business?"false":"true");
    one("#h01FlowCity").textContent=(s.city||"选择城市")+" ⌄";
    if(!business)return;
    one("#h01FlowKicker").textContent=t.layout==="service"?"我的仓位":"当前待办";
    one("#h01FlowTitle").textContent=t.title;
    one("#h01FlowBadge").textContent=t.badge||"";
    const actualStore=t.storeId&&window.SIM_FIXTURES?.stores?.find(x=>x.id===t.storeId);
    const name=actualStore?.name||"";
    const storeNode=one("#h01FlowStore"),subNode=one("#h01FlowSub");
    storeNode.textContent=name;storeNode.hidden=!name;
    let summary=t.sub||"";
    if(name&&summary.startsWith(name+" · "))summary=summary.slice(name.length+3);
    else if(name&&summary===name)summary="";
    const order=t.orderId&&s.orders?.find(x=>x.id===t.orderId);
    if(order?.term_months&&["pending","identity","upcoming","active","expiring","renewal"].includes(t.key))summary+=(summary?" · ":"")+order.term_months+"个月";
    subNode.textContent=summary;subNode.hidden=!summary;
    const address=one("#h01FlowAddress");
    const locationText=["identity","upcoming","active","expiring","renewal","returning","lease_expired"].includes(t.key)?String(actualStore?.address||""):"";
    address.textContent=locationText;address.hidden=!locationText;
    one("#h01FlowTask").dataset.urgent=["pending","expired","payment_failed","invalidated","refund","returning","identity","expiring"].includes(t.key)?"true":"false";
    const facts=one("#h01FlowFacts");facts.replaceChildren();
    (t.facts||[]).slice(0,3).forEach(([value,label])=>{const box=document.createElement("div");box.className="h01-flow-fact";const b=document.createElement("b");b.textContent=value;if(t.key==="pending"&&label==="支付剩余时间"){box.dataset.countdown="true";b.id="h01FlowCountdown";b.setAttribute("role","timer");b.setAttribute("aria-live","off");}const small=document.createElement("small");small.textContent=label;box.append(b,small);facts.append(box)});
    updateCountdown();
    one("#h01FlowPrimary").textContent=t.primary?.[0]||"查看订单";
    one("#h01FlowSecondary").textContent=t.secondary?.[0]||"查看订单";
    one("#h01FlowSecondary").hidden=!t.secondary||["booking","refund"].includes(t.key);
    const service=t.key==="active"||t.key==="expiring";
    one("#h01FlowServices").hidden=!service||t.key==="expiring";
    one("#h01FlowOther").hidden=t.key!=="active"&&!(t.otherActiveCount>0);
    // Top text link replaces duplicate inline browse / top tabs. Existing markup is retained for comparison only.
    one("#h01FlowBrowse").hidden=true;
    one("#h01FlowNote").textContent=t.otherActiveCount>0?"另有 "+t.otherActiveCount+" 间在租仓位，请在订单中查看。":"";
    const help={
      identity:["入仓前准备","完成身份验证后，起租日可使用仓门开锁。"],
      upcoming:["首次入仓须知","起租日开放存取，提前查看门店位置和存取时间。"],
      active:["门店使用须知","存取时核对仓号，离开前请确认仓门已关好。"],
      expiring:["到期办理提醒","到期前可办理续租；退租时需清空并申请验仓。"],
      renewal:["续租办理提醒","续租费用与生效日期请以订单确认结果为准。"],
      returning:["退仓与验仓","仓内物品清空后申请验仓，押金以审核结果为准。"],
      lease_expired:["退押金办理","先完成退租和门店验仓，再办理押金退还。"],
      refund:["退款进度","押金进度以订单审核记录为准。"]
    };
    const entry=help[t.key]||null;
    one("#h01FlowHelp").hidden=!entry;
    if(entry){one("#h01FlowHelpTitle").textContent=entry[0];one("#h01FlowHelpText").textContent=entry[1];}
    // Campaigns are opt-in and require a verified, active configuration. Never invent offers.
    const promo=window.MK_H01_PROMOTION;
    const canPromote=["active","upcoming"].includes(t.key);
    const validPromo=canPromote&&promo?.approved===true&&promo?.active===true&&
      typeof promo.title==="string"&&promo.title.trim().length>0&&
      ["storeService","nearby"].includes(promo.action)&&
      (!promo.storeId||promo.storeId===t.storeId)&&
      (!promo.expiresAt||Date.now()<Date.parse(promo.expiresAt));
    one("#h01FlowPromo").hidden=!validPromo;
    if(validPromo)one("#h01FlowPromoTitle").textContent=promo.title.slice(0,42);
  }
  function countdownValue(expiresAt){
    const remaining=Math.max(0,Math.ceil((Number(expiresAt)-Date.now())/1000));
    const pad=n=>String(n).padStart(2,"0");
    return {remaining,text:pad(Math.floor(remaining/3600))+":"+pad(Math.floor(remaining%3600/60))+":"+pad(remaining%60),
      tone:remaining<=300?"critical":remaining<=1800?"warning":"normal"};
  }
  function updateCountdown(){
    if(model?.task?.key!=="pending")return;
    const info=countdownValue(model.task.expiresAt);
    if(!Number.isFinite(model.task.expiresAt)){const timer=one("#h01FlowCountdown");if(timer)timer.textContent="以订单为准";return;}
    if(info.remaining===0){render();return;}
    const timer=one("#h01FlowCountdown");
    if(timer){timer.textContent=info.text;timer.closest(".h01-flow-fact").dataset.tone=info.tone;}
  }
  function setView(v){const t=model?.task;if(!t||t.isMarketing)return;view=v;save(PREF,{view:v,key:t.key,orderId:t.orderId});render();}
  function go(path){window.location.assign(path);}
  function orderUrl(){const id=model.task.orderId;return "index.html?page=O03"+(id?"&order="+encodeURIComponent(id):"")}
  function storeUrl(){const id=model.task.storeId;return id?"index.html?page=S02&store="+encodeURIComponent(id)+"&s01_r2=1":orderUrl()}
  function showChoice(title,description,options){
    document.querySelectorAll(".h01-flow-modal").forEach(x=>x.remove());
    const cover=document.createElement("div");cover.className="h01-flow-modal";
    const panel=document.createElement("section");panel.className="h01-flow-dialog";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");
    const h=document.createElement("h2");h.textContent=title;
    const p=document.createElement("p");p.textContent=description;
    panel.append(h,p);
    for(const [label,handler] of options){
      const b=document.createElement("button");b.type="button";b.textContent=label;b.className="h01-flow-choice";
      b.addEventListener("click",()=>{cover.remove();handler()});panel.append(b);
    }
    const close=document.createElement("button");close.type="button";close.className="h01-flow-cancel";close.textContent="返回";
    const trigger=document.activeElement;
    const dismiss=()=>{cover.remove();if(trigger?.isConnected&&typeof trigger.focus==="function")trigger.focus();};
    close.addEventListener("click",dismiss);panel.append(close);cover.append(panel);
    cover.addEventListener("click",e=>{if(e.target===cover)dismiss();});
    cover.addEventListener("keydown",e=>{
      if(e.key==="Escape"){e.preventDefault();dismiss();return;}
      if(e.key!=="Tab")return;
      const buttons=[...panel.querySelectorAll("button")];
      const first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    document.getElementById("phone").append(cover);panel.querySelector("h2").id="h01ServiceTitle";
    panel.setAttribute("aria-labelledby","h01ServiceTitle");panel.querySelector("button")?.focus();
  }
  function act(kind){
    const t=model?.task;if(!t)return;
    if(kind==="business"){setView("business");return}
    if(kind==="browse"){setView("market");return}
    if(kind==="city"){const btn=document.querySelector(".hero .search");if(btn){setView("market");btn.click();}return}
    if(kind==="primary"&&t.key==="pending"){
      const checked=getState().task;
      if(checked.key!=="pending"||checked.orderId!==t.orderId){render();return;}
      go("index.html?page=O01&order="+encodeURIComponent(t.orderId));return;
    }
    if(kind==="primary"||kind==="secondary"){act(t[kind]?.[1]||"order");return}
    if(kind==="order"){
      if(t.key==="pending"&&getState().task.key!=="pending"){render();return;}
      go(orderUrl());return;
    }
    if(kind==="allorders"){go("index.html?page=M01");return}
    if(kind==="restart"){
      const draft=read("mk_br04_ui_v2")||{};
      // Invalidate the previous QUICK selection UI; keep capacity/term as input hints only.
      if(draft.quick)delete draft.quick;
      save("mk_br04_ui_v2",draft);
      save("mk_h01_reorder_intent_01",{previous_order_id:t.orderId,source:"H01",created_at:Date.now()});
      go("index.html?page=QUICK");return;
    }
    if(kind==="booking"){go("account.html?view=needs");return}
    if(kind==="nearby"){go("index.html?page=S01&s01_r2=1");return}
    if(kind==="recommend"){go("index.html?page=S5");return}
    if(kind==="estimate"){go("cap.html");return}
    if(kind==="navigate"){
      const st=window.SIM_FIXTURES?.stores?.find(x=>x.id===t.storeId);
      const geo=st?.geo;
      if(geo?.verified===true&&Number.isFinite(geo.latitude)&&Number.isFinite(geo.longitude)&&typeof window.wx?.openLocation==="function"){
        window.wx.openLocation({latitude:geo.latitude,longitude:geo.longitude,name:st.name,address:st.address,scale:16,
          fail:()=>showChoice("门店导航",st.address||st.name,[["查看门店位置",()=>go(storeUrl())]])});
      }else if(st?.address){
        showChoice("门店导航",st.address,[
          ["地图搜索路线",()=>{
            const keyword=encodeURIComponent([st.name,st.address].filter(Boolean).join(" "));
            const url="https://uri.amap.com/search?keyword="+keyword+"&city="+encodeURIComponent(st.city||"");
            const opened=window.open(url,"_blank","noopener,noreferrer");if(!opened)go(storeUrl());
          }],
          ["查看门店位置",()=>go(storeUrl())]
        ]);
      }else go(storeUrl());
      return;
    }
    if(kind==="verify"){
      showChoice("身份验证","完成身份核验后，起租日才可使用蓝牙开锁。",[
        ["查看订单及资格",()=>go(orderUrl())],
        ["联系门店",()=>go(storeUrl())]
      ]);return;
    }
    if(kind==="unlock"){
      const current=getState();
      const decision=window.H01_STATE_POLICY.accessDecision(current.state,
        window.SIM_CORE.create({state:current.state}),t.orderId);
      if(!decision.allowed){
        const messages={identity:"请先完成身份核验。",before_start:"起租日 "+(decision.startDate||"待确认")+" 后可以开锁。",lease_inactive:"当前租约或验仓状态不允许开锁。",not_paid:"订单未支付，暂不能开锁。"};
        showChoice("仓门开锁",messages[decision.reason]||"请查看订单的开锁资格。",[
          ["查看订单",()=>go(orderUrl())],["查看门店位置",()=>go(storeUrl())]
        ]);return;
      }
      const gateway=window.MK_H01_LOCK_GATEWAY;
      if(typeof gateway?.requestUnlock==="function"){
        Promise.resolve().then(()=>gateway.requestUnlock({orderId:decision.orderId,storeId:decision.storeId,unitIds:decision.unitIds})).then(result=>{
          if(result?.confirmed===true&&result?.acknowledged===true)
            showChoice("开锁成功","请在仓门关闭后确认锁具已锁好。",[["完成",()=>render()]]);
          else showChoice("无法完成开锁","未收到仓门的开锁确认，请重试或联系门店。",[["查看门店",()=>go(storeUrl())]]);
        }).catch(()=>showChoice("无法完成开锁","蓝牙连接或仓门授权未完成，请检查蓝牙并联系门店。",[["查看门店",()=>go(storeUrl())]]));
      }else showChoice("蓝牙开锁","请靠近仓门并开启手机蓝牙。仓门设备尚未绑定，暂时无法开锁。",[
        ["查看门店位置",()=>go(storeUrl())],["查看我的订单",()=>go(orderUrl())]
      ]);
      return;
    }
    if(kind==="exit"){go("index.html?page=EX01&order="+encodeURIComponent(t.orderId));return}
    if(kind==="deposit"){go("index.html?page=DP01&order="+encodeURIComponent(t.orderId));return}
    if(kind==="help"){
      const details={
        identity:"准备身份材料，并确认门店存取时间。身份未核验完成前不能开锁。",
        upcoming:"到店前确认地址与起租日期，携带必要物品。起租后才开放开锁权限。",
        active:"存取前确认仓位编号；禁止存放易燃易爆等危险物品；离开前关闭仓门并检查锁具。",
        expiring:"租期到期前确认续租或退租安排，退租需清空仓位并由门店验仓。",
        renewal:"续租金额、起止日期和生效情况以订单确认记录为准。",
        returning:"清空全部物品后申请验仓。验仓通过后处理押金，未通过需按门店提示处理。",
        lease_expired:"租期已结束，仓门权限将停止。申请退租、清空验仓后再处理押金。",
        refund:"退款处理中可查看订单状态，退还金额和到账时间以实际处理结果为准。"
      };
      showChoice("用仓帮助",details[t.key]||"请查看门店存取规则。",[["查看我的订单",()=>go(orderUrl())]]);return;
    }
    if(kind==="promo"){
      const cfg=window.MK_H01_PROMOTION;
      if(cfg?.approved!==true||cfg?.active!==true)return;
      act(cfg.action);return;
    }
    if(kind==="storeService"){go(storeUrl());return}
    if(kind==="support"){go(t.orderId?orderUrl():"index.html?page=M01");return}
    if(kind==="renew"){
      if(!t.orderId){go("index.html?page=M01");return;}
      const latest=getState().state.orders?.find(o=>o.id===t.orderId);
      if(latest?.status!=="paid_simulated"){render();return;}
      go("index.html?page=RN01&order="+encodeURIComponent(t.orderId));return;
    }
    if(kind==="more"){
      showChoice("更多仓位服务","加租将创建新订单，换仓须由顾问确认。",[
        ["加租仓位",()=>{save("mk_h01_add_intent_01",{source:"H01",preferred_store_id:t.storeId||null,origin_order_id:t.orderId||null});go("index.html?page=QUICK");}],
        ["换仓申请",()=>{save("mk_advisor_context_v3",{service_source:"h01_change_request",store_id:t.storeId||null,order_id:t.orderId||null});go("index.html?page=BOOKING&mode=advisor");}]
      ]);return;
    }
    if(kind==="add"){
      showChoice("加租仓位","将创建新的选仓和下单流程，原有租约不受影响。",[
        ["优先当前门店",()=>{save("mk_h01_add_intent_01",{source:"H01",preferred_store_id:t.storeId||null,origin_order_id:t.orderId||null});go("index.html?page=QUICK");}],
        ["浏览其他门店",()=>{save("mk_h01_add_intent_01",{source:"H01",preferred_store_id:null,origin_order_id:t.orderId||null});go("index.html?page=S01&s01_r2=1");}]
      ]);return;
    }
    if(kind==="change"){
      showChoice("换仓申请","仓位迁移、剩余租金和押金需要人工确认；本入口不会修改现有租约。",[
        ["咨询换仓方案",()=>{save("mk_advisor_context_v3",{service_source:"h01_change_request",store_id:t.storeId||null,order_id:t.orderId||null});go("index.html?page=BOOKING&mode=advisor");}]
      ]);return;
    }
  }
  el.addEventListener("click",e=>{const b=e.target.closest("[data-h01]");if(!b)return;e.preventDefault();act(b.dataset.h01)});
  window.addEventListener("pageshow",render);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)render()});
  // Use the saved deadline, never decrement a locally stored counter.
  window.setInterval(()=>{if(model?.task?.key==="pending")updateCountdown()},1000);
  render();
})();
