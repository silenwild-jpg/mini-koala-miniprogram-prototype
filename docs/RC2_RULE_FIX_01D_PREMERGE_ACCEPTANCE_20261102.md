# RC2-RULE-FIX-01D｜完整主链与归并前验收回执

日期：2026-11-02｜范围：PR #35 隔离模拟候选｜发布门禁：HOLD

## 一、版本身份
- 基线：GitHub main（当前已知 RC1-P1），隔离分支 `audit/rc2-rule-fix-01a-lifecycle-isolated`，不认为此分支是已部署 RC2。
- 合入目标：main，仅供后续显式版本升级授权；目前没有合并或部署。
- BR01 新首页交接 PR #34、S01 A/R2 PR #33 仍为 Draft，尚未并入本次受测版本。
- 新增的租后功能 UI 仍为内部业务演示样式，未取得最新母版签收。

## 二、实际修复范围
1. O01 iframe 支付成功/失败后的「查看订单与后续服务」、已支付后续入口，均由旧 account.html 外跳改到中央 O03；按当前模拟订单 ID 校验并保存选择。
2. H01 的底部「我的」进入中央 M01；已支付或待支付用户首页「继续办理」携带已存在订单 ID 进入中央 O03。
3. M01、O03、OH01 已可用；O03 仅对 paid_simulated 订单显示 RN01/EX01/DP01/IV01 租后动作。
4. 支付取消保留 pending 订单，M01 → O03 支持在订单选择未改变时恢复 O01；每次重新进入 O01，服务协议必须主动勾选，禁止未勾直接支付；恢复后不重新创建订单。
5. U01/Q01 不能从正式中央路由进入；历史 V2.7.4.8 文件作为存档存在，不等于正式入口。
6. 旧版 RC1-P1 冻结文件与 Netlify 配置未修改；独立 CI 按本候选运行。**未降低旧冻结门禁**。

## 三、证据和结论
- 最新专项 CI：<https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41402275568> **SUCCESS**。模型契约 job 和真实 Chromium 浏览器 job 均成功。
- 真实浏览器 375×812、390×844 各四组路径（总 8 组）：H01→S01→S02→手机号拒绝→再次验证→O01→模拟成功→O03→RN01／返回首页「继续办理」→O03／底部「我的」→M01；S01→支付失败（阻止租后操作）；支付取消→待支付订单→重新勾协议→同单恢复支付；预置需求 S5→O01→O03。均 PASS。
- 同一次 CI 复跑旧 01C 生命周期专项：续租完成、退租验仓、押金退款模拟、发票已提交，375/390 PASS，JS error=0。
- 私有证据 Artifact：<https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41402275568/artifacts/13122341131>（截图与 summary.json）。
- 旧 RC1-P1 冻结链 CI：<https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41402275612> **FAIL**，在 `Verify RC1-P1 integrity while preserving original RC1 freeze` 阶段失败。此门禁是**新候选无法沿用旧冻结版本的预期阻塞**；不得放松旧检查，也不能宣布此 PR 已达到 main 归并发布门禁。

## 四、未关闭（不属于 01D 全 PASS）
- 最新获批首页 HIFI 和 S01 A/R2 未并入本候选；未完成两图原图同状态对照、人工视觉签收。
- CAP 全输入/ITEMS/AI→S5 的真实点击链路不在此次测试范围；S5 用预置 3m³、6 个月状态进入，不能冒充已验收 CAP。
- MK 旧门店/仓型实数据以及五城全量回归不在本次新增浏览器测试覆盖；主要测试 catalog=sim。
- 当前仍有历史「我的需求」、消息/品牌链接指向旧 account.html。需单独决定对应承接界面，不将「我的需求」冒充当前订单记录。
- 模拟订单只在当前浏览器 session 中保留，未验证真实跨设备、后端、服务端数据持久化；review=1 不是后台身份认证。
- JS error、水平溢出检查来自自动化；截图已归档但未进行最新视觉母版逐区人工验收。
- 正式 RC2 源码/部署 SHA 未锁定；Netlify 当前已核对的仍是 RC1-P1。

## 五、归并决策
**隔离功能主链：专项准入 PASS。中央正式归并：HOLD。**
要允许归并，应先建立可追溯的新演示版本标签（不修改历史 RC1-P1 冻结锁），完成 PR #33/#34 与 PR #35 的来源冲突盘点，补齐 CAP/ITEMS、新旧 MK 数据、支付异常及全站关键状态，并验收 375/390 最新视觉。
