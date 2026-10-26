# WX-NATIVE-01E-R1｜迷你考拉仓统一 AuthGate Git 接线准备包

**2026-10-26｜真实母版：BLOCKED｜独立模块：BUILT+UNIT TESTED**

## 项目边界（必须先读）

本包不是 `GIT-SETUP-02` 仓库的物理提交，也不是四分支真实原型的归并版。实际核验：当前运行环境仅存在 WX-NATIVE-01E 的独立演示 HTML/ZIP，不含 `CURRENT_CANDIDATE.zip`、中央01B和 BRANCH-01～04 源 ZIP 的可提取 raw bytes；GitHub 连接无可访问仓库。文件库虽有若干历史 ZIP 的条目，但当前会话的 `raw_file` 提取返回 `does not have an authorized raw-byte materialization path`。因此**无法对源文件定向改动、创建真实 Git Commit、进行真实 375/390 全站回归**。`Release Gate` 继续 HOLD。

本包可以用在 Codex **拿到本机仓库以后**作为新增独立 `AuthGate` 模块的移植输入；不得替代源码核验或视觉母版检查。

## 文件内容

- `src/auth-gate.mjs`：共享业务门槛。通过 `provider.isVerified()` 检查实际会话；弹层/原生授权由 provider 负责；失败一律不放行；条件快照比对、双重会话检查、同动作去重。
- `src/branch-entrypoints.mjs`：四分支与 O01 的共享入口包装示例。不得覆盖页面原逻辑；接到已批准的原处理函数上。
- `adapters/provider-contract.mjs`：未接后端时拒绝放行，以及**仅测试**的模拟 provider。
- `adapters/native-wechat.template.md`：微信真机接口绑定说明（不是已集成真机代码）。
- `tests/auth-gate.test.mjs`：19 项可运行 Node 内置测试，未连接真实四分支页面。
- `contracts/ENTRY_MATRIX.csv`：页面调用和授权节点登记。
- `contracts/INTEGRATION_STEPS.md`：Codex 在 Git 仓库执行的逐步计划与保护白名单。
- `receipt/SOURCE_GATE.md`：原始 ZIP/仓库实体接收阻塞记录、可完成与不可完成的范围。
- `receipt/UNIT_TEST_RESULTS.txt`：单元测试结果记录。
- `demo/previous_01E_standalone.html`：上一阶段的独立模拟可视化演示（**仍用原 JS，未替换为中央源码**）。

## 运行单元测试

```powershell
node --test .\tests\auth-gate.test.mjs
```

或 Linux/macOS：

```bash
node --test tests/auth-gate.test.mjs
```

## 核心策略

1. `QUOTE`：必须验证才能拉取/渲染**正式**报价；公开参考价不拦截。
2. `ORDER`：立即下单、快捷下单到 O01、O01 直接导航及提交均核验。
3. `LEAD`：预约用仓留资属于单独流程，不擅自改成正式 ORDER。
4. 关闭/拒绝/失败不清空选择，不调用受保护接口。
5. 微信快捷授权与短信验证码是有效登录方式的两个候选；**填写手机号≠验证**。
6. 每次正式报价/订单执行同时由后端确认会话，前端 AuthGate 无法取代服务端鉴权。
7. `contextSnapshot` 必须包括原门店 ID、仓位 ID、容量、租期、优惠版本、报价版本（如存在）；变更后不恢复旧操作。
8. 不因 AuthGate 改动首页、容量页、门店卡、租期卡的已批准视觉和原型业务语义。

## 功能接入示例

```js
import {PhoneGate} from './src/auth-gate.mjs';
import {makeAuthEntrypoints} from './src/branch-entrypoints.mjs';
const gate = new PhoneGate({provider: actualVerifiedPhoneProvider});
let operationCounter = 0;
const entry = makeAuthEntrypoints({
  gate,
  getContext: () => readActualCurrentPageContext(),
  quoteAction: ctx => fetchOfficialQuoteFromProtectedBackend(ctx),
  orderAction: ctx => navigateExistingO01WithSnapshot(ctx),
  submitOrderAction: ctx => submitOrderWithVerifiedSession(ctx),
  makeOperationId: key => `${key}-${++operationCounter}`
});
// bind existing CTA to entry.onRequestQuote / entry.onImmediateOrder / entry.onSubmitOrder; use entry.onEnterOrder for O01 deep link before protected render
```

示例刻意不假设中央真实函数名，不含可被误用的模拟登录成功逻辑。订单请求还须后端幂等键，不可只依赖前端去重。

## 阶段判定

| 环节 | 状态 |
| --- | --- |
| WX-NATIVE-01C 业务需求 | 已明确 |
| WX-NATIVE-01D-R1 视觉候选 | 已提供，未真实母版签收 |
| 01E 独立 HTML 样机 | 已有，模拟环境 |
| 01E-R1 AuthGate 可移植模块 | 已创建 |
| 本模块 19 项 Node 测试 | PASS |
| 当前 Git 母版实体 | BLOCKED |
| 四分支真实代码接线 | NOT STARTED |
| 真实 HTTP 375/390、微信真机回归 | NOT TESTED |
| Release Gate | HOLD |
