# AGENTS.md｜Codex 执行守则（GIT-SETUP-01）

1. 当前目标为产品验证、内部演示、视觉探索；**不是**上线开发、后端接入或微信真机验收。可使用受控演示数据。
2. 执行前检查 `git status`, `git branch --show-current`, `git rev-parse HEAD`，读取 `docs/BRANCH_REGISTER.md`、`docs/VISUAL_MANIFEST.md`、`docs/CURRENT_RULES.md`。
3. 首次 Git 基线来自 `PROTO-PARALLEL-01/CURRENT_CANDIDATE.zip`；后续批准的业务、视觉规则覆盖旧原型中已废止的方案。不得认为历史 HTML 代表最新批准方案。
4. 严格遵守 VIS-GUARD：已批准视觉图片高于旧 CSS；未经授权不可添加卡片、边框、阴影、大背景或改变布局；禁止全局组件统一导致不同分支视觉同质化。
5. 严格遵守 PROTO-PROGRESS-01：区分 **批准 / 产出 / 已测试 / 已归并 / 已冻结**，每项任务报告当前阶段、完成、遗漏、归并状态、下一任务编号。
6. 只修改本分支页面/资源；CAP 和 S5 可能位于同一个 HTML，必须定向修改，禁止整文件跨分支覆盖。公共状态、门店ID、租期、报价及订单快照由中央集成分支裁定。
7. BR01 为 H01；BR02 为容量填写、物品、AI估算和顾问选仓；BR03 为 S01/S02 门店与仓位；BR04 为 S5/预约用仓/快捷下单/O01。共享能力归 MERGE。
8. 最新业务硬边界：U01 仓位详情已从业务链路删除；S02可直接O01；CAP及辅助估算等分支去 S5；预约仅销售线索；快捷下单进 O01；必要输入未确认不签发有效订单。
9. 每次 PR 必须包含所改文件、获批视觉依据、375x812 与 390x844 验证、状态路径验证、阻塞和回滚说明。未执行的真实浏览、路由测试标记 NOT TESTED，禁止声称 PASS。
10. 不自动合并到 `main`、不创建 Release、不覆盖批准视觉原图、不硬映射不同来源的门店与仓位 ID；不把仅作为视觉候选的 AI/考拉E存素材写成签收。
11. 当原件缺失/数据不一致时，只生成最小修复和问题清单，不得通过编造截图、数据或虚假的测试报告解锁。

12. 全站执行 `docs/PROTO_VIS_EXEC_01.md` 与 `docs/PROTO_VIS_EXEC_01_CONTRACT.json`：已批准结构高于旧活动源码；对已有参考图仅作高保真还原，禁止未经批准新 CTA、额外解释文本、边框及改变导航层级。
13. 视觉修改必须有唯一 Commit/活动入口、G-TECH 与 G-VIS 两套独立结论。代码测试 PASS 不代表视觉 PASS；原图哈希或部署同源性未知必须 HOLD。PR 机器门禁见 `scripts/check_proto_vis_exec_01.cjs`。
14. 中央 S02 的三个同级选项卡为“可选仓位 / 服务设施 / 交通路线”；热门仓型横幅不得新增“查看仓位”按钮。PR 先比对 `docs/visual-evidence/README.md`，不以旧 S02 HTML 的 PASS 冒充中央页面签收。


## 2026-11-13 当前项目控制与批量执行规则（优先级高于历史登记表）

1. **唯一项目入口：** 每次任务先读 `docs/PROJECT_CONTROL_CENTER_01_20261113.md`。它记录当前候选SHA、页面/规则来源、验收状态、待确认项和任务队列。README指向该控制中心。
2. `docs/BASELINE_REGISTER.md`、`docs/BRANCH_REGISTER.md`、`docs/CURRENT_RULES.md` 等旧登记文件是历史快照，不因文件仍存在就自动代表当前状态；与最新用户批准结论、控制中心或候选分支中的更新规则冲突时，以最新批准结论为准，并登记差异。
3. **批量执行：** 一个任务包启动后，连续完成所有已批准且可自主裁定的子任务（盘点、裁定、实施、测试、回归、文档、状态更新），不得每完成一个小步骤就等待用户发送“继续”。
4. **阻断项定点确认：** 仅当规则冲突无法消解、需要改变冻结视觉/核心交互、正式业务政策无法隔离、缺少必要权限或将执行不可逆高风险操作时暂停；只暂停依赖该决策的部分，无关任务继续。
5. **演示优先：** 缺少真实库存、门店、地图、CRM、支付或业务规则时，优先用稳定可替换的演示数据完成真实用户路径；未确认事项单独登记，不得伪装为生产规则。
6. **版本与验收：** 每项技术/视觉证据必须绑定精确SHA。验收期间冻结候选分支写入；新提交会使旧SHA验收失效。自动化PASS只证明其覆盖范围，不等于人工视觉签收、已归并或已部署。
7. **高风险操作：** 不删除历史成果、不批量关闭PR或删除分支、不修改main保护/权限、不合并main、不正式部署，除非用户明确确认。


