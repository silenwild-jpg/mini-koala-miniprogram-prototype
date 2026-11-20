"""W24 第三部分（D-180，W22 §8 遗留按建议执行）：S5 仓位行「约X㎡」、企业页「其他」租期底部弹层、首页系统失败态保留状态栏与顶栏；登记新增状态。非幂等。"""
import sys,os,json
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b,n=1):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    assert s.count(a)==n,(f,a,s.count(a))
    open(p,'w',encoding='utf-8').write(s.replace(a,b))
# S5 仓位行补「约X㎡」（与 S01 / S02 同一函数；「大一档」行已有差额说明，不再加）
sub('pages/w2-render.js',"""<b>'+esc(l.volume)+'m³</b><span>· '+(l.next&&a.monthly_average>first.monthly_average?""","""<b>'+esc(l.volume)+'m³</b>'+(single&&!l.next&&window.SIM_SPACE_UNIT.unitAreaSuffix(single)?'<span>· '+esc(window.SIM_SPACE_UNIT.unitAreaSuffix(single))+'</span>':'')+'<span>· '+(l.next&&a.monthly_average>first.monthly_average?""")
# 企业页「其他」租期：页内面板 → 底部弹层（与 cap / items / quick / booking 同一做法）
p=os.path.join(R,'pages/w5-render.js');s=open(p,encoding='utf-8').read()
a=s.index("""(termOther||draftErr==='term'||err==='INVALID_TERM'?'<div class="termpanel">""");b=s.index("""'</div>':'')+'</div></div>'));""",a)
s=s[:a]+"""(draftErr==='term'||err==='INVALID_TERM'?'<div class="errtext">'+esc(DRAFT_MSG.term)+'</div>':'')+'</div></div>'));"""+s[b+len("""'</div>':'')+'</div></div>'));"""):]
k="""  if(q.get('overlay')==='date')ovr.append("""
assert s.count(k)==1
s=s.replace(k,"""  if(q.get('overlay')==='term'){const P0=W7.TERM_PRESETS,oth=Number.isInteger(v.term)&&!P0.includes(v.term),d=oth?W7.termDiscount(v.term):''; /* W24 D-180：其他租期底部弹层 */
    ovr.append(sheet('其他租期','<div class="termother"><span class="stepper" role="group" aria-label="其他租期"><button type="button" data-action="termMinus" aria-label="减少一个月"'+(oth&&v.term>1?'':' class="off"')+'>−</button><output>'+(oth?v.term+'个月':'—')+'</output><button type="button" data-action="termPlus" aria-label="增加一个月">＋</button></span>'+(d?'<span class="tag disc">'+d+'</span>':'')+'</div><div class="chips inline soft" role="group" aria-label="常用租期">'+[18,24,36].map(m=>chip(m+'个月',v.term===m,'term',m)).join('')+'</div><p class="fine">可选 1–60 个月</p>','<div class="acts"><button type="button" class="btn neutral" data-action="closeSheet">取消</button><button type="button" class="btn primary'+(oth?'':' disabled')+'"'+(oth?'':' disabled aria-disabled="true"')+' data-action="customApply">确定</button></div>'));}
"""+k)
open(p,'w',encoding='utf-8').write(s)
# 首页：状态栏和顶栏包在 .hero-wrap 里，系统态原来把整块隐藏
sub('pages/w7-sys.js',"""[...screen.children].forEach(c=>{if(!c.matches(KEEP))c.style.display='none';});""","""[...screen.children].forEach(c=>{if(c.matches(KEEP))return;
      if(c.querySelector(':scope > .statusbar, :scope > .topbar')){[...c.children].forEach(g=>{if(!g.matches(KEEP))g.style.display='none';});c.style.background='none';c.style.minHeight=(Math.max(0,...[...c.querySelectorAll(':scope > .statusbar, :scope > .topbar')].map(x=>x.offsetTop+x.offsetHeight))+8)+'px';c.querySelectorAll(':scope > .statusbar.overlay').forEach(x=>x.classList.remove('overlay'));} /* W24：首页状态栏 / 顶栏在 .hero-wrap 内，只隐藏其余内容 */
      else c.style.display='none';});""")
# 状态登记
NEW={'s01':['far_transport'],'business':['custom&overlay=term']}
p=os.path.join(R,'tools/w7_states.json');d=json.load(open(p,encoding='utf-8'))
for k,ss in NEW.items():
    for x in ss:
        assert x not in d[k]['states'];d[k]['states'].append(x)
json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump(NEW,open(os.path.join(R,'tools/w24_states.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('part3 ok')
