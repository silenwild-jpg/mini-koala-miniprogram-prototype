/* MK-VOL v0.2（2026-11-18，张坤裁定 D-143「按建议执行」：三档系数改为连续过渡；v0.1 = 2026-11-17 设计侧生成，待业务实测校准）
 * 建议容量 = 物品体积合计 ÷ 装载系数 k，向上取 0.1m³
 * k 由大件体积占比 b 连续决定（大件 = 不可规则码放的家具 / 家电 / 长件）：
 *   b ≤10% → 0.80；10%–30% 线性降到 0.65；30%–70% = 0.65；70%–90% 线性降到 0.55；≥90% → 0.55
 *   （三个锚点 0.80 / 0.65 / 0.55 与 v0.1 相同，只把 20%、80% 两处的跳变改成斜坡）
 * 需频繁存取（商家 / 办公品类体积占比 z）：减 0.10 × clamp((z−30%)/40%, 0, 1)，k 下限 0.50（v0.1 为 z≥50% 一次减 0.10）
 * 性质：往清单里加任何物品，建议容量不会变小（tools/test_volume_model_v02.js 随机 20 万次 + 全目录逐项验证）
 * ㎡ → m³：立方仓售卖体积 = 占地 × 层高 2.4m（团队定价测算口径；运行时现为 2.5，列代码侧待办）
 * 单品体积沿用 items-catalog.js（PR #220 HEAD 1d0dc7f），本模型不改单品数值。系数锚点仍是没有门店实测的初值。 */
(function(root){
  'use strict';
  const VERSION='MK-VOL-0.2',LAYER_HEIGHT_M=2.4;
  const REGULAR=new Set(['box','bin','clothingBox','quilt','coat','toybox','luggage28','luggage24','luggage20','bag','shoebox','figurebox','winebox','goodsbox','turnover','clothingPack','archiveBox','officeBox']);
  const FREQUENT=new Set(['business','office']);
  const TIERS=[{maxBulky:.2,k:.80,label:'箱类为主'},{maxBulky:.8,k:.65,label:'家具与箱类混装'},{maxBulky:1.01,k:.55,label:'大件为主'}]; /* 仅用于文字标签；k 不再按档取值 */
  const ceil1=v=>Math.ceil(v*10-1e-9)/10;
  const ramp=(x,x0,x1,y0,y1)=>x<=x0?y0:x>=x1?y1:y0+(y1-y0)*(x-x0)/(x1-x0);
  const kBase=b=>b<=.3?ramp(b,.1,.3,.80,.65):ramp(b,.7,.9,.65,.55);
  const freqCut=z=>.10*ramp(z,.3,.7,0,1);
  /* lines: [{id, category, volume_m3, count}] ; opts.frequentAccess 可显式指定（true = 减满 0.10，false = 不减），否则按商家 / 办公品类体积占比连续计算 */
  function recommend(lines,opts){
    const net=lines.reduce((s,l)=>s+l.volume_m3*l.count,0);
    if(!(net>0))return {version:VERSION,net:0,k:null,recommended:0,tier:null,frequentAccess:false,bulkyShare:0};
    const bulky=lines.filter(l=>!REGULAR.has(l.id)).reduce((s,l)=>s+l.volume_m3*l.count,0)/net;
    const biz=lines.filter(l=>FREQUENT.has(l.category)).reduce((s,l)=>s+l.volume_m3*l.count,0)/net;
    const tier=TIERS.find(t=>bulky<t.maxBulky);
    const cut=opts&&typeof opts.frequentAccess==='boolean'?(opts.frequentAccess?.10:0):freqCut(biz);
    const k=Math.max(.5,kBase(bulky)-cut);
    return {version:VERSION,net:Number(net.toFixed(3)),bulkyShare:Number(bulky.toFixed(2)),bizShare:Number(biz.toFixed(2)),tier:tier.label,frequentAccess:cut>0,k:Number(k.toFixed(3)),recommended:ceil1(net/k)};
  }
  const cubicFromArea=a=>Number((a*LAYER_HEIGHT_M).toFixed(2));
  /* CAP 参考档：同一套单品体积 + 同一套 k 反推，替换运行时 bandData.things（标题 / 配图不动） */
  const V={'标准纸箱':.096,'行李箱':.08,'收纳箱':.084,'收纳袋':.03,'折叠椅':.1,'单人沙发':.6,'矮柜':.6,'双人沙发':1.15,'洗衣机':.32,'床垫':.9,'三人沙发':1.6,'冰箱':.55,'拆装衣柜':1};
  const CAP_THINGS={1:{k:.80,n:{'标准纸箱':5,'行李箱':2,'收纳箱':1,'收纳袋':2}},3:{k:.80,n:{'标准纸箱':16,'行李箱':4,'折叠椅':2,'收纳箱':4}},8:{k:.65,n:{'标准纸箱':30,'单人沙发':2,'矮柜':1,'行李箱':6}},15:{k:.65,n:{'标准纸箱':55,'双人沙发':2,'洗衣机':1,'床垫':2}},30:{k:.65,n:{'标准纸箱':120,'三人沙发':2,'床垫':4,'冰箱':2}},60:{k:.65,n:{'标准纸箱':210,'三人沙发':4,'冰箱':4,'拆装衣柜':10}}};
  function applyToCapBands(bands){
    return (bands||[]).map(b=>{const c=CAP_THINGS[b.anchor];if(!c)return b;
      return Object.assign({},b,{k:c.k,net:Number(Object.entries(c.n).reduce((s,[n,q])=>s+V[n]*q,0).toFixed(2)),
        things:b.things.map(t=>Object.assign({},t,{value:c.n[t.name]+t.value.replace(/^\d+/,'')}))});});
  }
  const API={VERSION,LAYER_HEIGHT_M,TIERS,REGULAR,kBase,freqCut,recommend,cubicFromArea,applyToCapBands,CAP_THINGS,CAP_ITEM_VOLUME:V};
  root.MK_VOLUME_MODEL=API;
  if(root.MK_CAP_BANDS)root.MK_CAP_BANDS=applyToCapBands(root.MK_CAP_BANDS);
  if(typeof module==='object'&&module.exports)module.exports=API;
})(typeof window==='object'?window:globalThis);
