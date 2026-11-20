"""W12（2026-11-18）：D-119 未授权定位提醒改为城市选择区轻气泡 + 搜索面板快捷项（不占内页高度）/ D-120 报价有效期 3 小时 /
D-121 手机号验证 = 注册登录同一逻辑，删除「验证手机号后显示整期价格」区块，「查看报价」直接调起登录。
在 W11 工作树上原位打补丁；每处替换要求恰好命中 n 次。"""
import os,json
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(path,old,new,n=1):
    p=os.path.join(R,path);s=open(p,encoding='utf-8').read()
    assert s.count(old)==n,(path,old[:50],s.count(old))
    open(p,'w',encoding='utf-8').write(s.replace(old,new))
def cut(path,a,b,new):
    p=os.path.join(R,path);s=open(p,encoding='utf-8').read()
    i=s.index(a);j=s.index(b,i);assert s.count(a)==1
    open(p,'w',encoding='utf-8').write(s[:i]+new+s[j:])
A='pages/w9-auth.js'
# ---------- D-119 定位提醒 ----------
cut(A,"  /* ---------- 定位状态条（H01 / S01）---------- */","  if(auth==='privacy'){",r"""  /* ---------- W12 D-119：定位提醒 = 城市选择区轻气泡（浮层，不占内页高度）；取代 W9 的页内状态条 ---------- */
  const cityBtn=screen.querySelector('.topbar .city');
  function lochint(text,act,quiet){
    if(!cityBtn)return;
    cityBtn.classList.add('w12off');cityBtn.insertAdjacentHTML('beforeend','<i class="w12dot" aria-hidden="true"></i>');
    cityBtn.setAttribute('aria-label','当前城市 北京，定位未开启');
    if(quiet)return;
    if(getComputedStyle(screen).position==='static')screen.style.position='relative';
    const r=cityBtn.getBoundingClientRect(),sr=screen.getBoundingClientRect();
    const n=$el('<div class="w12pop" role="status" aria-label="定位提醒"><span class="tx">'+text+'</span><button type="button" class="btn text sm" data-action="'+act[0]+'">'+act[1]+'</button><button type="button" class="x" aria-label="关闭定位提醒" data-action="closeHint">'+svg(I.close,'ico sm')+'</button></div>');
    n.style.top=(r.bottom-sr.top+6)+'px';n.style.left=Math.max(12,r.left-sr.left-4)+'px';
    screen.append(n);
  }
  const LOC={
    loc_ok:()=>{},
    privacy_declined:()=>lochint('开启定位，查看离您近的门店',['enableLocation','开启']),
    loc_denied:()=>lochint('开启定位，查看离您近的门店',['openSetting','去开启']),
    loc_system:()=>lochint('手机定位未开启',['sysHelp','查看方法']),
    loc_timeout:()=>lochint('暂未获取到位置',['relocate','重试']),
    loc_quiet:()=>lochint('',[],true),
  };
  /* 搜索面板（H01 / S01 点搜索框进入）：定位快捷行 + 城市 + 区域 + 商圈快捷选择 */
  function searchPanel(located){
    const city=(document.getElementById('city')||{}).textContent||'北京';
    const st=F.stores.filter(s=>(s.city||'').replace(/市$/,'')===city);
    const uniq=a=>[...new Set(a.filter(Boolean))];
    const dist=uniq(st.map(s=>(s.district||'').replace(/^北京|^上海|^深圳/,''))).slice(0,8);
    const area=uniq(st.map(s=>s.area_name||(s.name||'').split('·')[0].replace(/店$/,''))).filter(x=>x.length<=5).slice(0,8);
    const chips=(a,act)=>'<div class="w12chips">'+a.map(x=>'<button type="button" class="chip" data-action="'+act+'" data-value="'+x+'">'+x+'</button>').join('')+'</div>';
    const sb=screen.querySelector('.statusbar');const top=sb?sb.getBoundingClientRect().bottom:44;
    const locrow=located
      ?'<div class="w12locrow">'+svg(I.pin)+'<div class="tx"><b>朝阳区 安贞附近</b><span>当前位置</span></div><button type="button" class="btn text sm" data-action="relocate">重新定位</button></div>'
      :'<div class="w12locrow">'+svg(I.pin)+'<div class="tx"><b>使用当前位置</b><span>开启定位后按距离排序</span></div><button type="button" class="btn text sm" data-action="enableLocation">开启</button></div>';
    ovr.append($el('<div class="w12search" role="dialog" aria-modal="true" aria-label="搜索" style="top:'+top+'px"><div class="w12sbar"><div class="search focus"><svg class="ico sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="ph">小区、写字楼、地址或门店名</span></div><button type="button" class="btn text sm" data-action="close">取消</button></div>'+locrow+
      '<h5>城市</h5>'+'<div class="w12chips">'+['北京','上海','深圳','杭州','广州'].map(c=>'<button type="button" class="chip'+(c===city?' on':'')+'" data-action="city" data-value="'+c+'">'+c+'</button>').join('')+'</div>'+
      (dist.length?'<h5>'+city+' · 按区域</h5>'+chips(dist,'district'):'')+(area.length?'<h5>'+city+' · 按商圈</h5>'+chips(area,'area'):'')+'</div>'));
  }
  if((PAGE==='H01'||PAGE==='S01')&&(auth==='search_off'||auth==='search_on')){if(auth==='search_off')LOC.loc_quiet();searchPanel(auth==='search_on');}
  if((PAGE==='H01'||PAGE==='S01')&&auth==='city_off'){
    LOC.loc_quiet();const city=(document.getElementById('city')||{}).textContent||'北京';
    ovr.append($el('<div class="scrim" role="dialog" aria-modal="true" aria-label="选择城市"><div class="sheet w9sheet"><div class="grab"></div><h4>选择城市</h4><div class="w12locrow">'+svg(I.pin)+'<div class="tx"><b>使用当前位置</b><span>开启定位后按距离排序</span></div><button type="button" class="btn text sm" data-action="enableLocation">开启</button></div>'+['北京','上海','深圳','杭州','广州'].map(c=>'<div class="opt'+(c===city?' on':'')+'" data-action="city" data-value="'+c+'">'+c+(c===city?svg(I.check):'')+'</div>').join('')+'</div></div>'));
  }
""")
sub(A,"    LOC.loc_denied();\n    dialog('开启位置权限'","    LOC.loc_quiet();\n    dialog('开启位置权限'")
sub(A," *   loc_settings     用户主动点「去开启」后的设置引导"," *   loc_settings     用户主动点「去开启」后的设置引导\n *   W12 D-119：以上未定位状态不再插入页内状态条，改为城市选择区轻气泡（浮层）；loc_quiet = 气泡关闭后只留城市旁圆点\n *   search_off / search_on   搜索面板（定位快捷行 + 城市 / 区域 / 商圈快捷选择）；city_off = 城市选择层顶部带「使用当前位置」")
# ---------- D-121 删除页首验证区块；未登录卡片显示门店均价 + 查看报价 ----------
cut(A,"  const lockHtml=","  if(PHONE_KEYS.includes(auth)&&['S5','S01','S02','QUICK'].includes(PAGE))lockPrices();",r"""  /* W12 D-121：验证 = 注册登录同一逻辑。不再显示「验证手机号后显示整期价格」区块与锁图标行；
     未登录时卡片价格位显示门店均价（与无需求浏览态同一表达），「查看报价」直接调起登录层 */
  const avgBox=id=>{try{const s=F.stores.find(x=>x.id===id),v=W.storeAvgText(s);return v==null?'':'<div class="price avgprice"><span class="k">均价</span><span class="cur">¥</span><span class="num">'+v+'</span><span class="unit">/m³/月</span></div>';}catch(_){return '';}};
  function lockPrices(){
    const sid=el=>{const c=el&&el.closest('[data-store]');return c?c.dataset.store:(F.stores[0]&&F.stores[0].id);};
    document.querySelectorAll('.scard:not(.compact) .foot, .urow .foot').forEach(f=>{
      const box=f.firstElementChild;if(!box||!box.querySelector('.price'))return;
      box.innerHTML=avgBox(sid(f));
      const b=f.querySelector('.card-cta');if(b){b.textContent='查看报价';b.dataset.action='phone';}
    });
    document.querySelectorAll('.scard.compact .cprice').forEach(c=>{c.innerHTML=avgBox(sid(c));});
    document.querySelectorAll('.combo .price, .combo .price-sec').forEach(p=>{if(p.classList.contains('price'))p.outerHTML=avgBox(sid(p));else p.remove();});
    const pc=document.querySelector('.pricecard');
    if(pc){const p=pc.querySelector('.price');if(p)p.outerHTML=avgBox(sid(p));pc.querySelector('.price-sec')?.remove();pc.querySelector('.lk')?.remove();
      const am=document.querySelector('.actbar .qsum .amt');if(am){am.textContent='登录后显示';am.classList.add('muted');}
      const nb=document.querySelector('.actbar .btn.primary');if(nb){nb.textContent='查看报价';nb.dataset.action='phone';}}
  }
""")
sub(A,"手机号用于登录、查看整期报价、预约联系和订单通知。验证通过后自动注册或登录。暂不验证也可继续浏览门店与仓位。","未注册的手机号将自动注册。手机号用于查看报价、预约联系和订单通知。")
sub(A,'aria-label="关闭手机号验证"','aria-label="关闭登录"')
sub(A,"暂不验证，继续浏览","暂不登录，继续浏览")
sub(A,"phone_ok:()=>toast('验证成功')","phone_ok:()=>toast('登录成功')")
# ---------- D-120 报价有效期 3 小时 ----------
sub('model/w7-rules.js',"  const RENEW_QUOTE_TTL_H=24;","  const QUOTE_TTL_H=3;                             /* W12 D-120：新单报价有效期 3 小时（与手机号绑定无关，D-116） */\n  const RENEW_QUOTE_TTL_H=24;")
sub('model/w7-rules.js',"PENDING_TTL_H,RENEW_QUOTE_TTL_H,","PENDING_TTL_H,QUOTE_TTL_H,RENEW_QUOTE_TTL_H,")
sub(A,"<b>报价已过有效期</b><span>刷新后显示最新金额</span>","<b>报价已超过 '+(W&&W.QUOTE_TTL_H||3)+' 小时</b><span>刷新后显示最新金额</span>")
W2='pages/w2-render.js'
sub(W2,"(estimate?'<p class=\"fine\">预估金额，授权手机号后锁定报价；优惠券在授权后可选。</p>':'')","(estimate?'<p class=\"fine\">预估金额，授权手机号后锁定报价；优惠券在授权后可选。</p>':'')+(!order&&authorized&&key!=='price_changed'?'<p class=\"fine\" data-quote-ttl>报价 '+W7.QUOTE_TTL_H+' 小时内有效</p>':'')")
sub(W2,"!authorized?'验证手机号后显示'","!authorized?'登录后显示'",2)
sub(W2,">手机号未验证</span>",">未登录</span>")
sub(W2,"(authorized?'更换':'去验证')","(authorized?'更换':'去登录')")
sub(W2,"btn='验证手机号查看金额';action='phone';amtMuted='验证后显示';","btn='查看报价';action='phone';amtMuted='登录后显示';")
W6='pages/w6-render.js'
sub(W6,"kv('验证手机号',phone?esc(mask(phone)):'<span class=\"soft\">尚未验证</span>'","kv('登录手机号',phone?esc(mask(phone)):'<span class=\"soft\">未登录</span>'")
sub(W6,"btn('验证手机号','primary md','phone')","btn('登录 / 注册','primary md','phone')")
sub(W6,"btn('验证手机号','secondary md block','phone')","btn('登录 / 注册','secondary md block','phone')")
sub(W6,"浏览门店无需登录；查看整期报价、预约和下单前需验证手机号。","浏览门店无需登录；查看报价、预约和下单时登录即可。")
sub(W6,"验证手机号后查看金额","登录后查看金额",2)
# ---------- CSS ----------
p=os.path.join(R,'design-system/components.css');s=open(p,encoding='utf-8').read();assert 'W12' not in s
s+="""
/* ===== W12（2026-11-18）D-119 定位轻气泡 / 搜索面板；D-121 未登录价格位 ===== */
.topbar .city.w12off{position:relative}
.topbar .city .w12dot{position:absolute;right:-2px;top:6px;width:6px;height:6px;border-radius:50%;background:var(--mk-color-accent-promoIcon)}
.w12pop{position:absolute;z-index:6;display:flex;align-items:center;gap:2px;max-width:calc(100% - 24px);min-height:40px;padding:2px 2px 2px 12px;background:#fff;border:1px solid var(--mk-color-line-hairline);border-radius:var(--mk-radius-thumb);box-shadow:0 4px 14px rgba(31,42,36,.12);font-size:var(--mk-font-size-sm);color:var(--mk-color-ink-primary)}
.w12pop::before{content:"";position:absolute;left:18px;top:-5px;width:8px;height:8px;background:#fff;border-left:1px solid var(--mk-color-line-hairline);border-top:1px solid var(--mk-color-line-hairline);transform:rotate(45deg)}
.w12pop .tx{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.w12pop .btn{height:36px;min-width:44px;flex:none;white-space:nowrap}
.w12pop .x{flex:none;width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--mk-color-ink-secondary)}
.w12search{position:fixed;left:0;right:0;bottom:0;z-index:20;background:#fff;padding:0 var(--mk-space-pageGutter) 24px;overflow:auto}
.w12sbar{display:flex;align-items:center;gap:4px;height:52px}
.w12sbar .search .ph{color:var(--mk-color-ink-secondary)}
.w12sbar .btn{height:36px;min-width:44px;flex:none;margin-right:-8px}
.w12locrow{display:flex;align-items:center;gap:8px;min-height:56px;border-bottom:1px solid var(--mk-color-line-hairline)}
.w12locrow > .ico{flex:none;color:var(--mk-color-brand-text)}
.w12locrow .tx{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.4}
.w12locrow .tx b{font-size:var(--mk-font-size-md);font-weight:600}
.w12locrow .tx span{font-size:var(--mk-font-size-xs);color:var(--mk-color-ink-secondary)}
.w12locrow .btn{height:36px;min-width:44px;flex:none;margin-right:-8px}
.w12search h5{font-size:var(--mk-font-size-sm);font-weight:400;color:var(--mk-color-ink-secondary);margin:20px 0 10px}
.w12chips{display:flex;flex-wrap:wrap;gap:8px}
.w12chips .chip{height:36px}
"""
open(p,'w',encoding='utf-8').write(s)
# ---------- 状态登记 ----------
NEW={'h01':['new&auth=loc_quiet','new&auth=search_off','new&auth=search_on','new&auth=city_off'],
     's01':['browse&auth=privacy_declined','browse&auth=loc_quiet','browse&auth=search_off','browse&auth=search_on','browse&auth=city_off']}
p=os.path.join(R,'tools','w7_states.json');d=json.load(open(p,encoding='utf-8'))
for k,ss in NEW.items():
    for x in ss:
        assert x not in d[k]['states'],x;d[k]['states'].append(x)
json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump(NEW,open(os.path.join(R,'tools','w12_states.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('ok',sum(map(len,NEW.values())))
