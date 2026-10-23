> P1 双尺寸真实浏览后续：P1-1、P1-2 在 HTTP Chromium 下验收 PASS，原型两项已关闭。C02 帮助浮窗与底栏发生碰撞而不可见，合入 P2-3（VIS-04B 定向处理）。本文件其余为历史 S5 问题。

> P1 接续状态：本表为 S5 历史发现。P1-1、P1-2 已在本候选完成代码修复和逻辑验证，真实浏览验证仍 BLOCKED，尚未最终关闭。P2 七项保持未修改。见 H01_007_P1_IMPLEMENTATION_REPORT.md。

# H01-007 遗留问题表（S5 收口，2026-10-13）

分级：P0 阻断演示主链路；P1 影响演示可信度或主要操作；P2 视觉 / 文案 / 密度问题，不阻断。「来源」注明是 H01-004B 母版既有还是 H01-007 引入；「状态」均为未实施，按任务书只报告不修改。证据路径相对 S5 交付目录 `evidence/`。两视口（375×812、390×844，DPR 2）结果一致除非另注。

## P0

无。

## P1

| # | 问题 | 复现 | 来源 | 最小修改文件与方案（未实施） | 证据 |
|---|---|---|---|---|---|
| P1-1 | C02 选券页底部操作栏整体向左偏移半个屏宽：`.coupon-bottom` x=−187.5（375）/ −195（390），「自动使用最优优惠」「暂不使用优惠券」两个按钮只剩右半截可见（显示为「最优优惠」「用优惠券」）。 | U01（6 个月、新客）→「更换优惠券」→ C02 | 004B 母版既有（原始树同样 x=−187.5；`mini_storage_coupon_benefit_v1.css` 与 C02 `<head>` 内联样式与 004B 逐字节相同）。根因：基础样式 `.coupon-bottom{left:50%;transform:translateX(-50%)}`，C02 页内联覆盖只改了 `left:0!important;right:0!important;width:100%`，未重置 transform。 | 1 个文件 `prototype/mini_storage_coupon_select_c02_v1.html`：内联覆盖追加 `transform:none!important`（或删除该内联覆盖整体）。改动 1 个属性，不触及业务脚本。 | `s5b/375x812_B7_C02_top.png`、`s5b_followup/375x812_004Btree_C02.png`、`s5b/results.json → B7_C02` |
| P1-2 | 优惠券遗留锁（S2 登记、S5 只读复核）：(a) 订单锁定 CPN-001 后在同一订单改为「暂不使用」并无券支付成功，CPN-001 永久 `LOCKED → 该订单`，且 CPN-002 / CPN-003 不会按 NEW_CUSTOMER_COMPLETED 失效（`syncPaymentResult` 在订单无 user_coupon_id 时提前返回）；(b) 12 个月订单先用 CPN-001 锁定，再换 CPN-002 支付成功：CPN-002 REDEEMED、CPN-003 INVALID，但 CPN-001 仍 LOCKED。 | 见 `tools/s5b_visual_checks.py` B9a / B9b | 004B 母版既有（优惠券模块 S2 只改首购判断与本单恢复，未动锁释放） | 1 个文件 `prototype/mini_storage_coupon_benefit_v1.js`：① `syncPaymentResult` 在订单 PAID 时，把 `locked_order_id === 该订单号` 且 `user_coupon_id !== 订单实际使用券` 的 LOCKED 行按既有规则置为 INVALID（新客券）或 CLAIMED（非新客券）；② 无券 PAID 订单也执行一次新客券 INVALID 化与同订单锁释放。属业务规则，需业务确认后单独任务实施。 | `s5b/375x812_B9a_O02_paid_no_coupon.png`、`s5b/375x812_B9b_O02_paid.png`、`s5b/results.json → B9_COUPON_LOCK` |

## P2

