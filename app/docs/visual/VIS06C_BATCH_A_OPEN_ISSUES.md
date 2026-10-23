# VIS-06C Batch A｜开放问题与例外

| ID | 类型 | 状态 | 后续处理 |
|---|---|---|---|
| BA-VIS-01 | 双尺寸真实浏览 | BLOCKED（Chromium ERR_BLOCKED_BY_ADMINISTRATOR） | VIS-06F 使用可访问本地 HTTP 的真实 Chromium 复验两视口各状态；不得用离线想象截图替代 |
| BA-QA-01 | S3 既有 SHA 契约 | KNOWN HISTORICAL (17/18) | 与 VIS06AB 原始输入一致，单独进行旧断言治理，不能修改券逻辑迁就哈希 |
| BA-QA-02 | S01 Filter VM 缺函数 | KNOWN HISTORICAL | 与原始输入一致，保持真实业务排序验收独立 |
| BA-QA-03 | Phase3B 旧 HTML 整包 SHA 锁 | KNOWN HISTORICAL | VIS06AB 原始输入即 FAIL；本阶段逐字节业务段及新增样式白名单校验为准，后续新版本契约另行维护 |
| BA-VIS-02 | S01 标签 2–4 个与换行策略 | CARRY FORWARD | 遵循既有 V3 包含完整标签的可见策略；若需单行需单独业务/视觉裁定 |
| BA-P2-3 | Q01 金额遮挡、C02 帮助入口隐藏 | DEFERRED | 维持用户延期裁定，未在本次改动 |
| BA-RELEASE | 微信真机、原生组件、真实发布 | NOT TESTED / HOLD | 不从源码通过推断可上线 |
