# RC2-MAINLINE-MERGE-PREP-01｜正式演示签收后的main合并准备

**日期：** 2026-11-13  
**任务：** [#202](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/202)  
**用户授权边界：** 已批准继续main业务合并**准备与审计**，不代表准许业务合并或Netlify部署。

## 1. 已签收候选与构建身份

| 项目 | 经核实状态 |
|---|---|
| 用户签收内容 | “签收新整合候选 d5a4ff63，继续业务主线合并准备。” |
| 签收完整SHA | `d5a4ff63e2b0cdcffb2e5be4c4e710b61497ae95` |
| 签收源分支 | `integration/rc2-mainline-integration-01-20261113` |
| 源分支HEAD | `d5a4ff63e2b0cdcffb2e5be4c4e710b61497ae95`（与签收一致） |
| 同SHA自动化 | [Run #43452015757](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43452015757)，completed/success |
| 375/390证据 | [Artifact #14052280343](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43452015757/artifacts/14052280343) |
| Review构建包 | [Artifact #14053215123](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43452015757/artifacts/14053215123) |
| 原RC2候选 | `41a8a079eb48049e1060512bddf71c226bfd3738`，PR #176 Draft/HOLD，未修改 |
| 本轮审计时main | `8b888b147e1dcab2770321951c5843887278cd89` |

状态：**AUTOMATED_QA_PASS / HUMAN_VIS_UAT_SIGNED / MERGE_PREP_AUTHORIZED**。不代表已合入main，不代表已部署。

## 2. 双侧分叉与路径清单

基于共同治理基线 `b370957eab9a6dbccc50cc26e4618972151fe569`：
- 新签收分支自该基线领先 **200 commits**。
- main自该基线领先 **3个治理提交**，仅4个docs路径。
- 两侧自基线变动的路径交集为 **0**，没有发现两端修改同一文件的直接文本冲突；但**仍不能代替GitHub真实PR mergeable检查**。

以当前main为base的签收候选compare：`diverged`，ahead 200 / behind 3，共**171个差异路径**：

| 目录 | 变动路径数 |
|---|---:|
| `app/` | 101 |
| `docs/` | 32 |
| `scripts/` | 33 |
| `qa/` | 3 |
| `.github/workflows/` | 1 |
| `netlify.toml` | 1 |
| **合计** | **171** |

main独有的4个治理docs路径：
1. `docs/PROJECT_CONTROL_CENTER_01_20261113.md`（已更新）
2. `docs/RC2_MAINLINE_INTEGRATION_01_AUDIT_20261113.md`（新增）
3. `docs/RC2_MAINLINE_INTEGRATION_02_VIS_UAT_AUDIT_20261113.md`（新增）
4. `docs/RC2_UAT_P1_FIX_01_EVIDENCE_20261113.md`（新增）

必须保留main当前控制中心及所有审计文档；不允许旧分支覆盖。

## 3. 主线合并规则

- main Ruleset `main-protection-demo-first`：`active`，仅作用 `refs/heads/main`；禁止删除、强推；通过PR归并。
- 唯一必需检查 `Visual contract and evidence guard` 已绑定GitHub Actions（integration_id 15368）。
- `strict_required_status_checks_policy=false`，不用为每次治理文档提交强制重新同步，但不意味着可忽略源HEAD/mergeability和业务回归。
- 对main业务合并至少需要：准确SHA、真实GitHub可合并性、171路径文件范围审查、main治理增量保留、必需Visual guard成功、全链路RC2回归与独立授权。
- 签收仅适用于 `d5a4ff63...`。若准备过程产生新head/merge提交，不能自动把该SHA的技术与视觉签收移植到不同代码快照。

## 4. 部署隔离是当前阻断项

当前Netlify已连接的站点 `mini-koala-internal-rc1-review` 仍有ready部署、SSO访问控制，并且存在自动站点检查：

- main `netlify.toml` 使用旧RC1构建命令 `verify_demo_rc1_p1.cjs && build_rc1_private_site.py`；
- 新签收候选 `netlify.toml` 相比main新增一条 `ignore` 条件，但只会跳过 `REVIEW_ID=176` 或旧分支 `integration/rc2-clean-migration-01-20261113`；
- 新的签收分支 `integration/rc2-mainline-integration-01-20261113`、未来的业务合并PR均不在该排除名单。
- 之前治理PR存在 Netlify RC1 的 `Pages changed` / `Header rules` / `Redirect rules` 失败；不能据此认定后续PR不产生构建/预览部署行为。
- **截至目前无法验证新业务PR已经安全隔离Netlify自动预览；所以本工作包不创建main业务Draft PR。**

优先在不改变签收SHA的情况下，于Netlify站点配置层核对并限制旧RC1 PR预览自动构建。若必须修改仓库中的 `netlify.toml`，只能在受控新分支另起变更并进行必要重新验收；不能改冻结源分支。

## 5. main业务PR进入条件（下一阶段）

1. 核查并隔离Netlify旧RC1的自动PR构建/预览行为；必须保留现有可用RC1访问与回滚记录。
2. 建立新的 **Draft / MAIN MERGE HOLD** PR，head为签收候选对应受控分支，base为main；不得使用原PR #176替代。
3. 读取GitHub PR真实 `mergeable` 与合并来源，不从compare推断自动可合并。
4. 复核最终PR的文件差异，尤其 `netlify.toml`、`.github/workflows/rc2-clean-migration-01.yml`、`promotion-policy.js`、页面/素材及新版控制中心。
5. 针对合并结果精确SHA执行全链路375/390 UAT；不能仅依赖源分支通过的旧run。
6. 如新候选包含产品视觉/运行时代码差异，取得新的差异签收。
7. **只有另行获得main业务合并授权后**才能执行真实merge；部署另行授权。

## 6. 状态与下一步
- 已完成：用户签收绑定、分支及Actions核验、main分叉审计、171路径分类、Ruleset核验、Netlify风险识别。
- 当前阻断：Netlify RC1 PR预览/构建隔离尚未核实。
- 未执行：业务PR创建、main业务代码合并、Netlify设置变更、站点部署、生产微信原生上线。
- 下一任务：`RC2-MAINLINE-MERGE-PREP-02`｜旧RC1站点预览隔离核验与受控main Draft PR准入。
