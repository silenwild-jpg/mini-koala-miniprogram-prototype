# EST-VIS-08｜最新版源码检查点：估算四页受控试装与P1修复

- 性质：**独立候选，不覆盖母版，不进入发布合并**。Release Gate HOLD。
- 用户授权：视觉截图验收暂缓，继续源码级业务与P1修复核对。
- 试装底座：`Mini_Koala_VIS05_Full_Site_Source_Rollout_IN_PROGRESS_2026-10-14.zip`，SHA-256 `a728bdb1c62bc38e87f91ba93e256dd0d94e5126d03c6abcc87414624be3ee15`，此包仍为 **IN_PROGRESS**，不能认定已发布最新版。
- 视觉输入：`Mini_Koala_EST_VIS_06_Estimate_Core_Visual_Unification_Candidate_2026-10-14.zip`，SHA-256 `271fd8b591186bd07562a76b52bef5b00f991732e02f792a5dbe2746ca36dfd7`。
- 更早已验业务候选：VIS-04B。业务修复属于底座，不从视觉旧 HTML 覆盖。

## 改动白名单
- 既有文件修改：**仅** `prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html`，只加入5份CSS、5份JS的引用及原有4阶段装饰指示条。剥离上述三类注入后，文件与VIS-05原件**逐字节一致**。
- 新增文件：48 个（其中2份EST-VIS-08 P1修复资源），见 change_manifest.json。保留VIS-05所有其他原文件。
- P1-01：S4数量加减按钮44×44像素最小尺寸（两视口），通过缩小图片区、列间距避免挤压。
- P1-02：给S2/S3原有点击卡片加 `role=button`、`tabindex=0`、`aria-pressed`，Enter/Space仅调用原卡的 `.click()`，不重写跳转逻辑。
- 已纳入S2(A)、S3(B)、S4物品卡6图／中性占位、S5卡片视觉；**不并入ITEM-VIS的45图独立分支**。后续合并务必移除EST-VIS-06的6图装饰层，保持唯一图片渲染器。

## 明确保留与限制
- H01-007的“租期缺失不默认补值”逻辑不变，不以视觉旧文件覆盖。
- S2/S3 8类用途×三档＝24档，S4计算及S5推荐 JS 源码不改。
- VIS-05原有站点 shell 样式继续启用；估算专项CSS按HTML声明顺序覆盖局部卡片。
- **未完成真实HTTP/微信真机/视觉截图验收**；仅能标为 SOURCE_TRIAL，不得标为浏览PASS。
- 并行工作：VIS-05自身仍为IN_PROGRESS，ITEM-VIS-08/09独立合并另行开展，本包不能替代任一并行结果。

## 回滚
在候选HTML删除EST-VIS-08注入的10条link/script及步骤栏，并删除所有`est_vis0*`新增资源；或从VIS-05源ZIP重建，即回到本次试装前状态。
