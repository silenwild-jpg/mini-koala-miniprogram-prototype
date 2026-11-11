(function(root){
  'use strict';
  // Customer-facing M01 is rendered in the central demo. No separate account data store.
  var currentView='home';
  var allowed={home:1,orders:1,booking:1,quotes:1,recent:1,favorites:1,coupons:1,services:1,messages:1,account:1,help:1};
  var names={orders:'我的订单',booking:'预约用仓',quotes:'我的报价',recent:'最近找仓',favorites:'我的收藏',coupons:'我的优惠券',services:'租后服务',messages:'消息',account:'个人信息',help:'帮助与保障'};
  function setView(next){currentView=allowed[next]?next:'home';}
  function safeList(value){return Array.isArray(value)?value:[];}
  function readFavorites(){
    try{var saved=JSON.parse(sessionStorage.getItem('mk_visual_align_ui_v1')||'{}');
      return {stores:safeList(saved.storeFavorites),units:safeList(saved.favorites)};
    }catch(_){return {stores:[],units:[]};}
  }
  function orderLife(o,ctx){
    if(o.status!=='paid_simulated')return null;
    try{return ctx.getLife(o.id);}catch(_){return null;}
  }
  function sortedService(orders,ctx){
    var ranked=safeList(orders).map(function(o){
      var life=orderLife(o,ctx),rank=0;
      if(life){
        rank=life.lease_status==='returning'?100:life.lease_status==='active'?90:life.lease_status==='upcoming'?80:life.lease_status==='expired'?25:15;
        if(life.identity_status!=='verified'&&life.lease_status!=='returning'&&life.lease_status!=='ended')rank=95;
        if(life.lease_status==='active'&&life.end_date){
          var days=Math.ceil((Date.parse(life.end_date+'T00:00:00')-Date.now())/86400000);
          if(days>=0&&days<=30)rank=96;
        }
      }else if(o.status==='pending')rank=75;
      else if(o.status==='payment_failed')rank=70;
      else if(o.status==='payment_cancelled')rank=60;
      return {order:o,life:life,rank:rank};
    }).sort(function(a,b){return b.rank-a.rank;});
    return ranked.length?ranked[0]:null;
  }
  function badge(text,tone){return '<span class="m01-status '+(tone||'')+'">'+text+'</span>';}
  function row(label,detail,action,value,ctx,count){
    return '<button class="m01-row" type="button" data-action="'+action+'" data-value="'+ctx.esc(value||'')+'"><span class="m01-row-main"><strong>'+label+'</strong>'+(detail?'<small>'+detail+'</small>':'')+'</span>'+(count?'<span class="m01-count">'+ctx.esc(String(count))+'</span>':'')+'<span class="m01-chevron" aria-hidden="true">›</span></button>';
  }
  function block(title,content){
    return '<section class="m01-block"><h2>'+title+'</h2>'+content+'</section>';
  }
  function primaryFromOrder(entry,ctx){
    var o=entry.order,l=entry.life,slabel='当前订单',title=ctx.storeName(o),info=ctx.unitName(o),cta='查看订单',act='m01Order',tone='';
    if(o.status==='pending'){slabel='待支付';cta='继续支付';act='m01ContinuePay';tone='attention';info+=' · '+o.term_months+'个月 · 应付'+ctx.money(o.payable);}
    else if(o.status==='payment_failed'){slabel='支付未完成';cta='重新查看可用仓位';act='m01Recover';tone='attention';info+=' · 请重新核对仓位和费用';}
    else if(o.status==='payment_cancelled'){slabel='支付已取消';cta='查看订单';tone='attention';info+=' · 请核对订单状态';}
    else if(l){
      var req=safeList(l.renewal_requests).find(function(x){return x.status==='QUOTE_PENDING'||x.status==='QUOTE_READY';});
      if(l.lease_status==='returning'){slabel='退租处理中';cta='查看退租进度';act='m01Service';}
      else if(l.lease_status==='ended'){slabel='已结束';cta='查看历史订单';}
      else if(l.identity_status!=='verified'){slabel='待身份验证';cta='完成身份验证';act='m01Identity';tone='attention';}
      else if(l.lease_status==='upcoming'){slabel='待起租';cta='查看入仓准备';act='m01Access';}
      else if(l.lease_status==='expired'){slabel='已到期';cta='查看订单';tone='attention';}
      else {slabel='正在用仓';cta='查看我的仓位';}
      if(req&&l.lease_status!=='returning'&&l.lease_status!=='ended'){slabel=req.status==='QUOTE_READY'?'续租报价待确认':'续租申请处理中';cta='查看续租进度';act='m01Service';}
      info+=' · '+l.total_months+'个月'+(l.end_date?' · 至'+l.end_date:'');
    }
    var value=act==='m01Service'?o.id+'|'+(l&&l.lease_status==='returning'?'EX01':'RN01'):o.id;
    return '<div class="m01-primary-top">'+badge(slabel,tone)+'<span class="m01-primary-context">用仓服务</span></div>'+
      '<strong class="m01-primary-title">'+ctx.esc(title)+'</strong><p class="m01-primary-meta">'+ctx.esc(info)+'</p>'+
      '<div class="m01-primary-actions">'+ctx.button(act,cta,value,'m01-primary-button')+'</div>';
  }
  function primary(ctx){
    var s=ctx.state,entry=sortedService(ctx.orders,ctx);
    if(entry&&entry.rank>=60)return primaryFromOrder(entry,ctx);
    var quote=s.quote;
    if(quote&&quote.store_id&&quote.unit_ids&&quote.unit_ids.length){
      var valid=!!(quote.expiresAt&&quote.expiresAt>Date.now());
      return '<div class="m01-primary-top">'+badge(valid?'有待确认方案':'方案需重新核价')+'</div>'+
        '<strong class="m01-primary-title">'+ctx.esc(ctx.storeName(quote))+'</strong>'+
        '<p class="m01-primary-meta">'+ctx.esc(quote.term_months+'个月 · '+quote.unit_ids.map(function(id){return ctx.unitName({unit_ids:[id]});}).join('、'))+'</p>'+
        ctx.button('m01Resume','继续选仓','', 'm01-primary-button');
    }
    var bookings=safeList(s.leads).filter(function(x){return x.type==='SIMULATED_BOOKING_LEAD'&&x.status!=='withdrawn';});
    if(bookings.length){
      var lead=bookings[bookings.length-1];
      return '<div class="m01-primary-top">'+badge('预约需求已记录')+'</div><strong class="m01-primary-title">预约用仓</strong>'+
        '<p class="m01-primary-meta">'+ctx.esc(lead.address||'已填写用仓位置')+'</p>'+
        ctx.button('m01View','查看预约记录','booking','m01-primary-button');
    }
    var req=s.requirement||{};
    if(req.capacity_m3){
      return '<div class="m01-primary-top">'+badge('继续找仓')+'</div><strong class="m01-primary-title">'+ctx.esc(req.capacity_m3+'m³')+'</strong>'+
        '<p class="m01-primary-meta">'+ctx.esc(req.term_confirmed?req.term_months+'个月 · '+s.city:'租期待确认 · '+s.city)+'</p>'+
        ctx.button('m01Resume','继续找仓','','m01-primary-button');
    }
    if(entry)return primaryFromOrder(entry,ctx);
    return '<div class="m01-primary-top">'+badge('尚未用仓')+'</div><strong class="m01-primary-title">就近找个合适的仓位</strong>'+
      '<p class="m01-primary-meta">从附近门店开始，或先估算所需空间</p>'+
      ctx.button('go','找附近门店','S01','m01-primary-button');
  }
  function renderHome(ctx){
    var s=ctx.state,bookings=safeList(s.leads).filter(function(x){return x.type==='SIMULATED_BOOKING_LEAD'&&x.status!=='withdrawn';});
    var fav=readFavorites(),orders=safeList(ctx.orders),req=s.requirement||{},phone=s.account&&s.account.phone?String(s.account.phone):'';
    var profile='<section class="m01-profile"><span class="m01-avatar" aria-hidden="true">我</span><div class="m01-profile-details"><strong>'+(phone?'我的迷你考拉':'欢迎使用迷你考拉')+'</strong><p>'+(phone?ctx.esc(phone.replace(/(\d{3})\d{4}(\d{4})/,'$1****$2')):'可直接浏览门店，订单操作按需验证')+'</p></div>'+
       ctx.button('m01View','个人信息','account','m01-profile-action')+'</section>';
    var records=block('我的记录',
      row('预约用仓',bookings.length?bookings.length+'条记录':'查看预约需求','m01View','booking',ctx)+
      row('我的报价',s.quote?'查看当前方案':'暂无保存方案','m01View','quotes',ctx)+
      row('我的订单',orders.length?orders.length+'笔订单':'查看订单记录','m01View','orders',ctx)+
      row('最近找仓',req.capacity_m3?req.capacity_m3+'m³'+(req.term_confirmed?' · '+req.term_months+'个月':' · 租期待确认'):'恢复找仓需求','m01View','recent',ctx));
    var service=block('服务与权益',
      row('我的收藏','门店和仓位','m01View','favorites',ctx,fav.stores.length+fav.units.length)+
      row('我的优惠券','查看领取与使用状态','m01View','coupons',ctx,safeList(s.coupons).filter(function(x){return x.status==='CLAIMED'||x.status==='APPLIED';}).length)+
      row('租后服务','续租、退租、押金和发票','m01View','services',ctx)+
      row('消息','查看业务通知','m01View','messages',ctx,safeList(s.messages).length));
    var help=block('更多服务',
      row('联系客服与帮助','','m01View','help',ctx)+
      row('个人信息','','m01View','account',ctx));
    return profile+'<section class="m01-task" aria-label="当前服务">'+primary(ctx)+'</section>'+records+service+help;
  }
  function empty(text){return '<p class="m01-empty">'+text+'</p>';}
  function serviceRows(ctx){
    var paid=safeList(ctx.orders).filter(function(o){return o.status==='paid_simulated';});
    if(!paid.length)return empty('暂无可办理租后服务的订单');
    return paid.map(function(o){
      var l=orderLife(o,ctx),n=ctx.esc(ctx.storeName(o)),id=ctx.esc(o.id);
      var main='<div class="m01-service-order"><h3>'+n+'</h3><p>'+ctx.esc(ctx.unitName(o))+'</p></div>';
      var actions='<div class="m01-service-actions">'+ctx.button('m01Order','订单详情',o.id,'m01-minor-button');
      if(l&&['active','upcoming'].includes(l.lease_status))actions+=ctx.button('m01Service','续租',o.id+'|RN01','m01-minor-button');
      if(l&&['active','returning'].includes(l.lease_status))actions+=ctx.button('m01Service','退租进度',o.id+'|EX01','m01-minor-button');
      if(l)actions+=ctx.button('m01Service','押金',o.id+'|DP01','m01-minor-button');
      if(l)actions+=ctx.button('m01Service','发票',o.id+'|IV01','m01-minor-button');actions+='</div>';
      return '<article class="m01-service-item" data-order-id="'+id+'">'+main+actions+'</article>';
    }).join('');
  }
  function listView(ctx){
    var s=ctx.state,view=currentView,fav=readFavorites(),orders=safeList(ctx.orders);
    if(view==='orders')return orders.length?'<div class="m01-order-list">'+orders.map(ctx.orderBrief).join('')+'</div>':empty('暂无订单。可以先查看附近门店。');
    if(view==='booking'){
      var leads=safeList(s.leads).filter(function(x){return x.type==='SIMULATED_BOOKING_LEAD';});
      return leads.length?leads.slice().reverse().map(function(x){return '<article class="m01-info-item"><strong>预约用仓</strong>'+badge(x.status==='withdrawn'?'已撤回':'需求已记录')+
        '<p>'+ctx.esc(x.address||'地址待补充')+'</p><small>'+ctx.esc((x.capacity_m3||'容量待确认')+(x.capacity_m3?'m³':'')+' · '+(x.term_months?x.term_months+'个月':'租期待确认'))+'</small></article>';}).join('')+
        '<a class="m01-text-link" href="account.html?view=needs">管理已提交需求</a>':empty('暂无预约需求');
    }
    if(view==='quotes'){
      var q=s.quote;
      return q&&q.unit_ids&&q.unit_ids.length?'<article class="m01-info-item"><strong>'+ctx.esc(ctx.storeName(q))+'</strong>'+badge(q.expiresAt>Date.now()?'待确认':'需重新核价')+
        '<p>'+ctx.esc(q.term_months+'个月 · '+q.unit_ids.map(function(id){return ctx.unitName({unit_ids:[id]});}).join('、'))+'</p>'+
        '<div class="m01-service-actions">'+ctx.button('m01Resume','重新核对方案','','m01-minor-button')+'</div></article>':empty('暂无有效的已保存报价。可以返回找仓继续选择。');
    }
    if(view==='recent'){
      var r=s.requirement||{};return r.capacity_m3?'<article class="m01-info-item"><strong>'+ctx.esc(r.capacity_m3+'m³')+'</strong>'+badge(r.term_confirmed?'需求已确认':'待补齐租期')+
        '<p>'+ctx.esc(s.city+' · '+(r.term_confirmed?r.term_months+'个月':'租期待选择'))+'</p>'+
        '<div class="m01-service-actions">'+ctx.button('m01Resume','继续找仓','','m01-minor-button')+'</div></article>':empty('尚无已保存找仓需求');
    }
    if(view==='favorites'){
      var items=fav.stores.map(function(id){return {id:id,name:ctx.storeName({store_id:id})};}).concat(fav.units.map(function(id){return {id:null,name:ctx.unitName({unit_ids:[id]})};}));
      return items.length?items.map(function(x){return '<article class="m01-info-item"><strong>'+ctx.esc(x.name)+'</strong>'+(x.id?'<div class="m01-service-actions">'+ctx.button('m01Store','查看门店',x.id,'m01-minor-button')+'</div>':'')+'</article>';}).join(''):empty('还没有收藏门店或仓位');
    }
    if(view==='coupons')return safeList(s.coupons).length?s.coupons.map(function(c){return '<article class="m01-info-item"><strong>'+ctx.esc(c.name||'优惠权益')+'</strong>'+badge(ctx.esc(({CLAIMED:'可使用',APPLIED:'已选择',REDEEMED:'已使用',LOCKED:'已锁定',INVALID:'不可用'})[c.status]||c.status))+'</article>';}).join(''):empty('暂无可查看的优惠券');
    if(view==='services')return serviceRows(ctx);
    if(view==='messages')return safeList(s.messages).length?s.messages.slice().reverse().map(function(m){return '<article class="m01-info-item"><strong>'+ctx.esc(m.title||'消息')+'</strong><p>'+ctx.esc(m.text||'')+'</p>'+(m.order_id?ctx.button('m01Order','关联订单',m.order_id,'m01-minor-button'):'')+'</article>';}).join(''):empty('暂无新消息');
    if(view==='account'){
      var phone=s.account&&s.account.phone?String(s.account.phone):'';
      return '<article class="m01-info-item"><strong>手机号</strong><p>'+(phone?ctx.esc(phone.replace(/(\d{3})\d{4}(\d{4})/,'$1****$2')):'未验证')+'</p>'+
        '<p class="m01-secondary">浏览服务无需登录；正式报价及下单时按统一规则验证。</p>'+
        '<a class="m01-text-link" href="account.html">查看账户与联系方式</a></article>';
    }
    if(view==='help')return '<div class="m01-help-links"><a href="account.html?view=support">联系客服</a><a href="account.html?view=brand">品牌与保障</a>'+
      '<a href="account.html?view=referral">推荐有礼</a></div>';
    return '';
  }
  function render(ctx){
    var main=currentView==='home'?renderHome(ctx):
      '<section class="m01-subhead">'+ctx.button('m01View','‹ 返回','home','m01-back')+'<h2>'+names[currentView]+'</h2></section>'+
      '<section class="m01-subcontent">'+listView(ctx)+'</section>';
    return '<div class="view-title view-title-primary"><strong>我的</strong></div><div class="mk-orders m01-surface">'+main+'</div>';
  }
  root.M01_REBASELINE_01={render:render,setView:setView,getView:function(){return currentView;}};
})(window);