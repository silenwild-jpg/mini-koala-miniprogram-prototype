# H01-TASK-SPACE-VIS-09｜真实中文复测、375px 安全间距及测试脚本纠偏

日期：2026-11-12。范围仅 PR #123 H01 任务态；S5/BR04、O03/支付、BLE、完整营销首页与 main 均不变。

## 真实运行证据（不得混用 SHA）

| 运行 | SHA | 结果与裁定 |
|---|---|---|
| [#43058045815](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43058045815) | `688bdde...` | 40/40 PASS，但无中文字体，不能作为中文终签。 |
| [#43060457357](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43060457357) | `7be0a223...` | 39/40 PASS；375px active 的帮助区未满足距底栏最少16px，确认为需修复项。 |
| [#43104388009](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43104388009) 第二次运行 | `08675b29...` | Chrome/Playwright/CJK 运行后 **26/40 PASS，14 FAIL**；已下载 artifact `13894488355`，14项均为脚本在测试情景**导航离开 H01 后**再次定位 `#h01FlowPrimary` 造成的 `locator.evaluate` 超时。不能解释为 14 个生产页面缺陷。其页面截图与 `results.json` 仍可证明此前记录的 H01 布局信息。 |
| [#43108822941](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43108822941) | `74e5c42...` | 已提交测试脚本纠偏并触发；记录时 **queued，尚无最终结果**。 |

## 375/390 两尺寸实际 CJK 几何检查

从 `#43104388009` 工件 `results.json` 的 `variant.help.bottom` / `variant.nav.top` 及 `bottomSafety` 逐项计算：

| H01 状态 | 375 首屏间距 | 390 首屏间距 | 375/390 滚动到末尾间距 |
|---|---:|---:|---|
| 待支付 | 191.8px | 216.4px | 内容不足一屏，未发生滚动 |
| 待入仓 | 141.6px | 161.2px | 内容不足一屏，未发生滚动 |
| 正常在租 | **37.6px** | **55.2px** | **77.6px / 80.2px** |

本轮在租两尺寸最少16px安全距离均已满足；**375px 帮助区安全间距不足已得到同SHA真实浏览器几何复核，技术层面可视作已修正。** 不代表全站或全状态人工视觉终签。之前“遮挡”描述应准确修正为“旧版未满足安全间距16px”；旧截图中文字未必被物理覆盖。

## 测试故障定性及修复

- 运行 `08675b29...` 的 14 项超时全部堆栈均指向测试脚本末尾 `#h01FlowPrimary` 的高度检查。
- 原脚本先在 H01 截图，再执行实际交互（如待支付→O03，待入仓→S02，在租→QUICK），最后错误地重新查询已离开的 H01 主按钮。
- 已在 `74e5c42f65cec4f4822f310e5456b9204b0fb734` 仅修改 `scripts/verify_h01_task_space_03_browser.cjs`：将48px 主次按钮测量提前到交互跳转之前；保留所有原有阶段/照片/滚动/中文/支付动作断言，且将实际尺寸写入 JSON。未修改任何 H01 运行时 JS/CSS。
- 已对 PR #116 H01 业务基线进行 GitHub file-scope 对照；本候选的生产代码变更仍局限 H01 任务态 JS/CSS，无 S5、BR04、O03 或营销首页生产文件变更。

## 三状态视觉裁定

- **待支付 A：保持。** 首屏清晰突出首次应付、倒计时和继续支付；下部大留白不必使用营销卡填满。
- **待入仓 C：保持。** 门店导航优先、一键开锁仅演示入口；环境图片作为辅助认知。无需为图片增加新的业务功能或文字容器。
- **正常在租 C：有条件保持。** 已解决存取时间重复和安全间距；图片仍因高度96/104px明显横裁，门店环境可识别度需人工观察；不擅自加高挤压主操作与服务入口，列为P2视觉候选，不作为阻断P1。

## 当前门禁

- `H01_ACTIVE_SAFE_AREA_375390=PASS_AT_SHA_08675b29`
- `H01_20_STATUS_CURRENT_QA=RETEST_PENDING_SHA_74e5c42`
- `H01_VIS_SIGNOFF=HOLD · S5=OUT_OF_SCOPE · MAIN=NO_GO · NETLIFY=NOT_DEPLOYED · BLE=DEMO_ONLY`

下一步编号：`H01-TASK-SPACE-VIS-10`。取得 `#43108822941` 完整运行结果，复核20类×2尺寸与两张在租截图；如通过，再进入任务态人工视觉签收，不以本文件自行合并或部署。
