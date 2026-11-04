# RC2-FINAL-INTEGRATION-02 | isolated integration gate

Source H01: PR #77 b5169f92350f3a6177a1c4999d7eaacedb820c1e (sole visual owner).
Source S01: PR #76 8bc106b777ccf7b1c4af38c1389a717e8345bd0b.
Source S5: PR #78 a648202655cb37a15b33d379e0698beafa048958.

Rules: H01 main heading "为您推荐", first badge "距离最近", no subtitle/all-store link.
S01 3 filters (排序/距离/服务), third fixed 考拉E存, fourth+ compact direct S02.
S5 term summary + two warehouse photographs, no entire-page H01/S01 override.
No main merge or deployment without source-backed 375/390 visual and full business QA.

Integration pass 1: H01 baseline + S01 scoped markup/binding + S01 bridge and visible store filters.
Preserve H01 S02 renderer/order contracts and storefront photos. This is a NEW isolated candidate, not acceptance.

## 2026-11-04 实际归并与冲突裁定

| 页面或模块 | 采用来源 | 具体处理 | 门禁 |
|---|---|---|---|
| H01 | #77 @ b5169f92350f3a6177a1c4999d7eaacedb820c1e | 原样保留 VIS-11J 主体与“为您推荐”/“距离最近” | H01 QA PASS |
| S01 | #76 @ 8bc106b777ccf7b1c4af38c1389a717e8345bd0b | 移植 S01 模板、绑定、三筛选/九态共享接口。三位E存、四位起紧凑 | 九态、同ID PASS |
| S02 | #69 RC2 中央底座 | 保留中央三Tab、真实仓位ID/库存/照片，不用 S01 旧S02覆盖 | 业务回归 PASS |
| S5 | #78 @ a648202655cb37a15b33d379e0698beafa048958 | 仅移植 S5 页面、s5-compact.css、BR04桥中S5布局照片，不接收 #78 旧首页覆盖 | 视觉技术 PASS |
| S5 #75 | #75 @ 2bcceb18d3d22f23a697b42bad3f5eadd968b995 | #75 的“S01首卡字段同构、双仓位细节、区域偏好回流”与 #78 横图简约布局互不包含；本轮没有越权叠加两套结构 | **VIS/功能冲突待决** |

### 同SHA CI证据
- H01/S01/S02/S5 单一候选 375/390 双尺寸、五城 H01 及 S01 九态： GitHub Actions #41761984553 SUCCESS。
- RC2 付款/恢复/续租/退租/押金/开票全链路： #41761984620 SUCCESS。
- 视觉治理：#41761984586 SUCCESS。
- 待补：9页面×2宽度×首/中/底的完整 54 张截图和新候选来源校验，以 PR #82 最新 CI 为准。

### 阻塞最终签收
1. **S5 #75 vs #78**：当前采用 #78 最新简约布局，但尚未完成 #75 的S01同结构字段、双仓位展示及区域偏好继承。须单独决定信息密度与布局优先级，不能混入未经批准的新增卡片。
2. S01/S5 最新获批视觉母版的最终多状态用户验收与微信真机待完成。
3. Netlify/CloudBase 线上站点没有与本次 Git SHA 做字节级同源部署验证，不能称已上线。
4. S5 后台真实业务数据及地图插件仍无实接，现仅演示。

准入：**RC2_INTEGRATED_CANDIDATE=YES**；**MERGE_MAIN=HOLD**；**DEPLOYED=HOLD**。
