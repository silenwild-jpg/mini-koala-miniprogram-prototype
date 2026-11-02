# RC2-RULE-FIX-01C｜隔离租后生命周期验收回执（2026-11-02）

## 版本
- 仓库：silenwild-jpg/mini-koala-miniprogram-prototype
- 隔离 PR：#35，base main `274c5110aa18af7ed71d92533ab126ebbbd11f75`。
- 本回执仅覆盖 PR #35 的隔离模拟源码；不能认定 RC2 已部署。

## 交付
- 中央路由：M01、O03、OH01、RN01、EX01、DP01、IV01；U01/Q01 仍不进入中央。
- 租后状态：续租请求 QUOTE_PENDING → 评审录入人工演示报价 QUOTE_READY → 用户确认 COMPLETED；生成独立模拟 RENEWAL 付款记录，不自动套用旧月租。
- 退租：REQUESTED → 用户确认清空并申请 WAITING_INSPECTION → 显式 review=1 演示验仓 INSPECTION_PASSED/INSPECTION_FAILED。
- 押金：HELD → WAITING_INSPECTION → REFUND_PENDING → 显式 review=1 模拟 REFUNDED，**不生成退款金额、扣款算法或退款时效**。
- 发票：按本地 INITIAL / RENEWAL 模拟实际支付记录发起 SUBMITTED 申请；不伪造正式开票或含税金额。
- 访问守卫：未支付、未实名、尚未开始、已到期、清仓验仓中、验仓完成均阻止旧入仓调用；跨页面状态序列化到已有演示 session 状态。
- 可见的新租后页面为隔离演示功能结构，未取得最新视觉母版用户签收，不作为独立高保真验收成果。

## 验收证据
- 专项 CI：<https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41400331203>，**SUCCESS**。
- Node 模型/合同测试：成功，覆盖续租人工报价/完成、拒绝无报价确认、状态保存/恢复、发票、退租与验仓 review-only、押金、订单历史、结束后入仓拒绝。
- Chromium 375×812 / 390×844：两组成功；模拟订单 2，续租 COMPLETED、退租 INSPECTION_PASSED、押金 REFUNDED、发票 SUBMITTED、JS fatal error 0。
- 私有截图与 JSON：<https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41400331203/artifacts/13120948655>，ZIP SHA256 `5e9496d169b97dcd0264162d049743aa9037d02307533fab748468e8a62f0628`。
- 旧 SITE-ACCESS-03C 冻结工作流 <https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41400331196> **FAIL**：在 RC1-P1 frozen tree 检查处阻断；后续旧 375/390 回归未执行。该失败不能被专属 CI 成功覆盖。

## 仍 HOLD
1. 独立 RC2 运行实体及其 Commit 未锁定；不宣称 RC2 正式版本通过。
2. 未接真实支付、库存、权限后端；review=1 是内部浏览器演示开关，**不是安全认证**，不可作为真实门店/财务后台权限模型。
3. 历史旧租后 API 的自动续租价格/退款演示逻辑仍留在归档/旧运行模块内，本候选通过新的 lifecycle API 避免调用；正式整合需专门清理以防双真相。
4. 历史页面索引仍可包含 U01/Q01；中央主链无此路由，正式打包时继续隔离历史素材。
5. 正式产品视觉、真正新用户从 S01/S5→手机号→O01→O03 全链路、异常支付取消恢复、跨会话服务器持久化未在本 CI 覆盖。
6. 在 main 合并前须批准候选版本升级及更新冻结门禁，不改写旧 RC1-P1 锁文件。
**结论：隔离租后专项 CI PASS；RC2 发布与全链路验收 HOLD。**