## 2026-11-20 当前原生分支执行增量

最新用户授权优先微信原生体验版实现，覆盖第1条旧的“不做微信真机验收”范围。首先读取 `wx-native/docs/baseline-20261120/规则基线与实施计划.md`、`规则变更台账.csv` 和两份原文来源；当轮6项修订优先于40条原清单，后者优先于Claude包冲突规则。代码实现、编译、真机、视觉、归并分别验收。规则目标契约不是运行时配置；修改目标契约不得冒充已实现。仅在隔离分支工作，未完成原生截图验收不能继承旧Web签收。


## 2026-11-20 协作增量｜COLLAB-SETUP-01

来源：Claude只读评审分支7b5634af，原文留档wx-native/docs/collab/COLLAB-SETUP-01/UPSTREAM_CODEX_COLLAB_HANDOFF_PROMPT_v2.md。用户本聊天“继续”已启动本包。以下原文须受这三项执行覆盖约束：

1. 本轮“真机”按用户最新定义指微信开发者工具，证据标sim，不要求实际手机；未测项如实记录。
2. 不写Claude评审目录/分支；处置另存wx-native/docs/collab/COLLAB-SETUP-01/review-dispositions.csv，以issue_id关联原表。
3. 五类小样实际六个状态、双尺寸12图。截图分别记录DPR、逻辑大小、原图像素大小及捕获缩放；DPR不能等同模拟器工具栏缩放。旧static-result是有限Node检查，不冒充Python全量检查。

## 一、背景与当前事实

- 仓库：`silenwild-jpg/mini-koala-miniprogram-prototype`（公开仓库）。
- 规则基线：`feat/wx-native-rule-baseline-20261120` @ `6d34a4a`（Claude v0.2.0 + 11-20 批准规则）。
- 你的当前分支：`codex/inventory-display-density-20261120` @ `76916af`，运行时候选 `f125158`。
- 另一方是 Claude（钉钉群里的产品设计助理，运行在无图形界面的 Linux 服务器上）：能读本仓库、能跑 Node / Python 测试和静态检查、持有冻结设计稿与 D-01～D-203 裁定史；**没有**微信开发者工具，看不到模拟器和真机。
- Claude 已在 `76916af` 上独立复跑：`node --test tests/` 164/164 通过；`smoke_run.js` 35 页 / 22 组件 / 6618 次调用 0 异常；`smoke_orders.js` 6 单 / 960 次调用 0 异常；`python3 tools/static_check.py miniprogram` **报 2 条错误**（见第七节任务 2）。

## 二、分工（单写者）

| 事项 | 负责方 | 说明 |
|---|---|---|
| `wx-native/miniprogram/`、`tests/`、`tools/` 运行时代码 | **Codex（唯一写入方）** | Claude 不直接改这三个目录，发现问题只出问题单 |
| 微信开发者工具编译、模拟器自动化、截图采集、预览码 | **Codex** | 按本文第四节的命名和索引交付 |
| 独立评审：截图对照设计稿、规则逐条核对、测试独立复跑 | **Claude** | G-VIS 的独立结论由 Claude 出；你的逐图检查记为「自检」 |
| 设计稿与设计口径：`wx-native/design-frozen/`、`wx-native/review/` | **Claude（唯一写入方）** | 你不改这两个目录；认为设计稿过时，写进问题单 |
| 业务规则、视觉取舍、是否发体验版、是否归并 | **张坤** | 只把真正需要裁定的项交给张坤，一次列清 |

规则来源顺序不变：张坤最新指令 ＞ 11-20 当轮 6 项修订 ＞ 40 条清单 ＞ Claude 包内未冲突条目。Claude 的评审意见是**评审输入**，不是规则；涉及改规则的，必须由张坤裁定后进《规则变更台账》才生效。

## 三、分支与提交

