"""W24 第五部分（D-173）：门店列表紧凑卡（第三家起）也显示「满6个月免费运输」标签——远距离门店通常排在后面。非幂等。"""
import sys,os
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b,n=1):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    assert s.count(a)==n,(f,a,s.count(a))
    open(p,'w',encoding='utf-8').write(s.replace(a,b))
sub('pages/w1-render.js',"""<div class="tags">'+tagsHtml(pres.tags(s,2))+'</div><div class="meta">""","""<div class="tags">'+(W7.freeTransport(displayedKm(s))?'<span class="tag promo">'+W7.FREE_TRANSPORT.tag+'</span>'+tagsHtml(pres.tags(s,1)):tagsHtml(pres.tags(s,2)))+'</div><div class="meta">""")
print('part5 ok')
