# wx-native｜迷你考拉仓微信原生实施候选（2026-11-20）

当前入口：[11月20日实施与验收记录](docs/implementation-20261120/STATUS.md)。现行规则以 `docs/baseline-20261120/` 的40条原文及6项覆盖为准；本轮已经实现规则、主路径与看仓弹窗，已使用正式AppID进行开发者工具模拟器验证。账号、手机号、实名、订单、支付和销售线索仍是受控演示适配器，不能视为生产能力。

下方为11月18日来源包的历史状态，保留追溯；“尚未编译”“游客AppID”等旧记录不代表当前候选。

本目录是 2026-11-17～18 全站视觉重设计（W1–W27）冻结之后的全部现行产出：微信原生小程序工程、测试与工具、真机探针、开发交接文档、冻结设计稿、可点击 HTML 版。
仓库里 `app/` 下的 Web 原型是 11-14 的旧视觉与旧规则，本分支没有改动它。

## 状态（如实）

| 项 | 状态 |
|---|---|
| 小程序代码 | 35 个页面全部写过第一遍，占位页 0 |
| 单元与流程测试 | 147 项通过 |
| 静态检查 | 0 错误 |
| 模拟运行 | 35 页、21 个组件，调用 6,522 次，0 报错 |
| 订单联调 | 6 笔订单 × 9 页，加载 54 次、调用 960 次，0 报错 |
| 微信开发者工具编译 | **没做** |
| 真机 | **没做** |
| AppID | 游客 `touristappid`，发体验版前要换正式 AppID |

上表各项于 2026-11-18 在入库前的同一份文件上复跑。各页已实现状态数、已知缺口、自定做法见 `docs/W34_Status.md`。

## 目录

| 路径 | 内容 | 来源轮次 |
|---|---|---|
| `miniprogram/` | 微信原生工程，开发者工具导入这个目录 | W32 → W34 |
| `tests/` `tools/` | 测试、静态检查、模拟运行、演示数据导出 | W32 → W34 |
| `probe/` | 真机验证探针工程（12 页，验证平台行为，不是体验版） | W30 |
| `handoff/` | 给 WorkBuddy 的交接提示词与回报模板（v0.2.0） | W33 → W34 |
| `docs/01_DEV_HANDOFF_v1.0_WeChat_Native.md` | 开发交接 v1.0，现行业务规则以它为准 | W28 |
| `docs/01_Dev_Task_Book.md` | 开发任务书（B 编号） | W32 |
| `docs/02_Page_Index.csv` `02_Page_State_Matrix.csv` | 页面索引、状态矩阵（580 行，其中 2 个已被 D-198 撤回） | W28 |
| `docs/03_UI_Text_Table.csv` | 界面文字表 | W28 |
| `docs/04_Rules_Config.md` `rules_config.json` | 规则配置表（58 个参数） | W28 |
| `docs/05_Design_Tokens_Components.md` `tokens/` | 设计令牌与组件清单 | W28 |
| `docs/07_Device_Acceptance_Checklist.md` | 真机验收清单 57 项 | W28 |
| `docs/01_Platform_Rules_Verified.md` `02_Console_Prep_Checklist.md` `03_Device_Test_Plan.xlsx` | 微信平台规则核对、后台准备、真机测试计划 | W30 |
| `docs/01_D198_Order_Login_Gate.md` | 确认订单登录拦截 | W31 |
| `docs/02_Prototype_Maturity_Review.md` `03_Next_Phase_Task_Plan.md` | 成熟度评审、后续任务安排 | W27 |
| `docs/ledger/` | 裁定台账 D-01～D-195 及其后各轮增量（至 D-203） | W28–W35 |
| `docs/reports/` | W27、W28、W30、W31 各轮报告 | — |
| `design-frozen/` | W27 冻结设计稿（不含回归截图），`demo.html` 是演示导航 | W27 |
| `clickable-prototype/` | 可点击 HTML 版（含 D-198 登录拦截），打开 `index.html` | W29 → W31 |
| `assets/` | tabBar 图、图标、位图及对照表 | W28 |

没有入库：各轮回归截图与全量压缩包（单轮 100–200MB）、580 张状态截图（38MB）、W1–W26 的过程稿。

## 复跑检查

```bash
cd wx-native
node --test tests/
python3 tools/static_check.py miniprogram
node tools/smoke_run.js miniprogram
node tools/smoke_orders.js miniprogram   # 约 2–3 分钟
```

## 说明

- 手机号、身份证号、邮箱均为演示用的假数据；价格是结构示例，折扣中间档和满额减金额等财务定档。
- `design-frozen/tools/gen_contract_module.py` 里一处本机输入路径在入库时改成了占位，其余冻结稿文件未改。
- 界面里约 50 条条款短句、注销与撤回授权的句子法务没有审过。
