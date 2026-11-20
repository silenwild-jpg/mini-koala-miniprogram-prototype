"""W16（2026-11-18）：容量估算补缺失状态 + 长件提示（去「大件」标签）+ S5 估算衔接 + S01 浏览卡补可租容量 + S02 门店头部信息分层。
非幂等：每处替换都断言恰好命中 1 次。"""
import os,io
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def patch(rel,pairs):
    p=os.path.join(ROOT,rel);s=io.open(p,encoding='utf-8').read()
    for a,b in pairs:
        assert s.count(a)==1,(rel,s.count(a),a[:70])
        s=s.replace(a,b)
    io.open(p,'w',encoding='utf-8').write(s)
# ---------------- CAP / ITEMS ----------------
patch('pages/w3-render.js',[
 # CAP 状态
 ("advisor_hint:{v:20,term:12},sales:{v:30}};","advisor_hint:{v:20,term:12},sales:{v:30},area_invalid:{unit:'m2',area:0.1},over:{v:260,term:12}}; /* W16：㎡ 无效输入；超过 200m³ 转顾问 */"),
 ("const n=raw===''?null:Number(raw),ok=n!==null&&capValid(n),missing=n===null,invalid=!missing&&!ok,term=cfg.term||null;\n  const sales=ok&&W7.salesOnly(n),hint=ok&&!sales&&n>W7.ADVISOR_CAP_M3;",
  "const areaBad=unit==='m2'&&cfg.area!==undefined&&!areaValid(cfg.area); /* W16 */\n  const n=raw===''?null:Number(raw),ok=n!==null&&capValid(n),over=n!==null&&Number.isFinite(n)&&n>200,missing=n===null&&!areaBad,invalid=areaBad||(!missing&&!ok&&!over),term=cfg.term||null;\n  const sales=(ok&&W7.salesOnly(n))||over,hint=ok&&!sales&&n>W7.ADVISOR_CAP_M3; /* W16：>200m³ 与 ≥30m³ 同样交顾问，不再报「超出范围」 */"),
 ("(invalid?'<div class=\"caphelp\"><span class=\"err\">请填写0.5–200m³的有效容量</span></div>':'')",
  "(invalid?'<div class=\"caphelp\"><span class=\"err\">'+(areaBad?'请填写 0.2–80㎡ 的面积，最多一位小数':'请填写不小于 0.5m³ 的容量，最多两位小数')+'</span></div>':'')"),
 ("  if(ok){const b=BANDS.find(x=>n<=x.max)||BANDS[BANDS.length-1];","  if(ok||over){const b=BANDS.find(x=>n<=x.max)||BANDS[BANDS.length-1];"),
 ("need=[missing?'填写容量':invalid?'修改容量':'',term?'':'选择租期']","need=[missing?'填写容量':areaBad?'修改面积':invalid?'修改容量':'',term?'':'选择租期']"),
 # ITEMS 状态
 ("clear:{seed:true,browsing:true,overlay:'cart',overlay2:'clear'}};",
  "clear:{seed:true,browsing:true,overlay:'cart',overlay2:'clear'},\n  /* W16 补缺失状态 */\n  variant:{seed:true,browsing:true,overlay:'variant',ovItem:'sofa3'},qty:{seed:true,browsing:true,overlay:'qty',ovItem:'box'},qty_max:{seed:true,browsing:true,overlay:'qty',ovItem:'box',qtyRaw:'1200'},\n  tiny:{seedTiny:true,category:'organize',term:6},over:{seedHuge:true,category:'business',term:12},restored:{seed:true,browsing:true,term:6,restored:true}};\nconst QTY_MAX=999; /* W16：单种物品数量上限，设计侧初值（基线没有上限），待业务确认 */"),
 ("  if(cfg.seedBig){","  if(cfg.seedTiny){COUNT.box=1;}\n  if(cfg.seedHuge){COUNT.pallet=90;COUNT.goodsbox=200;}\n  if(cfg.seedBig){"),
 ("const validVol=()=>Number.isFinite(volume())&&volume()>0&&volume()<=200&&(st.known===null||volume()>=0.5);",
  "const validVol=()=>Number.isFinite(volume())&&volume()>0&&(st.known===null||(volume()>=0.5&&volume()<=200)); /* W16：按物品估出 >200m³ 不再置灰，走交顾问 */\n  const tiny=()=>st.known===null&&volume()>0&&volume()<.5;\n  const longSel=()=>selected().filter(x=>x.long);\n  /* W16 长件提示（替代「大件」标签）：目录没有物品长度字段，只提示对照仓位尺寸，不做能否放入的判断 */\n  const longHint=()=>longSel().length?'<p class=\"fine longhint\">'+ico('i-info','ico sm')+'<span>含长件：'+esc(longSel().map(x=>x.name).join('、'))+'。选仓时请对照仓位的长宽高。</span></p>':'';"),
 ("(x.long?'<span class=\"tag\" title=\"大件物品\">大件</span>':'')","''"),
 ("<output>'+n+'</output><button type=\"button\" data-action=\"step\" data-value=\"'+x.id+'|1\" aria-label=\"增加'+esc(x.name)+'\">+</button></span></div></div></article>'",
  "<output data-action=\"qty\" data-value=\"'+x.id+'\" title=\"点数字可直接填写数量\">'+n+'</output><button type=\"button\" data-action=\"step\" data-value=\"'+x.id+'|1\" aria-label=\"增加'+esc(x.name)+'\">+</button></span></div></div></article>'"),
 ("<h4>没有找到相关物品</h4><p>可尝试其他名称或切换分类</p><div class=\"acts\"><button type=\"button\" class=\"btn secondary md\" data-action=\"resetSearch\">查看全部物品</button></div></section>')",
  "<h4>没有找到相关物品</h4><p>可换个名称，或选一件大小相近的物品代替</p><div class=\"acts\" style=\"flex-direction:column;align-items:center\"><button type=\"button\" class=\"btn secondary md\" data-action=\"resetSearch\">查看全部物品</button><button type=\"button\" class=\"btn text md\" data-action=\"toCap\" data-href=\"cap.html\">直接填写容量</button><button type=\"button\" class=\"btn text md\" data-action=\"advisor\">顾问协助</button></div></section>')"),
 ("已选 '+kinds()+' 种、'+units()+' 件 · 查看清单 ›</button>':'')+'<div>'","已选 '+kinds()+' 种、'+units()+' 件 · 查看清单 ›</button>':'')+longHint()+'<div>'"),
 ("(arr.length&&selected().length?'<p class=\"fine estnote\">建议容量为'+EST_NOTE+'。</p>':'')",
  "(arr.length&&selected().length?'<p class=\"fine estnote\">'+(tiny()?'物品约 '+disp1(exactSum())+'m³，小于最小仓位，按 0.5m³ 为您匹配。':'建议容量为'+EST_NOTE+'。')+'</p>':'')"),
 ("const bottom='<span class=\"big\">'+(volume()>0?(st.known!==null?'约 ':'建议 '):'')+disp1(volume())+'m³</span> · '",
  "const bottom='<span class=\"big\">'+(tiny()?'按 0.5m³ 匹配':(volume()>0?(st.known!==null?'约 ':'建议 '):'')+disp1(volume())+'m³')+'</span> · '"),
 ("<div class=\"carttotal\"><span class=\"k\">建议容量","'+longHint()+'<div class=\"carttotal\"><span class=\"k\">建议容量"),
 ("  if(cfg.overlay2==='clear')",
  "  if(ov==='variant'){const x=BYID[cfg.ovItem];ovr.append(sheet('选择规格',x.variants.map(v=>'<div class=\"opt'+(v.id===VAR[x.id]?' on':'')+'\" data-action=\"pickVariant\" data-value=\"'+v.id+'\"><span class=\"r\"><span>'+esc(v.name)+'</span></span><span class=\"amt\">约 '+display(v.volume_m3)+'m³/件'+(v.id===VAR[x.id]?ico('i-check','ico sm'):'')+'</span></div>').join(''),'<p class=\"fine\">'+esc(x.name)+' · 换规格后数量不变，小计按新规格计算。</p>'));}\n"+
  "  if(ov==='qty'){const x=BYID[cfg.ovItem],raw=cfg.qtyRaw??String(COUNT[x.id]),bad=!(Number(raw)>=0&&Number(raw)<=QTY_MAX);\n    ovr.append(el('<div class=\"scrim center\" role=\"dialog\" aria-modal=\"true\" aria-label=\"填写数量\"><div class=\"dialog qtydlg\"><h4>'+esc(x.name)+'</h4><p>填写数量</p><div class=\"input'+(bad?' err':'')+'\" role=\"textbox\" aria-label=\"数量\"><span class=\"ph filled\" style=\"font-weight:600\">'+esc(raw)+'</span><span class=\"suffix\">件</span></div>'+(bad?'<div class=\"qerr\">单种物品最多填 '+QTY_MAX+' 件，更多请交给顾问配仓</div>':'')+'<div class=\"chips inline soft\" role=\"group\" aria-label=\"常用数量\">'+[10,20,50].map(v=>chip(v+' 件',false,'qtyQuick',v)).join('')+'</div><div class=\"acts\"><button type=\"button\" class=\"btn neutral md\" data-action=\"qtyNo\">取消</button><button type=\"button\" class=\"btn primary md'+(bad?' disabled':'')+'\"'+(bad?' disabled aria-disabled=\"true\"':'')+' data-action=\"qtyYes\">确定</button></div></div></div>'));}\n"+
  "  if(cfg.restored)toast('已保留上次选择的物品，可继续增减');\n  if(cfg.overlay2==='clear')"),
])
# ---------------- S5：估算 → 推荐的衔接说明 ----------------
patch('pages/w2-render.js',[
 ("  sales30:{scenario:'normal',capacity:30} /* W7 新增：边界 30m³（含 30）交销售 */};",
  "  sales30:{scenario:'normal',capacity:30} /* W7 新增：边界 30m³（含 30）交销售 */,\n  from_items:{scenario:'normal',capacity:3.3,from:'items'} /* W16：从按物品估算进入，写明估算值与推荐仓位的关系（演示清单 = ITEMS 默认种子：3 箱 + 2 行李箱 + 1 沙发） */};"),
 ("  document.getElementById('origin').textContent=st.city+' · 全城门店';\n  const list=document.getElementById('rec-list')",
  "  document.getElementById('origin').textContent=st.city+' · 全城门店';\n  if(cfg.from==='items')document.querySelector('.dsum').after(el('<p class=\"estlink\">'+ico('i-info','ico sm')+'<span>按物品估算：物品约 2.1m³，留出码放空隙后建议 '+esc(r.capacity_m3)+'m³。下方是不小于 '+esc(r.capacity_m3)+'m³ 的仓位。<br>清单含长件（三人位沙发），请对照仓位的长宽高。</span></p>'));\n  const list=document.getElementById('rec-list')"),
 # S02 头部分层：身份（店名 + 属性）/ 到店（地址 + 距离 + 须知，成组）/ 价格
 ("<div class=\"addr\">'+(km?'<b>'+km+'</b>':'')+ico('i-pin','ico sm')+'<span class=\"ellip\" title=\"'+esc(s.address)+'\">'+esc(s.address)+'</span></div>'+(tab==='服务设施'?'':'<div class=\"tags\">'+tagsHtml(pres.detailTags(s,5))+'</div>')+(!linked&&tab==='可选仓位'?avgHtml(s):'')+'</div>'));",
  "'+(tab==='服务设施'?'':'<div class=\"tags attrs\">'+tagsHtml(pres.detailTags(s,5))+'</div>')+'<div class=\"arrbox\"><div class=\"addr\">'+ico('i-pin','ico sm')+'<span class=\"ellip\" title=\"'+esc(s.address)+'\">'+esc(s.address)+'</span>'+(km?'<b>'+km+'</b>':'')+'</div></div>'+(!linked&&tab==='可选仓位'?avgHtml(s):'')+'</div>'));"),
])
# ---------------- S01：无需求浏览卡补「可租容量」 ----------------
patch('pages/w1-render.js',[
 ("const avgPriceHtml=s=>{",
  "/* W16：无需求浏览卡价格行右侧补「可租容量」区间（当前可租仓位的最小–最大容量）；只有一种容量时写单值；不写剩余数量 */\nconst capRange=(core,s)=>{const vs=availRows(core,s).map(u=>Number(u.volume)).filter(v=>v>0);if(!vs.length)return '';const a=Math.min(...vs),b=Math.max(...vs);return '<div class=\"caprange\"><span class=\"k\">可租容量</span><b>'+(a===b?a:a+'–'+b)+'m³</b></div>';};\nconst avgPriceHtml=s=>{"),
 ("'<div class=\"price\"><span class=\"unit\">暂无可租仓位</span></div>':avgPriceHtml(s))+'</div>'+ico('i-chev','ico chev')+'</div></a>');",
  "'<div class=\"price\"><span class=\"unit\">暂无可租仓位</span></div>':avgPriceHtml(s))+'</div>'+(s.status==='open'&&!ctx.noMatchPage?capRange(core,s):'')+ico('i-chev','ico chev')+'</div></a>');"),
 ("'<div class=\"soldout nomatch\">暂无可租仓位</div>':'<div class=\"cprice\">'+avgPriceHtml(s)+'</div>';",
  "'<div class=\"soldout nomatch\">暂无可租仓位</div>':'<div class=\"cprice\">'+avgPriceHtml(s)+(ctx.noMatchPage?'':capRange(core,s))+'</div>';"),
])
css='''
/* ===== W16（2026-11-18）===== */
/* ITEMS：长件提示、数量输入、规格弹层 */
.longhint{display:flex;align-items:flex-start;gap:6px;margin:4px 0 8px;line-height:1.5}
.longhint .ico{flex:none;margin-top:2px;color:var(--mk-color-ink-secondary)}
.sheet .longhint{margin:12px 0 0}
.irow .stepper output[data-action="qty"]{cursor:pointer;text-decoration:underline dotted var(--mk-color-line-strong);text-underline-offset:4px}
.dialog.qtydlg .input{margin-top:0}
.dialog.qtydlg .qerr{font-size:var(--mk-font-size-xs);color:var(--mk-color-status-errorText);margin-top:6px;line-height:1.5}
.dialog.qtydlg .chips{margin:12px 0 16px}
.sheet .opt .amt .ico{margin-left:8px;vertical-align:-3px}
.sheet .opt .amt{font-weight:400;color:var(--mk-color-ink-secondary)}
.sheet .opt.on .amt{color:var(--mk-color-brand-text);font-weight:600}
/* S5：估算 → 推荐衔接 */
.estlink{display:flex;align-items:flex-start;gap:6px;padding:10px var(--mk-space-pageGutter);font-size:var(--mk-font-size-sm);line-height:1.5;color:var(--mk-color-ink-secondary);border-bottom:1px solid var(--mk-color-line-hairline)}
.estlink .ico{flex:none;margin-top:2px}
/* S01：浏览卡价格行右侧「可租容量」 */
.scard .caprange{margin-left:auto;display:flex;align-items:baseline;gap:6px;white-space:nowrap;font-size:var(--mk-font-size-sm);color:var(--mk-color-ink-secondary)}
.scard .caprange b{font-size:var(--mk-font-size-md);font-weight:600;color:var(--mk-color-ink-primary)}
.scard.browse .foot .chev{flex:none;margin-left:-4px}
body[data-page="S01"] .scard.compact .cprice{flex-wrap:wrap;gap:0 12px}
body[data-page="S01"] .scard.compact .cprice .caprange{margin-left:0;font-size:var(--mk-font-size-xs)}
body[data-page="S01"] .scard.compact .cprice .caprange b{font-size:var(--mk-font-size-sm)}
/* S02：门店头部信息分层（身份 / 到店 / 价格），不再五行同级堆叠 */
body[data-page="S02"] .s02head .tags.attrs{margin-top:6px;gap:0;flex-wrap:nowrap;overflow:hidden;align-items:center}
body[data-page="S02"] .s02head .tags.attrs .tag:not(.promo){border:0;padding:0;height:auto;background:none;font-size:var(--mk-font-size-sm);line-height:20px;color:var(--mk-color-ink-secondary);flex:none}
body[data-page="S02"] .s02head .tags.attrs .tag:not(.promo)+.tag:not(.promo)::before{content:"·";margin:0 6px;color:var(--mk-color-ink-tertiary)}
body[data-page="S02"] .s02head .tags.attrs .tag.promo{margin-right:8px;flex:none}
body[data-page="S02"] .s02head .arrbox{margin-top:12px;padding:0 12px;background:var(--mk-color-canvas-sunken);border-radius:var(--mk-radius-thumb)}
body[data-page="S02"] .s02head .arrbox .addr{margin-top:0;padding:10px 0;gap:6px}
body[data-page="S02"] .s02head .arrbox .addr .ellip{flex:1;min-width:0}
body[data-page="S02"] .s02head .arrbox .addr b{margin-left:8px}
body[data-page="S02"] .s02head .arrbox .arr-note{padding:10px 0;min-height:40px;border-top:1px solid var(--mk-color-line-hairline)}
body[data-page="S02"] .s02head .avgprice{margin-top:12px}
'''
p=os.path.join(ROOT,'design-system/components.css');io.open(p,'a',encoding='utf-8').write(css)
json_states={"cap":{"states":["area_invalid","over"]},"items":{"states":["variant","qty","qty_max","tiny","over","restored"]},"s5":{"states":["from_items"]}}
import json
p=os.path.join(ROOT,'tools/w7_states.json');d=json.load(io.open(p,encoding='utf-8'))
for k,v in json_states.items():
    d.setdefault(k,{"states":[]})
    for s in v['states']:
        assert s not in d[k]['states'];d[k]['states'].append(s)
json.dump(d,io.open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump({k:v['states'] for k,v in json_states.items()},io.open(os.path.join(ROOT,'tools/w16_states.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('W16 applied')
