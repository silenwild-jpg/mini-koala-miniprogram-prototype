"""W23（张坤 2026-11-18：仓位名统一写「A003 · 3.5m³」）：去掉 W22 加的「仓号 」前缀；S02 仓位行把容量并入仓位名。非幂等。"""
import sys,os
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b,n=1):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    assert s.count(a)==n,(f,a,s.count(a))
    open(p,'w',encoding='utf-8').write(s.replace(a,b))
sub('pages/w1-render.js',"""<div class="unit"><b>仓号 '+esc(u.demo_cabin_no||u.code)""","""<div class="unit"><b>'+esc(u.demo_cabin_no||u.code)""")
for f in('pages/w2-render.js','pages/w3-render.js'):
    sub(f,"""return '仓号 '+cabin+(d?""","""return cabin+(d?""")
sub('pages/w2-render.js',"""<div class="name">仓号 '+esc(u.demo_cabin_no||u.code)+'<small>'+esc(u.volume)+'m³</small></div>""","""<div class="name">'+esc(u.demo_cabin_no||u.code)+' · '+esc(u.volume)+'m³</div>""")
sub('pages/w2-render.js',""":'仓号 '+(single?.demo_cabin_no||single?.code)""",""":(single?.demo_cabin_no||single?.code)""")
for f in('pages/w4-render.js','pages/w6-render.js'):
    sub(f,"""return no?'仓号 '+no+' · '""","""return no?no+' · '""")
sub('pages/w22-terms.js',"""'$1仓号 A0$2 · '""","""'$1A0$2 · '""")
print('W23 applied')
