# PROJECT-OPS-RESET-01 / P1-B2｜49条未被开放PR引用分支的来源与清理风险复核

**审计日期：2026-11-13**；主候选PR #176签收SHA：`41a8a079eb48049e1060512bddf71c226bfd3738`；main核对SHA：`aa29e33a23ba6a37a6e2fd3843e4001d6d0524fb`。

- 实时分支总数：**181**（包含本任务新增的活动审计分支`governance/project-ops-p1a2-p1b2-20261113`）；仍开放PR：**130**；本轮分析**49**条其他未被开放PR引用的历史分支。
- 上轮P1-B提供48条逐分支Git Ahead/Behind比较（相对main `165e521...`）；第49条是已Squash归并PR #179的审计源分支，其3份docs与现在main blob SHA逐项相同。
- 旧基线48条中：ahead=0 **21**、ahead>0 **27**；第49条为Squash归并源，有原提交历史，但其3份docs内容已核对进入main。
- 已关闭PR索引：本次查询GitHub已关闭PR **38** 条；这49条中 **35** 条曾作为已关闭PR的head或base被引用（见明细表）。
- **不能把无开放PR引用误读为无人使用**：存在已关闭PR、Netlify发布、备份/发布留存、历史签收视觉原件、源代码审计证据。

## 现场确认的外部部署依赖

1. Netlify站`mini-koala-rc2-uat-pr96-20261110`已发布部署ID `6af3442d0a6cc685b78ebe74`，`branch=uat/rc2-pr96-20261110`，`commit_ref=be4b8d1aee72357cb38c2e6d61ad2adf90dfc6cf`，`state=ready`。**该分支绝不能因为PR已关闭而删除**；`stage/rc2-pr96...`虽然同SHA也须先核对历史审计引用。
2. Netlify旧RC1站`mini-koala-internal-rc1-review`当前成功发布`branch=main`、`commit_ref=9b0f07d563777e37d736551a176fe814134454fa`，并非当前签收RC2 SHA。不能用此站证明RC2已经上线。
3. Netlify `mini-koala-rc2-uat-private`已有ready部署，但记录不提供`branch`或`commit_ref`，**无法确认对应哪条历史分支**；归档前需保留相应来源线索。
4. 当前连接的GitHub资源接口未提供可用的Tags清单/全量Actions部署引用，因此**尚未核验全部Tag与历史部署依赖**；本报告不能作为立即删除授权。

## 49条详细处理清单

