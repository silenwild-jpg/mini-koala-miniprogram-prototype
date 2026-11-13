# PROJECT-OPS-RESET-01 / P1-B2｜49条未引用历史分支可归档性与查漏报告

**日期：2026-11-13**。范围：对上一轮[P1-B全量分支报告](PROJECT_OPS_P1B_BRANCH_INVENTORY_20261113.md)的48条未引用历史分支，结合治理PR #179合并后新增的1条不再被开放PR引用的来源分支，进行分组与抽样内容比对。签收候选PR #176保持冻结，不修改代码。

- 当前main审计SHA：`aa29e33a23ba6a37a6e2fd3843e4001d6d0524fb`。
- 受签收演示候选：`41a8a079eb48049e1060512bddf71c226bfd3738`。
- 上一轮180条分支中，48条未被Open PR引用，另1条为当时尚未合并的审计工作分支；#179 Squash合并后，**未引用历史分支变为49条**。本报告工作分支新建后，分支总数短暂增加到181；它成为新的治理PR head后不计入历史未引用分支。
- **先前48条**的compare结果基于更早main提交`165e521cca6e9453a691c6660d04110538f7fdec`：21条ahead=0，27条ahead>0。随后main仅发生治理文档Squash提交；#179源分支是额外的1条已Squash治理来源，按Git提交关系仍有独有历史。任何最终删除前需对实时main重新比对。
- 没有关闭任何PR、删除任何分支、迁移任何旧业务代码或发布站点。

## 一、处置分组

| 分组 | 数量 | 判定和策略 |
|---|---:|---|
| 相对旧审计main ahead=0 | 21 | 无领先main的独有提交，仍需确认历史用途；其中备份2、历史Release1不得优先删除 |
| 相对旧审计main ahead>0 | 27 | 含治理已Squash合并来源2和独有开发/QA/视觉历史25；需核对差异 |
| 新增#179治理Squash来源 | 1 | 已合并main，但原分支提交关系不等于原始历史被原样合并 |
| **总计** | **49** | **本轮可直接删除：0** |

### 1. 无领先main独有提交的18条非备份/Release分支（下一轮低风险候选）

这些分支曾承载开发或合并过程，但**只是候选清理范围，不是已批准删除清单**：

```text
feature/br01-home
feature/br02-capacity
feature/br03-promo-copy-01
feature/br03-store-unit
feature/core-journey-fix-01
feature/git-merge-02c-targeted-20261027
feature/git-merge-02e-visual-e2e-20261027
feature/git-merge-02f-premerge-gates-20261027
feature/git-merge-02g-central-ssot-20261027
feature/git-merge-02h-source-and-visual-20261027
feature/git-merge-02i-demo-admission-20261027
feature/git-merge-02j-legacy-store-intake-20261027
feature/git-merge-02k-legacy-visual-gate-20261027
feature/git-merge-02n-protected-review-package-20261027
feature/visual-consistency-01
feature/wx-native-01e
integration/git-merge-02b-seven-pr-isolated-20261027
integration/proto-merge-01f
```

**实际Closed PR引用抽样核对**：
- `feature/br01-home`：历史PR #10 已合并到旧集成分支；#2 关闭未合并。
- `feature/br02-capacity`：历史PR #9 已合并到旧集成分支；#1 关闭未合并。
- `feature/git-merge-02n-protected-review-package-20261027`：PR #21 已合并main。
- `feature/core-journey-fix-01`：历史PR #4 关闭未合并。虽然ahead=0，但**曾有未合并PR引用，不可仅凭无独有提交推断其功能不再需要**。

其余13条仍需核对closed PR、tags、workflow和历史部署关联。即便最后删除分支，GitHub已关闭PR的差异阅读可用性/审计追溯仍应先做备份确认。

### 2. 默认保留的3条历史备份/发布分支

- `backup/main-pre-02n-review-config-20261027`
- `backup/main-pre-demo-mk-rc1-20261027`
- `release/demo-mk-rc1-20261027`

以上3条相对旧main没有独有提交，但承担回滚/版本身份意义；其中Release分支曾用于已合并PR #20。禁止纳入第一批删除。

### 3. 治理Squash来源3条（保留追溯至归档批准）

- `governance/proto-vis-exec-01-20261103`：治理PR #68已Squash合并。
- `governance/ops-postmerge-status-01-20261113`：治理PR #178已Squash合并。
- `governance/project-ops-p1a-p1b-audit-20261113`：治理PR #179已Squash合并。

