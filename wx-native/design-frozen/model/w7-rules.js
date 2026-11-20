/* W7 共用规则（2026-11-17，裁定 D-71～D-107 的设计侧实现；runtime/ 原件不动，本文件在 runtime 之后、w*-render.js 之前加载）
 * 所有页面取数一律走这里，不各写一份。代码侧实施时并入对应运行时模块（见 DEV_HANDOFF v2）。 */
(function(root){
  'use strict';
  const F=root.SIM_FIXTURES;
  /* W22 D-168：门店数据显示层清洗（runtime/fixtures.js 原件未改，源数据仍需业务清洗）。
     「昌平其它」按地址沙河镇写「沙河」；「科技园区」按地址丰台区丰葆路写「丰台科技园」（设计侧推断，待业务确认）；地址里重复的区名去掉第二次。 */
  (F.stores||[]).forEach(s=>{if(s.name)s.name=String(s.name).replace(/^昌平其它·/,'沙河·').replace(/^科技园区·/,'丰台科技园·');if(s.address)s.address=String(s.address).replace(/^((?:[^市]{2,4}市)?([^市区]{2,3}区))(.*?)\2/,'$1$3');});
  /* ---- W21（2026-11-18）定价第一阶段 ---- */
  /* D-156 公开折扣表：最深做到主流成交价 6.5 折（张坤口径）；档位起点 3 / 6 / 12 个月；12 个月及以上同为 6.5 折，更深的转满额减与顾问审批。
     8 / 7.5 / 7 折三档是结构示例，待财务按成交数据定。runtime/fixtures.js 原件未改，在这里覆盖；BEST_TERM 随之变为 12 个月。 */
  F.pricing.termRules=[{min:1,max:2,factor:.80},{min:3,max:5,factor:.75},{min:6,max:11,factor:.70},{min:12,max:60,factor:.65}];
  const PUBLIC_FACTOR=0.65;                       /* D-10a / D-23 公开取价档 */
  const ADVISOR_CAP_M3=15, ADVISOR_RENT_TOTAL=3000; /* W26（张坤 2026-11-18）：整期门槛保留 ¥3,000 及以上，撤回 W24 D-180 的 ¥20,000；D-97：容量 >15m³ 或 整期租金 ≥¥3,000；D-105：后续作为可调介入策略，当前不调 */
  const SALES_CAP_M3=30;                           /* D-101：≥30m³ 不做自助匹配，交销售（个人 / 企业同） */
  const NEAR_RATIO=0.8;                            /* D-99：接近 = 比需求小且差额 ≤20% */
  const PENDING_TTL_H=3;                           /* D-96：待支付与支付失败统一 3 小时，自下单起算，失败不重新计时 */
  const QUOTE_TTL_H=3;                             /* W12 D-120：新单报价有效期 3 小时（与手机号绑定无关，D-116） */
  const RENEW_QUOTE_TTL_H=24;                      /* D-74 / D-102 */
  const SERVICE_HOURS={start:9,end:20,label:'每日 9:00–20:00'}; /* D-106 暂定默认销售服务时段 */
  const LEAD_COPY={                                /* D-95 / D-106：张坤 2026-11-17 给定原句 */
    inHours:'预计 10 分钟内与您联系',
    offHours:'已收到，顾问上班后将优先联系您',
    hoursNote:'服务时段：每日 9:00–20:00',
    notLock:'提交后由顾问电话确认，不锁定仓位与价格'  /* D-89 预约用仓只是线索 */
  };
  const TERM_PRESETS=[1,3,6,12];  /* W17 D-141：默认 1 / 3 / 6 / 12 个月（24 个月并入「其他」） */                /* R-B-21 统一租期组件：预设 + 「其他」1–60 个月整数 */
  const BIZ_BANDS=[                                /* D-88 / D-101 企业容量区间：存区间，带入找仓按上限；30m³+ 不带入 */
    {key:'1-5',label:'1–5m³',min:1,max:5,match:5},
    {key:'5-15',label:'5–15m³',min:5,max:15,match:15},
    {key:'15-30',label:'15–30m³',min:15,max:30,match:30,note:'不含 30'},
    {key:'30+',label:'30m³ 及以上',min:30,max:null,match:null,sales:true}];
  const termFactor=m=>{const r=F.pricing.termRules.find(x=>m>=x.min&&m<=x.max);return r?r.factor:1;};
  const termLabel=m=>m+'个月';
  /* 折扣标签：直接由折扣表生成，不写「优惠」等形容 */
  const termDiscount=m=>{const f=termFactor(m);return f<1?(Math.round(f*100)/10)+'折':'';};
  const allUnits=s=>F.units.filter(u=>u.store_id===(s.id||s)&&Number(u.volume)>0);
  /* D-98 门店均价（定价测算「加权单价」）= Σ(体积×该仓 0.65 档立方单价) ÷ Σ体积 = Σ(月基价×0.65) ÷ Σ体积；全部仓位，不随出租变化 */
  function storeAvgCubic(s){const us=allUnits(s);if(!us.length)return null;return us.reduce((a,u)=>a+u.base_month*PUBLIC_FACTOR,0)/us.reduce((a,u)=>a+Number(u.volume),0);}
  const storeAvgText=s=>{const v=storeAvgCubic(s);return v==null?null:Math.round(v);};   /* 显示：均价 ¥75/m³/月（不带「起」） */
  const rentTotal=(u,m)=>{const to=F.pricing.roundRentTo||10;return Math.round(u.base_month*m*termFactor(m)/to)*to;};
  /* D-97 顾问卡：并列入口，不拦截自助下单；一页只出现一次，放在仓位列表之后 */
  function advisorNeeded(capacityM3,rentTotalYuan){return Number(capacityM3)>ADVISOR_CAP_M3||Number(rentTotalYuan)>=ADVISOR_RENT_TOTAL;}
  const salesOnly=capacityM3=>Number(capacityM3)>=SALES_CAP_M3;
  /* D-99 匹配判定：不小于需求 = 匹配；小且 ≥80% = 接近（写明差额）；<80% 不推荐 */
  function fit(unitVol,needM3){const v=Number(unitVol),n=Number(needM3);if(!(n>0))return {state:'browse'};if(v>=n)return {state:'matched',diff:+(v-n).toFixed(2)};if(v>=n*NEAR_RATIO)return {state:'near',diff:+(n-v).toFixed(2),text:'比需求小 '+(+(n-v).toFixed(1))+'m³'};return {state:'small'};}
  const inServiceHours=d=>{const h=((d||new Date()).getUTCHours()+8)%24;return h>=SERVICE_HOURS.start&&h<SERVICE_HOURS.end;};
  const leadAck=d=>inServiceHours(d)?LEAD_COPY.inHours:LEAD_COPY.offHours;
  /* ---- W14（2026-11-18）---- */
  const NEARBY_KM=5;                               /* D-128：用仓位置 5km 内没有门店 = 「附近没有门店」 */
  /* D-129：商圈标签直接用门店数据里的商圈名。下表逐字取自 runtime/fixtures.js extraStores[].area_name（该字段在合并后的 F.stores 里被丢掉，这里补回；原件未改）。
     表里没有的门店（基础 8 店）取店名「·」前一段；店名没有「·」的不归入任何商圈。 */
  const STORE_AREA={"SIM_BJ06": "陶然亭", "SIM_BJ07": "广渠门", "SIM_BJ08": "望京", "SIM_BJ09": "丰台科技园", "SIM_BJ10": "双井", "SIM_BJ11": "万柳", "SIM_BJ12": "回龙观", "SIM_BJ13": "玉桥", "SIM_BJ14": "老山", "SIM_BJ15": "广安门", "SIM_BJ16": "陶然亭", "SIM_BJ17": "四惠", "SIM_BJ18": "丽泽", "SIM_BJ19": "望京", "SIM_BJ20": "学院路", "SIM_BJ21": "沙河", "SIM_BJ22": "潞苑", "SIM_BJ23": "牛街", "SIM_BJ24": "东花市", "SIM_BJ25": "成寿寺", "SIM_BJ26": "玉泉营", "SIM_BJ27": "西二旗", "SIM_BJ28": "霍营", "SIM_BJ29": "北关", "SIM_BJ30": "广安门"};
  const areaOf=s=>{if(!s)return '';if(STORE_AREA[s.id])return STORE_AREA[s.id];const n=String(s.name||'');return n.includes('·')?n.split('·')[0]:'';};
  const districtOf=s=>String(s&&s.district||'').replace(/^(北京|上海|深圳|杭州|广州)市?(?=.+区$)/,''); /* 数据里有「北京朝阳区」这类写法，显示时去掉城市前缀；源数据仍需清洗 */
  /* D-123：仓位层标签。上下叠放的仓位显示「所在层/总层数」，如 2/2层、3/3层；独立单仓（整高一个仓）不显示。
     仓位数据目前没有这个字段：UNIT_TIER_DEMO 是演示数据，只为验证版式（演示仓位的高度仍是原样，和叠放并不对应）。代码侧需新增字段 tier_index / tier_total。 */
  const UNIT_TIER_DEMO={SIM_BJ01_U01:[2,2],SIM_BJ01_U02:[1,2],SIM_BJ02_U01:[3,3],SIM_BJ03_U01:[2,2],SIM_BJ06_U01:[2,2],SIM_BJ06_U02:[1,2]};
  const unitTier=u=>{const id=u&&(u.id||u),t=(u&&u.tier_total>1)?[u.tier_index,u.tier_total]:UNIT_TIER_DEMO[id];return t&&t[1]>1?{index:t[0],total:t[1],label:(t[0]===t[1]?'上层':t[0]===1?'下层':'中层')+' '+t[0]+'/'+t[1],aria:'上下 '+t[1]+' 层仓位中的第 '+t[0]+' 层'}:null;};
  /* ---- W17（2026-11-18）---- */
  /* D-140：门店价格 = ¥XX/m³/月起，以门店最低折扣下的立方单价计算 = 该店可租仓位在折扣表最低档（W21 起为 12 个月及以上 6.5 折）下「月租 ÷ 容量」的最小值。
     与运行时 presentation-policy.js cubicReference() 同一算法（取整同为舍去小数）。取代 D-98 门店均价与 D-23 的 0.65 公开档——仅门店级价格；单个仓位的「/月起」仍是 0.65 档，见 W17 报告待裁。 */
  const BEST_RULE=[...F.pricing.termRules].sort((a,b)=>a.factor-b.factor||a.min-b.min)[0],BEST_TERM=BEST_RULE.min,BEST_FACTOR=BEST_RULE.factor;
  function storeFromCubic(s,core){const us=allUnits(s).filter(u=>core?core.available(u):u.status!=='soldout');if(!us.length)return null;
    return Math.min(...us.map(u=>(core?core.amounts([u.id],BEST_TERM).monthly_average:Math.trunc(u.base_month*BEST_FACTOR))/Number(u.volume)));}
  const storeFromText=(s,core)=>{const v=storeFromCubic(s,core);return v==null?null:Math.ceil(v-1e-9);}; /* W20 D-147：起价小数进位 */
  /* W20 D-146：单个仓位的「/月起」与门店级同口径 = 折扣表最低档下的月租，小数进位（取代 0.65 档 PUBLIC_TERM） */
  const unitFromMonthly=(core,u)=>Math.ceil(core.amounts([u.id],BEST_TERM).monthly_average-1e-9);
  const fromPriceHtml=(s,core,cls)=>{const v=storeFromText(s,core);return v==null?'':'<div class="price fromprice'+(cls?' '+cls:'')+'"><span class="cur">¥</span><span class="num">'+v.toLocaleString('zh-CN')+'</span><span class="unit">/m³/月起</span></div>';};
  /* D-141：统一租期组件（紧凑版）：一行 4 个预设 +「其他」，折扣写在右上角标；「其他」走底部弹层，不在页内展开 */
  function termSeg(term,o){o=o||{};const P=TERM_PRESETS,other=Number.isInteger(term)&&!P.includes(term);
    const cell=(label,on,action,value,badge,extra)=>'<button type="button" class="tcell'+(on?' on':'')+(extra||'')+'" aria-pressed="'+!!on+'" data-action="'+action+'" data-value="'+value+'"><span class="m">'+label+'</span>'+(badge?'<span class="badge">'+badge+'</span>':'')+'</button>';
    return '<div class="termseg'+(o.unsure!==undefined?' six':'')+'" role="group" aria-label="租期">'+P.map(m=>cell(m+'个月',term===m,'term',m,termDiscount(m))).join('')+cell(other?term+'个月':'其他',other,'moreTerms','',other?termDiscount(term):'',' other')+(o.unsure!==undefined?cell('暂不确定',!!o.unsure,'term','unsure','',' unsure'):'')+'</div>';}
  /* ㎡ 全流程：需求以 ㎡ 输入时，各页需求条写「2㎡ · 约4.8m³」。运行时 space-unit.js 的 demandCapacity 按层高 2.5 校验，
     设计稿层高口径是 2.4（D-104），这里按 2.4 重写显示函数；runtime 原件未改，代码侧统一层高后可直接用原函数。 */
  const SU=root.SIM_SPACE_UNIT,AREA_H=(root.MK_VOLUME_MODEL&&root.MK_VOLUME_MODEL.LAYER_HEIGHT_M)||2.4,pretty=v=>String(Number(Number(v).toFixed(2)));
  function demandCapText(r){r=r||{};const v=Number(r.capacity_m3);if(!Number.isFinite(v)||v<=0)return '';
    if(r.input_unit==='m2'&&Number(r.input_value)>0&&Math.abs(Number(r.input_value)*AREA_H-v)<0.011)return pretty(r.input_value)+'㎡ · 约'+pretty(v)+'m³';return pretty(v)+'m³';}
  if(SU)SU.demandCapacity=demandCapText;
  /* ---- W21 定价第一阶段（续）---- */
  const TERM_DEFAULT=12;                           /* D-158：租期默认选中 12 个月 */
  const NUDGE_MONTHS=3;                            /* D-159：离下一档 3 个月以内才提示 */
  const UPSIZE_RATIO=0.85;                         /* D-161：需求占匹配仓 85% 及以上或含长件，写明大一档的理由；85% 是设计侧初值 */
  /* D-157 满额减：按整期租金（券前）自动生效，不用领取；与优惠券不同享，取优惠大的一项；特价仓、续租不参与。三档金额是结构示例，待财务定。 */
  const FULL_TIERS=[{min:5000,off:150},{min:10000,off:400},{min:20000,off:1000}];
  const yuan=n=>'¥'+Number(n).toLocaleString('zh-CN');
  const fullTier=t=>FULL_TIERS.filter(x=>Number(t)>=x.min).pop()||null;
  function applyFull(a,opts){
    if(!a||a.full_checked||(opts&&opts.renewal)||(a.campaign_ids&&a.campaign_ids.length))return a;
    const t=fullTier(a.rent_total),off=t?t.off:0,cp=Number(a.coupon_discount)||0;
    if(!(off>cp))return Object.assign(a,{full_checked:true,full_reduction:0});
    const after=a.rent_total-off,months=a.monthly_average?Math.round(a.rent_total/a.monthly_average):0;
    return Object.assign({},a,{full_checked:true,full_reduction:off,full_min:t.min,coupon_id:null,coupon_discount:0,coupon_skipped:cp>0,rent_after_coupon:after,monthly_after_coupon:months?Math.round(after/months*100)/100:a.monthly_after_coupon,payable:a.payable+cp-off});}
  /* 报价一律经 core.amounts / formalAmounts 取数，在这里统一套满额减；订单对象需由代码侧在下单时落 full_reduction（见 DEV_HANDOFF v10） */
  if(root.SIM_CORE&&!root.SIM_CORE.__w21){const mk=root.SIM_CORE.create;
    root.SIM_CORE.create=function(o){const c=mk.call(root.SIM_CORE,o),am=c.amounts,fa=c.formalAmounts;
      c.amounts=(ids,m,opts)=>applyFull(am(ids,m,opts),opts);if(fa)c.formalAmounts=(ids,m)=>applyFull(fa(ids,m));return c;};
    root.SIM_CORE.__w21=true;}
  /* D-164「已省」= 租期折扣 + 满额减 + 优惠券，比较基准是月基价（挂牌价） */
  const savedTotal=a=>a?(Number(a.term_discount_total)||0)+(Number(a.full_reduction)||0)+(Number(a.coupon_discount)||0):0;
  /* D-159 下一档提示：只在离下一档 3 个月以内出现；有仓位时带月均差额 */
  function nextTier(m){const cur=termFactor(m),r=F.pricing.termRules.filter(x=>x.min>m&&x.factor<cur).sort((a,b)=>a.min-b.min)[0];
    return r&&r.min-m<=NUDGE_MONTHS?{add:r.min-m,months:r.min,factor:r.factor,label:(Math.round(r.factor*100)/10)+' 折'}:null;}
  function termHint(m,baseMonth){if(!Number.isInteger(m))return '';const n=nextTier(m);if(!n)return '';
    const less=baseMonth?Math.trunc(baseMonth*termFactor(m)+1e-9)-Math.trunc(baseMonth*n.factor+1e-9):0;
    return '再租 '+n.add+' 个月享 '+n.label+(less>0?'，月均少 '+yuan(less):'');}
  function fullHint(m,rentAt,coupon){try{const cur=rentAt(m),next=FULL_TIERS.find(x=>x.min>cur&&x.off>(Number(coupon)||0));if(!next)return '';
      for(let k=1;k<=NUDGE_MONTHS&&m+k<=60;k++)if(rentAt(m+k)>=next.min)return '再租 '+k+' 个月，整期满 '+yuan(next.min)+' 减 '+yuan(next.off);}catch(_){}return '';}
  const nudge=(m,baseMonth,rentAt,coupon)=>termHint(m,baseMonth)||(rentAt&&Number.isInteger(m)?fullHint(m,rentAt,coupon):'');   /* 一处只出一句：先折扣档，后满额减 */
  /* D-163 顾问卡：出现条件 = >15m³ 或整期 ≥¥3,000（W26 回到 ¥3,000，含 3,000）；达到「15m³ 以上或整期满最高满减档」时文案写明条件 */
  const BIG_DEAL_TOTAL=FULL_TIERS[FULL_TIERS.length-1].min;
  const bigDeal=(cap,total)=>Number(cap)>ADVISOR_CAP_M3||Number(total)>=BIG_DEAL_TOTAL;
  const advisorCopy=big=>big?{t:'可申请专属方案',s:ADVISOR_CAP_M3+'m³ 以上或整期满 '+yuan(BIG_DEAL_TOTAL)+'，由顾问确认方案与价格'}:{t:'需要顾问帮您确认方案？',s:'协助确认仓位、费用及搬运安排'};
  /* D-173（张坤 2026-11-18）：面向远距离用户的召回策略。用仓位置距门店 ≥5km、租期 ≥6 个月、折扣不低于 6 折 → 免 1 次车辆运输费。
     「折扣」这里按租期折扣档判断（公开表最深 6.5 折，自助单都满足）；特价仓沿用原叠加规则不参与。
     W26（B1，按设计侧建议执行）：是否赠送只看租期折扣档，用券 / 满额减后实付低于 6 折仍送——用户下单前就能知道自己有没有。 */
  const FREE_TRANSPORT={minKm:5,minTerm:6,minFactor:0.6,chip:'免费运输',name:'免费运输 1 次',tag:'满6个月免费运输',
    cond:'用仓位置距门店 5km 及以上、租期满 6 个月可用',scope:'含 1 次车辆运输费；搬运、拆装、楼梯费另计'};
  const freeTransport=(km,term,factor)=>Number.isFinite(Number(km))&&Number(km)>=FREE_TRANSPORT.minKm&&(term==null||Number(term)>=FREE_TRANSPORT.minTerm)&&(factor==null||Number(factor)>=FREE_TRANSPORT.minFactor-1e-9);
  const freeTransportFor=(km,term)=>Number.isInteger(Number(term))&&freeTransport(km,Number(term),termFactor(Number(term))); /* 订单是否送：距离 + 租期 + 租期折扣档 */
  /* W26（B2）：用仓位置距门店 ≥5km、租期不足 6 个月时的引导句。一处只出一句：
     下一折扣档正好是 6 个月（现表 3–5 个月）→ 合成一句「再租 N 个月享 7 折，还可免费运输 1 次」；
     下一折扣档更近（现表 1–2 个月 → 3 个月）→ 只出折扣档那句；没有折扣档提示时才单独出「租满 6 个月可免费运输 1 次」。 */
  function nudgeFar(m,baseMonth,rentAt,coupon,km){const far=Number.isInteger(m)&&m<FREE_TRANSPORT.minTerm&&Number.isFinite(Number(km))&&Number(km)>=FREE_TRANSPORT.minKm,n=far?nextTier(m):null;
    if(far&&n&&n.months===FREE_TRANSPORT.minTerm)return '再租 '+n.add+' 个月享 '+n.label+'，还可'+FREE_TRANSPORT.name;
    return nudge(m,baseMonth,rentAt,coupon)||(far?'租满 '+FREE_TRANSPORT.minTerm+' 个月可'+FREE_TRANSPORT.name:'');}
  const PREPAY_NOTE='租期折扣按预付整期计算，提前退仓时按协议重新核算';      /* D-160；W27 D-189 */
  root.MK_W7={FREE_TRANSPORT,freeTransport,freeTransportFor,nudgeFar,TERM_DEFAULT,NUDGE_MONTHS,UPSIZE_RATIO,FULL_TIERS,fullTier,applyFull,savedTotal,nextTier,termHint,fullHint,nudge,bigDeal,advisorCopy,BIG_DEAL_TOTAL,PREPAY_NOTE,unitFromMonthly,storeFromCubic,storeFromText,fromPriceHtml,termSeg,demandCapText,BEST_TERM,BEST_FACTOR,NEARBY_KM,STORE_AREA,areaOf,districtOf,UNIT_TIER_DEMO,unitTier,PUBLIC_FACTOR,ADVISOR_CAP_M3,ADVISOR_RENT_TOTAL,SALES_CAP_M3,NEAR_RATIO,PENDING_TTL_H,QUOTE_TTL_H,RENEW_QUOTE_TTL_H,SERVICE_HOURS,LEAD_COPY,TERM_PRESETS,BIZ_BANDS,
    termFactor,termLabel,termDiscount,storeAvgCubic,storeAvgText,rentTotal,advisorNeeded,salesOnly,fit,inServiceHours,leadAck};
})(typeof window==='object'?window:globalThis);
