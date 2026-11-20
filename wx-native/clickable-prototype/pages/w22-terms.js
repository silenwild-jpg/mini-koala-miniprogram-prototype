/* W22 D-167 · 用词显示层归一。runtime/ 原件里的旧叫法（租赁中、身份验证、用仓预约、退租、验收、A03）在显示时换成张坤 2026-11-18 定的叫法；
 * 代码侧按 DEV_HANDOFF v11 A-82 改 runtime 文案后，本文件可删除。协议页不加载本文件（合同正文逐字显示）。 */
(function(){
  const RULES=[[/退(?:租|仓)验(?:收|仓)/g,'验仓'],[/服务范围与距离资格待确认/g,'用仓位置距门店 5km 及以上、租期满 6 个月可用'],[/基础搬运权益/g,'免费运输 1 次'],[/租赁中/g,'租用中'],[/入仓前需完成验证/g,'入仓前需完成实名认证'],[/身份验证/g,'实名认证'],[/查看验证进度/g,'查看认证进度'],[/开始验证/g,'开始认证'],[/用仓预约/g,'预约用仓'],[/退租/g,'退仓'],[/验收/g,'验仓'],[/(^|[^A-Za-z0-9号] ?)A(\d{2}) · /g,'$1A0$2 · ']];
  const fix=n=>{let t=n.nodeValue,o=t;for(const [a,b] of RULES)t=t.replace(a,b);if(t!==o)n.nodeValue=t;};
  const walk=r=>{if(r.nodeType===3)return fix(r);if(r.nodeType!==1||/^(SCRIPT|STYLE)$/.test(r.tagName))return;const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))fix(n);};
  walk(document.body);
  new MutationObserver(ms=>ms.forEach(m=>{if(m.type==='characterData')fix(m.target);else m.addedNodes.forEach(walk);})).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