1. 继续在 `codex/*` 分支工作，每个任务包一个分支或一组连续提交，提交说明带任务 ID。
2. 提交说明统一带 `[skip netlify]`（`cbffc52` 之后的 5 个提交漏了，后续补上即可，不要为此改写历史）。
3. 每个任务包完成后，开一个 **Draft PR**：`codex/<分支>` → `feat/wx-native-rule-baseline-20261120`。PR 只用于评审与留痕，**不要自行合并**。PR 描述写明：运行时 SHA、改动范围、证据目录、未测项。
4. 不推 `main`、不强制推送、不删分支、不关他人 PR、不上传体验版，除非张坤在当轮明确说可以。
5. 仓库是公开的：代码上传密钥（`.key`）、令牌、手机号等真实客户信息一律不得进仓库和证据文件。

## 四、每批交付物（固定格式）

证据目录沿用你现有约定：`wx-native/evidence/next-stage-20261120/<任务ID>/<运行时完整SHA>/`。在现有文件之外，补齐下面三样。

### 4.1 截图命名

`<场景ID>__<页面ID>__<状态>__<宽度>__<环境>__<SHA前7位>.png`

- 场景ID：取 `ACCEPTANCE_MATRIX.csv` 的 ID（如 `D05`）；矩阵里没有的场景先在矩阵登记再截。
- 页面ID：H01 / CAP / ITEMS / S01 / S02 / S5 / QUICK / O01 / LOGIN 等现行页面代号。
- 状态：小写英文短横线，如 `near-combo`、`guest-default`、`visit-sheet-open`。
- 宽度：`375` 或 `390`（逻辑宽度，以 systemInfo 为准）。
- 环境：`sim`（开发者工具模拟器）/ `ios` / `android`（真机）。**模拟器图不得标成真机。**
- 例：`D05__S5__near-combo__375__sim__c92fcf0.png`

### 4.2 截图索引 `shots.csv`（每批一份，一行一张图）

列：`file, scene_id, page_id, route_with_query, fixture_id, login_state, pre_actions, logical_size, env, device_model, wechat_version, sdk_version, runtime_sha, design_ref, rule_ids, self_check, self_check_note`

- `design_ref`：对应的冻结稿文件路径（`wx-native/design-frozen/...`），找不到对应稿填 `NONE`，不要猜。
- `rule_ids`：这张图要验证或已知偏离冻结稿的规则 ID（如 `NR-25;NR-27`）。冻结稿早于 11-20 规则基线，凡是规则已覆盖冻结稿的地方必须在这里标出，否则会被当成还原偏差。
- `self_check`：`PASS / FAIL / NOT_CHECKED`，是你的自检，不是视觉签收。
- 用渲染 fixture 而非真实路径得到的画面，`fixture_id` 写清，`pre_actions` 注明「页面实例注入，未走真实操作路径」。

### 4.3 技术门禁 `G_TECH.md`（附原始输出文件）

每批必须包含以下各项的命令、原始输出和结论，缺任何一项写 `NOT_RUN` 及原因：

1. `node --test tests/`
2. `python3 tools/static_check.py miniprogram`（要求 errors = 0）
3. `node tools/smoke_run.js miniprogram`
4. `node tools/smoke_orders.js miniprogram`（改动涉及报价、订单、登录守卫时必跑）
5. 微信开发者工具 WXML 编译与控制台日志（工具版本、基础库版本）

G-VIS 一栏你只填 `PENDING_INDEPENDENT_REVIEW`，由 Claude 评审后回填结论，最终签收由张坤给。

## 五、评审回路

1. 你推送并开 Draft PR 后，在给张坤的回报里附：分支、完整 SHA、PR 号、证据目录、`shots.csv` 路径。
2. Claude 拉取该 SHA，输出 `REVIEW_<SHA前7位>.md` 和 `review_issues.csv`。列：`issue_id, severity(P0–P3), type(与设计不符/与规则不符/技术回归/证据不足/需裁), page_id, scene_id, file_or_shot, 现象, 依据(规则ID或设计稿路径), 建议`。
   - 传递方式：张坤已授权 Claude 推送评审分支。文件在 `claude/review-<SHA前7位>` 分支的 `wx-native/review/<SHA前7位>/`，有 PR 时 Claude 同时在 PR 留评论。该分支只供阅读，不要合并，也不要往里提交。
