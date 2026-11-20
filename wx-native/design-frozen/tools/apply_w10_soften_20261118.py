"""W10 合同引用文案收敛（张坤 2026-11-18）：rules 增加 ui 软化句，t() 取 ui，strict() 取合同压缩句。用法：python3 apply_w10_soften.py <design_root>"""
import json, re, sys, pathlib
root = pathlib.Path(sys.argv[1])
UI = {
 'deposit.name': '押金（履约保证金）',
 'deposit.deduct': '验收时仓位与配件完好、物品已取空的，押金按约定退还；如有待结费用，结算后退还余额',
 'cancel.rule': '签署后 7 日内且未使用仓位的，可联系门店办理退订',
 'cancel.paid': '按协议结算后退还',
 'early.rule': '提前退租请先与门店确认，费用按实际使用时间及协议约定结算',
 'early.promo': '已享优惠按实际使用周期重新核算',
 'early.unused': '租期按订单约定的起止日期计算',
 'overdue.fee': '租期已到，超出的天数按协议约定计费',
 'overdue.short': '租期已到，超出的天数按协议约定计费',
 'overdue.effect': '欠费期间开仓等服务可能受限',
 'pay.deadline': '请在页面提示的时间内完成支付',
 'pay.lateRelease': '超过支付时间订单将自动关闭，如仍需要可重新下单',
 'pay.official': '请通过小程序等官方渠道付款',
 'invoice.applyDeadline': '建议在合同结束后 30 个自然日内申请',
 'invoice.reissue': '退租或换仓后如需重开发票，请联系客服办理',
 'order.renewPrice': '续租价格以续租时的报价为准',
 'protect.claim': '如有物品损失，请在 48 小时内联系我们，并保留相关凭证',
 'estore.scope': '上门取送、便捷寄存、灵活召回：可按需召回部分或全部物品，最小 1 个包裹起，送达同城指定地址。物品由仓库集中保管，取用通过召回配送完成',
 'estore.fee': '仓储服务费 + 运输费，按套餐下单；搬运、拆装、包装等按需另计，超出套餐的部分可升级套餐',
 'estore.limit': '请自行打包；易损物品请提前告知并在外包装标注',
 'estore.carriers': '由合作承运方上门取送（目前合作：顺丰、蓝犀牛、闪送、京东）',
 'estore.review': '入库后会复核实际体积并通知您确认',
 'estore.recallConfirm': '召回送达后请在 7 日内确认收货',
}
jp = root/'model/mk-contract-text.json'; d = json.loads(jp.read_text(encoding='utf-8'))
for k, v in UI.items():
    assert k in d['rules'] and d['rules'][k]['status'] == 'contract', k
    d['rules'][k]['ui'] = v
d['meta']['module'] = 'MK_CONTRACT v1.1 (2026-11-18)'
d['meta']['uiNote'] = 'v1.1：张坤 2026-11-18 指示收敛直接引用合同的表述。rules[k].ui 为界面展示用的温和短句（不展示违约金比例、处置后果等），t(k) 优先取 ui；rules[k].text 保留合同压缩句，仅供 strict(k) 与核对使用；完整条款以协议页正文为准。'
jp.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
js = root/'model/mk-contract-text.js'; s = js.read_text(encoding='utf-8')
i = s.index('(function(g){var M='); j = s.index('M.t=function')
head = s[:i].replace('MK_CONTRACT v1.0', 'MK_CONTRACT v1.1').replace('取界面短句；', '取界面短句（优先 ui 温和句）；MK_CONTRACT.strict(key) 取合同压缩句；')
tail = s[j:].replace('return r?r.text:M.meta.pendingText;};', 'return r?(r.ui||r.text):M.meta.pendingText;};M.strict=function(k){var r=M.rules[k];return r?r.text:M.meta.pendingText;};', 1)
assert 'M.strict' in tail
js.write_text(head + '(function(g){var M=' + json.dumps(d, ensure_ascii=False, indent=1) + ';\n' + tail, encoding='utf-8')
LINK = ' <a href="agreement.html?doc=usage">查看协议</a>'
EDITS = [
 ("expired_lease:['请办理续租或退租','逾期期间'+C.t('overdue.short')+'。','err']", "expired_lease:['请办理续租或退租',C.t('overdue.short')+'。','warn']"),
 ("kvl('退订规则',ct('cancel.rule'))", "kvl('退订说明',ct('cancel.rule'))"),
 ("""<section class="card notice err" role="status"><div class="t">请办理续租或退租</div><div class="s">逾期期间'+ct('overdue.short')+'。'+ct('overdue.effect')+'。</div>""",
  """<section class="card notice warn" role="status"><div class="t">请办理续租或退租</div><div class="s">'+ct('overdue.short')+'。""" + LINK.replace('<a ', '<a style="display:inline-block;padding:7px 0" ') + """</div>"""),
 ("kvl('提前退租',ct('early.rule'))+kvl('优惠订单',ct('early.promo'))", "kvl('费用结算',ct('early.rule')+'。" + LINK + "')+kvl('已享优惠',ct('early.promo'))"),
 ("kvl('扣除条件',ct('deposit.deduct'))", "kvl('结算说明',ct('deposit.deduct'))"),
 ("expired_lease:['租期已到期','待办理','err']", "expired_lease:['租期已到期','待办理','warn']"),
 ("expiredLease?['待办理','err']", "expiredLease?['待办理','warn']"),
]
p = root/'pages/w4-render.js'; t = p.read_text(encoding='utf-8')
for a, b in EDITS:
    assert t.count(a) == 1, a[:40]; t = t.replace(a, b)
p.write_text(t, encoding='utf-8')
p = root/'pages/w7f-render.js'; t = p.read_text(encoding='utf-8')
a = "以上内容摘自'+esc(C.docName('usage'))+'，"; assert t.count(a) == 1
p.write_text(t.replace(a, "完整条款见'+esc(C.docName('usage'))+'，"), encoding='utf-8')
print('ok', len(UI), 'ui rules;', len(EDITS), 'site edits')
