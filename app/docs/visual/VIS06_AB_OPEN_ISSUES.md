# VIS-06A/B｜未决问题与验收边界

- **DEFERRED / P2-3**：Q01 帮助入口压金额；C02 帮助入口因碰撞不可见。用户决定延期，本批没有隐藏或重定位入口。
- **KNOWN_FAIL**：S3 QA 17/18，旧 SHA 契约不符；在本输入原样复现，不能标 PASS。
- **DEFERRED**：375×812/390×844 真实 HTTP/Chromium、点击/滚动/安全区几何、M01 动态空态/报价/租赁态与 H01 三卡截图。等 VIS-06F 统一第三方验收。
- **NOT_TESTED**：微信真机与原生组件。
- **NOT_REVALIDATED**：整套 run_regression.py、所有跨页 HTTP。保持既有遗留，未放宽或删除任何测试。
- **PROVENANCE**：原锁定 5046f30c 截图修复 ZIP 未独立取得，本批以 EST09 实际 H01 字节为准，不冒称该包通过。
- **RELEASE GATE**：HOLD，不覆盖统一项目管理母版。
