"""Generate the five T8 page scaffolds (O03 / RN01 / EX01 / DP01 / IV01) from the shared icon set used by cap.html
(+ the i-renew / i-order symbols from h01.html). Same scaffold as o01.html: StatusBar → TopBar.page → #body.stack →
#actbar-root / #overlay-root / #toast-root, runtime modules + lifecycle-contract.js + w4-render.js."""
import os, re
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=open(os.path.join(ROOT,'pages/cap.html'),encoding='utf-8').read()
h01=open(os.path.join(ROOT,'pages/h01.html'),encoding='utf-8').read()
sym=re.search(r'<svg width="0" height="0"[^>]*>(.*?)</svg>',cap,re.S).group(1)
extra=''.join(m.group(0)+'\n' for m in re.finditer(r' <symbol id="i-(renew|order|calc)"[^>]*>.*?</symbol>',h01,re.S))
PAGES={
 'o03':('O03','订单详情','?state=empty|pending|payment_failed|expired|identity|upcoming|active|renewal|returning|inspection|refund|expired_lease|ended · T8：StatusBar → TopBar.page → StatusHeader（状态 + 订单号 + 下单时间）→ SummaryCard → 租赁进度 kv → 订单服务 ListRow → FeeList → BottomActionBar'),
 'rn01':('RN01','续租申请','?state=empty|form|quote_pending|quote_ready|payment_pending|payment_failed|cancelled|completed|unavailable（?overlay=pay）· T8：StatusHeader → SummaryCard.compact → StepList → 表单/报价 → BottomActionBar → ResultState'),
 'ex01':('EX01','退租与到期','?state=empty|form|form_early|form_expired|requested|waiting|failed|passed|unavailable · T8：StatusHeader → SummaryCard.compact → StepList → 退租安排表单（类型 + 日期）→ 押金说明 → BottomActionBar（danger，全站仅此与取消订单）'),
 'dp01':('DP01','押金处理','?state=empty|held|waiting|refund_pending|refunded|refund_failed（review=1）（?overlay=progress）· T8：StatusHeader → 金额 → StepList 竖向 → 说明 → 按钮'),
 'iv01':('IV01','发票申请','?state=empty|form|filled|form_enterprise|invalid|submitted|processing|issue_failed（review=1）|two_payments（?overlay=payment）· T8：StatusHeader → 付款记录 → 发票信息表单（类型 / 抬头 / 税号 / 邮箱）→ BottomActionBar → ResultState'),
}
TPL='''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>迷你考拉仓 · {title} {code} · W4 高保真（可编辑）</title>
<link rel="stylesheet" href="../design-system/tokens.css">
<link rel="stylesheet" href="../design-system/base.css">
<link rel="stylesheet" href="../design-system/components.css">
</head>
<body data-page="{code}">
<!-- {note}；无 TabBar -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">{sym}{extra}</svg>
<div class="screen no-tab has-actbar" id="screen">
  <div class="statusbar"><span>9:41</span><span class="sig">●●●● <i></i></span></div>
  <header class="topbar page"><button type="button" class="back" data-action="back" aria-label="返回上一步"><svg class="ico"><use href="#i-back"/></svg></button><span id="tb-title">{title}</span></header>
  <div id="body" class="stack" style="padding-top:0"></div>
</div>
<div id="actbar-root"></div>
<div id="overlay-root"></div>
<div id="toast-root"></div>
<script src="../runtime/store-geo.js"></script>
<script src="../runtime/fixtures.js"></script>
<script src="../runtime/space-unit.js"></script>
<script src="../runtime/br03-demo-snapshots.js"></script>
<script src="../runtime/presentation-policy.js"></script>
<script src="../runtime/promotion-policy.js"></script>
<script src="../runtime/gift-term-policy.js"></script>
<script src="../runtime/lead-flow.js"></script>
<script src="../runtime/demo-core.js"></script>
<script src="../runtime/br03-policy.js"></script>
<script src="../runtime/lifecycle-contract.js"></script>
<script src="w4-render.js"></script>
</body>
</html>
'''
for fn,(code,title,note) in PAGES.items():
    open(os.path.join(ROOT,'pages',fn+'.html'),'w',encoding='utf-8').write(TPL.format(code=code,title=title,note=note,sym=sym,extra=extra))
    print('wrote pages/'+fn+'.html')
