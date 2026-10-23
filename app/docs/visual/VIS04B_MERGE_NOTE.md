# VIS-04B｜受控视觉与业务合并记录

2026-10-13。Release Gate HOLD，统一项目母版未覆盖。

## 输入

- 业务：H01-007-P1 双尺寸浏览验收接续包 SHA-256 `72ca4f019235d059560364cb1e89d7a000213bee3d8e1ba33b7e285e67d01b42`。
- 视觉：VIS-03C CORE_no_outputs ZIP SHA-256 `dbff4a876b4ebb51fed38a04398fe6cb9bca14506f8b1213248321c4951dd19d`，529 文件与 CORE_file_sha256_vs_original 清单逐一一致。原完整包宣称 SHA-256 `a4001456c3bc50e0de24e2974f1c10d5307aa0cd139837cdd65c0b23a45db801`；该整包未在本环境取得，无法独立核对其哈希及 313 个 outputs 证据。CORE 的受管理 528 文件经包内 check_package 验证，568 链接 0 错误。

## 合并范围

- H01 HTML：保留 H01-007 S3/S4 的 PAYMENT_FAILED 与浏览语义，增加 VIS-03C 的 CSS 引用和 Hero 标记、文案、A1 图片引用两处独立 hunk。
- 新增 `mk-v3-home-banner-vis03c.css`、A1 品牌 JPEG、未启用的双11 JPEG、VIS-03B/B.1/C 三份记录。
- 浮窗 QA 夹具同步视觉版并把外部点击目标改为可见的 `.hero-benefits`（VIS-03D 建议）。业务树其他 prototype 文件不改。
- 记录与 Manifest 重算；P1 两项修复继承。C02 帮助浮窗不可见合并在 OPEN_ISSUES 的 P2-3 跟踪，未修改碰撞策略。

## 验收边界

静态包校验、逻辑回归和源码差异结果见候选交付报告。合并后 375×812 / 390×844 HTTP 真实浏览与微信真机单列，不能沿用 VIS-03D 或 P1 各自浏览 PASS 来宣称合并态通过。11 项历史回归失败不得删除或放宽。

## 本环境复验

- 源码差异对 P1 浏览验收接续包：修改 H01、浮窗 QA、三份接续记录；新增 2 张 JPEG、1 CSS、3 份 VIS 记录和本记录；删文件 0。H01 净 diff 仅视觉 2 个 hunk，S3/S4 的状态、浏览函数无改动。其余业务运行时代码逐字节一致。
- `tools/check_package.py`：576 个受管理文件、568 处链接、0 错误。五项业务逻辑测试 S1 13/13、S2 14/14、S3 18/18、S4 30/30、P1 12/12。
- 本机完整 `run_regression.py`：26/39。与已验收业务基线 28/39 相比多出的两项环境失败是 `test_acceptance_v11_patch.cjs` 的子进程 EPERM 和 `tools/check_http.py` 的 socket EPERM；逐项对照其余 11 项失败集合相同。前一项单独重跑仍为 spawnSync EPERM。本轮没有删除测试或放宽断言。这两个沙箱权限失败不能据此判为产品回归，亦不能作为测试通过。
- 当前执行环境没有 Python Playwright/Chromium 与本地 HTTP socket 权限，合并态真实浏览（375×812、390×844）NOT TESTED。原 P1 和 VIS-03D 分支各自的浏览验收仅作输入证据，合并候选仍须 VIS-04C 独立双尺寸 HTTP 验收：A1 图比例和可见性、10 态（含 PAYMENT_FAILED）、跨页入口、帮助浮窗与 C02 P2-3、资源/控制台/溢出、交易及优惠券链。
- 微信真机与原生组件 NOT TESTED。Gate HOLD。
