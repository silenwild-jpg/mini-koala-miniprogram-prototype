# RC2-CLEAN-MIGRATION-02E｜S02/S5视觉规则裁定与剩余签收门禁

日期：2026-11-13。**本文件为产品负责人明确裁定的规则冻结记录与证据复核，不代表全站人工终签或内部 UAT 已放行。**

## 1. 本轮已批准的最终基准

| 页面 | 决策 | 执行约束 | 状态 |
|---|---|---|---|
| S02 门店详情 | **保留「交通路线」选项卡** | 作为与「可选仓位」「服务设施」并列的可访问 tab；不得依据历史删除意见再移除。后续地图接口真实化另行评估，原型允许演示数据。 | FROZEN |
| S5 仓位推荐 | **前两张门店卡使用小尺寸门店照片** | 沿用当前候选的小图与匹配仓位布局，不恢复历史“横幅大图”提案；保留门店信息、仓号/容量、整期主价、月租次级及直接下单。 | FROZEN |
| S01/S5 视觉统一 | **统一信息层级、照片尺寸级别与运营/服务标签语义，不强制两页面 DOM/卡片形态一致** | S01 保留附近门店平面紧凑列表与第四位起紧凑卡；S5 保留带匹配仓位和 CTA 的推荐卡。两者不应互相覆盖、加大图或重复服务模块。 | FROZEN |

## 2. 核验证据

唯一运行时基线：PR #176 代码 SHA `e275871918673559b88a4ff370e5bf41dd4fd16b`。

- 完整自动化：[GitHub Actions #43371610581](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43371610581)，completed / success，且测试 SHA 与上方一致。
- 375/390 截图：[Artifact #14011599753](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43371610581/artifacts/14011599753)，过期时间 2026-11-20 05:24 UTC。
- 内部评审构建：[Artifact #14012402822](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43371610581/artifacts/14012402822)，同 SHA、同日期过期。
- **S02**：`rc2-s02-term-state-01/S02-browse-375.png` / `S02-browse-390.png`：可见「可选仓位／服务设施／交通路线」三选项。
- **S5**：`s5-final-vis-signoff-04c/expanded-375-top.png` / `expanded-390-top.png`：首推荐门店卡小图可见；`near-capacity-375-top.png` / `near-capacity-390-top.png` 用于核对两张推荐卡情形。以实际页面场景为准，不把“仅一门店可匹配”误判为遗漏第二张。
- **S01**：`rc2-single-candidate-03-s01/S01-375-matched.png` / `S01-390-matched.png` 与 `S01-375-compact.png` / `S01-390-compact.png`：对照平面紧凑列表、筛选、标签与可选仓位。
- **M01**：`m01-ia-03/04-two-active-assets-375.png` / `04-two-active-assets-390.png`：两笔已付款用仓资产平面列表；浏览器专项 375/390 PASS。
- **H01**：`rc2-single-candidate-03-h01/375-new.png` / `390-new.png`：走廊头图、任务区和门店横滑结构。
- **订单**：`rc2-merge-ready-04/375-07-O01-confirmed-top.png` / 对应 390 图；结合 QA JSON 验证下单核心流程。

## 3. 视觉初审与签收分界

两项新明确的 S02/S5 决议，在本候选截图中**未发现需要修改运行时的差异**。除此以外，自动化已确认 H01、NAV、CAP、S01、S02、S5、M01、QUICK/O01 等流程基本功能运行，但**并未对所有 335 个 artifact 文件进行全场景逐张人工设计签收**。原型数据可模拟；不得把人工审核改写成真实业务数据验真。

| 范围 | 已完成的证据 | 待完成的签收 |
|---|---|---|
| S02 三 tab | 375/390 截图含「交通路线」 | 交互态、长页面、地图占位态的人眼复核 |
| S5 两卡小图 | 375/390 推荐卡与相关状态截图 | 双卡/单卡/大容量/无匹配等全场景版式终签 |
| S01↔S5 一致性 | 文字层级与图片尺度的截图抽查 | 两页面并排同尺寸视觉验收 |
| H01/NAV | 20状态×双尺寸、底栏点击、像素/视觉脚本 | 任务卡方案和底栏品牌图形最终人工确认 |
| M01 | 11/11 业务断言+375/390 浏览器 PASS | 全部租约状态的人眼抽查 |
| CAP/ITEMS/BOOKING/QUICK/O01 | 受控浏览器检查 PASS | 端到端手动点击与极值下的文案/对齐检查 |

## 4. 版本身份和门禁

- 上次自动化通过 SHA `e275871`；**提交本规则文档后 PR HEAD 会变成新文档 SHA，不能冒充新 HEAD 运行过同 SHA 完整回归**。如需要声称代码与 CI 严格同 SHA，须另行重新触发全套测试；两张图片决议未涉及运行时改动。
- 现有 Netlify RC2 私站均为旧版部署；本轮**不触发站点切换或正式部署**。
- `visual_human_signoff=false`; `online_rc2_uat=NOT_READY`; `main_merge_allowed=false`; `deployment_allowed=false`; `pr_draft=true`。
- 下一阶段 `RC2-CLEAN-MIGRATION-02F`：围绕未签收的页面状态，补齐最终视觉检查清单/截图人工签核，之后在取得明确内部 UAT 部署授权的前提下复用 RC2 私站并核验同一构建包 SHA/登录权限；不得绕过门禁。
