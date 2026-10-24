# BR01 GIT-MIGRATE-01｜首页来源和获批母版接收

阶段：**SOURCE_INTAKE_ONLY**。仅在 BR01 独立工作区纳入 HANDOFF-01B 独立演示 HTML 和 VIS-11J 用户批准原图，保留原字节供差异审查；共享 H01、中央导航和其他页面未修改。

| 文件 | 来源 | SHA256（原 ZIP 与工作区复算一致） |
|---|---|---|
| `prototype/branch01_home_handoff01b.html` | `BRANCH-01-HANDOFF-01B...zip` 的 `01_preview/BRANCH-01_首页独立演示_R1_定位语义修复.html` | `7afdf74098dafe85ed3836dd8ee681b8fc1a50d0484eceac352edf9199cc6f9a` |
| `assets/branch01/VIS-11J_用户批准唯一视觉母版.png` | 同包 `02_visual/` 原图 | `30749d1700c025423a4d54fb3e34e99e9516bf299fac2a2cf073a9e1b0560660` |

包内的 `CITY_SYNC_MIN_PATCH.diff` 与 `LOCATION_CONFIRMATION_MIN_PATCH.diff` 仅针对独立演示页的前后版本，不适用于共同基线 `prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html`。不能直接对该共同页面套补丁或整页覆盖。当前独立演示的城市/定位状态与已批准视觉是移植依据，历史 60/60 双尺寸复测只证明原包独立页面。

本次提取的 3 个内嵌脚本通过 `node --check`；当前工作区的真实 HTTP 双尺寸、跨页状态、门店 ID 和底栏动作 **NOT TESTED**。底栏第三项的中央去向、BR04 可达路径、中央同源门店数据及订单上下文须在后续定向接线时验证。VIS-11M 仅为有条件视觉通过，不代表正式发布验收。Release Gate HOLD。

回退：撤销本次新增的独立来源页、母版原图和本说明；共同 H01 文件保持原样。
