"""W22（2026-11-18）：D-167 用词统一 / D-168 内部表达 / D-169 冗余 / D-170 W18 §3.3 版式项 / D-171 旅程缺口（部分）。非幂等，只在 W21 工作树副本上跑一次。"""
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
# ---------- D-167 用词 ----------
allrep('退租','退仓'); allrep('验收','验仓'); allrep('用仓地址','用仓位置')
rep('pages/w4-render.js',"'仓位使用中'","'仓位租用中'",1)
allrep('核验','认证'); allrep('待验证','待认证')
rep('pages/w6-render.js',"'验证通过'","'认证通过'")
for f in ['pages/w2-render.js','pages/w3-render.js']:
    rep(f,"return cabin+(d?' · '+d.replace(/独立仓$/,''):'');","return '仓号 '+cabin+(d?' · '+d.replace(/独立仓$/,''):'');",1)
rep('pages/w3-render.js','填写用仓位置，如：城市、街道和楼栋','填写用仓位置，如：小区、街道和楼栋',1)
# 合同短句模块：只改界面句（ui），合同压缩句与协议正文不动
for f in ['model/mk-contract-text.js','model/mk-contract-text.json']:
    s=rd(f); out=[]; c=0
    for l in s.split('\n'):
        if l.lstrip().startswith('"ui":'):
            l2=l.replace('退仓验收','验仓').replace('验收','验仓').replace('退租','退仓'); c+=l2!=l; l=l2
        out.append(l)
    wr(f,'\n'.join(out)); print(f,'ui lines changed',c); assert c>0
# ---------- D-168 内部表达 ----------
rep('pages/w9-auth.js','<span class="tag info w9demo">微信原生弹窗 · 示意</span>','',1)
rep('pages/w13-arrival.js',"if(A.photos.length>1&&open==='guide')","const HAS_PHOTO=A.photos.some(p=>p[2]); /* W22：没有门店实拍照片时不显示照片位，文字指引照常 */\n    if(HAS_PHOTO&&A.photos.length>1&&open==='guide')",1)
rep('pages/w13-arrival.js',"else if(A.photos.length)h+=","else if(HAS_PHOTO&&A.photos.length)h+=",1)
for f in ['pages/w2-render.js','pages/w3-render.js']:
    rep(f,'基础搬运权益 · 资格待确认','基础搬运权益 · 顾问确认后生效',1)
    rep(f,"'个月 · 期限规则待确认</b>","'个月</b>",1)
rep('pages/w6-render.js',"ELIGIBILITY_PENDING:'资格待确认'","ELIGIBILITY_PENDING:'顾问确认中'",1)
rep('pages/w6-render.js',"GRANTED:'已记录·期限规则待确认'","GRANTED:'已记录'",1)
rep('pages/s01.html','data-quick="moving">送搬运<','data-quick="moving">含搬运权益<',1)
rep('pages/w3-render.js',"</b>示意</span>","</b></span>",1)
rep('pages/w4-render.js','zhangsan@example.com','zhangsan@163.com',1)
rep('pages/w7f-render.js','finance@example.com','caiwu@163.com',1); rep('pages/w7f-render.js','w***@example.com','w***@163.com',1)
allrep('示例银行','招商银行'); allrep('示例商贸','安贞商贸'); allrep('示例科技','安贞科技')
allrep('MA00EXAMPLE','MA01K7XQ3R')
rep('model/w7-rules.js','"SIM_BJ09": "科技园区"','"SIM_BJ09": "丰台科技园"',1); rep('model/w7-rules.js','"SIM_BJ21": "昌平其它"','"SIM_BJ21": "沙河"',1)
rep('model/w7-rules.js',"  const F=root.SIM_FIXTURES;\n","  const F=root.SIM_FIXTURES;\n  /* W22 D-168：门店数据显示层清洗（runtime/fixtures.js 原件未改，源数据仍需业务清洗）。\n     「昌平其它」按地址沙河镇写「沙河」；「科技园区」按地址丰台区丰葆路写「丰台科技园」（设计侧推断，待业务确认）；地址里重复的区名去掉第二次。 */\n  (F.stores||[]).forEach(s=>{if(s.name)s.name=String(s.name).replace(/^昌平其它·/,'沙河·').replace(/^科技园区·/,'丰台科技园·');if(s.address)s.address=String(s.address).replace(/^((?:[^市]{2,4}市)?([^市区]{2,3}区))(.*?)\\2/,'$1$3');});\n",1)
# ---------- D-169 冗余 ----------
rep('pages/w3-render.js',"留出码放空隙后的建议值<br>'+EST_NOTE+'</small>","留出码放空隙后的建议值</small>",1)
s=rd('pages/h01.html'); s2=re.sub(r'\n    <div class="pillars">.*?</div>\n    </div>\n    <div class="proofs">.*?</div>\n',"\n    <a class=\"btn text sm\" href=\"acc.html?view=brand\" style=\"margin:4px auto 0\">了解迷你考拉仓 ›</a>\n",s,flags=re.S); assert s!=s2; wr('pages/h01.html',s2); print('h01 brand trimmed',len(s)-len(s2))
rep('pages/w4-render.js',"body().append(el('<section class=\"card\" aria-label=\"押金退还说明\"><div class=\"sec-title\">退还说明</div><div class=\"kvlist\">'+kv('退还时限',ct('deposit.refundTime'))+kvl('退还方式',ct('deposit.refundMethod'))+kvl('结算说明',ct('deposit.deduct'))+'</div></section>'));",
 "/* W22 D-169：押金保管中只留退还时限一行，进入退还流程后再展开方式与结算说明 */\n  const dpFull=ds!=='HELD'||q.get('info')==='open';\n  body().append(el('<section class=\"card\" aria-label=\"押金退还说明\"><div class=\"sec-title\">退还说明</div><div class=\"kvlist\">'+kv('退还时限',ct('deposit.refundTime'))+(dpFull?kvl('退还方式',ct('deposit.refundMethod'))+kvl('结算说明',ct('deposit.deduct')):'')+'</div>'+(dpFull?'':'<a class=\"btn text sm\" style=\"margin-left:-8px\" href=\"dp01.html?state='+key+'&info=open\">查看退还方式与结算说明 ›</a>')+'</section>'));",1)
# ---------- D-170 W18 §3.3 ----------
rep('model/w7-rules.js',"label:t[0]+'/'+t[1]+'层'","label:(t[0]===t[1]?'上层':t[0]===1?'下层':'中层')+' '+t[0]+'/'+t[1]",1)
raise SystemExit('以下步骤见 apply_w22b_20261118.py（本文件此处的企业页匹配串有误，实际运行时在这里中止）')
rep('pages/w5-render.js',"'<div class=\"chips inline soft\" role=\"group\" aria-label=\"租用时长\">'+P.map(m=>chip(m+'个月',v.term===m,'term',m,dsc(m))).join('')+chip(termOther?v.term+'个月':'其他',termOther,'moreTerms','',termOther?dsc(v.term):'')+'</div>'","W7.termSeg(v.term)",1)
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
