# RC2-CLEAN-MIGRATION-02C｜M01 来源差异与统一候选 QA

日期：2026-11-13。审计来源：PR #126 `8a4e7127954fc48f209b712d7656a9fb567b0340`，PR #176 统一候选。**本文件不是人工视觉验收证书，不代表站点已部署。**

## 更正上一阶段的风险判断

02B 仅通过 blob 不同判断 M01 需要核对是正确的；但 **blob 不等不意味着功能缺失**。本次读取两版本实际源代码确认：

| 模块 | 对照事实 | 裁定 |
|---|---|---|
| `m01-rebaseline-01.css` | 两分支 blob 完全一致 | 视觉样式源码已含 #126 的平面资产列表样式 |
| `m01-rebaseline-01.js` | 297 行对 295 行，仅发现两处租期剩余天数计算方式差异（当前候选使用日期归一化） | #126 核心 M01 资产与需求 UI 已包含；保留当前候选日期处理，待自动化和人工复核 |
| `app.js` | 双方均含 `unitFacts`，#176 优先使用 `demo_cabin_no` 作为仓号后备 `code/name` | 数据桥接已包含，非缺失；两分支整个 app.js 因其他功能推进不同，不能直接覆盖 |
| `account.js` | #176 除 #126 客资文本收敛外，还有中央订单跳转及身份资料状态流程调整 | 不以旧文件覆盖当前运行时，应独立验证旧链路 |
| M01 专项验证 | #126 `verify_m01_ia_03.cjs` 与 `verify_m01_ia_03_browser.cjs` 初始未出现在 #176 | 已原样复制两个 QA 脚本进入 #176，并接入现有统一候选完整回归工作流；不修改 app 运行时 |

## 核对的 M01 业务要点

- [x] 我的仓位按付款订单一行，不把组合仓拆成多张资产卡。
- [x] 多租约预览两笔、全部列表入口；仓号与容量同组显示。
- [x] 当前任务与正常在租资产不重复展示。
- [x] 预约用仓、顾问咨询、企业用仓需求归类。
- [x] 当前报价快照不伪造报价历史；最近需求区分参考与继续。
- [x] 无新增仓位对比或 U01。
- [ ] 从本次同 SHA GitHub Actions 读取 M01 实际断言及 375/390 截图结果。
- [ ] 产品负责人核对截图的人眼视觉签收。

上述前六项系**源代码与静态功能存在性证据**，不是新运行版本的浏览器 PASS。

## 受控自动回归

- 引入脚本：`scripts/verify_m01_ia_03.cjs`（单/多/组合订单、预约历史、报价及防重复 UI）；`scripts/verify_m01_ia_03_browser.cjs`（375/390 实际页面点击与截图）。
- 集成到 `.github/workflows/rc2-clean-migration-01.yml` 的冻结身份、浏览器回归与 artifact 采集步骤。
- 目标运行：[GitHub Actions #43371254762](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43371254762)，触发代码 SHA `3e3d5fdb0563e72b8e375e17df5ea0d99a82d629`。**以 GitHub 实际终态与日志为最终依据；本文创建时未预填 PASS。**
- 原始成功基线 Actions [#43366861599](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43366861599) 对应 SHA `345ee13`，不得替代新脚本的验证结果。

## 发布与归并约束

- 独立 RC2 私站虽存在但为旧版本；不能直接用旧 URL 签收本轮候选。
- `main_merge_allowed=false`、`deployment_allowed=false`、`internal_uat_online_allowed=false`。
- 需另行授权的内部 UAT 版本上传、SSO 访问核验与逐屏人工签收；目前未实施。
- 若新专项测试失败，仅在 QA/受控候选内按实际日志定向修复，不回滚其他业务模块、不把错误报告为已通过。

后续：`RC2-CLEAN-MIGRATION-02D`，在运行日志完成后修补真正的 M01 QA 缺陷，锁定测试代码 SHA 与构建包，再准备受控在线 UAT。
