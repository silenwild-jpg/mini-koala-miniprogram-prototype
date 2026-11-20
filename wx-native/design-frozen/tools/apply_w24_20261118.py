"""W24（张坤 2026-11-18）：D-173～D-180。容量范围文字、㎡ 不显示换算说明、「预约用仓」并名、付款后实名兜底、送搬运规则（免费运输 1 次）等。非幂等。"""
import sys,os,re
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b,n=1):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    assert s.count(a)==n,(f,a,s.count(a))
    open(p,'w',encoding='utf-8').write(s.replace(a,b))
def cnt(f,a): return open(os.path.join(R,f),encoding='utf-8').read().count(a)

# ---- D-177（D-154 定稿）：容量范围文字「0.5m³–200㎡」----
sub('pages/w5-render.js','请填写0.5–200m³','请填写0.5m³–200㎡',2)
sub('pages/w2-render.js',"""(m2?'可填 0.2–80㎡':'可填 0.5–200m³')""","""'可填 0.5m³–200㎡'""")

# ---- D-178：㎡ 不显示换算说明（层高等实际仓位长宽高数据）----
sub('pages/w3-render.js',"""' m³（按层高 '+AREA_H+'m）</div>'""","""' m³</div>'""")
sub('pages/w2-render.js',"""' m³（按层高 '+H+'m）</div>'""","""' m³</div>'""")
sub('pages/w1-render.js',"""' m³（按层高 '+H+'m）</div>'""","""' m³</div>'""")

# ---- D-179：「预约与咨询」「提交用仓需求」并到「预约用仓」----
sub('pages/w6-render.js',"""'查看已提交的预约与咨询'""","""'查看已提交的预约'""")
sub('pages/w6-render.js',"""'暂无预约与咨询','提交预约或咨询后，可在这里查看受理进度。'""","""'暂无预约记录','预约用仓后，可在这里查看受理进度。'""")
sub('pages/w6-render.js',"""<div class="sec-title">提交用仓需求</div>""","""<div class="sec-title">预约用仓</div>""")
sub('pages/w3-render.js',"""submit:'提交用仓需求'}""","""submit:'预约用仓'}""")
for f in ('pages/w5-render.js','pages/w6-render.js','pages/w3-render.js'):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    s=s.replace('查看预约与咨询','查看预约记录').replace('预约与咨询','预约用仓')
    open(p,'w',encoding='utf-8').write(s)
print('part1 ok')
