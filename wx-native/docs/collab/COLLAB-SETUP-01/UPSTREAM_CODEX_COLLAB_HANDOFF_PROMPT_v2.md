# 给 Codex 的任务交接协作提示词 v2（2026-11-20，北京时间；替代 v1）

> 用法：整段粘贴给 Codex。Codex 确认后，请把「一～八」作为 `AGENTS.md` 的「2026-11-20 协作增量」追加提交（只追加，不改前文）。
> 本文不改变任何业务规则，只约定谁写、谁审、怎么交接。与 `AGENTS.md` 现有条款冲突时，以张坤最新指令为准，并把冲突点列给张坤。

---

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
