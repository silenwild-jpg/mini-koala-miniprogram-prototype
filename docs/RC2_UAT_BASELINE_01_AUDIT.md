# RC2-UAT-BASELINE-01｜部署溯源、S5 入口与视觉防漂移审计
日期：2026-11-03
状态：隔离候选；线上发布/最终视觉签收 HOLD

## 1. 唯一运行参照
Netlify: `mini-koala-rc2-uat-private`
Deploy ID: `6ae9756ecb05d0b77a21a489`
发布时间：2026-11-03 05:47:34 UTC。
手动 drop 部署、无 git commit_ref、无 source ZIP；Netlify 元数据仅证明 11 个文件在此部署更新，不支持将任意 GitHub 分支认定为逐字节线上源。
用户指定入口：`/central-review-02g?catalog=sim&page=S5`。
已连接浏览器读取真实 UAT 标签页：显示“独立仓位详情已取消 / 未能打开此演示入口”。**线上 S5 P0 未关闭**。
已连接 Github candidate 的中央契约允许 S5 进入 `index.html?page=S5`，后者应加载 `br04/s5/index.html`。
单纯在 GitHub 修补与 Netlify 无哈希对应的旧文件不能视为线上问题修复。

## 2. 资产真实来源与标记
资源上游：PR #59，`isolate/unit-image-rebuild-01-r3-20261103`。
源路径：`app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/`。
四档 640×480 WebP + 四档 336×312 WebP，含 `asset_manifest.json`。
已有 PR59 manifest 明确写 `UNIT-IMAGE-REBUILD-01-R3`，与项目保存的“R4A 最终候选”表述未能建立相同哈希。
本候选仅整包移植上游实际二进制资源；不存在从旧 S02 HTML 自制 SVG 冒充正式图的操作。
当前不能称“R4A 完整物理签收”，应在提供 R4A 正式原件后逐字节/hash 对照。

## 3. 历史 CSS 风险表
| 页面 | 检查结果 | 本轮策略 |
|---|---|---|
| 中央 H01/S01/S02 | styles.css、visual-align.css、demo.css、decision-apply.css 共同叠加 | 不盲删；以目标 UAT 真实画面为准，对冲突选择器做逐处证据清理 |
| S5 | br04/s5/style.css 含固定 371px 画板、约 52 处绝对定位、约 10 处阴影声明 | 这可能是高保真原稿定位方式，不自动等同污染；375/390 + 真实内容状态检查后决定 |
| 订单 | orders-ux.css 明确作用于订单页 | 不跨页面归并样式 |
| 调试层 | review-clean.css 仅隐藏非用户端控件 | 保留功能隔离，不向用户露出“模拟/演示/待核验”说明文案 |

## 4. P0 / P1 对应验收门禁
P0-01：Netlify UAT 入口 S5 实际加载错误。必须对同一部署文件的错误原因给出可复现证据并部署同源构建，不能只验证本地 GitHub 分支。
P0-02：中央 S01/S02/S5 容量图片来自同一个受控资源路径且四档加载正常，不再使用退役占位图片。
P1-01：六个主要页面状态的 375/390 同状态截图需加顶/中/底滚动分段；满高截图无法证明内部滚动容器内容。
P1-02：S5 固定画板、BR04 iframe 与中央路由/状态传递需真实浏览器验证，测试不等于最后视觉签收。
P1-03：用户提供的已获批母版与 UAT 同状态逐区比对，重点首图/首屏/内容密度/底部固定区/安全区/单仓组合仓。
P1-04：旧式解释文本、附加视觉容器、重复动作不得重新加入；必要价格/容量/风险文案保留。

## 5. 归并门禁
禁止把 PR #60 单独 S02 旧 HTML 当作此 UAT 母版。
禁止以 Actions PASS 替代获批图片人工同状态签收。
原 Netlify 部署内容无法物理取回时，归并必须暂停；从可追踪的新 Git 构建取代该部署需要独立批准，不可静默覆盖。
