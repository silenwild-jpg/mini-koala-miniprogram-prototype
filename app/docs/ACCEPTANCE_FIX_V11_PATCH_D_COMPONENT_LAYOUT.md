# Mini Koala — Acceptance Fix V1.1 / PATCH D

日期：2026-10-08。基线：`Mini_Koala_Acceptance_Fix_V1_1_PATCH_ABC_FULL.zip`。

## 修复范围与取舍

- AF-18 **帮助浮窗遮挡（P1）**：将原本固定于内容右下的 `#miniGlobalSupport` 移动到内容滚动区域末尾，成为「需要帮助？｜电话｜客服」服务区。不覆盖任意滚动位置的金额或日期；原电话/微信客服的 JS 点击处理器、兜底弹层保持不变。对于 `.page`、`.coupon-main`、`.app`、`.phone`、`.p` 等不同容器使用统一规则，固定底部支付/操作栏不移动。此项设计取舍是**不再始终悬浮**，以获得零遮挡和较好可达性。
- AF-08 **展开/收起**：S02 和 Q01 的 `<details>` 根据 open 状态同步「收起 ▴」「展开 ▾」与 `aria-expanded`；关闭旧 CSS 中的重复伪元素文本。初始为 open 的区块将正确显示“收起”。
- AF-07 **表单错误定位**：HTML 原生校验错误旁新增行内错误、ARIA 标识、输入有效后自动清除；B2B 既有手机号校验仍由原页面处理，本补丁补充字段旁提示。未新增手机号、报价、优惠政策等校验规则。
- AF-20 **共享按钮样式**：统一帮助区的电话/在线客服操作目标（最小 44px）；尊重已禁用控件的视觉语义和键盘焦点。首页已有的原生帮助入口及底部 tab 图标未做全面替换，以避免触碰冻结首页结构。
- AF-21 **局部排版**：M01 区块横向安全边距及记录按钮换行；B2B 首屏标题按 375/390 响应式处理，保留原文字；优惠券金额、券名改为可换行的独立区域。搬运补贴券仅添加「查看使用说明」，不提供租金券“去使用”入口、不虚构搬运线上兑现流程。Q01 左上占位的真实来源未通过完整动态渲染复现，本轮不盲删节点。

## 修改方式

1. 核心 HTML 文件全部保持与 A+B+C 基线逐字节一致；所有历史业务 fixture、金额、仓位、需求、券规则保持不变。
2. 在公共加载器 `prototype/mini_storage_global_support_v274.js` 追加加载 `mini_koala_acceptance_v11_layout_patch.css` 与 `mini_koala_acceptance_v11_layout_patch.js`。
3. PATCH D 纯表现和无侵入 DOM 增强层可独立撤回：从加载器删除这两项资源即可还原旧展示；不要覆盖旧 PATCH A/B/C。
4. 现有无内容容器的 `home_original_reference.html`、`mini_storage_home_h01_vi_ready_wireframe_v1.html` 为历史跳转轻页，不改其用户界面结构。其余 47/49 个引用公共支持脚本的页面在结构扫描中都有可对接的滚动容器；仅对 8 类代表性页面做了实际隔离式 Chromium 布局检查。

## 验证结果

- 历史基础静态回归：**68/68**。
- PATCH A：**6/6**；PATCH B：**9/9**；PATCH C：**18/18**（合计已有 **101/101**）。
- PATCH D 源码结构和规则保护：**13/13**。
- PATCH D Chromium 隔离 DOM/布局：**16/16**（8 类页面 × 375×812 / 390×844）。验证包含末尾帮助区位置、底部 CTA 不重叠、折叠标签实际切换、B2B 行内手机号错误、搬运补贴券的说明展现；截图记录存于 `qa/acceptance_v11/patch_d_visual`。
- 以上 Chromium 测试用 `page.set_content` 渲染原始页面的静态 DOM 和实际 CSS/补丁 JS（禁用原业务脚本，不依赖完整场景数据），仅证明隔离条件下的**布局与组件表现**，不证明整站功能链路可用。
- 浏览器试图真实导航 `file://` 及 `data:` URL 时均报 `ERR_BLOCKED_BY_ADMINISTRATOR`，仍未完成完整端到端状态回归、完整视觉截图和真实手机验收。

## Release Gate 及未完成事项

- 源码及隔离式布局验证：通过，作为 **PATCH A+B+C+D 内部修复候选包**。
- 最终动态验收：仍未通过，需在可访问的 HTTP/HTTPS 测试环境运行 AT-01 至 AT-08；验证状态恢复、优惠券跨页持续、复制订单号、定位距离、全量滚动页面 FAB 安全性。
- 未闭环的视觉细节：全局底部 tab 图标统一、Q01 左上疑似留白需要真实动态截图复现后决策；未核验的业务证据、荣誉图仍冻结。

## 执行

```bash
python qa/run_acceptance_static.py
node qa/test_acceptance_v11_patch.cjs
node qa/test_acceptance_v11_patch_b.cjs
node qa/test_acceptance_v11_patch_c.cjs
python qa/acceptance_v11/test_patch_d_static.py
python qa/acceptance_v11/test_patch_d_visual.py
```

## QA 可移植性补充
- PATCH C 的核心 HTML 冻结检查原本依赖外部 `koala_patchB` 工作目录。本轮只更新其 QA 比对方式：找不到历史目录时读取包内 `qa/acceptance_v11/abc_core_html_sha256.json`，使完整原型包单独解压后仍可运行 C 测试；不修改业务源码。
- 完整隔离浏览器测试需要 `python playwright`、Chromium、`beautifulsoup4`；并非生产端到端测试。
