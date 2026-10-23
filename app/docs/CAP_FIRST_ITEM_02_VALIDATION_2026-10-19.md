# CAP-FIRST-ITEM-02｜受控候选 V2 校验与准入边界

## 基线与规则

- 用户指定母包 `Mini_Koala_DEMO_COUPON_ALL_NEW_01_Candidate_2026-10-15.zip`，SHA-256 `e8e60ee4d00abf2e640054ab430dd68b7ddb1d49e46fab71ef7113f8495d480a`。母包仍为 Candidate；本轮只在隔离副本 `c2/` 修改。
- 用户最新确认：已有确认需求时，首页「附近门店」自动进入匹配态；无确认需求时普通浏览。该直接指令优先于历史文档中的浏览态叙述。
- AI 估算暂时冻结，仅供演示。固定示例不得提交需求；真实 `ai_assisted` 路径不属于本轮可验收实现。

## 已取得的证据

- `python tools/check_http.py` 在获准的本机回环环境验证 **153 个资源、0 错误**。原沙箱的 `WinError 10013` 是测试权限限制，已通过本地授权测试解除，不再作为 HTTP 阻塞项。
- 安装的 Chrome + Playwright 通过真实 `http://127.0.0.1` 访问双尺寸 375×812、390×844。主脚本 `qa/test_cap_first_item_02_browser.cjs --http` **52/52 PASS**；扩展跨页脚本 `qa/test_cap_first_item_02_extended_http.cjs` **68/68 PASS**。逐项 JSON 和截图在 `outputs/cap_first_item_02/`。
- 扩展脚本覆盖无需求 S01 筛选排序返回、S02/U01 独立估算入口、U01 直购至 O01 支付前预览；U01 取消返回原仓位、确认提交后进入 S5 并记录来源仓位；已有确认需求从 H01「附近门店」进入匹配态，U01 估算预填容量与租期且取消不覆写；物品规格数量草稿返回及跨页恢复；3.5m³ 代表图与精确容量、50.1m³ 无图合法进入 S5；S5/U01/O01 的目标容量与租期传递。
- `qa/test_cap_first_item_02_business_compare_http.cjs` 对同一确认需求 3.5/5.1/50.1m³、双尺寸分别渲染母版与候选，**6/6 PASS**。S5 可见推荐、价格、库存及按钮文案一致；候选另有一句容量说明。该比较不覆盖全部价格库存组合或实际支付。
- `qa/test_h01_007_s4_entry_contracts.cjs` 按用户最新门店规则更新后 **30/30 PASS**；`qa/test_home_state_integration_patch_v1.cjs` **17/17 PASS**；`qa/test_p1_review_fix_behaviors.js` PASS，核固定 AI 演示不提交需求。
- 22 项验收矩阵当前 **13 PASS / 2 BLOCKED / 7 NOT TESTED**。两项 BLOCKED 为用户冻结的真实 AI 路径，不影响继续核其他功能。逐项证据及缺口见 `CAP_FIRST_ITEM_02_ACCEPTANCE_RESULT.csv`。

## 未完成的准入项

1. P0-04/11/17/18/19/21/22 尚有全字段继承、非法规格与禁品、所有来源返回、全页面状态一致性、价格库存组合、原生微信支付/真机及全屏遮挡等未测部分。可见 S5 母版对比和 O01 支付前预览不能替代这些全量验收。
2. 旧全量回归含母版固有失败与历史规则断言，应逐项归因；不能把该集合的失败直接视作新功能失败，也不能据定向测试宣称全站通过。获准 HTTP 环境本候选结果为 **20 PASS / 20 FAIL**。
3. 原 R4/R5A 浅色浮窗源码及最终 Banner 仍未确认，相关视觉归并只保留受控局部状态。

本候选维持 `PENDING_REVIEW`，正式 Release Gate **HOLD**。母版不覆盖；下一阶段继续上述非 AI 验收，再评审是否晋级。AI 维持演示冻结，待用户解除冻结并提供真实结果契约后另行验收。
