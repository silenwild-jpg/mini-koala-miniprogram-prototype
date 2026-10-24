# BR02 GIT-MIGRATE-01｜冻结页面原字节接收

阶段：**SOURCE_INTAKE_ONLY**。本次只把两份已签收的独立页面放入 BR02 专属工作区，供后续逐区域移植和差异审查；旧共享原型及中央状态、S5、其他分支均未改动。页面本身仍是独立预览，不能称为已接通的产品链路。

| 页面 | 接收文件 | 原始来源 | SHA256（原包内容与工作区文件复算一致） |
|---|---|---|---|
| CAP | `prototype/branch02_cap_vis_guard02.html` | `BRANCH_02_FREEZE_01_...zip` 内 `SIGNED_VISUAL_SOURCE.zip` 的 `BRANCH_02_VIS_GUARD_02/visual_review_offline.html` | `cfb9477a2265dcb455f56fd12cf4b2ba2d7f724a10459fdaf14dfcc492157e7f` |
| 按物品估算 | `prototype/branch02_items_flow_freeze01.html` | `BRANCH_02_FLOW_FREEZE_01_...zip` 内 `FLOW08E_箱包摄影级独立交互预览.html` | `8e6b3a98b746d26d61977c2ae6d01b823fc18b3987603d0eb7cbaab81a5bae16` |

原 ZIP 留在仓库之外的 `original-zips/`，未添加到 Git。CAP 母版与物品工作台分别保留，不能用后一页的布局或样式覆盖 CAP。没有改写这两份 HTML 的 DOM、CSS、JS 或内嵌素材。CAP 签收包的 375×812 / 390×844 首屏图散列已独立复算，与冻结清单一致；物品工作台源 SHA 与冻结清单一致。历史包内浏览测试仅为各自独立预览证据。

## 本次检查与限制

- 从两页提取 3 个内嵌脚本，`node --check` 均通过；文件 SHA 与原 ZIP 字节一致。
- 本机 Chrome 和 Edge 无头截图均因 GPU 进程不可用而失败；应用内浏览器阻止 `file:` 页面访问。**当前工作区页面的双尺寸真实 HTTP 视觉、交互与路由均为 NOT TESTED**，不借用历史截图宣称本次通过。
- 尚未把 CAP/物品页面接入共享导航或 S5。提交有效需求时仍需中央校验 `target_volume`、精度、`term_months`、`term_confirmed=true`；无主动确认时不可默认 12 个月。旧共享原型当前仍有默认 12 个月逻辑，故不可直接将此分支标为已集成。
- AI 估算与顾问协助不在这两份冻结源码内；不能将历史候选当作获批母版。

下一步：对照两份冻结页面与共同基线的对应区域生成可审查的定向补丁，先在 BR02 工作区完成入口/状态适配，再由中央集成分支接 S5，并做两尺寸真实 HTTP 回归。Release Gate HOLD。