| 分支 | SHA | 旧main ahead/behind | closed PR引用 | 相对双基线无同路径文件数 | 处理组 | 原因 |
|---|---|---|---|---:|---|---|
| `audit/rc2-p1-demo-close-02-20261110` | `310a3c2e9a` | 513/6 | 未关联到已关闭PR | 126 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `audit/rc2-uat-user-01-20261110` | `19ed539fdb` | 516/6 | 未关联到已关闭PR | 130 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `audit/rc2-ux-quality-rebase-01-20261111` | `c7bc61902c` | 532/6 | 未关联到已关闭PR | 134 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `backup/main-pre-02n-review-config-20261027` | `285ff1529a` | 0/15 | 未关联到已关闭PR | 未统计 | D1｜备份/发布保留 | 保留版本身份与回滚路径；不删除 |
| `backup/main-pre-demo-mk-rc1-20261027` | `97ecfe97df` | 0/127 | 未关联到已关闭PR | 未统计 | D1｜备份/发布保留 | 保留版本身份与回滚路径；不删除 |
| `br01-h01-connect-03-isolated` | `e7d0da04c2` | 3/6 | [#34](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/34)× | 3 | D0｜独立桥接待裁定 | 树比较发现H01旧桥接JS及两份交接文档不存在于双基线；不可盲移 |
| `feat/h01-task-space-explore-03-20261111` | `c9941ba22d` | 650/6 | [#123](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/123)× | 139 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `feature/br01-home` | `739f524376` | 0/126 | [#10](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/10)✓、[#2](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/2)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/br02-capacity` | `fddbe355c5` | 0/126 | [#9](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/9)✓、[#1](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/1)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/br03-promo-copy-01` | `8a0003d11b` | 0/124 | [#7](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/7)(base)×、[#6](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/6)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/br03-s01-s02` | `e0761bd710` | 1/125 | 未关联到已关闭PR | 23 | D0｜独立前端素材待移交 | 树比较有23个现版双基线均无同路径文件：独立S01/S02演示、素材、截图与QA |
| `feature/br03-store-unit` | `c5056fe478` | 0/125 | [#8](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/8)✓、[#3](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/3)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/core-journey-fix-01` | `6015b9a787` | 0/126 | [#5](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/5)(base)×、[#4](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/4)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/git-merge-02c-targeted-20261027` | `91e6ef3178` | 0/99 | [#13](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/13)(base)×、[#12](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/12)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/git-merge-02e-visual-e2e-20261027` | `6584b5202d` | 0/92 | [#14](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/14)(base)×、[#13](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/13)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/git-merge-02f-premerge-gates-20261027` | `2d72a3d2f4` | 0/82 | [#15](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/15)(base)×、[#14](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/14)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/git-merge-02g-central-ssot-20261027` | `f6ffcb29fd` | 0/68 | [#16](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/16)(base)×、[#15](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/15)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/git-merge-02h-source-and-visual-20261027` | `c141bec6b3` | 0/64 | [#17](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/17)(base)×、[#16](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/16)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/git-merge-02i-demo-admission-20261027` | `a6c828476e` | 0/44 | [#18](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/18)(base)×、[#17](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/17)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/git-merge-02j-legacy-store-intake-20261027` | `fd4babb615` | 0/28 | [#19](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/19)(base)×、[#18](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/18)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/git-merge-02k-legacy-visual-gate-20261027` | `e863dead43` | 0/20 | [#19](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/19)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/git-merge-02n-protected-review-package-20261027` | `ecb5e10888` | 0/9 | [#21](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/21)✓ | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/visual-consistency-01` | `157e512606` | 0/120 | [#7](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/7)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `feature/wx-native-01e` | `963b350974` | 0/125 | [#6](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/6)(base)×、[#5](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/5)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `fix/rc2-p1-demo-close-01-20261110` | `5cd12af243` | 514/6 | [#97](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/97)✓ | 125 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `fix/rc2-single-candidate-04-20261112` | `7b7a929d25` | 690/6 | 未关联到已关闭PR | 184 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `fix/site-access-03c-s5-iframe-route-20261029` | `403f3b59ab` | 9/8 | [#31](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/31)✓ | 0 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `governance/ops-postmerge-status-01-20261113` | `41ce65e209` | 3/1 | [#178](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/178)✓ | 0 | D2｜Squash归并源 | 来源PR已归并main，审计前保留原分支；#179源3份docs已核对SHA相同 |
| `governance/project-ops-p1a-p1b-audit-20261113` | `f130de7183` | Squash源（另核） | [#179](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/179)✓ | 3份docs已在main按SHA核实 | D2｜Squash归并源 | 来源PR已归并main，审计前保留原分支；#179源3份docs已核对SHA相同 |
| `governance/proto-vis-exec-01-20261103` | `6cd9c6d98e` | 20/6 | [#68](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/68)✓ | 0 | D2｜Squash归并源 | 来源PR已归并main，审计前保留原分支；#179源3份docs已核对SHA相同 |
| `integration/git-merge-02b-seven-pr-isolated-20261027` | `8bd1ad9a34` | 0/113 | [#12](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/12)(base)×、[#11](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/11)✓、[#10](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/10)(base)✓、[#9](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/9)(base)✓、[#8](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/8)(base)✓ | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `integration/proto-merge-01f` | `97ecfe97df` | 0/127 | [#4](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/4)(base)×、[#3](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/3)(base)×、[#2](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/2)(base)×、[#1](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/1)(base)× | 未统计 | D3｜无独有提交归档候选 | 与旧main审计SHA相比ahead=0；还需验证closed PR/tag/回滚等引用 |
| `isolate/rc2-cap-h01-integration-gate-01-20261112` | `9eec773091` | 683/6 | [#143](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/143)× | 182 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `isolate/rc2-gate-ready-02-main-candidate-20261102` | `56e6ad917c` | 166/6 | 未关联到已关闭PR | 44 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `isolate/rc2-h01-active-no-photo-03-20261112` | `0346a0ec21` | 665/6 | [#144](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/144)× | 183 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `isolate/rc2-h01-task-vis-adapt-01-20261112` | `5182f5eb88` | 661/6 | [#144](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/144)(base)×、[#142](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/142)× | 180 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `isolate/rc2-merge-prep-01-three-source-20261102` | `212a9dde17` | 32/6 | 未关联到已关闭PR | 7 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `isolate/rc2-merge-prep-03-h01-receipt-gate-20261102` | `c768cdd8d9` | 54/6 | [#38](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/38)× | 30 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `isolate/rc2-s02-term-state-01-20261112` | `a6bcfafe18` | 641/6 | [#139](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/139)✓ | 175 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `isolate/rc2-s5-source-reconcile-01-20261112` | `cffe000a30` | 631/6 | [#138](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/138)✓ | 173 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `isolate/ux-quality-01-r2-audit-20261102` | `b82955890f` | 171/6 | 未关联到已关闭PR | 46 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `isolate/ux-quality-01-r2-close-20261102` | `c5195f1af8` | 171/6 | 未关联到已关闭PR | 45 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `ops/git-cost-opt-01a-review-gate` | `4716ed5f8e` | 430/6 | [#94](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/94)✓ | 111 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `ops/rc2-uat-package-gate-20261105` | `276e2100d7` | 427/6 | 未关联到已关闭PR | 112 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `ops/site-connect-03a-rc1-p1-cd-20261029` | `02fa039c77` | 2/7 | [#32](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/32)✓ | 0 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `release/demo-mk-rc1-20261027` | `05b283f845` | 0/16 | [#20](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/20)✓ | 未统计 | D1｜备份/发布保留 | 保留版本身份与回滚路径；不删除 |
| `stage/rc2-pr96-p1-uat-20261110` | `be4b8d1aee` | 507/6 | 未关联到已关闭PR | 126 | D1｜独有历史复核 | 有独有Git提交或相关QA/部署历史，未确认资产完整迁移 |
| `uat/rc2-pr96-20261110` | `be4b8d1aee` | 507/6 | 未关联到已关闭PR | 126 | D0｜正在被历史站点引用 | Netlify旧UAT站当前发布指向该分支SHA；保留 |
| `visual/vis-rebuild-03a-s01-approved-a-white-distance-20261028` | `d63574fdc3` | 11/8 | [#23](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/23)× | 4 | D1｜视觉原件保留 | 历史获批参考的独立样式/QA/文档未进入当前同路径，VIS-GUARD留存 |

**缺失文件数说明**：对先前27条ahead>0旧历史分支，另以各分支完整Git Tree与冻结RC2、2026-11-13 main树的同路径blob进行核对。`缺失文件数`仅表示在两个目标树上均找不到同路径，可能为累积历史QA/文档/工具，不表示该数量的独立功能缺失；不作为直接cherry-pick清单。后续归档时必须按来源分支的单个PR diff与下游清单审计。`ahead/behind`是P1-B旧main快照，不能与本次mainSHA混淆。

## 处理组汇总

| 处理组 | 分支数 |
|---|---:|
| D0｜正在被历史站点引用 | 1 |
| D0｜独立前端素材待移交 | 1 |
| D0｜独立桥接待裁定 | 1 |
| D1｜备份/发布保留 | 3 |
| D1｜独有历史复核 | 21 |
| D1｜视觉原件保留 | 1 |
| D2｜Squash归并源 | 3 |
| D3｜无独有提交归档候选 | 18 |

## 优先处理顺序

1. **保留且不动**：`uat/rc2-pr96-20261110`（Netlify真实部署）、备份/发布分支、`feature/br03-s01-s02`（独立S01/S02素材/截图）、`br01-h01-connect-03-isolated`（旧桥接/交接原件）及冻结PR #176的运行时来源。
2. **治理Squash源**：#68/#178/#179源分支可成为未来单独归档候选；目前只验证#179源3份docs与main完全同SHA，仍不直接删除。
3. **没有独有提交的候选**：在闭合PR关联记录、Tags、回滚与部署依赖、分支SHA和人为审批都满足时，才能形成**具体删除清单**。有ahead=0并不等于删除许可。
4. **独有提交历史**：先把未迁入的、确有复用价值的独立素材/设计/文档/测试归入专题；再决定保留原分支或可归档，不整树重叠移植到已签收RC2。
5. **所有历史分支默认保留**，不删除、不强推、不批量关闭旧PR。清理执行需要用户对具体清单的明确授权。

## 待核风险与交接

- GitHub Tags/Release、已关闭PR之外的静态资源引用、某些历史Actions部署工作流的外部关联仍需补证。
- 旧Netlify站点当前发布记录与签收RC2 SHA不同，**不影响本项目DEMO READY签收的代码状态**，但不能把它当作正式演示在线站。
- 为避免产生更多漂移，每次新增治理文档PR应在检查通过后受控Squash并保持新分支作为待归档来源，自动统计数量随之增加属于正常。
