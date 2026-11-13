# RC2-MERGE-PREP-01｜三源差异、版本实体与隔离集成候选验收回执

日期：2026-11-02｜最终候选：PR #36｜状态：Draft / HOLD

## 版本实体
- Netlify 私有站 `mini-koala-internal-rc1-review`，Team SSO；当前部署 6ae3eecbe34f877c27632485（READY），Commit `274c5110aa18af7ed71d92533ab126ebbbd11f75`，2026-10-30 发布。
- 尚未定位到真实独立 RC2 部署的 Commit / 生产站。**PR #36 是隔离集成候选，不得称为已上线 RC2。**
- main、已冻结 RC1-P1 构建门禁、Netlify 已发布部署均未修改。

## 实体来源
| 分支 PR | 状态 | 接收方式 | 排除或限制 |
| --- | --- | --- | --- |
| #33 S01 A/R2 | Draft | 以整分支作为文件底座；保留两张原 WebP、S01 模板、R2 opt-in、原辅助脚本；静态 SHA 比较通过 | 最新母版人工视觉终签待确认，默认旧 S01 不替换 |
| #34 H01 CONNECT-03 | Draft | 只读复制 JS 路由适配器及两份交接文档，不执行、不作为中央 H01 导航器 | 仅历史路径；BOOKING/QUICK_ORDER 仍 unbound；不含新的 HIFI-06 视觉图、HTML 和资产 |
| #35 租后 01D | Draft | 接入统一模拟订单与续租/退租/押金/发票、O01 结果到 O03、H01 我的与回访、Node 与浏览器测试 | 仅模拟，不冒充后端支付/财务/微信原生权限；旧原型额外链接待隔离 |

## 文件级冲突裁定
- `demo/app.js`：保留 #33 的 S01_R2_CONTENT、R2 搜索/区域/容量/租期模板和 iframe / S02 预览；逐段补入 #35 的 M01、O03、OH01、RN01、EX01、DP01、IV01、选中订单 ID 和跨页返回。未复制旧 account 页面作为订单目标。
- `demo/br04/bridge.js`：保留 #33 的可选 R2 文案处理和 S5 页面处理；把 #35 O01 的已支付入口及支付结果订单链接改为中央 `SIM_DEMO.openOrder(id)`。
- `demo/index.html`：保留 PR #33 的 `s01-r2-content.js` 以及主屏 iframe CSS；按安全顺序加载 #35 的 `lifecycle-contract.js` 与 `lifecycle-ui.js`。
- #35 `central-contract.js`、`demo-core.js`、`home-bridge.js` 及生命周期模块随业务迁入；U01/Q01 未进入中央允许路由。
- #34 路由适配器仍为无副作用的源资料，未引用；不能把它的 `routes.S01/CAP/S02` 历史 URL 当成最新中央路径。
- #33 的 `netlify.toml` / `scripts/build_rc1_private_site.py` 仍含专用 PR #33 预览限制；未把 #36 发布到旧私有评审站，更未解除生产访问保护。

## 自动化验收
- 专项集成 CI：[41404109192](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41404109192) **SUCCESS**：契约和真实 Chromium job 均通过。
- Artifact：[13121839285](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41404109192/artifacts/13121839285)，包含 01C、01D 和三源新测试截图与 JSON。
- Node 集成门禁：#33 图像 SHA 原样继承、R2 宿主页与绑定、#35 生命周期与支付路由、U01/Q01 排除、#34 无副作用检查。
- Chromium 375×812 / 390×844：原 01C 租后全流程 PASS；原 01D H01→S01→S02→手机号→O01→O03、失败/取消/恢复/S5 预置需求 PASS；新 R2→租期→手机号→O01→O03 PASS；MK 五城市来源 ID 核验 PASS；R2 关闭时原搜索/排序/价格/服务入口 PASS。
- `PROTO-MERGE-02B` 原 PR #33 专用门禁：[41404109089](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41404109089) FAIL，因完整候选修改了 #33 原始不可变源码检查；RC1-P1 原冻结门禁：[41404109103](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41404109103) FAIL。不得松动旧源保护来消除此失败。

## 未闭合的关键风险
**P0 版本基线：** 真实 RC2 线上代码/Commit 未定位。不能把 PR #36 称为“RC2 已运行版本”。

**P0 最新首页视觉：** PR #34 不包含 HIFI-06 视觉；现有 H01 功能测试仍使用 RC1 旧首页演示图，不是新母版同状态验收。

**P1 S01 功能无损：** R2 开启后可见顶部仅搜索、区域、容量、租期三个筛选。原排序、距离和服务筛选在 `s01_r2=0` 的旧 UI 中可访问，但当前 R2 页面未验证到等价可见入口。不可视为“新视觉功能无损通过”；需用户决策如何不改母版布局仍实现可发现的功能访问。

**P1 完整业务路径：** CAP/ITEMS/AI/顾问选仓至 S5 的真实输入操作尚未完整穿行，S5 目前测的是预置需求；MK 五城核验为 ID/源一致性，不是全部门店/全仓库存与地图真实定位回归。

**P1 视觉：** 仅测试可用/响应，未逐区人工比对 HIFI-06 与 S01 A/R2 实际原图；VIS-GUARD 持续有效。

**P2 历史页面：** 非订单的消息、品牌、我的需求链接可能仍转旧 `account.html`；不能未经业务裁定全部改向 M01。

## 归并判定
- 三源隔离候选实际落地：**已完成**。
- 集成专项静态与 375/390 Chromium：**PASS**。
- 视觉和全站功能最终签收：**HOLD**。
- 中央 main、Netlify、正式 RC2 发布：**HOLD / 未执行**。

建议下一阶段：`RC2-MERGE-PREP-02｜新 H01 视觉资产真实接收、S01 R2 功能可达性恢复方案及新版本门禁定义`；优先补齐真正缺失的 H01 母版和 S01 A/R2 下的排序/服务入口，继续隔离双尺寸回归后才进入最终归并裁定。
