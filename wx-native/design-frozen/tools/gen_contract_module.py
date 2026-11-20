import json, re, hashlib, sys
out = sys.argv[1]
d = json.load(open('paras.json', encoding='utf-8'))
IN = '<团队收件目录>/'
F1 = '1794964854__SIGN202404101304285520261118091752.pdf'; F2 = '1794964857__SIGN202404101304658920261118091752.pdf'
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
def sections(paras, top):
    secs = []; cur = None
    for p in paras:
        if p.startswith('## ') and top.match(p[3:]):
            cur = {'title': p[3:].replace('E 存', 'E存'), 'paras': []}; secs.append(cur)
        else:
            if cur is None: cur = {'title': '', 'paras': []}; secs.append(cur)
            cur['paras'].append(('### ' + p[3:]) if p.startswith('## ') else p)
    return secs
notice = d['notice']; agr = d['agreement']
n_secs = [{'title': '', 'paras': [p for p in notice[1:]]}]
cut = agr.index('（以下无正文）')
main = sections(agr[1:cut], re.compile(r'^[一二三四五六七八九]、'))
main[0]['title'] = '协议说明'
# 第九章的附件目录行还原为普通段落
for s in main:
    s['paras'] = [p[4:] if p.startswith('### 附件') else p for p in s['paras']]