3. 你对每一条必须给出处置，写回同一张表新增三列：`disposition(FIXED / REJECTED / NEEDS_RULING / DEFERRED), commit_or_reason, 复测证据`。不允许不回应，也不允许把 REJECTED 的项默默关闭。
4. `NEEDS_RULING` 的项汇总成一张清单交张坤，只暂停依赖它的部分，其余继续。
5. 每批集中修复后最多再确认一轮；新出现的实质问题另开编号批次。新提交会使旧 SHA 的评审结论失效，只需重截受影响的页面，并在 `shots.csv` 里标明沿用旧图的行及理由。

## 六、真机档（01E 之前先约定）

模拟器截图只能证明模拟器范围。下列项目必须有真机证据才能记通过，其余可用模拟器图：

- 定位授权（同意 / 拒绝 / 拒绝后再进）、手机号快速验证（成功 / 拒绝 / 失败回退短信）
- 支付调起与支付失败返回、订阅消息调起
- 软键盘顶起（CAP 输入、看仓弹层、登录层）、底部安全区与刘海、系统字体放大
- 弹层关闭与遮罩点击的命中、长列表滚动

做法：你出预览码或真机调试，张坤在手机上操作并截图；真机图按 4.1 命名（环境填 `ios` / `android`），由你登记进 `shots.csv`，并记录机型、系统版本、微信版本、基础库版本。工具做不到真机自动截图时如实写「人工截图」，不要用模拟器图替代。至少各一台 iOS 和 Android。

## 七、本协议下的第一个任务包：COLLAB-SETUP-01

张坤 11-20 已确认本分工。首份独立评审已出：分支 `claude/review-76916af`，目录 `wx-native/review/76916af/`（`REVIEW_76916af.md`、`review_issues.csv`、`COLLAB_PLAN_v1.md`）。

1. **确认与登记**：回复你对本文的逐节确认；有做不到或不同意的条款，逐条写原因，不要整体同意后选择性执行。把「一～八」追加到 `AGENTS.md`。
2. **处置评审问题单**：`review_issues.csv` 共 8 条（P1 × 1，P2 × 6，P3 × 1），逐条按第五节第 3 点回填处置。其中 R76-01（`pages/store/detail.wxss:81` 裸色值，静态检查 2 条错误）必须在本包修复；另请说明 `evidence/20261120/static-result.json` 的 `errors: []` 是在哪个 SHA 上跑的。
3. **截图改为 1:1**：现有标称 375 的图实际是 345×748 像素（约 92% 缩放）。之后模拟器缩放设 100%，`shots.csv` 增加一列 `dpr`。
4. **五页小样**：按第四节格式交一批完整证据，范围为首页 H01、仓位推荐 S5（足额 / 容量接近各一）、确认订单 O01、登录层、订单详情，375 与 390 各一张。目的是验证命名、`shots.csv` 和评审回路能跑通，不新增功能。
5. **补索引**：给 `COMPONENT-PILOT-01B-FINAL/f125158…/` 的 24 张最终图补一份 `shots.csv`（不改文件名，`file` 列填现名）。更早的历史图不用回填。
6. **开 Draft PR**：`codex/inventory-display-density-20261120` → `feat/wx-native-rule-baseline-20261120`。
7. **后续顺序**：本包完成后继续你 `NEXT_PACKAGE.md` 里的 01C 剩余状态。01B 已经改了共享弹层 `mk-sheet`，这次按追溯评审处理；之后凡是改共享组件或全局样式，先把约定文档交 Claude 评审一轮再落代码。01D 分域推广按「每域一个 PR、一轮评审」走，整体阶段见 `COLLAB_PLAN_v1.md` 第 4 节。

## 八、回报格式（每批结尾固定）

```
任务包：<ID>            分支：<名>            运行时SHA：<完整SHA>        PR：#<号>
完成：…
证据目录：…             shots.csv：<N> 行（sim <n> / ios <n> / android <n>）
G-TECH：tests <通过/总数>｜static errors <n>｜smoke <调用数/异常数>｜smoke_orders <结果或NOT_RUN>｜WXML编译 <结果>
G-VIS：PENDING_INDEPENDENT_REVIEW（自检 PASS <n> / FAIL <n> / NOT_CHECKED <n>）
未测 / 限制：…
评审问题单处置：FIXED <n> / REJECTED <n> / NEEDS_RULING <n> / DEFERRED <n>
需张坤裁定：<逐条，没有写「无」>
下一任务包：<ID>
```

没有执行的写 `NOT_RUN` 或 `NOT TESTED`，不写 PASS；不编造截图、数据或测试结果。
