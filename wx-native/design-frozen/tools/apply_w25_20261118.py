"""W25（D-181）：快捷下单已选仓位、确认订单仓位卡第二行去掉开头的容量。
单仓只写尺寸；组合仓第一行没有合计容量，第二行写「合计 X m³」。每处替换只做一次（已替换则跳过）。"""
import os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    if b in s: print('skip',f); return
    assert s.count(a)==1,(f,s.count(a));open(p,'w',encoding='utf-8').write(s.replace(a,b));print('done',f)
sub('pages/w3-render.js',
 """(chosen?'<b style="color:var(--mk-color-ink-primary)">'+esc(rows.reduce((n,u)=>n+u.volume,0))+'m³</b> · '+esc(rows[0].dimensions):""",
 """(chosen?(rows.length>1?'<b style="color:var(--mk-color-ink-primary)">合计 '+esc(rows.reduce((n,u)=>n+u.volume,0))+'m³</b>':esc(rows[0].dimensions)):""")
sub('pages/w2-render.js',
 """<div class="meta"><b>'+esc(units.reduce((n,x)=>n+x.volume,0))+'m³</b><span>'+esc(u.dimensions)+'</span></div>'""",
 """<div class="meta">'+(units.length>1?'<b>合计 '+esc(units.reduce((n,x)=>n+x.volume,0))+'m³</b>':'<span>'+esc(u.dimensions)+'</span>')+'</div>'""")
