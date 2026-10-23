# 迷你考拉仓｜小程序原型 Git 仓库

项目定位：**产品验证、功能演示、视觉探索**；不是生产小程序代码验收。

> GIT-SETUP-01：`main` 首次保存的是只读历史业务源码基线 `PROTO-PARALLEL-01/CURRENT_CANDIDATE.zip`，不表示该版本通过内部视觉签收，更不代表已上线。`release_gate=HOLD`。

## 工作结构
- `app/`：按原 ZIP 结构逐文件解压的原型源码；不改名、不预先重构。
- `docs/`：基线、视觉签收索引、页面归属、集成门禁。
- `AGENTS.md`：Codex/AI 工作规则。
- `integration/proto-merge-01f`：隔离集成任务分支，不自动包含 01B/01F 候选源码。
- `feature/br01-home`、`feature/br02-capacity`、`feature/br03-store-unit`、`feature/br04-recommend`：从**同一初始基线**创建的四分支，初始内容一致，均未默认迁入分支交付包。

## 工作流程
1. 在独立 Worktree 中只处理一个任务，先核对已批准视觉原图与当前规则。
2. 修改局部源码并留存双尺寸、关键状态、真实 HTTP 交互验证。
3. 先提交本分支，再提 PR 到 `integration/proto-merge-01f`；中央归并只做定向移植，禁止用整个 ZIP 覆盖。
4. 集成测试通过后才能考虑 PR 到 `main`；当前 Release Gate 仍 HOLD。

本仓库的原始 ZIP、高清探索素材以及业务数据不得未经检查直接上传。请阅读 `docs/SOURCE_RECEIPT.md` 与 `docs/MERGE_GATES.md`。
