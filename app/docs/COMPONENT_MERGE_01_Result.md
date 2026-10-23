# COMPONENT-MERGE-01 合并候选及首次估算代金券修复

日期：2026-10-15。独立候选待审；原 Exception QA 冻结演示 READY；正式 Release Gate HOLD。视觉整体 PARTIAL，未批准替换冻结版本。

## 输入与基线

唯一最新原型：Mini_Koala_H01_CARD_01_Candidate_2026-10-15.zip。
SHA256：0fff0196d017278e29970aa375cc6a8b3ebcfc5f287ac3e50d94ae2ee64f993d。CRC、805项Manifest通过，独立解压。

BRAND-VIS-01C交接包SHA256：04ba86a8ad1bfae257b6469968015bee68b4617bca0f79b4f1ec870638cd57b9；CRC及14项SHA通过。

NAV-ICON-01B Scheme B交接包SHA256：96cae8b07c1f9def4ba6b0ea4031f7d3b1dfd5b81c634ff9d38361e8fcf75ed9；CRC及36项SHA通过。

## 改动和一致性处理

1. H01原品牌介绍、四服务与待核验材料折叠区域合并为选定品牌组件。保留brandTrust、brandTrustLink、homeBottomProofs业务挂点；原inline scripts逐字保持。仅一个了解更多入口，沿用B01路由。
2. 14年/590+/30万+、五城市、四项服务沿用基线。交接稿“考拉存存”按基线保留“考拉E存”。副文、统计与荣誉标签最低12px；了解更多触区44px；中性页底保持VIS-BG-01。
3. 新增4张品牌图及8个导航SVG、2x/3x PNG均与交接原资源逐字一致。品牌图是AI模拟演示，三项荣誉事实未核验，不能用作真实证书、CCTV报道或国标资质证明。原ASSET_AND_FACTS.md及供应商说明随包保留。
4. 当前为自定义HTML导航，共用CSS/a11y脚本替换现有图标。26px SVG优先，失败降级本地PNG3x；两者失败保留字形、文字和原点击处理。顺序、标签、目的页不变。保留当前56px内容高度+safe-area，未按交接建议加高到60–64px。
5. U01原viewOtherUnits按钮移动至saveQuote“保存方案，稍后再看”下方。ID、脚本、同店/附近分支、排除当前仓位与返回上下文保持。
6. 用户追加修复：首次估算S5代金券不显示。原因是显示条件读取已保存requirement.term_months，而首次进入S5尚未保存需求。现在读取S5当前租期控件，调用既有ensureAcquisitionWallet/grant。未提前保存需求，未更改新客资格、券额、门槛、选择策略、价格公式、订单链路。
7. 保留此前H01两标签单行、店名社区同行、标签与价格底部齐平、区域低价/离您最近、汽车图标、去价格箭头。24张卡片文字/金额/门店ID与上一候选一致。

## 本轮验证

本地真实HTTP、Chrome155.0.8059.79，375×812 /390×844、DPR2、zh-CN、Asia/Shanghai。供应商旧截图不计入本轮验收。

- P01–P16、A01 ×2尺寸：34/34 PASS，覆盖估算、筛选、换仓、报价、订单、券状态/资格、支付前金额和协议阻断。
- 首次估算直达S5与经过S4两入口×2尺寸：修复前4/4没有券和钱包；修复后首次完成/展开说明/仓位或门店返回/刷新16/16券图显示。切换3/12月、返回与刷新券ID不变，三券只生成一次，首次S5需求快照仍为空。
- 导航H01/S01/M01三页×2尺寸，共6张业务激活态；每页1 active+3 inactive、图标26px、触区≥44px；reload和back状态正确。找仓入口另有2张真实估算页截图。
- 四激活态×2尺寸独立组件页8张；本地PNG降级2尺寸真实加载和点击通过，SVG故障注入产生的中断为预期记录。
- 品牌双尺寸4图加载、唯一B01入口、原事实保留；U01位置/触区及原路由通过。
- 首页24卡片与8条首卡跳转通过。完整34流程结束后仅有品牌文字字号视觉调整，最终视觉证据另跑完成；最终ZIP解压后做定向复测。
- 默认40命令双树对比：19 PASS /21历史FAIL，0新增失败。未删除、放宽历史断言；最终源文件清单和引用检查另见Packaging.json。
- 原有HTML全部script标签和内容逐字保持；原data、图片和QA断言不变。原外部JS仅导航显示脚本及coupon模块estimatorInit显示触发改动。所有差异与保护哈希详见Source_Changes.json /Source_Diff.patch。

## 未关闭事项和适用范围

- 真实产品找仓为估算流程，原本没有四项tabBar。本次没有新增业务导航改变底部动作。四态fixture不等同于四业务页均有tabBar：交接矩阵适配为三业务主导航页+找仓入口+四态组件测试。
- iOS/Android最低目标浏览器、微信真机、生产API、真实支付NOT TESTED。当前桌面移动仿真safe-area为0，不代表真实刘海屏验收。
- 继承S5优惠说明展开时首卡可能被底栏遮挡的布局问题。前候选记录375约51.75px、390约24.94px。本轮修复首次券显示，该展开态几何问题仍OPEN；视觉整体PARTIAL。
- P1-03支付失败恢复、P1-05退出确认防重复等原待办保持OPEN/DEFERRED。
- 原8768服务及冻结ZIP不覆盖。新预览8769，新候选待复审批准，Release HOLD。

## 复现

候选根目录运行：

```powershell
node tools/component_merge01_review.cjs --root . --out outputs/component-visual --mode after
node tools/first_estimate_coupon_review.cjs --root . --out outputs/first-coupon --mode after
node tools/component_merge01_full.cjs --root . --out outputs/flows
python tools/check_package.py
```

完整候选ZIP、证据ZIP、双尺寸前后对比图、SHA256SUMS_COMPONENT_MERGE_01.txt一起交付。供应商输入说明和清单在docs/COMPONENT_MERGE_01_INPUTS/。
