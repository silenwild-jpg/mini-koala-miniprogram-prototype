# PROJECT-OPS-CLEAN-ELIGIBILITY-02｜历史审计PR第二批归档准入

审计日期：2026-11-13。目的：清理已过时的PR待办状态，保留完整历史审计和决策链；不回滚、移动、合并任何RC2业务代码。**本文件不是关闭授权，需用户对具体PR名单确认。**

## 当前唯一有效基线

| 对象 | 已核验状态 |
|---|---|
| 已获用户签收演示候选 | [PR #176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176) SHA `41a8a079eb48049e1060512bddf71c226bfd3738`；Draft/Open，未合并main |
| 同SHA浏览器QA | [Run #43405346410](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43405346410) SUCCESS；375/390、H01/S01/S02/S5/M01、预约、快捷下单、O01、促销与生命周期 |
| 额外旧QA补证 | [PR #182](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/182) `55154bd0...`，[Run #43426100394](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43426100394) 19/19 PASS；此QA未修改签收运行时代码 |
| main治理基线（审计开始） | `9610cda8f67b57e48431907106588007e9689994`，`protected=true` |
| 开放PR快照 | 128条，全部Draft；#22/#24/#50已按用户上轮批准关闭，源分支保留 |
| 已有审计资料 | [P1-A2历史main PR差异](PROJECT_OPS_P1A2_MAIN_PR_DELTA_20261113.md)、[P1-A3旧规则/QA/部署保全](PROJECT_OPS_P1A3_LEGACY_RULE_DEPLOY_QA_HANDOFF_20261113.md)、[QA补证](QA_LEGACY_RETAIN_01_RESULT_20261113.md) |

## 第二批建议关闭的4条历史审计 PR

以下4条均已通过GitHub PR元数据和文件清单逐一检查：状态为Open/Draft、尚未Merge、所有PR增量文件均位于`docs/`、当前无其他Open PR以其head分支作为base。**这仅证明关闭PR不会改变代码或切断现有Open PR的base关系，不代表可以删除源分支。**

| PR | 历史HEAD SHA | docs改动 | 当时审计对象及阻断 | 现在的处置 |
|---|---|---:|---|---|
| [#67](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/67) | `6249e07bf19532b6e83f854462618c6672e3226f` | 2 | 2026-11-03对PR#66的S01宽图/旧88px卡冲突、四页人工同态签收HOLD；没有直接修改业务源码 | **建议关闭为历史审计**；保留S01视觉演变与原图依据，不将旧布局覆盖当前签收母版 |
| [#84](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/84) | `8c4adec391f529e2fee4fc414b5c5bdb17cbc9ce` | 1 | 2026-11-04对PR#80的S01长列表取证不足、S5重复租期和留白、完整母版待签收 | **建议关闭为历史审计**；后续PR#85对S01实际滚动与S5租期收敛已补证，最终用户对更新后的PR#176签收 |
| [#86](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/86) | `b77a57dbd74d4b6f2a5805f70c610664e7c05121` | 1 | 2026-11-04对PR#85的人审HOLD、Netlify私有站当时部署SHA不一致、UAT和main合并NO-GO | **建议关闭旧版归并门禁文档PR**；保留[#87](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/87)专门承接旧站版本/SSO/设备UAT历史与部署交接，当前线上演示站的同SHA身份仍未验证 |
| [#89](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/89) | `ffaef7547cbfa0d23288d5b783a37d6bf4c12bd3` | 1 | 2026-11-04对PR#88的H01“估算大小”文案偏差、S01辅助文案偏差、正式视觉签收未完成、站点SHA待核验 | **建议关闭为历史审计**；用户签收的新SHA不继承旧候选结论，旧视觉偏差可作为独立变更历史继续追溯 |

归档方式：**仅调用 GitHub Close PR**，在各PR讨论中记录旧审计HEAD、被后续签收基线取代的范围、仍存在的独立部署风险及本文件路径。源分支、提交、文档、历史讨论全部保留，关闭不是删除/合并。

## 本轮明确不建议关闭

| PR/范围 | 保留理由 |
|---|---|
| [#176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176) | 用户签收的DEMO READY唯一运行时；冻结SHA，不合并、不部署 |
| [#182](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/182) | 19项隔离QA补证来源；保留证据、暂不将QA插入签收业务SHA |
| [#87](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/87) | 唯一明确记录旧Netlify私有站的部署ID、SSO与UAT接入矩阵；这些外部部署/访问事项尚未解决 |
| [#28](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/28)、[#30](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/30)、[#47](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/47) | 旧Netlify/CloudBase/站点与安全专题，仍有运维交接及外部资源引用 |
| [#33](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/33)、[#35](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/35)、[#36](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/36)、[#26](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/26) | 旧RC1/RC2代码/QA/视觉来源，包含实际运行时代码或测试，仍需对比独有增量，不能只因19项补证通过就直接关闭 |
| [#79](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/79)、[#80](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/80)、[#85](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/85)、[#88](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/88) | RC2历史业务源，含业务JS/CSS/测试或工作流，不等于纯审计文档，先保留来源链 |
| [#92](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/92)、[#133](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/133) | 图片重建质控与可视化编辑工具是独立资产/开发方向；不能当成普通过期视觉审计关闭 |
| [#124](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/124)、[#135](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/135)、[#162](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/162) | 含独立测试脚本/工作流；后续需要检查现行RC2质量门禁的替代覆盖 |
| #156–175来源链及其他链式PR | 可能涉及已签收RC2真实源码及QA来源，尚有Open PR依赖链；不批量关闭或强行转移base |

## 当前仍然存在的事项

1. **演示已签收≠线上站部署同SHA验证。** 旧#86/#87发现的Netlify站点UAT版本/SSO问题没有因签收而自动解决。未来如要给真实业务人员在线试用，应建立独立部署任务，记录：构建/签收SHA、部署ID、文件hash、访问控制、设备/网络与用户反馈；不能宣称已上线。
2. **旧审计NO-GO只对旧HEAD成立。** #67/#84/#86/#89的历史判定不能自动扩展到11月13日的新候选；同时新候选演示签收也不能伪装成微信原生、CRM、真支付、后端、合规生产验收。
3. **严格Ruleset尚需后台优化。** main目前protected=true，但此前检测到同名视觉检查重复和strict状态检查要求会增大CI成本。这不属于本PR改动，需管理员单独处理。
4. **历史分支删除不在本批授权范围。** 关闭这些PR后，未被Open PR引用的分支数量预计增加，统计变化不能当作“新发现的可删除分支”。备份/Tags/旧Actions/Netlify引用仍须专项复核。

## 执行门禁

- 当前任务状态：`AUDITED / PROPOSED_FOR_CLOSE / USER_APPROVAL_PENDING`。
- 用户明确批准 **#67、#84、#86、#89** 这一组后，按逐PR“先留评论→Close→复核closed/unmerged/head SHA→复核分支仍存在”的流程执行。
- 任何一条HEAD、PR状态、downstream依赖变动，立即停止该条处理；其他不受影响的条目继续。
- **不删除任何分支，不合并旧PR，不改业务PR #176，不部署。**

关联项目总控：[Issue #177](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/177)。
