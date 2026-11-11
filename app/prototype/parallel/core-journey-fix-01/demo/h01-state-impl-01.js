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
  '<div class="h01-flow-content" id="h01FlowContent"><div class="h01-flow-kicker" id="h01FlowKicker">当前任务</div><article class="h01-flow-task" id="h01FlowTask">'+
  '<div class="h01-flow-title"><strong id="h01FlowTitle"></strong><span class="h01-flow-badge" id="h01FlowBadge"></span></div>'+
  '<div class="h01-flow-store" id="h01FlowStore"></div><p class="h01-flow-sub" id="h01FlowSub"></p>'+
  '<div class="h01-flow-facts" id="h01FlowFacts"></div><div class="h01-flow-buttons">'+
  '<button type="button" class="h01-flow-primary" data-h01="primary" id="h01FlowPrimary"></button>'+
  '<button type="button" class="h01-flow-secondary" data-h01="secondary" id="h01FlowSecondary"></button></div></article>'+
  '<section class="h01-flow-services" id="h01FlowServices"><h2>仓位服务</h2><div class="h01-flow-service-grid">'+
  '<button type="button" data-h01="renew">续租</button><button type="button" data-h01="add">加租仓位</button><button type="button" data-h01="change">换仓申请</button></div></section>'+
  '<div class="h01-flow-other" id="h01FlowOther"><button type="button" data-h01="allorders">我的订单 <span>›</span></button><button type="button" data-h01="support">存取与门店帮助 <span>›</span></button></div>'+
  '<button type="button" class="h01-flow-browse" id="h01FlowBrowse" data-h01="browse">浏览其他门店 ›</button>'+
  '<p class="h01-flow-note" id="h01FlowNote"></p></div>';
  root.insertBefore(el,root.firstChild);
  const one=s=>el.querySelector(s);
  function getState(){
    const saved=read(SOURCE);
    let core=null;
    try{core=window.SIM_CORE.create(saved?{state:saved}:{});}catch(_){}
    const state=core?core.state():(saved||{});
    return {state,task:window.H01_STATE_POLICY.derive(state,core)};
  }
  function render(){
    const next=getState();model=next;const t=next.task,s=next.state;
    const pref=read(PREF);
    if(pref&&pref.key===t.key&&pref.orderId===t.orderId&&pref.view==="market")view="market";
    else if(pref&&(pref.key!==t.key||pref.orderId!==t.orderId)){view="business";save(PREF,null);}
    if(t.isMarketing)view="market";
    const business=!t.isMarketing&&view!=="market";
    document.body.classList.add("h01-state-adapter-ready");
    document.body.classList.toggle("h01-flow-business",business);
    document.body.classList.toggle("h01-flow-marketing",!business);
    one("#h01FlowHead").hidden=!business;
    one("#h01FlowContent").hidden=!business;
    one("#h01FlowReturn").hidden=business||t.isMarketing||t.allowTab;
    one("#h01FlowTabs").hidden=!t.allowTab;
    const tabs=one("#h01FlowTabs").querySelectorAll("button");
    tabs[0].setAttribute("aria-selected",business?"true":"false");
    tabs[1].setAttribute("aria-selected",business?"false":"true");
    one("#h01FlowCity").textContent=(s.city||"选择城市")+" ⌄";
    if(!business)return;
    one("#h01FlowKicker").textContent=t.layout==="service"?"我的仓位":"当前待办";
    one("#h01FlowTitle").textContent=t.title;
    one("#h01FlowBadge").textContent=t.badge||"";
    one("#h01FlowStore").textContent=t.sub||"";
    const actualStore=t.storeId&&window.SIM_FIXTURES?.stores?.find(x=>x.id===t.storeId);
    if(actualStore&&actualStore.name)one("#h01FlowStore").textContent=actualStore.name;
    one("#h01FlowSub").textContent=t.sub||"";
    one("#h01FlowTask").dataset.urgent=["pending","expired","payment_failed","invalidated","refund","returning","identity","expiring"].includes(t.key)?"true":"false";
    const facts=one("#h01FlowFacts");facts.replaceChildren();
    (t.facts||[]).slice(0,3).forEach(([value,label])=>{const box=document.createElement("div");box.className="h01-flow-fact";const b=document.createElement("b");b.textContent=value;const small=document.createElement("small");small.textContent=label;box.append(b,small);facts.append(box)});
    one("#h01FlowPrimary").textContent=t.primary?.[0]||"查看订单";
    one("#h01FlowSecondary").textContent=t.secondary?.[0]||"浏览门店";
    const service=t.key==="active"||t.key==="expiring";
    one("#h01FlowServices").hidden=!service||t.key==="expiring";
    one("#h01FlowOther").hidden=t.layout!=="service"&&!(t.otherActiveCount>0);
    one("#h01FlowBrowse").hidden=t.allowTab;
    one("#h01FlowNote").textContent=t.otherActiveCount>0?"另有 "+t.otherActiveCount+" 间在租仓位，请在订单中查看。":(t.key==="identity"?"请先完成验证，开门权限按订单资格判断。":"");
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
    close.addEventListener("click",()=>cover.remove());panel.append(close);cover.append(panel);
    cover.addEventListener("click",e=>{if(e.target===cover)cover.remove()});
    document.getElementById("phone").append(cover);close.focus();
  }
  function act(kind){
    const t=model?.task;if(!t)return;
    if(kind==="business"){setView("business");return}
    if(kind==="browse"){setView("market");return}
    if(kind==="city"){const btn=document.querySelector(".hero .search");if(btn){setView("market");btn.click();}return}
    if(kind==="primary"||kind==="secondary"){act(t[kind]?.[1]||"order");return}
    if(kind==="order"){go(orderUrl());return}
    if(kind==="allorders"){go("index.html?page=M01");return}
    if(kind==="booking"){go("account.html?view=needs");return}
    if(kind==="nearby"){go("index.html?page=S01&s01_r2=1");return}
    if(kind==="recommend"){go("index.html?page=S5");return}
    if(kind==="estimate"){go("cap.html");return}
    if(kind==="navigate"){go(storeUrl());return}
    if(kind==="support"){go(t.orderId?orderUrl():"index.html?page=M01");return}
    if(kind==="renew"){go(t.orderId?orderUrl()+"&intent=renew":"index.html?page=M01");return}
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
  render();
})();
