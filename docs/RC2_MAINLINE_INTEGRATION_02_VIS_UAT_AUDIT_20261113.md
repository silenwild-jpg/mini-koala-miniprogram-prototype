# RC2-MAINLINE-INTEGRATION-02｜新旧候选视觉与UAT差异审计

日期：2026-11-13  
任务：[Issue #197](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/197)

## 1. 审查对象
- 原签收候选SHA：`41a8a079eb48049e1060512bddf71c226bfd3738`（PR #176，冻结）。
- 新整合候选SHA：`281b3deab14a715fb61d20c50f6e1a5aedd5de0c`。
- GitHub compare：新候选相对旧候选 ahead 35 commits；总共46个变更路径。此数字包括main治理文件和非运行时文档，不能当作46处页面变化。

## 2. 应用实际差异（4个文件）

| 文件 | 实际变化 | 视觉/体验影响判断 |
|---|---|---|
| `demo/demo-core.js` | 策略工厂来源从SIM_PRESENTATION改为SIM_PROMOTION_POLICY | 不直接改UI，促销资格、叠加、优惠券状态可能间接影响动态页面 |
| `demo/index.html` | 仅在核心模块前增加promotion-policy.js脚本 | 无页面结构差异；需确认脚本加载顺序 |
| `demo/presentation-policy.js` | 删除重复的策略工厂，保留展示模块 | 页面价格和标签展示函数未改 |
| `demo/promotion-policy.js` | 新增独立唯一权益策略，修正组合键顺序 | 促销资格/状态机行为可能有间接影响 |

GitHub compare未发现任何 `app/` 下CSS、图片、SVG、原型页面结构、H01/S01/S02/S5/M01页面内容文件变更。不能把代码层“没有这些变化”升级为“所有动态截图像素完全一致”。

## 3. 促销契约审查
从GitHub patch可确认：
- demo-core.js只修改了策略模块引用与创建方式。
- index.html只插入一份脚本，原页面DOM、CSS引用与其他脚本次序保留。
- presentation-policy.js移除内嵌权益工厂，导出页面展示函数仍是create。
- 新promotion-policy.js保留租期折扣、租金券、搬运三类已批准组合；特价仓/租期折扣、特价仓/券、赠期组合仍为NEEDS_CONFIRMATION，默认不放开。
- 优惠券状态仍覆盖AVAILABLE、SELECTED、LOCKED、REDEEMED、EXPIRED和INVALID，不能重复核销。
- 新核心使用fixture演示日期及可注入时钟；与旧核心显式today上下文须通过同SHA测试验证。
- 业务上未授权的叠加、押金、赠期财务口径继续标记待确认。

## 4. 同SHA验收证据
| 对象 | Run / Artifact | 当前状态 |
|---|---|---|
| 原签收SHA | [Run #43405346410](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43405346410) | 先前用户签收 |
| 新整合SHA | [Run #43446189232](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43446189232) | GitHub Actions SUCCESS |
| 新SHA 375/390证据 | [Artifact #14048525517](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43446189232/artifacts/14048525517) | GitHub确认已生成且未过期 |
| 新SHA评审构建 | [Artifact #14048590522](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43446189232/artifacts/14048590522) | GitHub确认已生成且未过期 |

新SHA CI成功步骤：迁移文件检查、运动契约、容量双制、促销标签、权益模型与演示生命周期、构建身份、H01和导航、CAP/ITEMS/S01/S02、S5与地图来源、H01/S01/S02/S5/M01、BOOKING/QUICK/O01双视口浏览器回归、证据包上传。

## 5. 审查结论及证据边界
- **PASS（代码层）**：没有发现新旧候选CSS、视觉图片、页面DOM结构的文件改动。
- **PASS（自动化）**：新SHA独立GitHub Actions回归成功，已具备可检查的375/390证据包。
- **NOT VERIFIED（人工视觉）**：本轮没有将两个Artifact内的截图逐张下载并打开进行人工像素/布局比对，不得宣称“逐张视觉签收”。
- **HOLD（用户UAT）**：用户于2026-11-13对原SHA的签收不能自动替代新SHA签收。
- **HOLD（main业务归并和部署）**：未授权、不执行。

## 6. 最小人工复核范围
1. H01：走廊背景、双任务卡、推荐滑动及底部导航；375/390均需抽查。
2. S01/S02：三筛选、匹配仓位、详情交通路线、促销标签与起价。
3. S5：容量和租期已确认后的双推荐、考拉E存、地图入口和价格。
4. O01：特价仓、无券/有券、赠期、基础搬运、支付取消/失败/成功。
5. M01：已支付订单权益快照及生命周期，不因活动配置变化重算。
6. 若发现新旧同条件截图差异，回溯四个app运行时文件；不得直接改冻结母版。

## 7. 固定状态
- 当前阶段：`RC2-MAINLINE-INTEGRATION-02 / CODE_AUDIT_PASS / AUTOMATED_QA_PASS / HUMAN_VIS_HOLD`
- 业务演示原签收SHA：`41a8a079eb48049e1060512bddf71c226bfd3738`（仍有效）
- 新整合SHA：`281b3deab14a715fb61d20c50f6e1a5aedd5de0c`（技术PASS，待人工签收）
- 新候选无变更；文件结论只适用于上述SHA。
- 下一阶段：`RC2-MAINLINE-INTEGRATION-03`，取得新候选截图人工签收后再评估业务main合并，不触发真实部署。
