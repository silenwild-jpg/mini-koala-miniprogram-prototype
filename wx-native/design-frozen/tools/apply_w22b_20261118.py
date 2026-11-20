"""W22（2026-11-18）：D-167 用词统一 / D-168 内部表达 / D-169 冗余 / D-170 W18 §3.3 版式项 / D-171 旅程缺口（部分）。非幂等，apply_w22 在企业页租期组件一步断言失败后中止，本文件接着跑剩余步骤（该步匹配串已修正）。"""
import re,glob,os,io
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(f): return open(os.path.join(R,f),encoding='utf-8').read()
def wr(f,s): open(os.path.join(R,f),'w',encoding='utf-8').write(s)
def rep(f,old,new,n=None,regex=False):
    s=rd(f); c=len(re.findall(old,s)) if regex else s.count(old)
    assert c>0 and (n is None or c==n), (f,old[:40],c,n)
    wr(f,re.sub(old,new,s) if regex else s.replace(old,new)); print('%-22s %3d  %s -> %s'%(f.split('/')[-1],c,old[:28].replace('\n',' '),new[:28].replace('\n',' ')))
PAGES=sorted(glob.glob(os.path.join(R,'pages','*.js'))+glob.glob(os.path.join(R,'pages','*.html')))
def allrep(old,new):
    t=0
    for p in PAGES:
        s=open(p,encoding='utf-8').read(); c=s.count(old)
        if c: open(p,'w',encoding='utf-8').write(s.replace(old,new)); t+=c
    print('ALL pages              %3d  %s -> %s'%(t,old,new)); assert t>0,old
# （D-167～D-169 与 D-170 的层标签已由 apply_w22_20261118.py 完成）
rep('pages/w5-render.js',"<div class=\"chips inline soft\" role=\"group\" aria-label=\"租用时长\">'+P.map(m=>chip(m+'个月',v.term===m,'term',m,dsc(m))).join('')+chip(termOther?v.term+'个月':'其他',termOther,'moreTerms','',termOther?dsc(v.term):'')+'</div>'","'+W7.termSeg(v.term)",1)
rep('pages/w1-render.js',"'<a class=\"moreunits\" href=\"#S02\">另有 '+more+' 个可租 ›</a>'","'<a class=\"moreunits\" href=\"#S02\">另有 '+more+' 个可租 · 查看门店 ›</a>'",1)
rep('pages/w1-render.js',"(facts.inventoryLine?'<span class=\"inv\">· '+esc(facts.inventoryLine)+'</span>':'')","''",1)
rep('pages/w2-render.js',"(f.inventoryLine?'<div class=\"inv\">'+esc(f.inventoryLine)+'</div>':'')","''",1)
rep('pages/w4-render.js','<p>取消后仓位将释放，订单不可恢复；如仍需用仓需重新下单。</p>','<p>取消后仓位将释放；如仍需用仓，可重新下单。</p>',1)
rep('pages/w3-render.js','会删除当前选择的物品与数量。<br>此操作不可撤销。','会删除当前选择的物品与数量。',1)
rep('pages/w4-render.js','<p>提交后进入退仓流程，订单不能再办理续租。</p>','<p>提交后进入退仓流程；如需继续用仓，请先办理续租。</p>',1)
rep('pages/w4-render.js',"(type==='early'?kvl('费用结算',ct('early.rule')+'。 <a href=\"agreement.html?doc=usage\">查看协议</a>'):'')",
 "(type==='early'?kv('预计结算费用','约 '+money(earlyFee()))+kvl('费用结算',ct('early.rule')+'。 <a href=\"agreement.html?doc=usage\">查看协议</a>'):'')",1)
rep('pages/w4-render.js',"  const confirmDlg=()=>dialog('确认提交退仓？'","  /* W22 D-170：提前退仓只算违约金（D-165）= 剩余租金 20% 与 1 个月月租中较高者；界面只给一个数，不写规则（D-113） */\n  const earlyFee=()=>{const o=core.state().orders.find(z=>z.id===id)||{},m=Number(o.deposit)||0,left=Math.max(0,Math.ceil((new Date(v.end_date)-new Date(core.today()))/2629800000));return Math.round(Math.max(m,m*left*0.2));};\n  const confirmDlg=()=>dialog('确认提交退仓？'",1)
# ---------- D-171 旅程缺口 ----------
for f in ['pages/w1-render.js','pages/w6-render.js']: rep(f,'<a href="#help">查看须知 ›</a>','<a href="agreement.html?doc=notice">查看须知 ›</a>',1)
rep('pages/w4-render.js',"refunded:life('lifeEnded'),\n  refund_failed:","refunded:life('lifeEnded'),refunded_partial:life('lifeEnded'), /* W22：有待结费用、部分退还 */\n  refund_failed:",1)
rep('pages/w4-render.js',"  /* W22 D-169：押金保管中只留","  if(key==='refunded_partial'){const due=200,back=Math.max(0,Number(raw.deposit)-due);body().append(el('<section class=\"card\" aria-label=\"押金结算\"><div class=\"sec-title\">押金结算</div><div class=\"kvlist\">'+kv('订单押金',money(raw.deposit))+kv('待结费用','−'+money(due))+kv('实际退还',money(back))+'</div><p class=\"fine\" style=\"margin:8px 0 0\">待结费用明细可向门店查询。</p></section>'));}\n  /* W22 D-169：押金保管中只留",1)
# 运行时来源文字的显示层归一（runtime 原件不改）
wr('pages/w22-terms.js',"""/* W22 D-167 · 用词显示层归一。runtime/ 原件里的旧叫法（租赁中、身份验证、用仓预约、退租、验收、A03）在显示时换成张坤 2026-11-18 定的叫法；
 * 代码侧按 DEV_HANDOFF v11 A-82 改 runtime 文案后，本文件可删除。协议页不加载本文件（合同正文逐字显示）。 */
(function(){
  const RULES=[[/租赁中/g,'租用中'],[/入仓前需完成验证/g,'入仓前需完成实名认证'],[/身份验证/g,'实名认证'],[/查看验证进度/g,'查看认证进度'],[/开始验证/g,'开始认证'],[/用仓预约/g,'预约用仓'],[/退租/g,'退仓'],[/验收/g,'验仓'],[/(^|[^A-Za-z0-9号] ?)A(\\d{2}) · /g,'$1仓号 A0$2 · ']];
  const fix=n=>{let t=n.nodeValue,o=t;for(const [a,b] of RULES)t=t.replace(a,b);if(t!==o)n.nodeValue=t;};
  const walk=r=>{if(r.nodeType===3)return fix(r);if(r.nodeType!==1||/^(SCRIPT|STYLE)$/.test(r.tagName))return;const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))fix(n);};
  walk(document.body);
  new MutationObserver(ms=>ms.forEach(m=>{if(m.type==='characterData')fix(m.target);else m.addedNodes.forEach(walk);})).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
""")
for p in PAGES:
    if p.endswith('.html') and not p.endswith('agreement.html'):
        s=open(p,encoding='utf-8').read(); assert '</body>' in s; open(p,'w',encoding='utf-8').write(s.replace('</body>','<script src="w22-terms.js"></script>\n</body>',1))
print('done')
