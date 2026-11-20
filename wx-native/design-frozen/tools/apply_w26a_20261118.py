"""W26 包 A（首页 / 门店列表 / 用仓位置）：A2 定位到无门店城市、A3 免费运输筛选缺用仓位置、A6 首页任务卡 ㎡ 需求、A8 搬家两个地址提示。非幂等。"""
import sys,os,json
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b,n=1):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    assert s.count(a)==n,(f,a[:60],s.count(a))
    open(p,'w',encoding='utf-8').write(s.replace(a,b))
# ---------- w9-auth.js：loc_nocity ----------
sub('pages/w9-auth.js'," *   W14：search_* / loc_area / loc_far 见 pages/w14.js"," *   W26：loc_nocity = 定位到没有门店的城市（演示：成都）→ 自动回到北京，城市位下方轻气泡说明，可切换城市；公里数与免费运输标签不显示\n *   W14：search_* / loc_area / loc_far 见 pages/w14.js")
sub('pages/w9-auth.js',"""  /* W14 D-127：搜索面板与城市选择层合并""","""  /* W26 A2（张坤 2026-11-18）：定位到没有门店的城市 → 说明后回到北京。不拦截、不弹确认：页面直接是北京内容，气泡给「切换城市」。
     公里数是相对用户所在位置的，人在外地时不显示；「满6个月免费运输」标签依赖距离，同样不显示。 */
  const NOCITY='成都'; /* 演示城市 */
  function nocity(){
    if(!cityBtn)return;
    cityBtn.setAttribute('aria-label','当前城市 北京；您所在的'+NOCITY+'暂无门店');
    if(getComputedStyle(screen).position==='static')screen.style.position='relative';
    const r=cityBtn.getBoundingClientRect(),sr=screen.getBoundingClientRect();
    const n=$el('<div class="w12pop w26nocity" role="status" aria-label="城市提醒"><span class="tx">'+NOCITY+'暂无门店，已为您显示北京门店</span><button type="button" class="btn text sm" data-action="changeCity">切换城市</button><button type="button" class="x" aria-label="关闭城市提醒" data-action="closeHint">'+svg(I.close,'ico sm')+'</button></div>');
    n.style.top=(r.bottom-sr.top+6)+'px';n.style.left=Math.max(12,r.left-sr.left-4)+'px';
    screen.append(n);
    document.querySelectorAll('.scard .meta > b, .rcard .loc > b').forEach(b=>{const nx=b.nextElementSibling;b.remove();if(nx)nx.textContent=nx.textContent.replace(/^·\\s*/,'');});
    const FT=W&&W.FREE_TRANSPORT&&W.FREE_TRANSPORT.tag;
    if(FT)document.querySelectorAll('.scard .tags .tag').forEach(t=>{if(t.textContent===FT)t.remove();});
    document.body.dataset.nocity=NOCITY;
  }
  /* W14 D-127：搜索面板与城市选择层合并""")
sub('pages/w9-auth.js',"""  }else if(LOC[auth]&&(PAGE==='H01'||PAGE==='S01')){""","""  }else if(auth==='loc_nocity'&&(PAGE==='H01'||PAGE==='S01')){nocity();
  }else if(LOC[auth]&&(PAGE==='H01'||PAGE==='S01')){""")
# ---------- w14.js：面板说明行 / 搬家提示 / 免费运输缺用仓位置 ----------
sub('pages/w14.js'," *    loc_far = 已定位但 5km 内没有门店（D-128）。"," *    W26：transport_noloc（S01）= 没有用仓位置时点「免费运输」→ 打开本面板并说明原因；search_move = 搬家场景进入时，「最近使用」下提示搬出地 / 搬入地可切换对比。\n *    loc_far = 已定位但 5km 内没有门店（D-128）。")
sub('pages/w14.js',"""<button type="button" class="btn text sm" data-action="close">取消</button></div>';
  if(o.query){""","""<button type="button" class="btn text sm" data-action="close">取消</button></div>'+(o.note?'<p class="w26pnote" role="status">'+esc(o.note)+'</p>':'');
  if(o.query){""")
