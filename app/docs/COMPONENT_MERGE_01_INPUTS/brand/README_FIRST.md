# BRAND-VIS-01C｜首页品牌模块独立封装（待原型母版合并）

日期：2026-10-15
状态：**可独立预览的组件交付；未合并到正式原型母版**。Release Gate = HOLD。

## 交付内容
- `index.html`：375/390 宽原生 HTML 可运行视觉预览；启动本地 HTTP 服务器后打开。
- `brand-section.html`：待替换的品牌模块结构；一处独立的 `section.mk-brand-01c`。
- `css/brand-vis-01c.css`：作用域隔离的品牌组件样式。
- `assets/*.webp`：1 张品牌仓储图 + 3 张模拟图片。均从本轮已选 B 方案设计图中拆取，未嵌入整页静态设计稿。
- `docs/CODEX_INTEGRATION.md`：移交 Codex 的精确合并与验收说明。
- `docs/ASSET_AND_FACTS.md`：模拟素材与未验证资质口径。
- `docs/QA_RESULTS.md`：本次独立组件验收记录。

## 局限性
唯一尝试读取的项目候选：`Mini_Koala_DEMO_PREPAY_Exception_QA_Candidate_2026-10-15(1).zip`。目前项目文件无法授权下载到可编辑容器，未能读取源代码，因此**不宣称真实修改或全站回归通过**。将最新实际原型 ZIP 上传到当前聊天后，才可执行零猜测受控替换与合并。

## 试装规则
1. 仅替换首页原“城市仓储领先品牌”模块，不覆盖其他主页节点。
2. CSS 前缀 `mk-brand-01c__*` 避免污染全局样式。
3. 图片文件路径必须按实际 HTML 文件位置重定位，避免 HTML 原样粘贴导致相对地址错误。
4. “了解更多”在真正合并时保留旧有导航处理函数和目的页；预览页临时指向 `#brand-detail-demo`。
5. 保持原型其他模块、支付链路、价格、优惠券、数据模型完全不变。
6. 双尺寸 375x812 / 390x844、DPR2 截图，点击/滚动和控制台核查、Manifest、ZIP CRC、SHA 核验。
