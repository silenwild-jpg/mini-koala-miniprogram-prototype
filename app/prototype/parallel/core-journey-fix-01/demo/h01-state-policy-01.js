(function(root,factory){const api=factory();root.H01_STATE_POLICY=api;if(typeof module==="object"&&module.exports)module.exports=api;})(typeof window==="object"?window:globalThis,function PolicyFactory(){
  "use strict";
  const amount=n=>Number.isFinite(Number(n))?"¥"+Math.round(Number(n)).toLocaleString("zh-CN"):"待确认";
  const date=d=>typeof d==="string"&&/^\d{4}-\d\d-\d\d$/.test(d)?d:"待确认";
  const dayDiff=(future,now)=>Math.ceil((Date.parse(future+"T00:00:00Z")-now)/(86400000));
  function derive(state,core,nowMs=Date.now()){
    const s=state||{}, all=Array.isArray(s.orders)?s.orders:[], services=s.services||{}, stores=core?.fixture?.stores||[], units=core?.fixture?.units||[];
    const storeName=id=>(stores.find(x=>x.id===id)||{}).name||"已选门店";
    const unitName=ids=>{const u=units.find(x=>x.id===(ids||[])[0]);return u?((u.code||"仓位")+" · "+u.volume+"m³"):"";};
    const row=(key,title,badge,sub,facts,primary,secondary,score,order)=>({key,title,badge,sub,facts,primary,secondary,score,orderId:order?.id||null,storeId:order?.store_id||null,layout:"task"});
    const records=[];
    for(const o of all){
      if(!o||!o.id)continue;
      const name=storeName(o.store_id),desc=[name,unitName(o.unit_ids)].filter(Boolean).join(" · ");
      if(o.status==="pending"){
        if(o.expiresAt&&nowMs>=o.expiresAt){
          records.push(row("expired","订单已超时","需重新下单",desc,[["已过期","支付状态"]],["重新选择仓位","restart"],["查看原订单","order"],17,o));
        }else{
          const pending=row("pending","订单待支付","待完成",desc,[[amount(o.payable),"首次应付"],["--:--:--","支付剩余时间"]],["继续支付","order"],["费用明细","order"],95,o);
          pending.expiresAt=Number.isFinite(o.expiresAt)&&o.expiresAt>0?o.expiresAt:null;
          records.push(pending);
        }
        continue;
      }
      if(o.status==="expired"){
        records.push(row("expired","订单已超时","需重新下单",desc,[["已过期","支付状态"]],["重新选择仓位","restart"],["查看原订单","order"],17,o));
        continue;
      }
      if(["payment_failed","cancelled","invalidated"].includes(o.status)){
        records.push(row(o.status,o.status==="payment_failed"?"支付失败":"订单需重新确认","未完成",desc,[[{"payment_failed":"原仓位已释放","cancelled":"已取消","invalidated":"报价已失效"}[o.status],"订单状态"]],o.status==="payment_failed"?["重新选择仓位","restart"]:["查看订单","order"],["查看原订单","order"],17,o));
        continue;
      }
      if(o.status!=="paid_simulated")continue;
      const srv=services[o.id]||{};
      let life=null;
      try{life=core&&typeof core.lifecycleView==="function"?core.lifecycleView(o.id):null;}catch(_){}
      const exit=life?.exit||srv.lifecycle_v2?.exit||srv.exit||null;
      const deposit=String(life?.deposit_status||srv.lifecycle_v2?.deposit||srv.deposit||"").toUpperCase();
      const status=life?.lease_status||((srv.useStatus==="active")?"active":"upcoming");
      const identity=life?.identity_status||srv.identity||"pending";
      const end=life?.end_date||null;
      const renew=Array.isArray(life?.renewal_requests)?life.renewal_requests:[];
      if(["REFUND_PENDING","PROCESSING","REFUND_PROCESSING","REFUND_FAILED"].includes(deposit)){
        records.push(row("refund","押金处理中","待完成",name,[[deposit==="REFUND_FAILED"?"处理异常":"待处理","押金状态"],["以订单记录为准","办理进度"]],["查看押金进度","deposit"],["查看订单","order"],91,o));
      } else if(status==="returning"||["REQUESTED","WAITING_INSPECTION","INSPECTION_FAILED","awaiting_inspection","inspection_failed"].includes(exit?.status)){
        records.push(row("returning","退租处理中","办理中",desc,[[exit?.status==="INSPECTION_FAILED"||exit?.status==="inspection_failed"?"需重新验仓":"待确认","验仓进度"]],["查看退租进度","exit"],["一键开锁","unlock"],90,o));
       } else if(status==="expired"){
        records.push(row("lease_expired","租期已到期","待办理",desc,[[end?date(end):"待确认","租期截止"],["待验仓","押金办理"]],["办理退租及退押金","exit"],["查看押金进度","deposit"],89,o));
      } else if(status==="ended"){
        // Completed rentals appear in order history; pending refunds are handled above.
      } else if(identity!=="verified"){
        records.push(row("identity","入仓前需完成验证","待办理",desc,[[date(o.start_date),"计划起租"],["未完成","身份验证"]],["完成身份验证","verify"],["一键开锁","unlock"],87,o));
      } else if(renew.some(x=>x.status==="QUOTE_READY"||x.status==="QUOTE_PENDING")){
        records.push(row("renewal","续租申请处理中","办理中",desc,[[end?date(end):"待确认","当前租期至"],["待确认","续租报价"]],["一键开锁","unlock"],["查看续租进度","renew"],86,o));
      } else if(status==="upcoming"){
        records.push(row("upcoming","入仓准备","已支付",desc,[[date(o.start_date),"计划起租"],["起租日生效","入仓权限"]],["一键开锁","unlock"],["门店导航","navigate"],77,o));
      } else if(end&&Number.isFinite(dayDiff(end,nowMs))&&dayDiff(end,nowMs)<=30&&dayDiff(end,nowMs)>=0){
        const n=dayDiff(end,nowMs);
        const r=row("expiring","租期即将到期","需关注",desc,[[date(end),"租期至"],[String(n)+"天","剩余租期"]],["一键开锁","unlock"],["办理续租","renew"],82,o);r.layout="service";records.push(r);
      } else {
        const r=row("active","我的在租仓位","租赁中",desc,[[end?date(end):"待确认","租期至"],[(stores.find(x=>x.id===o.store_id)||{}).access_hours||"24小时","存取时间"]],["一键开锁","unlock"],["门店导航","navigate"],20,o);r.layout="service";records.push(r);
      }
    }
    const req=s.requirement||{},selected=Array.isArray(s.selected)?s.selected:[];
    const selectedFromOrder=selected.length>0&&all.some(o=>Array.isArray(o.unit_ids)&&o.unit_ids.length===selected.length&&o.unit_ids.every(id=>selected.includes(id))&&["paid_simulated","pending","cancelled","expired","invalidated","payment_failed"].includes(o.status));
    const staleRequirement=all.some(o=>o.status==="paid_simulated");
    if(selected.length&&!selectedFromOrder){
      records.push({key:"selected",title:"继续完成选仓",badge:"已选仓位",sub:storeName(s.storeId),facts:[[req.capacity_m3?req.capacity_m3+"m³":"待确认","需要容量"],[req.term_confirmed?req.term_months+"个月":"待选择","租期"]],primary:["继续下单","recommend"],secondary:["查看门店","nearby"],score:12,layout:"task",orderId:null,storeId:s.storeId||null});
    }else if(Number(req.capacity_m3)>0&&!staleRequirement&&!selectedFromOrder){
      records.push({key:"estimated",title:"继续查看仓位",badge:"已保存需求",sub:"已估算用仓需求",facts:[[req.capacity_m3+"m³","预计容量"],[req.term_confirmed?req.term_months+"个月":"待选择","租期"]],primary:["查看推荐仓位","recommend"],secondary:["修改需求","estimate"],score:11,layout:"task",orderId:null,storeId:null});
    }
    const leads=[...(Array.isArray(s.leads)?s.leads:[]),...(Array.isArray(s.enterpriseLeads)?s.enterpriseLeads:[])];
    const validLead=leads.filter(x=>x&&x.status!=="withdrawn").at(-1);
    if(validLead)records.push({key:"booking",title:"已保存用仓预约",badge:"待核实",sub:"预约已留存，受理情况以实际记录为准",facts:[[validLead.capacity_m3?validLead.capacity_m3+"m³":"待确认","预计容量"]],primary:["查看预约","booking"],secondary:["浏览门店","browse"],score:30,layout:"task",orderId:null,storeId:null});
    records.sort((a,b)=>b.score-a.score);
    const main=records[0]||{key:"new",layout:"marketing",title:"",badge:"",sub:"",facts:[],primary:null,secondary:null,score:0,orderId:null,storeId:null};
    const paid=all.filter(o=>o?.status==="paid_simulated");
    const activeOrders=records.filter(x=>x.key==="active"||x.key==="expiring");
    return {...main,otherActiveCount:activeOrders.filter(x=>x.orderId!==main.orderId).length,hasRental:activeOrders.length>0,hasOrder:all.length>0,allowTab:main.key==="active"||main.key==="expiring",isMarketing:main.key==="new"};
  }

  // Display-only eligibility; final BLE authorization must be verified server-side.
  function accessDecision(state,core,orderId){
    const order=(state?.orders||[]).find(o=>o.id===orderId);
    if(!order||order.status!=="paid_simulated")return {allowed:false,reason:"not_paid"};
    let view;try{view=core?.lifecycleView?.(order.id);}catch(_){return {allowed:false,reason:"not_available"};}
    if(view.identity_status!=="verified")return {allowed:false,reason:"identity"};
    if(view.lease_status==="upcoming")return {allowed:false,reason:"before_start",startDate:order.start_date};
    if(!view.access_allowed)return {allowed:false,reason:"lease_inactive",status:view.lease_status};
    return {allowed:true,reason:"eligible",orderId:order.id,storeId:order.store_id,unitIds:order.unit_ids||[]};
  }
  return {derive,accessDecision};
});
