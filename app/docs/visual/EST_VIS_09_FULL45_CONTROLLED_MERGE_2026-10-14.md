# EST-VIS-09｜估算视觉与45图受控归并（实际移植结果）

日期：2026-10-14｜类型：独立源码候选，**未修改统一母版**｜Release Gate **HOLD**。

## 1. 输入与原始版本

- TARGET：`Mini_Koala_EST_VIS_09_Compatibility_Staging_2026-10-14.zip`；SHA-256 `d1a12209d373bd73df1fada40d79f62b2118444f9b7d023f79b1d6008c7c6225`。
- ITEM：用户上传 `Mini_Koala_ITEM_VIS_08_Controlled_Merge_Candidate_2026-10-14(1).zip`；SHA-256 `15e9d3bce7c5edebbf93223ab43cea9d6025cb5b116085e7b6b8701787c1d965`。
- ITEM 的源码基线较早，不允许整文件覆盖 TARGET。TARGET 上的业务、定价、交易、租期、推荐、首页及其他视觉代码原样保留。

## 2. 真实移植白名单

- 仅修改 `prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html`：增加 40物品／51规格图片键映射；在 `itemCard` 内增加原生 `.item-media` 与 `.item-copy`；数字按钮增加ARIA和边界禁用；卡片仍保留 TARGET 原物品名称、metadata、单件与合计计算文字、常见／长件标签、数量／规格事件及其他全部函数；引入一条新局部 CSS。
- 新增 `prototype/est_vis09_full45_compact_integration.css`，覆盖 S4 媒体区域、44px 数量按钮、规格按钮及局部三栏布局。不改 S2/S3/S5 或全局 UI。
- 复制 ITEM 候选原样的 `assets/item-icons/full45-trial/`：45张 WebP + `ASSET_MANIFEST.json`；40物品ID、51规格对应44张正式物品图＋1张自定义占位图。
- 新增 `qa/test_est_vis09_full45_merge.cjs` 和本报告。更新 `RELEASE_MANIFEST.json` 的受管理文件与阶段记录。
- 原 EST-VIS-06 脚本已有 `item-media` 检测保护：原生图存在时不再增加 EST 六图/中性缩略图，避免重复图片。

## 3. 验证结果（无视觉验收）

**PASS:**

- 45/45 图片存在，均可解码为 256×256 透明 WebP，复制字节与 ITEM 输入一致。
- 40个物品 ID、51个规格与 TARGET `items` 清单吻合，物品 ID＋规格键 51/51 与来源资产清单一致。所有44张物品图均被映射；自定义占位另有1张。
- 204组 `itemCard` 函数级测试：51规格×数量0/1/12/99。检查图键、物品名、来源 metadata、体积文字、数量按钮边界、禁用及图片唯一容器。沙发三人/双人/单人切换分别显示 `1.60/1.15/0.60m³` 与对应图片。
- 估算器 HTML 仅移除新映射、新模板和新 CSS link 即可逐字节还原 TARGET 输入，说明未触碰 `items`、`sceneItems`、`applyPreset`、`calc`、`bindItemControls`、路由及交易代码。
- 内联估算器脚本 Node `--check` 通过；H01-007 S1 `13/13`、S2 `14/14`、S4 `30/30` 通过。

**SOURCE-EXISTING FAIL (相同失败已在未改 TARGET 重现)：**

- H01-007 S3 历史哈希冻结断言 `17/18`，因检查旧 S2/优惠券文件的已变化哈希；在 TARGET 输入同为 `17/18`。
- `test_estimator_item_fallback_p0_v1.js` 对原有搜索项显示要求失败；未改 TARGET 同样失败。
- `test_ai_space_estimator_patch.js` 含已变化的 AI/首页/门店入口断言失败；未改 TARGET 同样失败。

**NOT TESTED / BLOCKED:** 按用户指示，真实双尺寸视觉截图及页面视觉验收本次暂缓；微信真机、真实HTTP E2E、帮助浮窗碰撞与全交易链未获得本候选的独立验收证据。本次不能据函数级测试宣称完整业务E2E通过。

## 4. 源码合并约束与回滚

- 目标页面仅 S4 局部承接 45 图，S2/S3 用户已确认视觉和 S5 推荐不得被重做。
- 保留双尺寸脚本与回归要求，但允许本阶段先出独立候选；仍不能覆盖统一项目母版。
- 回滚：从原始 EST-VIS-09 Compatibility Staging ZIP 重建（最安全）；或恢复目标 HTML 字节、删除新 CSS 和 `assets/item-icons/full45-trial/`、移除本报告及专项 QA，重算 manifest。
- 本阶段结论：**允许作为下一轮评审的独立受控候选；Release Gate HOLD，禁止自动提升为正式母版。**
