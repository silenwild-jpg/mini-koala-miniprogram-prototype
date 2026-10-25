# BRANCH-03-S01-S02-CENTRAL-CATALOG-DEMO-01｜中央原生目录隔离演示候选

日期：2026-10-25　｜　分支：`feature/br03-s01-s02`　｜　阶段：**隔离候选已产出，中央归并 HOLD**

## 完成内容

在 `app/prototype/parallel/br03-central-catalog-demo/` 新增独立运行候选，复用 HIFI-03 的 S01/S02 CSS、页面模板和演示图片，不覆盖现有 S01/S02 原型、共享状态、中央数据模块或 O01。新候选加载 B4A 随包提供的中央目录快照，将页面门店和仓位切换为中央原生身份。

默认 3.5m³、6个月场景下，中央上海目录只有张江店含满足该容量的候选仓位：18 个；其他三家当前不匹配，因此不显示在该需求的 S01 结果里。无需求浏览时恢复四家门店。S02 只列出达到当前容量需求的仓位；组合仓仍可查看演示，但下单动作明确阻止，不产生单仓冒充或 O01 意图。

订单意图为本地隔离演示事件 `br03:order_intent`，使用中央 `store_id`、`unit_id === size_option_id`、中央代表仓号和 `unit_identity_type: SIZE_OPTION`。`capacity_m3` 表示用户的目标容量；选中仓位必须不小于目标容量。意图不携带租金、折扣、押金、管理费、优惠或应付金额，也不跳转 O01。租期未确认时只显示月参考价并要求先选择租期；已确认时展示中央候选给出的整期总租金和月均约。

## 来源与完整性

- 中央源包：`Mini_Koala_PROTO_MERGE_01F_BR03_B4A_CentralSource_O01_Demo_2026-10-23.zip`
- 源包 SHA256：`ea4831e7c9b3624cbf6209f857e314373e937172d6327991b7f260ff0d178440`
- 包内目录数据版本：`2026-09-29-v2-7-4-17-5-community`
- 包内生成文件：`PROTO-MERGE-01F-BR03-B4A/branch03/BRANCH-03-HIFI-03/isolated/central-catalog.js`
- 新候选 `central-catalog.js` SHA256：`eb0324621e3301317b368836adbca46964f4d45a081fee4bb02ed50001115453`；与源包对应文件逐字节相同。
- 中央门店与仓位数量：徐家汇 8、张江 21、中山公园 3、大宁 3；其中仅中央可用且正价的选项进入目录快照。默认 3.5m³ 筛选后，张江店 18 个满足选项。
- VIS-07 原图、HIFI-03 来源与原始校验见 `app/docs/BR03_GIT_MIGRATE_01_SOURCE_INTAKE.md`；候选未更改冻结原图。

目录快照及其嵌入的图片、距离、评分、评价数、标签和仓位可用数面向内部演示；不得理解为实时库存、真实评价、真实距离或实景证明。仓位面积和尺寸为中央数据中的模拟估值。租金候选沿用 B4A 从中央 `contractRent` 生成的展示快照，不表示服务器报价或真实结算。

## 文件范围

- 新增候选：`app/prototype/parallel/br03-central-catalog-demo/`（`index.html`、`app.js`、`styles.css`、`central-catalog.js`、`assets/`、`evidence/`）
- 新增回归：`app/qa/test_br03_central_catalog.js`
- 状态文档：`docs/BRANCH_REGISTER.md`、`docs/VISUAL_MANIFEST.md`
- 本报告：`app/docs/BRANCH03_S01_S02_CENTRAL_CATALOG_DEMO_01.md`

## 验证

| 检查 | 结果 | 边界 |
|---|---|---|
| `node --check`：候选 `app.js`、`central-catalog.js` | PASS | 语法检查 |
| `node app/qa/test_br03_central_catalog.js` | PASS | 4 个中央店、35 个仓位选项、7 个租期；同源 ID、正价、租期价格和金额字段边界 |
| 本地 HTTP + Chrome 375×812、390×844 | PASS | S01/S02 无横向溢出；默认需求门店/仓位筛选、身份/容量、订单意图、未确认租期提示、无需求浏览通过 |
| S01/S02 视觉对照 | 已检查截图，未作新视觉签收 | 仅确认候选沿用 VIS-07/HIFI-03 构图和现有素材位置 |
| S02 → 中央 O01 真实 HTTP 路由 | **NOT TESTED / 未接线** | 只验证本地意图弹层；不证明中央跨页、真实报价、订单持久化或支付 |
| 微信真机、真实库存、实际门店/仓位、服务器报价 | **NOT TESTED** | 本候选为内部演示 |

本地双尺寸证据位于 `app/prototype/parallel/br03-central-catalog-demo/evidence/`：

- `S01_375x812.png`、`S01_390x844.png`
- `S02_375x812.png`、`S02_390x844.png`
- `S02_INTENT_375x812.png`、`S02_INTENT_390x844.png`
- `S02_NO_TERM_375x812.png`、`S02_NO_TERM_390x844.png`

Playwright 默认 Chromium 在本机没有安装；为避免额外下载，验收使用已安装 Chrome 的 headless 模式通过本地 HTTP 页面完成。测试未连接外网服务。

## 阻塞、归并和回滚

- B4A 的 `verifyIntent`/`stageIntent` 没有并入本候选；当前没有 S02→O01 真实 HTTP 接线、中央重新核价、订单快照、日期/库存确认、组合仓整单处理或支付能力。
- 旧 `jingan / xuhui / changning / pudong` ID 保持未映射；候选使用中央同源 ID，不建旧 ID 别名。
- 视觉虽使用 VIS-07/HIFI-03 的已签收依据，候选代码与双尺寸截图不等于新的视觉验收、中央归并或发布放行。
- 回滚：删除新增目录 `app/prototype/parallel/br03-central-catalog-demo/`、测试 `app/qa/test_br03_central_catalog.js`，并还原上述状态登记文档即可；现有页面与共享状态无需回滚。
- 当前结论：S01/S02 的中央目录本地隔离候选可复核；`G4 真实跨页`、`G5 中央归并`、`G6 发布` 继续 **HOLD**。不自动合并 `main`，不创建 Release。

## 文档基线差异

`app/AGENTS.md` 要求先读 `README_CURRENT.md` 和 `docs/ITERATION_GUIDE.md`，但本分支基线中这两个文件均不存在；本次遵守仓库根 `AGENTS.md` 及实际存在的 `docs/BRANCH_REGISTER.md`、`docs/VISUAL_MANIFEST.md`、`docs/CURRENT_RULES.md`、`docs/MERGE_GATES.md`，将真实路由与中央归并保持 HOLD。