sub('pages/w14.js',"""map(r=>chip(r[0],0,r[1])).join('')+'</div>';""","""map(r=>chip(r[0],0,r[1])).join('')+'</div>'+(o.move?'<p class="w26pnote soft" role="note">搬家用仓：搬出地、搬入地都可以查。先选一处，另一处会留在「最近使用」，可随时切换对比。</p>':'');""")
sub('pages/w14.js',"""else if((PAGE==='S5'&&ov==='origin')""","""else if(auth==='search_move')panel({located:true,move:true}); /* W26 A8：搬家两个地址，复用「最近使用」，用仓位置仍只有一个（D-127） */
else if(auth==='transport_noloc'&&PAGE==='S01'){quiet();panel({located:false,note:'免费运输按用仓位置到门店的距离判断，请先选择用仓位置。'});} /* W26 A3 */
else if((PAGE==='S5'&&ov==='origin')""")
# ---------- w1-render.js：首页任务卡 ㎡ 需求 ----------
sub('pages/w1-render.js',"""(m³|个月|天|小时|万\\+?|\\+)?$/);""","""(m³|㎡|个月|天|小时|万\\+?|\\+)?$/);""")
sub('pages/w1-render.js',"""function twoLayer(task,state){""","""/* W26 A6：需求按 ㎡ 填写时，任务卡主格写面积、标签带「约X m³」；待办条与 S01 / S5 需求条同写法「2㎡ · 约4.8m³」（D-178 不写层高） */
const CAP_LABELS=['预计容量','需要容量'];
const capFacts=(facts,r,strip)=>r&&r.input_unit==='m2'&&Number(r.input_value)>0&&Number(r.capacity_m3)>0?facts.map(([v,l])=>CAP_LABELS.includes(l)?(strip?[window.SIM_SPACE_UNIT.demandCapacity(r),l]:[Number(r.input_value)+'㎡','预计面积 · 约'+Number(r.capacity_m3)+'m³']):[v,l]):facts;
function twoLayer(task,state){""")
sub('pages/w1-render.js',"""primary:['查看推荐仓位','recommend'],secondary:['修改需求','estimate'],score:11,layout:'task',orderId:null,storeId:null});""","""primary:['查看推荐仓位','recommend'],secondary:['修改需求','estimate'],score:11,layout:'task',orderId:null,storeId:null,req:NEW_DEMAND});""")
sub('pages/w1-render.js',"""  r.facts=(t.facts||[]).map(([v,l])=>[v,l==='首次应付'?'本次应付':l]).filter(([v])=>!FILLER.has(String(v)));""","""  r.facts=(t.facts||[]).map(([v,l])=>[v,l==='首次应付'?'本次应付':l]).filter(([v])=>!FILLER.has(String(v)));
  if(k==='estimated'||k==='selected')r.facts=capFacts(r.facts,t.req||state.requirement,false);""")
sub('pages/w1-render.js',"""    else if(t.key==='selected'){k='找仓进度';txt=[...(t.facts||[]).map(""","""    else if(t.key==='selected'){k='找仓进度';txt=[...capFacts(t.facts||[],t.req||state.requirement,true).map(""")
sub('pages/w1-render.js',"""    else{k='找仓进度';txt=(t.facts||[]).map(""","""    else{k='找仓进度';txt=capFacts(t.facts||[],t.req||state.requirement,true).map(""")
sub('pages/w1-render.js',"""  /* ---- W7-B 新增演示状态（D-81 两层任务卡）---- */""","""  /* ---- W26 A6：㎡ 需求（2㎡ ≈ 4.8m³，与 S01 matched_area 同一组数）---- */
  estimated_area:c=>{c.setScenario('normal');const st=c.state();st.requirement={...st.requirement,capacity_m3:4.8,term_months:6,term_confirmed:true,input_unit:'m2',input_value:2};return makeCore(st);},
  active_todo_area:c=>{c.setScenario('lifeActive');NEW_DEMAND={capacity_m3:4.8,term_months:6,input_unit:'m2',input_value:2};},
  /* ---- W7-B 新增演示状态（D-81 两层任务卡）---- */""")
sub('pages/w1-render.js',"""filter(v=>!FILLER.has(String(v))).join(' · ')+'，查看推荐仓位';}""","""filter(v=>!FILLER.has(String(v))).join(' · ')+((t.req||state.requirement||{}).input_unit==='m2'?'':'，查看推荐仓位');} /* W26：㎡ 需求多一段「约X m³」，375 宽放不下尾句，整行可点、有箭头，尾句省略 */""")
# ---------- 样式 ----------
open(os.path.join(R,'design-system/w26-a.css'),'a',encoding='utf-8').write("""
/* 用仓位置面板内的说明行（A3 免费运输缺用仓位置、A8 搬家两个地址）；面板只在 H01 / S01 / S5 / QUICK 出现 */
body[data-page] .w12search .w26pnote{margin:4px 0 8px;padding:10px 12px;border-radius:var(--mk-radius-thumb);background:var(--mk-color-brand-tint);color:var(--mk-color-ink-primary);font-size:var(--mk-font-size-sm);line-height:1.5}
body[data-page] .w12search .w26pnote.soft{margin:10px 0 0;padding:0;background:none;color:var(--mk-color-ink-secondary)}
/* 首页任务卡：㎡ 需求的标签较长，允许收窄 */
body[data-page="H01"] .dcard .facts span{overflow:hidden;text-overflow:ellipsis;max-width:100%}
""")
# ---------- 状态登记 ----------
NEW={'h01':['new&auth=loc_nocity','estimated_area','active_todo_area'],'s01':['browse&auth=loc_nocity','browse&auth=transport_noloc','browse&auth=search_move']}
json.dump(NEW,open(os.path.join(R,'tools/w26_states_a.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
p=os.path.join(R,'tools/w7_states.json');d=json.load(open(p,encoding='utf-8'))
for k,ss in NEW.items():
    for x in ss:
        assert x not in d[k]['states'];d[k]['states'].append(x)
json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('w26a ok')
