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