att = sections(agr[cut+1:], re.compile(r'^附件'))
att = [s for s in att if s['title']]
sig = ('甲方签署', '我已详细阅读如上内容')
strip_sig = lambda secs: [dict(s, paras=[p for p in s['paras'] if not p.startswith(sig)]) for s in secs]
DOCS = {
 'notice': {'title': '迷你考拉用户使用告知书', 'short': '用户使用告知书', 'status': 'contract', 'usedAt': '确认订单（签署使用协议前先确认）', 'sections': strip_sig(n_secs)},
 'usage': {'title': '迷你考拉自助式设备设施使用协议', 'short': '自助式设备设施使用协议', 'status': 'contract', 'usedAt': '确认订单', 'sections': strip_sig(main + att)},
 'register': {'title': '迷你考拉用户注册协议和个人信息保护政策', 'short': '用户注册协议和个人信息保护政策', 'status': 'pending', 'usedAt': '登录 / 注册', 'sections': []},
 'custom': {'title': '私人定制专项服务协议', 'short': '私人定制专项服务协议', 'status': 'pending', 'usedAt': '选购私人定制服务时', 'sections': []},
}
P = '待业务提供'
R = lambda text, src, status='contract': {'text': text, 'src': src, 'status': status}
RULES = {
 # —— 押金（履约保证金）——
 'deposit.name': R('押金（履约保证金），不计利息', '使用协议 一.12'),
 'deposit.refundTime': R('退仓验收通过后 15 个工作日内', '使用协议 三.11'),
 'deposit.refundMethod': R('退至您指定的银行账户或原路退回；信用卡付款原路退回约需 1 个月', '使用协议 三.11'),
 'deposit.deduct': R('仓体（含防潮垫）或门锁损坏、钥匙或门禁卡丢失、遗留物品清理（常规 ¥200/次）及其他应由您承担的费用，从押金中扣除，不足部分另行补交', '使用协议 三.11、三.2'),
 # —— 起租前退订 / 提前退租 ——
 'cancel.rule': R('签署后不足 7 日且未使用仓位的，经门店同意可退还已付仓储服务费，但需承担已实际产生的损失；损失无法计算的，按 7 日仓储服务费计', '使用协议 三.10(1)；告知书 11(1)'),
 'cancel.paid': R('已付仓储服务费扣除上述损失后退还', '使用协议 三.10(1)'),
 'cancel.deposit': R(P, '合同未单列退订时的押金处理', 'pending'),
 'early.rule': R('提前退租需经门店同意。已使用仓位或签署超过 7 日的，按实际使用时间收取仓储服务费（不足 1 个月按 1 个月计），并支付违约金：剩余合同金额的 20% 或 1 个月仓储服务费，以高者为准', '使用协议 三.10(2)；告知书 11(2)'),
 'early.promo': R('已享受优惠的订单，退仓后未使用期间的权益视为放弃；仅享受预付优惠的，按实际使用周期重新计算优惠', '使用协议 三.11'),
 'early.unused': R('租期内因自身原因未使用的，不影响租期计算', '使用协议 三.10'),
 # —— 逾期 ——
 'overdue.fee': R('逾期期间按订单原价按日计费，并按逾期应付款项每日 1% 收取逾期违约金；逾期超过 30 日的，按订单原价的 1.2 倍按日计费', '使用协议 三.9；告知书 9'),
 'overdue.effect': R('欠费期间门店可暂停开仓；欠费满 30 日可开仓并转移物品；满 60 日可终止协议并依法处置物品', '使用协议 三.13；告知书 8'),
 'overdue.short': R('按订单原价按日计费，另收每日 1% 逾期违约金；超过 30 日按 1.2 倍计费', '使用协议 三.9'),
 # —— 支付 ——
 'pay.deadline': R('签署后当日 24:00 前，或在系统设置的期限内完成支付', '使用协议 三.2'),
 'pay.lateRelease': R('逾期未支付视为放弃订单，仓位可被释放；仓位已被他人下单后才支付的，款项在 15 个工作日内退还', '使用协议 三.9；告知书 9'),
 'pay.official': R('请只通过小程序等官方渠道付款，我们不会用私人账号收款', '使用协议 五.4；附件3'),
 'pay.failReasons': R(P, '合同无支付失败原因枚举', 'pending'),
 # —— 发票 ——
 'invoice.applyDeadline': R('请在合同结束之日起 30 个自然日内申请；超期可能收取人工服务费，跨年度的发票另收开票金额 7% 的服务费', '使用协议 一.25'),
 'invoice.types': R('可选择开具技术服务费发票或仓储服务费发票', '使用协议 三.1'),
 'invoice.collected': R('运输费、电费为代收费用，开具代收发票', '使用协议 一.25'),
 'invoice.reissue': R('合同提前解除或换仓且已开票的，需在 3 个工作日内退回原发票后按实收金额重开；纸质发票遗失无法重开', '使用协议 一.25'),
 'invoice.includesDeposit': R('待财务确认', '合同未写明押金是否开票', 'pending'),
 'invoice.processTime': R(P, '合同无开票处理时限', 'pending'),
 # —— 企业 ——
 'ent.materials': R('企业名称、统一社会信用代码；经办人姓名、身份证件号码、手机号；营业执照副本复印件（或法定代表人签字盖章的证明文件）、加盖公章的企业授权书、经办人身份证件', '使用协议 二.2'),
 'ent.reviewTime': R(P, '合同无企业认证审核时限', 'pending'),
 # —— 下单与签署 ——
 'order.flow': R('先确认《迷你考拉用户使用告知书》，勾选不存放违规违禁物品，再签署《迷你考拉自助式设备设施使用协议》；签署后生成电子合同并支付', '使用协议 一.31、八.3'),
 'order.identity': R('个人用户下单需填写姓名、身份证件号码、手机号并完成实名认证', '使用协议 二.1'),
 'order.prohibitedPledge': R('我承诺不存放违规违禁物品', '使用协议 八.3'),
 'order.renewPrice': R('续租时如遇仓储服务费调整，按调整后的价格支付', '使用协议 一.9'),
 'order.swap': R('确需换仓时会提前 3 个工作日通知，并按换仓后的月仓储服务费折抵剩余费用', '使用协议 三.8'),
 # —— 服务与保障 ——
 'service.hotline': R('400-035-8885', '使用协议 附件3'),
 'service.hours': R('人工客服：工作日 9:00–20:00（法定节假日除外）', '使用协议 四.6'),
 'service.repair': R('售后维修：工作日 10:00–16:00；报修后通常在 24 小时内（工作日）到场', '使用协议 四.6'),
 'protect.basic': R('存放物品价值不超过 ¥5,000 的，附赠累计不超过 ¥5,000 的基础保障', '使用协议 七.1'),
 'protect.plus': R('物品价值超过 ¥5,000 的，可购买增值保障，赔付上限提升至累计不超过 ¥15,000；与基础保障不叠加', '使用协议 七.2、七.3'),
 'protect.claim': R('发生损失后请在 48 小时内联系我们，并保留受损物品与购买价值凭证', '使用协议 七.4(1)'),
 'protect.plusPrice': R(P, '合同无增值保障服务价格', 'pending'),
 'env.range': R('仓内温度约 10–28℃、湿度约 10%–70%，具体以门店现场为准', '使用协议 四.5；告知书 3'),
 'area.billing': R('计费面积 = 实际占用面积 × 1.5', '使用协议 三.1（考拉超级仓）；告知书 2'),
 'stack.rule': R('物品请上货架或垫高 13cm，堆放高度不超过 2m，与灯泡、插座保持 50cm 以上距离', '使用协议 附件4（地下空间）'),
 # —— 考拉E存 ——
 'estore.scope': R('上门取送、便捷寄存、灵活召回：可按需召回部分或全部物品，最小 1 个包裹起；召回送达同城指定地址。物品集中存放，不提供存放地址，不能到仓自取', '使用协议 一.2.4、一.15'),
 'estore.fee': R('仓储服务费 + 运输费（运输费为代收）；不含搬运、拆装、楼梯费、包装费、停车费、高速费。按套餐下单，超出套餐体积的部分可升级套餐或按账单另付', '使用协议 一.2.4、一.16、一.17、三.3'),
 'estore.limit': R('需自行打包；易损物品请提前书面声明并在外包装标注；违规违禁物品不可寄存（见禁存清单）', '使用协议 三.5；附件2'),
 'estore.carriers': R('运输由第三方机构承运（目前合作：顺丰、蓝犀牛、闪送、京东），运输途中的风险按承运方规则处理', '使用协议 一.3'),
 'estore.review': R('入库后会复核实际体积，复核订单 8 小时内未确认的视为认可', '使用协议 三.3'),
 'estore.recallConfirm': R('召回送达后 7 日内未确认收货的，视为无异议', '使用协议 三.4'),
 'estore.price': R(P, '合同无套餐价格、定金比例', 'pending'),
 # —— 优惠券 ——
 'coupon.def': R('优惠券可用于抵扣仓储服务费等费用', '使用协议 一.18'),
 'coupon.validity': R(P, '合同无优惠券有效期与使用门槛', 'pending'),
 'coupon.refundOnCancel': R(P, '合同无取消订单后优惠券是否退回的约定', 'pending'),
}
PROHIBITED_SHORT = ['违法违禁物品（枪械、管制刀具、毒品、赃物等）', '易燃易爆、易渗漏、易挥发物品（烟花爆竹、气体、油类、酒精、白酒等）', '腐蚀性、有毒、放射性物品及电池、蓄电池、农药、化学品', '压缩气体（气瓶、喷雾剂等）', '动物、活物、植物、食物（含茶叶、生鲜、调味料）', '易腐烂、易霉变、易变质或有异味的物品', '易碎物品', '货币、金银珠宝、古董字画、红木家具等贵重或难以估值的物品', '账本、计算机数据资源、国家机关公文']
att2 = next(s for s in DOCS['usage']['sections'] if s['title'].startswith('附件2'))
PENDING = [k for k, v in RULES.items() if v['status'] == 'pending']
M = {'meta': {'module': 'MK_CONTRACT v1.0 (2026-11-18)', 'note': '条款正文逐字取自张坤 2026-11-18 提供的两份合同 PDF，仅合并排版换行；rules 为界面短句，均注明条款出处；status=pending 的条目合同无对应约定，保持占位。',
  'sources': [{'doc': 'notice', 'file': F1, 'sha256': sha(IN+F1), 'pages': 4}, {'doc': 'usage', 'file': F2, 'sha256': sha(IN+F2), 'pages': 20}],
  'version': P, 'effectiveDate': P, 'pendingText': P},
 'docs': DOCS, 'rules': RULES, 'prohibited': {'short': PROHIBITED_SHORT, 'full': att2['paras'], 'src': '使用协议 附件2'}, 'pending': PENDING}
