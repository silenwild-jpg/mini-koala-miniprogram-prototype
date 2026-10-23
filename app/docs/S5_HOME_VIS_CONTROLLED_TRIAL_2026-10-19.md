# S5-01 与 HOME-VIS-01 受控增量试装结果

日期：2026-10-19。身份：在 `Mini_Koala_RECOMMENDATION_3KM_Controlled_Candidate_2026-10-19.zip`（SHA-256 `8c7929d473f5ddb93947357e7e8f1e31bfad493696445423d63a447dadeceb4b`）之后的**新工作候选**。用户证实母版仍为 2026-10-15 优惠券 Candidate（SHA-256 `e8e60ee4d00abf2e640054ab430dd68b7ddb1d49e46fab71ef7113f8495d480a`）。本轮不替换原 ZIP，不提升 READY；`demo_gate=PENDING_REVIEW`，`release_gate=HOLD`。

## 已试装

| 范围 | 实施与边界 |
| --- | --- |
| H01/S01/S5 推荐 | 沿用上版 3 km 初始、每轮 3 km 扩查、第二店整期价严格低于最近店；无更低价展示第二近且不贴低价标签。S01 用户距离上限和手动排序不变。 |
| S5 组合仓提示 | 删除普通单仓、无可信大件组合仓及容量备选卡的通用适配说明。仅组合仓且确认物品内有 `large` 风险、实测/核验尺寸及有效三维记录时显示一次：“组合仓由多个独立仓位组成，大件物品请先确认能否放入其中一间。”原可信尺寸硬排除仍由物理适配模块执行。 |
| S5 全城兜底 | 推荐器继续扫描北京演示城市全量可租门店。3 km 无真实匹配而全城有时提示“已扩大至全城查找”。全城无真实匹配时，容量在目标值下方最多 `max(0.5m³, 目标值的10%)` 或上方最多 30% 的真实可租单仓可作容量接近备选；按与目标容量的绝对差排序，容量不足明确显示差额。没有此类仓时显示真实空态。备选进入 S02 `nomatch` 核对路径，不直达 U01。 |
| 首页 | 复用现有 HOME-SEARCH-02A 单条搜索，文案改为“搜索小区、地址或门店”。把最新 1774×887 完整 Banner 按 2:1 原比试装，不裁切、不叠加第二套可见文字。图内“添加微信”按钮区域只打开既有在线咨询**演示**面板；未实际建微信会话或发送消息。搜索与原双任务之间新增五个快捷入口，分别聚焦现有 40 项目录的收纳、箱包、家具、商家货品和全部分类；不自动选物品、不写容量或租期、不覆盖确认需求。六张可选场景图未替换原场景。 |
| 演示冻结 | AI 估算仍只作固定演示；S5 北京调用及 Banner“北京 200 家门店”仅按用户暂定演示口径显示，未核实真实门店数量。 |

## 本轮验证

- `node qa/test_s5_01_remaining.cjs`：PASS，覆盖容量不足 0.1m³ 的备选、过小仓排除、无库存空态、可信大件判定和卡片文案。
- `node qa/test_recommendation_3km_expansion.cjs`：PASS；`node qa/test_external_review_merge_v2.cjs`：20/20 行为组 PASS。已有 3 km 排序和当前租期整期价沿用同一规则。
- `node qa/test_cap_first_item_02_browser.cjs`：两种尺寸资源拦截 Chrome **52/52 PASS**。首次尝试在 375 宽时被定位权限演示浮层的异步弹出打断；测试等待浮层稳定后重跑通过。包括容量/物品提交、确认需求保护、S5 返回和 H01/S01/S02 入口。
- `MINI_KOALA_INTERCEPT=1 node qa/test_recommendation_3km_http.cjs`：两种尺寸 H01/S01/S5 当前代码资源拦截浏览通过，截图及结果在 `outputs/recommendation_3km_http/`。脚本名保留历史文件名，结果**不是 HTTP**。
- `MINI_KOALA_INTERCEPT=1 node qa/test_home_vis_trial_browser.cjs`：375×812、390×844 资源拦截浏览通过。Banner 图片自然宽 1774、实测容器 2:1、无横向溢出；搜索恰好一条；五入口均进入正确分类，未预选物品且原确认需求标识保留；图内顾问区域可点。截图及结果在 `outputs/home_vis_trial_browser/`。
- 真实 localhost HTTP Chrome 在当前环境仍返回 `ERR_NETWORK_ACCESS_DENIED`；未把资源拦截证据算作真实 HTTP、微信真机或支付验收。
- `python tools/check_package.py`：907 个源码文件、823 个字面引用、错误 0。`python tools/run_regression.py`：20 PASS / 20 FAIL；失败名单与上一个 3 km 候选完全相同，未新增历史回归失败。逐条根因仍需另行分类，日志在 `outputs/s5_home_vis_trial_regression.txt`。

## 仍待验收

S5 分支 25 条专项矩阵没有逐条形成真实数据样本与浏览截图；本轮只覆盖上列定向情境。S5-03 的真实 AI 路径随用户冻结。缺城市、真实物品尺寸、全北京实库存、单仓筛选、S5→S02→U01→返回的全字段连续性，以及 3 km 外低价标签均需在完整专项矩阵复核。CAP-FIRST-ITEM-02 的 P0-04/11/17/18/19/21/22 仍有全字段、禁品/异常规格、微信真机/支付和全屏遮挡等未测部分。历史全量回归含旧断言和浏览环境失败，不能仅用总数裁定本候选。

## 回退与交付

旧 3 km ZIP 保持可直接回退。本候选新增 `assets/home-vis-2026-10-19/`、`prototype/home_vis_trial_2026_10_19.{js,css}`，并局部修改 H01、S5、HOME-SEARCH、推荐器和物品目录焦点；所有输出与截图留在 `outputs/`，不进入运行源码清单。入口为 `prototype/product_demo_hub_v1.html`；新候选 ZIP、SHA 和清单检查结果见本轮交付消息。