Squash会改写最终合并commit形态，源分支在Git ancestry视角仍可能ahead>0。归档前需确认原始审计材料、门禁报告和批准记录在main与PR讨论中均可追溯。

## 二、抽样差异的实际内容证据

以下“候选缺失路径”来自对分支head递归Git Tree和**已签收RC2 SHA**递归Git Tree的逐路径比较；只代表路径不存在，不代表功能未实现。并且各分支的同路径不同blob也不等于必须迁移。

| 未引用分支 | 与已签收候选同SHA文件 | 候选无同路径 | 同路径内容不同 | 判定 |
|---|---:|---:|---:|---|
| `feature/br03-s01-s02` | 962 | 23 | 4 | **保留**，独立门店目录与素材、S01/S02截图及QA |
| `br01-h01-connect-03-isolated` | 1513 | 3 | 32 | 保留历史路由合同/移交材料，需与现中央入口核对 |
| `ops/site-connect-03a-rc1-p1-cd-20261029` | 1513 | 0 | 32 | 旧Netlify发布配置历史，非新部署源 |
| `isolate/rc2-s5-source-reconcile-01-20261112` | 1591 | 173 | 27 | 含49条旧workflow、50份旧docs、71个旧scripts、3个QA文件；需归档审计用途 |
| `fix/rc2-single-candidate-04-20261112` | 1599 | 184 | 26 | 主要为历史QA/docs/workflow；不能整分支覆盖已签收RC2 |
| `audit/rc2-ux-quality-rebase-01-20261111` | 1569 | 134 | 28 | 主要为历史QA/docs/workflow；保留UX结论 |
| `visual/vis-rebuild-03a-s01-approved-a-white-distance-20261028` | 1509 | 4 | 32 | 含旧S01 CSS/QA和视觉记录，已过期，不作为正式母版 |

**优先保全的实际路径举例**：
- BR03独立目录：`app/prototype/parallel/br03-central-catalog-demo/`；包含店面图片、仓型图片、`central-catalog.js`、`S01_375x812.png`、`S02_390x844.png`等浏览器证据。结合此前“旧门店数据迁入”需求，需要先确认旧目录/实拍映射资产是否有独有价值。
- H01旧桥接：`app/prototype/mk-h01-central-route-connect03.js`、`docs/BR01_H01_CONNECT_03_STATUS.md`、`docs/BR01_H01_CONNECT_04_HANDOFF.md`。当前签收RC2未沿用这些路径，须保留旧转接逻辑文档并评估是否仅为废弃入口。
- S5来源审查：`docs/RC2_FINAL_MERGE_01_S5_SOURCE_LINEAGE_AND_RELEASE_GATE_20261103.md`、`docs/PRICE_INTEGER_CONTRACT_01_20261111.md`、`docs/PRICE_INTEGER_INTEGRATION_02_20261111.md`等在历史链条中保留审计线索，不自动移植。
- 旧S01静态：`app/prototype/parallel/core-journey-fix-01/demo/s01-vis-rebuild-03a.css`和相关QA仅作为视觉参考，不能覆盖当前认可的“排序/距离/服务”三筛选及第三E存位。

## 三、后续逐项归档门禁与优先级

1. **禁止第一批处理**：main、PR #176正式演示分支及所有Open PR head/base、上列3条backup/release、3条已合并治理源分支、BR03独有门店资料源、S5/RC2/UX来源审计链。
2. **先核对18条低风险候选**：检查各自Closed PR引用、部署/发布/Tags、主线内容和历史记录；若没有独有价值，才形成逐分支清理申请。
3. **旧门店数据专题**：核对BR03独立目录的门店实体及图片是否与当前fixtures和`store-curated`资产重复。未完成前不得删除BR03源分支。
4. **旧QA整理**：不把全部71个旧测试脚本直接注入新门禁；筛选仍未覆盖的业务场景，再纳入下版QA专题，而不是改动已签收SHA。
5. **真正执行删除时**逐条记录branch SHA、是否曾关联已关闭PR、可恢复的Tag/备份、批准人、执行时间；用户尚未授权批量删除，此报告不执行。
6. **保护主线规则**：清理分支不自动触发业务PR #176合并、不恢复U01、对比功能或历史视觉模板。

## 四、结论

**P1-B2已完成“49条未引用历史分支的风险分层 + 7个代表性源分支内容抽查”**，还没有完成“49条分支逐条资产/外部部署引用核实”。本阶段没有可直接删除的分支，18条属于下一轮低风险候选而非已核准删除。

_该审计仅针对标明的commit/树版本。main后续变化需要重核，不能让旧ahead/behind计数直接作为安全删除凭证。_
