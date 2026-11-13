# RC2-MAINLINE-INTEGRATION-01｜整合审计与新候选验收记录

**日期：** 2026-11-13  
**当前 main 基线：** `b370957eab9a6dbccc50cc26e4618972151fe569`  
**原RC2签收来源：** `41a8a079eb48049e1060512bddf71c226bfd3738`  
**新整合候选：** `integration/rc2-mainline-integration-01-20261113`  
**新整合候选SHA：** `281b3deab14a715fb61d20c50f6e1a5aedd5de0c`

## 1. 结论

- 新整合候选已建立；原RC2签收分支与PR #176保持不变。
- main治理基线已通过PR #195合入新整合分支；PR #195的base为整合分支，不是main，合并提交为 `76f7e9986f2d5c28a7d23d8423218786be5c2613`。
- 两条RC1历史工作流冲突已按main版本解决，均只保留 `workflow_dispatch`。
- 促销资格/叠加/优惠券状态已统一到main的 `promotion-policy.js`；RC2的页面展示与报价调用已接入该唯一策略模块。
- 新整合候选精确SHA `281b3deab14a715fb61d20c50f6e1a5aedd5de0c` 的RC2 CLEAN MIGRATION 375/390 GitHub Actions回归通过。
- **技术状态：AUTOMATED QA PASS。视觉/UAT新SHA签收：待用户复核。main合并：HOLD。部署：未执行。**

## 2. 两侧基线与分叉事实

| 项目 | SHA / 状态 |
|---|---|
| 当前main | `b370957eab9a6dbccc50cc26e4618972151fe569` |
| 原RC2签收候选 | `41a8a079eb48049e1060512bddf71c226bfd3738` |
| 原RC2 PR #176 | Draft / MAIN HOLD |
| 新整合分支 | `integration/rc2-mainline-integration-01-20261113` |
| 新整合候选SHA | `281b3deab14a715fb61d20c50f6e1a5aedd5de0c` |

原始比较显示两侧曾相对共同基线分叉：RC2领先181个提交，main领先19个提交。不能把原PR #176当作普通增量PR直接合并。

## 3. main治理增量并入

PR [#195](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/195) 已合并到新整合分支：
- 保留main的README、AGENTS、VIS-GUARD、Ruleset治理材料、PR/Issue模板、项目控制中心和历史QA/PR/分支审计。
- 保留main中02D～02K、02N九条旧工作流的手动触发设置。
- `.github/workflows/site-access-03c-s5-route-qa.yml` 与 `.github/workflows/site-connect-03a-rc1-p1-preflight.yml` 按main版本解决冲突，避免RC1旧工作流在RC2候选上自动运行。
- RC2专属 `rc2-clean-migration-01.yml` 保留并改为新整合分支触发；增加策略单测路径和执行步骤。

## 4. 促销策略单一事实源

### 原问题
- main已有 `demo/promotion-policy.js`。
- RC2原 `demo/presentation-policy.js` 内嵌第二份 `createPromotionPolicy()`。
- `demo-core.js` 通过展示模块加载策略，导致策略职责重复。

### 本轮修改
- `promotion-policy.js` 成为唯一策略模块，导出 `SIM_PROMOTION_POLICY`。
- `presentation-policy.js` 只负责页面价格、标签、事实展示。
- `demo-core.js` 改为直接调用 `promotion-policy.js`。
- `index.html` 在 `demo-core.js` 前加载唯一策略模块。
- 统一策略支持显式日期上下文、fixture日期、测试时钟，以及优惠券 `INVALID` 终态。
- 修复main原策略白名单的排序键错误：叠加组合使用排序键，而部分ALLOWED常量此前未按同一顺序编码，导致允许组合被误判。现已统一排序并由单测验证。

### 规则边界
- 保留已批准的：租期折扣+租金券、租期折扣+搬运服务、租金券+搬运服务可叠加。
- 特价仓与租期折扣/优惠券的正式叠加仍为待业务确认，不自动放开。
- 赠期合同期限、付费月份、押金和退款财务含义仍为待业务确认。
- 搬运仍是服务权益，不作为现金租金抵扣。
- 本次不改正式折扣表、押金口径、真实价格或生产营销配置。

## 5. 新SHA技术验收

GitHub Actions：[Run #43446189232](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43446189232)  
被测SHA：`281b3deab14a715fb61d20c50f6e1a5aedd5de0c`  
最终结论：**SUCCESS**

已通过的门禁：
- 冻结源身份与跨模块契约；
- 101个app路径迁移核验（原100项RC2运行时清单 + 1项mainline策略模块）；
- JS语法与运动契约；
- 容量单位双制测试；
- 促销标签事实源测试；
- 统一促销权益策略单测；
- 促销/优惠券/赠期/订单生命周期场景；
- 同SHA评审包构建与构建身份核验；
- H01双尺寸与底部导航；
- 导航语义、路由、像素曲线和光学回归；
- CAP、ITEMS、S01、S02 375/390；
- S5排序与跨页地图来源；
- H01、S01、S02、S5、M01及订单生命周期；
- 促销/生命周期浏览器证据；
- BOOKING、QUICK、O01双尺寸流程。

Artifact：
- [375/390 QA证据包（ID 14048525517）](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43446189232/artifacts/14048525517)
- [内部评审包（ID 14048590522）](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43446189232/artifacts/14048590522)

早期整合调试运行曾发现策略叠加白名单排序错误，已修复；上述最终SUCCESS绑定SHA `281b3de...`，不得用早期失败运行代替最终结论。

## 6. 原RC2签收资产保护

已复核：
- 原分支 `integration/rc2-clean-migration-01-20261113` HEAD仍为 `41a8a079eb48049e1060512bddf71c226bfd3738`。
- 原PR [#176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176) 仍为Open / Draft，head仍为原签收SHA，base仍为原base `274c5110aa18af7ed71d92533ab126ebbbd11f75`。
- 没有对原分支rebase、cherry-pick、推送或合并。

## 7. 尚未完成与风险

1. 新整合SHA虽已自动化PASS，但原RC2的人工视觉/UAT签收只覆盖原SHA；新SHA需要用户复核关键截图/交互后才能标记 `VIS_SIGNED`。
2. 在线演示部署未验证。本轮没有触发正式部署，没有修改Netlify站点设置或 `netlify.toml`。
3. 微信原生小程序、后端库存/价格/CRM、真实支付、正式协议与生产营销配置仍不在本轮验收范围。
4. #176不合并main；新整合候选也不自动合并main。
5. 新候选如再有任何代码变更，必须以新SHA重跑对应自动化；当前PASS不能跨SHA沿用。

## 8. 状态机

| 项目 | 状态 |
|---|---|
| main治理并入新整合分支 | MERGED（PR #195） |
| 促销策略统一 | IMPLEMENTED |
| 新SHA自动化/375/390 | TESTED |
| 新SHA人工视觉/UAT | HOLD / 待用户复核 |
| 合并main | HOLD / 未授权 |
| 部署 | NOT DEPLOYED |

**下一动作：** 向用户展示新SHA的375/390证据包与关键页面截图，取得新整合候选的视觉/UAT签收；随后再裁定是否建立main合并PR。  
