(function(root){
  'use strict';
  // Customer-facing M01 is rendered in the central demo. No separate account data store.
  var currentView='home';
  var allowed={home:1,assets:1,orders:1,booking:1,quotes:1,recent:1,favorites:1,coupons:1,services:1,messages:1,account:1,help:1};
  var names={assets:'我的仓位',orders:'我的订单',booking:'预约与需求',quotes:'报价方案',recent:'最近找仓',favorites:'我的收藏',coupons:'我的优惠券',services:'租后服务',messages:'消息',account:'个人信息',help:'帮助与保障'};
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
  function assetState(o,ctx){
    var life=orderLife(o,ctx);
    if(!life||!['active','upcoming','returning','expired'].includes(life.lease_status))return null;
    var status={upcoming:'待起租',active:'租用中',returning:'退租处理中',expired:'租期已到期'}[life.lease_status]||'查看订单';
    var priority={active:4,upcoming:3,returning:2,expired:1}[life.lease_status]||0;
    if(life.lease_status==='active'&&life.end_date){
      var localDay=new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10);
      var days=Math.round((Date.parse(life.end_date+'T00:00:00Z')-Date.parse(localDay+'T00:00:00Z'))/86400000);
      if(days>=0&&days<=30){status='即将到期';priority=5;}
    }
    return {order:o,life:life,status:status,priority:priority};
  }
  function activeAssets(ctx){
    return safeList(ctx.orders).map(function(o){return assetState(o,ctx);}).filter(Boolean)
      .sort(function(a,b){return b.priority-a.priority;});
  }
  function plainUnitSummary(o,ctx){
    var details=typeof ctx.unitFacts==='function'?safeList(ctx.unitFacts(o)):[];
    if(!details.length)return ctx.unitName(o);
    return details.map(function(u){
      var name=String(u.code||u.name||'仓位');
      var volume=Number(u.volume);
      return name+(Number.isFinite(volume)&&volume>0?' · '+volume+'m³':'');
    }).join('、');
  }
  function unitSummary(o,ctx){return ctx.esc(plainUnitSummary(o,ctx));}
  function assetRow(entry,ctx){
    var o=entry.order,l=entry.life;
    var status=ctx.esc(entry.status),details=unitSummary(o,ctx);
    var when=l.lease_status==='upcoming'?'起租 '+ctx.esc(l.start_date||o.start_date||'待确认'):
      (l.end_date?'至 '+ctx.esc(l.end_date):'租期查看订单');
    return '<button type="button" class="m01-asset-row" data-action="m01Order" data-value="'+ctx.esc(o.id)+'" aria-label="'+ctx.esc(ctx.storeName(o)+'，'+plainUnitSummary(o,ctx)+'，'+entry.status+'，查看订单')+'">'+
      '<span class="m01-asset-main"><span class="m01-asset-head"><strong>'+ctx.esc(ctx.storeName(o))+'</strong><em>'+status+'</em></span>'+
      '<span class="m01-asset-units">'+details+'</span>'+
      '<span class="m01-asset-term">'+ctx.esc(l.total_months)+'个月 · '+when+'</span></span><span class="m01-chevron" aria-hidden="true">›</span></button>';
  }
  function leadRecords(s){
    return safeList(s.leads).concat(safeList(s.enterpriseLeads)).filter(function(x){return x&&x.id;});
  }
  function leadName(x){return x.type==='ENTERPRISE_REQUIREMENT'?'企业用仓':
      x.type==='ADVISOR_CONSULTATION'?'顾问咨询':'预约用仓';}
  function demandInfo(s){
    var r=s.requirement||{},cap=Number(r.capacity_m3);
    if(!(Number.isFinite(cap)&&cap>0))return {has:false,active:false};
    var orders=safeList(s.orders),selection=safeList(s.selected);
    var independentSelection=selection.length>0&&!orders.some(function(o){
      var ids=safeList(o.unit_ids);return ids.length===selection.length&&ids.every(function(id){return selection.includes(id);});
    });
    // The core stores one latest requirement; matching a completed checkout is not a new intent.
    // A current quote, an unsubmitted selection or a first-time demand is evidence of active intent.
    var hasQuote=!!(s.quote&&s.quote.expiresAt>Date.now());
    var active=!orders.length||independentSelection||hasQuote;
    return {has:true,active:active,cap:cap,term:r.term_confirmed?r.term_months:null,city:s.city||'北京'};
  }
  function sortedService(orders,ctx){
    var ranked=safeList(orders).map(function(o){
      var life=orderLife(o,ctx),rank=0,ending=false;
      if(life){
        rank=life.lease_status==='returning'?100:life.lease_status==='active'?90:life.lease_status==='upcoming'?80:life.lease_status==='expired'?88:0;
        if(life.lease_status==='ended'&&life.deposit_status==='REFUND_PENDING')rank=85;
        if(life.identity_status!=='verified'&&['active','upcoming'].includes(life.lease_status))rank=95;
        if(life.lease_status==='active'&&life.end_date){
          var localDay=new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10);
          var days=Math.round((Date.parse(life.end_date+'T00:00:00Z')-Date.parse(localDay+'T00:00:00Z'))/86400000);
          if(days>=0&&days<=30){rank=96;ending=true;}
        }
      }else if(o.status==='pending')rank=75;
      else if(o.status==='payment_failed')rank=70;
      else if(o.status==='payment_cancelled')rank=60;
      return {order:o,life:life,rank:rank,ending:ending};
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
      else if(l.lease_status==='ended'&&l.deposit_status==='REFUND_PENDING'){slabel='押金处理中';cta='查看押金进度';act='m01Service';}
      else if(l.lease_status==='ended'){slabel='已结束';cta='查看历史订单';}
      else if(l.identity_status!=='verified'){slabel='待身份验证';cta='完成身份验证';act='m01Identity';tone='attention';}
      else if(l.lease_status==='upcoming'){slabel='待起租';cta='查看入仓准备';act='m01Access';}
      else if(l.lease_status==='expired'){slabel='已到期';cta='查看订单';tone='attention';}
      else if(entry.ending){slabel='即将到期';cta=l.total_months<60?'查看续租安排':'查看订单';if(l.total_months<60)act='m01Service';}
      else {slabel='正在用仓';cta='查看我的仓位';}
      if(req&&l.lease_status!=='returning'&&l.lease_status!=='ended'){slabel=req.status==='QUOTE_READY'?'续租报价待确认':'续租申请处理中';cta='查看续租进度';act='m01Service';}
      info+=' · '+l.total_months+'个月'+(l.end_date?' · 至'+l.end_date:'');
    }
    var target=l&&l.lease_status==='returning'?'EX01':l&&l.lease_status==='ended'&&l.deposit_status==='REFUND_PENDING'?'DP01':'RN01';
    var value=act==='m01Service'?o.id+'|'+target:o.id;
    return '<div class="m01-primary-top">'+badge(slabel,tone)+'<span class="m01-primary-context">用仓服务</span></div>'+
      '<strong class="m01-primary-title">'+ctx.esc(title)+'</strong><p class="m01-primary-meta">'+ctx.esc(info)+'</p>'+
      '<div class="m01-primary-actions">'+ctx.button(act,cta,value,'m01-primary-button')+'</div>';
  }

  // Shared H01/M01 selection: a single business priority queue, distinct page presentation.
  // The central app always provides sharedTask. Standalone legacy QA may omit it.
  function countdown(deadline){
    var n=Math.max(0,Math.ceil((Number(deadline)-Date.now())/1000));
    var pad=function(x){return String(x).padStart(2,'0');};
    return pad(Math.floor(n/3600))+':'+pad(Math.floor((n%3600)/60))+':'+pad(n%60);
  }
  function primaryShared(ctx,t){
    var orders=safeList(ctx.orders),o=orders.find(function(row){return row.id===t.orderId;});
    if(t.key==='new'){
      return orders.length?
        '<div class="m01-primary-top">'+badge('历史记录')+'</div><strong class="m01-primary-title">查看以往的用仓订单</strong>'+
        '<div class="m01-primary-actions">'+ctx.button('m01View','查看我的订单','orders','m01-primary-button')+'</div>':
        '<div class="m01-primary-top">'+badge('尚未用仓')+'</div><strong class="m01-primary-title">找一个合适的仓位</strong>'+
        '<p class="m01-primary-meta">可从附近门店开始</p><div class="m01-primary-actions">'+ctx.button('go','找附近门店','S01','m01-primary-button')+'</div>';
    }
    var key=t.key,act='m01Order',value=t.orderId||'',label='查看订单';
    var title=o?ctx.storeName(o):String(t.title||'我的用仓');
    var info=o?ctx.unitName(o):(t.sub||'');
    if(o&&o.term_months)info+=(info?' · ':'')+o.term_months+'个月';
    if(key==='pending'){act='m01ContinuePay';label='继续支付';info+=(info?' · ':'')+'应付'+ctx.money(o?.payable||0);}
    else if(key==='expired'||key==='payment_failed'){act='m01RestartOrder';label='重新选择仓位';}
    else if(key==='identity'){act='m01Identity';label='完成身份验证';}
    else if(key==='upcoming'){act='m01Access';label='查看入仓准备';}
    else if(key==='refund'){act='m01Service';label='查看押金进度';value+='|DP01';}
    else if(key==='returning'||key==='lease_expired'){act='m01Service';label=key==='lease_expired'?'办理退租及退押金':'查看退租进度';value+='|EX01';}
    else if(key==='renewal'){act='m01Service';label='查看续租进度';value+='|RN01';}
    else if(key==='expiring'){
      var lease=ctx.getLife(o.id);
      if(lease&&lease.total_months<60){act='m01Service';value+='|RN01';label='办理续租';}
      else label='查看订单';
    }
    else if(key==='active'){label='查看我的仓位';}
    else if(key==='booking'){act='m01View';value='booking';label='查看预约需求';}
    else if(key==='selected'||key==='estimated'){act='m01Resume';value='';label='继续找仓';}
    var urgency=['pending','payment_failed','expired','refund','returning','lease_expired','identity','expiring'].includes(key)?'attention':'';
    var clock=key==='pending'&&Number.isFinite(Number(t.expiresAt))?
      '<p class="m01-primary-meta m01-pay-meta">支付剩余时间 <span class="m01-pay-clock" role="timer" aria-live="off" data-expires="'+Number(t.expiresAt)+'">'+countdown(t.expiresAt)+'</span></p>':'';
    if(key==='active'&&t.otherActiveCount>0)info+=(info?' · ':'')+'另有'+t.otherActiveCount+'处在租';
    return '<div class="m01-primary-top">'+badge(ctx.esc(t.title||'当前服务'),urgency)+
       '<span class="m01-primary-context">当前任务</span></div>'+
       '<strong class="m01-primary-title">'+ctx.esc(title)+'</strong>'+
       (info?'<p class="m01-primary-meta">'+ctx.esc(info)+'</p>':'')+clock+
       '<div class="m01-primary-actions">'+ctx.button(act,label,value,'m01-primary-button')+'</div>';
  }
  function primary(ctx){
    if(ctx.sharedTask)return primaryShared(ctx,ctx.sharedTask);
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
    // A completed/closed lease leaves behind the last checkout's requirement snapshot.
    // Without a fresh intent marker, do not present that snapshot as a new active search.
    if(entry&&entry.rank===0)return '<div class="m01-primary-top">'+badge('暂无待办服务')+'</div><strong class="m01-primary-title">历史用仓记录</strong>'+ctx.button('m01View','查看我的订单','orders','m01-primary-button');
    var req=s.requirement||{};
    if(req.capacity_m3){
      return '<div class="m01-primary-top">'+badge('继续找仓')+'</div><strong class="m01-primary-title">'+ctx.esc(req.capacity_m3+'m³')+'</strong>'+
        '<p class="m01-primary-meta">'+ctx.esc(req.term_confirmed?req.term_months+'个月 · '+s.city:'租期待确认 · '+s.city)+'</p>'+
        ctx.button('m01Resume','继续找仓','','m01-primary-button');
    }
    if(entry)return '<div class="m01-primary-top">'+badge('暂无待办服务')+'</div><strong class="m01-primary-title">历史用仓记录</strong>'+ctx.button('m01View','查看我的订单','orders','m01-primary-button');
    return '<div class="m01-primary-top">'+badge('尚未用仓')+'</div><strong class="m01-primary-title">就近找个合适的仓位</strong>'+
      '<p class="m01-primary-meta">从附近门店开始，或先估算所需空间</p>'+
      ctx.button('go','找附近门店','S01','m01-primary-button');
  }
  function renderHome(ctx){
    var s=ctx.state,leads=leadRecords(s),fav=readFavorites(),orders=safeList(ctx.orders),demand=demandInfo(s);
    var assets=activeAssets(ctx),phone=s.account&&s.account.phone?String(s.account.phone):'';
    var profile='<section class="m01-profile"><span class="m01-avatar" aria-hidden="true">我</span><div class="m01-profile-details"><strong>'+
      (phone?'我的迷你考拉':'欢迎使用迷你考拉')+'</strong><p>'+
      (phone?ctx.esc(phone.replace(/(\d{3})\d{4}(\d{4})/,'$1****$2')):'查看订单与用仓服务')+'</p></div>'+
      ctx.button('m01View','个人信息','account','m01-profile-action')+'</section>';
    var current=ctx.sharedTask||{},passiveActive=current.key==='active'&&assets.length>0;
    var ended=current.key==='new'&&orders.length>0;
    var task=passiveActive||ended?'':'<section class="m01-task" aria-label="当前服务">'+primary(ctx)+'</section>';
    var assetBlock=assets.length?'<section class="m01-block m01-assets"><div class="m01-assets-heading"><h2>我的仓位</h2>'+
        '<button type="button" class="m01-assets-all" data-action="m01View" data-value="assets">查看全部 '+assets.length+'处 ›</button></div>'+
        '<div class="m01-assets-list">'+assets.slice(0,2).map(function(e){return assetRow(e,ctx);}).join('')+'</div></section>':'';
    var records=block('我的记录',
      row('我的订单',orders.length?orders.length+'笔订单':'查看订单记录','m01View','orders',ctx)+
      row('预约与需求',leads.length?leads.length+'条记录':'查看已提交需求','m01View','booking',ctx)+
      row('报价方案',s.quote?(s.quote.expiresAt>Date.now()?'当前方案有效':'当前方案需重新核价'):'暂无当前报价','m01View','quotes',ctx)+
      row('最近找仓',demand.has?demand.cap+'m³'+(demand.term?' · '+demand.term+'个月':' · 租期待确认'):'尚无保存的需求','m01View','recent',ctx));
    var service=block('服务与权益',
      row('我的收藏','门店和仓位','m01View','favorites',ctx,fav.stores.length+fav.units.length)+
      row('优惠与权益','查看可用权益','m01View','coupons',ctx,safeList(s.coupons).filter(function(x){return x.status==='AVAILABLE'||x.status==='SELECTED';}).length+safeList(s.serviceBenefits).length+safeList(s.giftTerms).filter(function(x){return x.status==='APPROVED';}).length)+
      (orders.some(function(o){return o.status==='paid_simulated';})?row('租后服务','续租、退租、押金和发票','m01View','services',ctx):'')+
      row('消息','查看业务通知','m01View','messages',ctx,safeList(s.messages).length));
    var help=block('更多服务',row('联系客服与帮助','','m01View','help',ctx));
    return profile+task+assetBlock+records+service+help;
  }
  function empty(text){return '<p class="m01-empty">'+text+'</p>';}
  function serviceRows(ctx){
    var paid=safeList(ctx.orders).filter(function(o){return o.status==='paid_simulated';});
    if(!paid.length)return empty('暂无可办理租后服务的订单');
    return paid.map(function(o){
      var l=orderLife(o,ctx),n=ctx.esc(ctx.storeName(o)),id=ctx.esc(o.id);
      var main='<div class="m01-service-order"><h3>'+n+'</h3><p>'+ctx.esc(ctx.unitName(o))+'</p></div>';
      var actions='<div class="m01-service-actions">'+ctx.button('m01Order','订单详情',o.id,'m01-minor-button');
      if(l&&['active','upcoming'].includes(l.lease_status)&&l.total_months<60)actions+=ctx.button('m01Service',safeList(l.renewal_requests).some(x=>['QUOTE_PENDING','QUOTE_READY'].includes(x.status))?'续租进度':'续租',o.id+'|RN01','m01-minor-button');
      if(l&&['active','expired','returning'].includes(l.lease_status))actions+=ctx.button('m01Service',l.lease_status==='returning'?'退租进度':'退租',o.id+'|EX01','m01-minor-button');
      if(l)actions+=ctx.button('m01Service','押金',o.id+'|DP01','m01-minor-button');
      if(l)actions+=ctx.button('m01Service','发票',o.id+'|IV01','m01-minor-button');actions+='</div>';
      return '<article class="m01-service-item" data-order-id="'+id+'">'+main+actions+'</article>';
    }).join('');
  }
  function listView(ctx){
    var s=ctx.state,view=currentView,fav=readFavorites(),orders=safeList(ctx.orders);
    if(view==='assets'){var assets=activeAssets(ctx);return assets.length?'<div class="m01-assets-list m01-assets-list-full">'+assets.map(function(e){return assetRow(e,ctx);}).join('')+'</div>':empty('暂无有效用仓仓位');}
    if(view==='orders')return orders.length?'<div class="m01-order-list">'+orders.map(ctx.orderBrief).join('')+'</div>':empty('暂无订单。可以先查看附近门店。');
    if(view==='booking'){
      var leads=leadRecords(s);
      return leads.length?leads.slice().reverse().map(function(x){
        var details=[x.capacity_m3?x.capacity_m3+'m³':null,x.term_months?x.term_months+'个月':null].filter(Boolean).join(' · ');
        var location=x.address||x.location||x.company||'用仓位置待补充';
        return '<article class="m01-info-item"><strong>'+ctx.esc(leadName(x))+'</strong>'+
          badge(x.status==='withdrawn'?'已撤回':'需求已记录')+
          '<p>'+ctx.esc(location)+'</p>'+(details?'<small>'+ctx.esc(details)+'</small>':'')+'</article>';
      }).join('')+'<a class="m01-text-link" href="account.html?view=needs">管理已提交需求</a>':empty('暂无预约或咨询记录');
    }
    if(view==='quotes'){
      var q=s.quote;
      return q&&q.unit_ids&&q.unit_ids.length?'<article class="m01-info-item"><strong>'+ctx.esc(ctx.storeName(q))+'</strong>'+badge(q.expiresAt>Date.now()?'当前报价':'已过期')+
        '<p>'+ctx.esc(q.term_months+'个月 · '+q.unit_ids.map(function(id){return ctx.unitName({unit_ids:[id]});}).join('、'))+'</p>'+
        '<div class="m01-service-actions">'+ctx.button('m01Resume','重新核对方案','','m01-minor-button')+'</div></article>':empty('暂无当前报价方案');
    }
    if(view==='recent'){
      var r=demandInfo(s);
      if(!r.has)return empty('尚无保存的找仓需求');
      return '<article class="m01-info-item"><strong>'+ctx.esc(r.cap+'m³')+'</strong>'+
        badge(r.active?'当前需求':'最近参考')+
        '<p>'+ctx.esc(r.city+' · '+(r.term?r.term+'个月':'租期待选择'))+'</p>'+
        '<div class="m01-service-actions">'+
        (r.active?ctx.button('m01Resume','继续找仓','','m01-minor-button'):
          ctx.button('go','按此需求重新找仓','S01','m01-minor-button'))+
        '</div></article>';
    }
    if(view==='favorites'){
      var items=fav.stores.map(function(id){return {id:id,name:ctx.storeName({store_id:id})};}).concat(fav.units.map(function(id){return {id:null,name:ctx.unitName({unit_ids:[id]})};}));
      return items.length?items.map(function(x){return '<article class="m01-info-item"><strong>'+ctx.esc(x.name)+'</strong>'+(x.id?'<div class="m01-service-actions">'+ctx.button('m01Store','查看门店',x.id,'m01-minor-button')+'</div>':'')+'</article>';}).join(''):empty('还没有收藏门店或仓位');
    }
    if(view==='coupons'){var items=safeList(s.coupons).map(function(c){return '<article class="m01-info-item"><strong>'+ctx.esc(c.name||'优惠券')+'</strong>'+badge(ctx.esc(({AVAILABLE:'可使用',SELECTED:'已选择',REDEEMED:'已使用',LOCKED:'已锁定',EXPIRED:'已过期',INVALID:'不可用'})[c.status]||c.status))+'</article>';}).concat(safeList(s.serviceBenefits).map(function(b){return '<article class="m01-info-item"><strong>'+ctx.esc(b.name||'服务权益')+'</strong>'+badge(ctx.esc(({ELIGIBILITY_PENDING:'资格待确认',ELIGIBLE:'可使用',RESERVED:'已锁定',FULFILLED:'已履约',INELIGIBLE:'不适用'})[b.status]||b.status))+'</article>'; })).concat(safeList(s.giftTerms).map(function(g){return '<article class="m01-info-item"><strong>赠送'+ctx.esc(g.gift_months)+'个月</strong>'+badge(ctx.esc(({SUBMITTED:'待审批',APPROVED:'已批准',ATTACHED_TO_QUOTE:'已加入报价',LOCKED_TO_ORDER:'已锁定',GRANTED:'已记录·期限规则待确认',REJECTED:'未通过'})[g.status]||g.status))+'</article>'; }));return items.length?items.join(''):empty('暂无可查看的优惠与权益');}
    if(view==='services')return serviceRows(ctx);
    if(view==='messages')return safeList(s.messages).length?s.messages.slice().reverse().map(function(m){return '<article class="m01-info-item"><strong>'+ctx.esc(m.title||'消息')+'</strong><p>'+ctx.esc(m.text||'')+'</p>'+(m.order_id?ctx.button('m01Order','关联订单',m.order_id,'m01-minor-button'):'')+'</article>';}).join(''):empty('暂无新消息');
    if(view==='account'){
      var phone=s.account&&s.account.phone?String(s.account.phone):'';
      return '<article class="m01-info-item"><strong>手机号</strong><p>'+(phone?ctx.esc(phone.replace(/(\d{3})\d{4}(\d{4})/,'$1****$2')):'未验证')+'</p>'+
        '<p class="m01-secondary">浏览服务无需登录；正式报价及下单时按统一规则验证。</p>'+
        '<a class="m01-text-link" href="account.html?view=profile">查看账户与联系方式</a></article>';
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