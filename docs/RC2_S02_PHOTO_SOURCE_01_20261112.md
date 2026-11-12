# RC2-S02-PHOTO-SOURCE-01｜门店详情图源定向回滚修复

2026-11-12。来源：PR #146 的同SHA S02 图片映射失败，原始证据 Actions #43186518852 / `RC2_STORE_IMAGE_MAP_01_BROWSER_FAIL`。
本分支以 PR #141 (SHA `92e0cd855b9f80d3002618fef298883143bdcf42`) 为唯一业务底座，**只修复一个源文件内的 S02 取图顺序**。

## 原因
- `fixtures.js` 给经筛选的用户提供门店示意素材设置 `s.photo=.../card.webp`（门店列表卡片）及 `s.photoDetail=.../hero.webp`（详情页横幅）。
- `app.js` 的 `renderS02()` 调用 `s02PhotoList(s)`，其中兜底路径取 `s.r2Photo` 或 `s.photo`，而直接从中央 fixture 取得的 `s` 只有 `photoDetail`；因此实际 S02 使用 `card.webp`。
- **修复**：若已有独立 `gallery_photos`，先保持原有一/多张图库权威内容；无配置时优先读取 `s.photoDetail`，再退回旧 `r2Photo` 和 `photo`。不覆盖 H01/S01 已使用的紧凑卡素材。
- 无视觉容器、筛选、状态机、仓位/计价/订单或其它页面 CSS 修改；不改原图片内容与文件映射。

## 实测条件
- Git SHA 以本分支当前 HEAD 和同一 Actions 为准，不以源码看似正确冒充完成。
- 对 375×812、390×844 复测用户照片映射：H01/S01 卡仍用 `card.webp`，S02 顶部用 `hero.webp`，图片可解码、无失败请求、无 JS/横向溢出。
- 复测 S02 浏览和已确定需求、订单月租、S01/S5 跨页、CAP m³/㎡ 不被破坏。
- 来源照片是用户提供的可用于原型演示的门店环境示例，不宣称已验证真实门店身份。
- 只有源截图的人工复核和同 SHA Actions 结果可解除此 P1 图源缺陷的技术门禁。获批视觉母版整体仍 HOLD。

**当前门禁**：本 PR 仅为隔离修复提案；不合并 #141、`main` 或部署 Netlify。不得合入已否决 H01 A/C 模块。
