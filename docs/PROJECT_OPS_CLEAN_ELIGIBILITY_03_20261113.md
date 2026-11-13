# PROJECT-OPS-CLEAN-ELIGIBILITY-03｜剩余历史PR依赖与分支清理门禁

**审计日期：** 2026-11-13  
**状态：** 证据审计完成；本轮没有新的 PR 关闭授权，不执行关闭或分支删除。  
**当前唯一正式演示基线：** [PR #176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176)，冻结SHA `41a8a079eb48049e1060512bddf71c226bfd3738`；DEMO READY，未归并 main，未证明线上站点部署此SHA。  
**main 基线：** `ab222867fe276505032a73cb880e3565f3e572bc`，`protected=true`。

## 一、最新库存与先前清理回执

- 开放PR **124条**，全部Draft；其中以main为base的8条：#176、#47、#36、#35、#33、#30、#28、#26。
- 仓库分支 **185条**，其中59条没有被当前开放PR的head/base直接引用。
- 上一阶段按用户逐项批准，已关闭#22/#24/#50，以及#67/#84/#86/#89，共**7条历史PR**；全部Not merged，原分支及原SHA已复查保留，历史讨论可查看。
- 现有未引用分支中**44条**可关联至少一条已关闭PR的head；另外**15条**没有相应已关闭PR作为head。没有PR直接引用并不代表没有历史或部署依赖。
- 本次新增的11条“未被开放PR引用”分支，来自关闭历史审计/PRD/设计工作及已合并的治理PR来源；它们与此前48条已审计历史分支合计59条。这些均不得直接删除。

## 二、发现两个应写入永久清理规则的依赖

| 依赖方 | 仍引用的来源分支 | 风险与裁定 |
|---|---|---|
| [开放PR #25](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/25) | `visual/vis-rebuild-03a-r1-pixel-faithful-20261028`，对应**已关闭PR #24**的head | **必须保留**此源分支。关闭PR不会自动使下游以它为base的PR脱钩，删除分支将破坏后续正常差异和审计来源。 |
| [开放PR #141](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/141) | `isolate/rc2-public-price-01-20261112`，对应**已合并PR #140**的head | **必须保留**此源分支，直到确认下游PR移交/变更base、原SHA被完整保全且通过复核。 |

**清理门禁升级：** 不得仅根据“PR已关闭/已合并”删除其head；**必须先查所有开放PR的base引用**。对曾被用作base的分支需另查已关闭PR的祖先链、GitHub工作流、Tags和外部部署依赖。不同SHA或Squash归并的历史分支也可能承担来源追溯职能。

## 三、剩余历史审计PR实际文件核验

| PR | 增量文件性质 | 当前裁定 |
|---|---|---|
| [#53](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/53) `PROTO-RULE-RESTORE-07` | 3个docs文件，**但仍是开放PR #54的base分支** | **保留，不在下一批关闭/删分支中处理**。需先保全#54—#55旧私有站验收链。 |
| [#87](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/87) `RC2-UAT-RELEASE-READY-01` | 2个docs文件，记录旧站部署版本、SSO与UAT过程 | **保留**。用户签收本地原型并不等于在线版本身份或国内/真机访问已经验证。 |
| [#124](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/124) / [#135](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/135) / [#145](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/145) | docs + 独立测试脚本 + workflow | **保留**，不是纯过期审计；需逐脚本比较当前RC2测试覆盖与后端未来质量门禁。 |
| [#122](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/122) / [#109](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/109) | docs + 浏览器/审计脚本 + workflow | **保留**，有可复用QA方法和视觉审计资产。 |
| [#92](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/92) | 4个视觉/素材验收文档及1个资产验证脚本 | **保留**，原用户已暂缓中大型仓素材重建，不能误当已完成并清理。 |
| [#79](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/79) / [#82](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/82) / [#90](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/90) / [#91](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/91) / [#95](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/95) / [#96](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/96) | 仍有app/运行时/样式及QA源变更 | **保留来源链**，禁止以“历史HOLD”标题直接关闭或整PR并入签收版。 |
| [#133](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/133) | 可视化编辑器独立工具资产 | **保留**，后续UI编辑工作流单独决策。 |

**本阶段没有发现仅凭已验证资料就可以安全追加关闭的新一批PR。** 推荐先做独有QA脚本替代覆盖对照与历史部署链核查，再提出新的4—8条具体候选。若需要关闭PR，须用户对**对应编号的具体名单**授权。

## 四、Tag与部署引用：不得删除

1. GitHub当前可查到`refs/tags/baseline/proto-parallel-01-20261021`，指向`97ecfe97df9a880dc66518f914117ed192f622f4`；对应旧备份来源，不能因ahead=0或无开放PR引用删除。
2. [Netlify RC2 PR96旧UAT部署](https://app.netlify.com/projects/mini-koala-rc2-uat-pr96-20261110)：部署ID `6af3442d0a6cc685b78ebe74`，**ready**，2026-11-10发布；来源分支`uat/rc2-pr96-20261110`，commit `be4b8d1aee72357cb38c2e6d61ad2adf90dfc6cf`。**该分支是明确的外部部署依赖，不得删除**，也不得声称该旧站已经发布PR#176签收SHA。
3. [Netlify旧RC1评审站](https://app.netlify.com/projects/mini-koala-internal-rc1-review) 的 PR #184预览部署ID `6af70a159edf1182f4dcb672`，状态 **error**，构建退出码2，`published_at=null`。这是旧站部署链路遗留问题，不能当成当前治理CI失败或RC2正式演示已部署的证据。
4. main现有旧Git-Merge工作流仍显式引用多条老`feature/git-merge-02*`分支；这些分支即使ahead=0，未退役工作流前仍须保留。历史UAT/Netlify分支来源也需保留。

## 五、分支清理候选的必要证据

任何“允许删除”的清单在提交前都必须同时具备：

- 精确分支名、当前SHA、Git ahead/behind、提交和原始PR关联；
- **所有开放PR head/base引用核对**，包括已关闭PR作为下游基线的场景；
- 当前main的工作流触发分支扫描、Tag/Release与Netlify部署关联；
- 是否为回滚/图片/源代码/QA方法保全载体；
- 可恢复方式（例如保留Git tag、历史PR/Commit永久记录等），明确授权与执行日志。

不满足任何一项即标记`HOLD`；不能以“低风险”替代删除许可。

## 六、剩余任务队列

| 任务 | 优先级 | 下一动作 |
|---|---|---|
| `QA-LEGACY-COVERAGE-02` | P1 | 比对#124/#135/#145/#122/#109旧测试与已签收RC2同SHA门禁，提取缺失断言，不触动签收业务源码 |
| `SITE-PREVIEW-ISOLATION-01` | P1 | 隔离旧RC1 Netlify对纯docs治理PR的失败预览检查；先做方案与权限核验，不未经授权改部署配置 |
| `BRANCH-RETIRE-GATE-01` | P1 | 先核实旧workflows/已关闭PR的base关系与Tags，生成逐分支安全退役清单，不批量删 |
| `MAIN-RULES-COST-01` | P1 | 规则集同名必需检查去重；取消严格分支更新要求以省CI成本，但保留必需CI，需管理员配置权限（目前仍为两条同名检查且strict=true） |
| `RC2-DEMO-PREVIEW-PROVENANCE-01` | P1 | 如果需要对外在线演示，单独核对候选SHA、部署ID、构建资产和访问权限；不得用旧PR96 UAT站冒充正式演示部署 |

## 执行边界

- P1-A/P1-B、A2/B2、A3/B3历史来源审计和QA-LEGACY-RETAIN-01补证已完成；首两批7条历史PR已经按用户具体授权关闭。
- 本次仅形成治理证据、更新状态，不关闭额外PR、不删分支、不动签收PR#176、不变更Netlify或main保护规则。
- 项目总控：[Issue #177](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/177)。本报告为当前状态快照，分支/PR数量随着治理PR归并会继续变化，应以GitHub实时读取为准。
