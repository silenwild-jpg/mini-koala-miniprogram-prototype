# VIS-06C Batch B｜开放问题

| ID | 类别 | 状态 | 责任/下步 |
|---|---|---|---|
| BB-01 | Chromium 真浏览与截图 | BLOCKED（ERR_BLOCKED_BY_ADMINISTRATOR） | VIS-06F：本地静态 HTTP + Playwright 两视口，完整金额与券选择、底栏、状态四态、页面滚动和弹层验证 |
| BB-02 | Q01 帮助浮窗遮金额 | P2-3 DEFERRED | 继承 VIS-04C，未改位置、隐藏或交互规则；后续统一修复 |
| BB-03 | C02 帮助入口因固定底栏不可见 | P2-3 DEFERRED | 原 P1 transform:none 保留；后续统一修复，不能以其未测判 PASS |
| BB-04 | S3 固定券代码 SHA 断言 | KNOWN HISTORICAL（17/18） | Batch A 未修改原始包也 FAIL；后续由测试治理单独处理，不动业务代码迁就旧哈希 |
| BB-05 | 全站 HTTP、真机原生组件 | NOT TESTED | VIS-06F 与上线阶段各自单列，不替代彼此 |
| BB-06 | Q01/C02 字级变化与浮窗 P2-3 的几何关系 | NOT TESTED | 真实浏览前无法保证零交集；Q01 应付金额保持近原始几何，仍必须在 VIS-06F 确认没有扩大遮挡 |
| BB-07 | Release Gate | HOLD | 不覆盖项目母版、不能表述为可正式上线 |