| # | 问题 | 测量 | 来源 | 建议（未实施） | 证据 |
|---|---|---|---|---|---|
| P2-1 | H01 与 S01 底部导航图标不一致：「找仓」H01 放大镜 / S01 立方体；「门店」H01 地图钉 / S01 店铺；H01 内联 SVG、S01 字符图标；栏高 68 / 56 px；未选中色 #59645E / #6D7671。 | 两视口相同 | 004B 既有（H01-007 未改导航标记与 CSS） | VIS-04 合并时以 H01 生活感 SVG 图标集统一 S01 及其他页 tabbar。 | `s5b_followup/*_NAV_H01_crop.png`、`*_NAV_S01_crop.png` |
| P2-2 | S01 普通浏览态「您已有找仓需求」切换条换行拥挤：标题 `<b>` 为行内元素，14px 折成 1.9 行后第二行「个月」与说明文字「当前按到店时间浏览…」直接相连；说明 2.1 行；整条 80px。无租期时标题为「…租期待选择」同样折行。 | 标题宽 196（375）/ 210（390）px | 004B 既有（原始树相同；S4 只是让切换条在更多入口下出现） | `#browseStripTitle{display:block}` 或缩短标题为「已有需求：5.0m³ · 6个月」。1 条 CSS 规则。 | `s5b/375x812_B2_S01_strip_term6.png`、`s5b_followup/*_004Btree_S01_strip.png` |
| P2-3 | 全局帮助浮窗遮挡金额：U01 展开态电话 / 客服列覆盖「押金 ¥637」「管理费 ¥50」与「更换优惠券」动作；Q01 收起态 44px 按钮在部分滚动位置覆盖费用明细右侧金额（截图中「优惠后租金 ¥3,6…」）。估算页（S5）收起与展开均未覆盖租期选项与「预计租多久」说明，展开列位于第 5 个租期片右侧。U01 上 Escape 不关闭浮窗（只有 H01 的 004B 浮窗支持）。 | U01 展开列 44×95 于 x321/y572（375） | 004B 既有（`mini_storage_global_support_v274.js` 未改） | 沿用 004B 在 H01 的做法：对费用值 `.rows b`、`#depositAmount`、`#managementFee`、Q01 明细右列预留 56px 右侧安全区，或复用 China-Native 补丁的碰撞时隐藏逻辑；补 Escape 关闭。 | `s5b/375x812_B3_U01_term_collapsed.png`（实为展开态）、`s5b/375x812_B5_Q01_expired_firstscreen.png`、`s5b/375x812_B3_S5_term_expanded.png` |
| P2-4 | 无租期时底部主按钮：U01 按钮改标「选择租期」，点击 toast「先选择实际租期」并展开租期编辑，视觉与校验一致；估算页已知容量流程主按钮保持「查看附近可租空间」实色绿，点击后才出现行内红字「请先选择1–60个月的租期。」，不跳转、不代默认月份——结果一致，但按钮事先无视觉提示。 | 两页均 disabled=false、opacity 1 | 004B 既有（S1 只改默认租期逻辑） | 估算页在 `state.term` 为空时给 `#knownNextBtn` 加 `aria-disabled` 弱化样式但保留可点，点击仍走现有校验。 | `s5b/*_B4_S5_no_term_click.png`、`*_B4_U01_no_term_after_click.png` |
| P2-5 | Q01 过期报价可读性：金额「¥3,820」30px/800 米白置于深绿卡上可读，但同卡的「报价需重新确认」徽标与「6个月整期总租金」行标签被压暗到几乎不可见；48 小时提示 74 字 / 110px 高。 | 提示对比度 6.63:1（12px） | S3 提示为新增；卡内压暗为 Acceptance V1.1 既有过期样式 | 过期态只压暗金额以外的装饰，不压暗行标签；提示可缩为两句。 | `s5b/*_B5_Q01_expired_firstscreen.png` |
| P2-6 | 价格变化提示偏长：U01 QUOTE_CHANGED 158 字 / 9.5 行 / 占视口 24%；O01 CROSS_S2 143 字 / 12.5 行（宽 277px）/ 占视口 32%（390 下 28%）；一致态提示 75 / 91 字。 | 13px 字号 | S3 新增文案 | 保留确认门槛，把逐项「原 → 现」列表折叠到「查看变化明细」，末句「重新核价后仍沿用本订单号…」移到按钮下方小字。 | `s5b/*_B6_U01_QUOTE_CHANGED_notice.png`、`*_B6_O01_CROSS_S2_notice.png` |
| P2-7 | 帮助浮窗跨页样式不一致：H01 为白底耳机图标「帮助」（004B），S01 / U01 / Q01 / C02 / 估算页为绿底「＋ 帮助」。 | 登记 | VIS-03B 只移植 H01 | VIS-04 统一。 | `s5b/*_B1_H01_nav.png` 与其他页截图 |

## 观察（不计入缺陷）

- 同订单换券后、支付前，`mini_storage_order_current` 仍保留上一张券与应付（例：CPN-001 / ¥7,542），而 O01 页面已显示新券金额（¥7,442）；支付后订单记录更新为新券。O01 展示与最终已付订单一致，仅中间记录滞后。
- `tools/check_package.py` 在非 Windows 环境对 004B 原始树也报 495 Missing + 495 Unlisted，原因是 004B 的 RELEASE_MANIFEST 以反斜杠记录路径；S5 重算改为 POSIX 分隔符，Windows 下同样可解析。
- `qa/test_home_visual_closeout_patch_v1.py` 在业务树上因定位权限演示层拦截点击而超时（VIS-03B.1 已在视觉分支把夹具改为 `state=new&loc=precise`），VIS-04 合并时按白名单带入。

## 正式开发待确认事项

1. 已结束 / 退款订单是否仍算「有效已支付」（现按任何 PAID 算，S2 §6）。
2. PENDING 支付下锁券是否设置超时（S2 / S3 未设）。
3. 多笔待支付并存时他单支付是否影响 A 的锁券（D-13 暂缓）。
4. 赠运输「首单」仍只看 URL 参数（冻结条件）。
5. 首页「企业需求」入口随 D-01 变为普通浏览，是否需要带需求。
6. 微信真机、原生小程序 `details` 等组件适配未验证。
