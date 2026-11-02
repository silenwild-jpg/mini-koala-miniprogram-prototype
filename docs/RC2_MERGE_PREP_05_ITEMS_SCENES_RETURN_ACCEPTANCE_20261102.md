# RC2-MERGE-PREP-05｜物品逐项、场景估算与返回修改双尺寸回归（2026-11-02）

## 版本身份与边界
- 候选：PR #40 `isolate/rc2-merge-prep-05-items-scenes-return-20261102`，基于 Draft PR #39，未合并 main、未部署 Netlify。
- H01 HIFI-06 已按用户明确指令废弃；本次不接收、不试装、不引用其视觉文件。
- 本次修改仅增加自动化浏览器测试、CI 及验收文档；未修改 ITEMS/CAP/S5 高保真页面源代码、未变更已批准业务逻辑。

## 真实 Chromium 结果
- [GitHub Actions #41410189297](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41410189297) `contract`、`browser`、`premerge-hold` **全部 SUCCESS**。最后一项成功表示正确识别 HOLD，而不是发布已放行。
- [私有 screenshot + JSON artifact #13125102758](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41410189297/artifacts/13125102758)，包含两个尺寸下的 ITEMS 主流程、场景切换、S5 返回修改与 CAP 回流证据，以及原业务回归截图。
- [Release HOLD 证据 #13125082237](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41410189297/artifacts/13125082237)。

### 新增 6 条真实双尺寸操作路径（3 业务场景 × 2 尺寸）
1. **按物品逐项**：进入 ITEMS→添加两种物品（`luggage28` ×2、`luggage24` ×1）→选择 12 个月→S5；点击 S5“修改需求”后返回 ITEMS，核对两种物品数量仍在→将 luggage28 改为 ×3 并选 6 个月→S5。两尺寸 PASS；估算体积 0.30→0.41m³，匹配容量仍为 0.5m³（正确遵守下限），`requirement.items` 与月份同步更新。
2. **按场景估算**：ITEMS 选择按场景/搬家→添加 `sofa3` ×2→切换物品/场景两种模式→选 6 个月→S5；修改返回 ITEMS，场景模式和物品数量保留→再添加至 sofa3 ×3→回到 S5。两尺寸 PASS；数量及估算体积刷新。
3. **CAP 返回修改**：CAP 快捷容量 3m³ + 12 个月→S5→修改需求返回 CAP，原值保留→改为 8m³ + 6 个月→S5。两尺寸 PASS；最终状态仅使用 8m³ 与 6 个月，没有旧报价需求残留。

### 同次复跑通过的回归链路
- CAP 3m³/12 个月→S5、ITEMS 已知容量 3.5m³/6 个月→S5，375/390 PASS。
- S01 四筛选/搜索/手机号与租期门禁→O01→中央 O03，375/390 PASS。
- H01 现运行首页→S01→O01，模拟支付成功、失败、取消恢复、同单重试，375/390 PASS。
- RN01 续租、EX01 退租、DP01 押金、IV01 发票及订单历史/资格判断，375/390 PASS。
- 新增测试期间无 JS pageerror。

## 状态与错误条件
- 新测试验证用户实际点击而非预置 `state.requirement`，经中央 `SIM_CORE` 序列化返回并进入 S5。
- 特别避免错误断言：若物品估算低于 0.5m³，下游匹配容量应稳定为 `max(0.5, estimated_volume)`。不能把匹配容量仍是 0.5m³ 误认为估算未刷新。
- 场景页的 `requirement.source` 仍为 `items_estimate`，场景模式属于选物品的浏览维度，不凭空新增另一套相斥需求源。
- U01/Q01 仍不进入中央正式路由；旧视觉 HIFI-06 不再作为验收要求。

## 仍未覆盖/待确认
- 19 项物品、全部场景及全部规格的逐一组合回归未执行；本次测试两个行李箱类物品和搬家沙发代表路径。
- AI 估算仍是演示入口，照片识别不是实际功能；顾问分支的预约留资链路未纳入本轮新测试。
- 容量极值（0.5/50/200）、库存变更、手机号拒绝后跨分支导航与 S01/S02 的全部回流异常态需专门测试。
- 截图经浏览器自动保存，但**尚未人工逐区对照冻结视觉母版**，不能宣称高保真视觉签收。
- H01 下一获批母版待决定。S01 四筛选人工视觉签收以及 main/Netlify 发布授权仍 HOLD。

## 归并结论
**PR #40 专项自动化通过，适合作为下一隔离候选的输入；正式归并 main 与发布仍 HOLD。**
下一任务建议：`RC2-MERGE-PREP-06｜S01/S02 需求回流、物品规格异常态与核心页面双尺寸视觉签收`。不需要 HIFI-06，不需要重建已验证的租后主链。
