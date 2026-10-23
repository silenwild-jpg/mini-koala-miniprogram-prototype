# 当前候选｜DEMO-PREPAY-02

DEMO-PREPAY-02源码候选：统一S5/S01/S02/U01路由，按门店ID排除当前店，保留出行方式及排除上下文至报价与订单返回。真实双尺寸未执行，演示准入BLOCKED，Release Gate HOLD。

先读 docs/DEMO_PREPAY_02_SOURCE_REPORT.md，再按DEMO-PREPAY-01范围进行真实HTTP＋Chromium双尺寸验收。

源码专项：node qa/test_demo_prepay02_distance.cjs
价格保护专项：node qa/test_d4_a_source.cjs .
