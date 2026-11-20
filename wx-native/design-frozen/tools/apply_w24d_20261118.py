"""W24 第四部分（D-180，W18 §6 第 10 项）：收藏失效状态（仓位已租出 / 门店暂停营业）。非幂等。"""
import sys,os,json
R=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def sub(f,a,b,n=1):
    p=os.path.join(R,f);s=open(p,encoding='utf-8').read()
    assert s.count(a)==n,(f,a,s.count(a))
    open(p,'w',encoding='utf-8').write(s.replace(a,b))
F='pages/w6-render.js'
sub(F,"""favorites:['SIM_BJ02_U03']}));return lifeCore('normal');}},""","""favorites:['SIM_BJ02_U03']}));return lifeCore('normal');},
  list_gone:()=>{sessionStorage.setItem(FAV_KEY,JSON.stringify({storeFavorites:['SIM_BJ01','SIM_BJ03'],favorites:['SIM_BJ02_U03'],gone:['SIM_BJ03','SIM_BJ02_U03']}));return lifeCore('normal');}}, /* W24：收藏的仓位已租出 / 门店暂停营业（演示标记，真实取仓位与门店状态） */""")
sub(F,"""units=(ui.favorites||[]).map(unitById).filter(Boolean);""","""units=(ui.favorites||[]).map(unitById).filter(Boolean),gone=id=>(ui.gone||[]).includes(id),gtag=t=>'<span class="tag" style="margin-left:6px;flex:none">'+t+'</span>';""")
sub(F,"""<span title="'+esc(s.name)+'">'+esc(s.name)+'</span></div><div class="u ellip">'+esc(s.address)+'</div>""","""<span title="'+esc(s.name)+'">'+esc(s.name)+'</span>'+(gone(s.id)?gtag('暂停营业'):'')+'</div><div class="u ellip">'+(gone(s.id)?'可查看附近其他门店':esc(s.address))+'</div>""")
sub(F,"""<div class="n"><span>'+esc(s.name)+'</span></div><div class="u">'+esc(cabinLabel(u)+' · '+u.dimensions)+'</div>""","""<div class="n"><span>'+esc(s.name)+'</span>'+(gone(u.id)?gtag('已租出'):'')+'</div><div class="u">'+esc(cabinLabel(u)+' · '+u.dimensions)+(gone(u.id)?' · 可看同店其他仓位':'')+'</div>""")
p=os.path.join(R,'tools/w7_states.json');d=json.load(open(p,encoding='utf-8'))
k=[x for x in d if 'favorites' in x]
if k: d[k[0]]['states'].append('list_gone')
else: d['acc_favorites']={'file':'pages/acc.html?view=favorites','states':['list_gone']}
json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
p=os.path.join(R,'tools/w24_states.json');n=json.load(open(p,encoding='utf-8'));n['acc_favorites']=['list_gone'];json.dump(n,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('part4 ok')
