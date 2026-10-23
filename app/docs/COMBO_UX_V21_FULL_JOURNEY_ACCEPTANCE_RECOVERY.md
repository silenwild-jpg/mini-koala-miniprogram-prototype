# Combo UX V2 — Full Journey Acceptance Recovery PATCH V2.1

日期：2026-10-12
基线：`Mini_Koala_Combo_UX_Regression_PATCH_V2_Candidate.zip`
状态：**内部演示验收恢复候选，Release Gate HOLD**。

## 范围与业务决策

仅针对上一轮 Full Journey Acceptance 的两项 P1 做小范围修复。不修改门店及仓位事实母表，不采集实测尺寸，不扩展多仓在线下单，不修改 U01 价格计算及首页冻结结构。

### P1-01｜无匹配时的相近仓位门槛

- S5/S01 共用推荐器新增演示备选容量门槛：目标容量的 **80%–130%**。仅当容量在该区间、可租并符合现行实物适配否决规则时，才可能作为“相近容量”备选；未达需求范围内的仓位仍不视为“匹配”。
- 组合推荐既有的 130% 上限保持不变。正式规则需后续业务确认，本轮仅防止 50m³ → 1.94m³ 的明显错误。
- 如果全城无符合容量的可租仓/合理备选，S5 不生成虚假价格推荐卡，保留“附近门店 / 调整空间 / 顾问 / E存”入口。
- S01 的无匹配门店仍可供普通探索，但展示“匹配仓位 0个 / 门店仓型范围 / 当前需求报价暂无匹配报价”，**不展示过小仓位整期租金**；首卡无有效备选时不标“推荐”。
- 正常单仓/组合状态的价格、匹配及点击语义不受影响。

### P1-02｜售罄演示状态跨页连续

- S02 无论售罄由 `inventoryStatus=soldout` 或来自当前库存状态触发，进入附近门店时传递 `soldoutStore`，指向**指定门店**，不修改库存母表。
- S01 只在 `source=s02_combo_recovery` 且门店 ID 有效时接收这个演示覆盖；该门店 `inventoryStatusForStore()` 优先返回 `SOLD_OUT`，不会再计入匹配库存或作为普通可租推荐。
- S01 显示该门店的“已售罄”卡；再进入 S02 时仍传递售罄上下文。其他门店正常匹配，切换页面内演示场景则释放覆盖。
- 保留 `target/term/travel/searchOriginKey/sort/distance/services` 等原有需求及筛选条件。普通浏览及真实库存记录不被覆盖。

## 验证与遗留边界

- `node qa/test_combo_full_journey_recovery_v21.cjs`：13 项专项检查，含 50m³ 无匹配、合理备选、原有单仓两仓三仓路径、单店售罄与参数传递。
- `python qa/visual_check_combo_recovery_v21.py`：375×812、390×844 的原 S01 HTML/CSS 离线页面渲染，检查无匹配报价与售罄卡可见性及页面横向溢出。
- `python tools/run_regression.py`：包含既有项目全量回归与本轮专项。
- 视觉渲染为离线注入原页面真实卡片 HTML，不是实际跨 URL 的 E2E；真机微信交互仍需人工核验，正式 Release Gate 维持 HOLD。