js = ('/* MK_CONTRACT v1.0 · 2026-11-18 · 由 tools/gen_contract_module.py 从合同 PDF 提取文本生成，请勿手改正文。\n'
      ' * 用法：MK_CONTRACT.t("deposit.refundTime") 取界面短句；MK_CONTRACT.src(key) 取条款出处；MK_CONTRACT.isPending(key)；MK_CONTRACT.docs.usage.sections 为协议正文。 */\n'
      '(function(g){var M=' + json.dumps(M, ensure_ascii=False, indent=1) + ';\n'
      'M.t=function(k){var r=M.rules[k];return r?r.text:M.meta.pendingText;};M.src=function(k){var r=M.rules[k];return r?r.src:"";};M.isPending=function(k){var r=M.rules[k];return !r||r.status==="pending";};\n'
      'M.docName=function(k){var d=M.docs[k];return d?"《"+d.title+"》":"";};\n'
      'g.MK_CONTRACT=M;if(typeof module!=="undefined"&&module.exports)module.exports=M;})(typeof window!=="undefined"?window:globalThis);\n')
open(out + '/mk-contract-text.js', 'w', encoding='utf-8').write(js)
json.dump(M, open(out + '/mk-contract-text.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# 逐字校验：去空白后，正文字符应全部来自 PDF 提取文本
norm = lambda s: re.sub(r'\s+', '', s)
raw = {'notice': norm(open('c1.txt', encoding='utf-8').read()), 'usage': norm(open('c2.txt', encoding='utf-8').read())}
for k in ('notice', 'usage'):
    miss = 0; n = 0
    for s in DOCS[k]['sections']:
        for p in s['paras']:
            q = norm(p.replace('### ', '')); n += len(q)
            # 段落可能跨页（页眉被去掉），按 40 字切片核对
            for i in range(0, len(q), 40):
                if q[i:i+40] not in raw[k]: miss += 1
    print(k, 'sections', len(DOCS[k]['sections']), 'chars', n, 'unmatched 40-char slices', miss)
print('rules', len(RULES), 'pending', len(PENDING)); print([s['title'] for s in DOCS['usage']['sections']])
