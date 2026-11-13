# RC2-CLEAN-MIGRATION-02G｜长页面、费用/协议与内部 UAT 门禁复核

日期：2026-11-13。用途：补充 02F 的长页面及关键交互检查。不是全站最终视觉人工签收，不是 UAT 部署授权。

## 1. 候选与证据

- PR #176：HEAD `8263fa3f4143256cee9e3382365ef609a73fea7c`，Draft=true、merged=false，base `274c5110aa18af7ed71d92533ab126ebbbd11f75`。
- 最后一次完整同 SHA 自动回归：[Actions #43371610581](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43371610581)，runtime SHA `e275871918673559b88a4ff370e5bf41ddf40ed`（应以 GitHub 记录为准）；completed/success。
- Artifact [#14011599753](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43371610581/artifacts/14011599753)，335 文件；314 PNG，375px 页面宽151张、390px页面宽151张，另12张局部裁剪。截止 2026-11-20 UTC 有效。
- 本轮已重新下载 ZIP 并抽查 S02、S5、M01、O01 的长页/底部状态；生成本地联系表 `RC2_02G_longpage_contact.jpg`。

## 2. 本轮实际图像复核

| 页面/流程 | 截图及事实 | 结论 |
|---|---|---|
| S02 | `S02-browse-375/390.png`、`S02-confirmed-375/390.png`：门店照片/服务标签/地址距离/电话与导航/服务标签/三 tab/仓位卡；「交通路线」tab 明确存在 | **保留规则符合**。本轮没有独立的交通路线 tab 展开态截图，仍需核查面板点击后内容、长地址与滚动。 |
| S5 | `two-stores-375/390-top/bottom.png`、`one-store-*`、`large-no-match-*`、`combo-*`：小图门店照片，匹配仓位、价格、下单 CTA；单店/双店/组合仓状态分开 | **符合小图最终决议**。信息层级可读，未发现必须立即改代码的缺陷；仍需人工检查价格极值/长门店名/优惠标签拥挤。 |
| M01 | `04-two-active-assets-375/390.png`、`08-closed-history-375/390.png`：多笔资产平面行、我的记录及结束历史；底部导航可见 | 与已通过 11/11 及双尺寸浏览器测试一致；待人工核对押金、续租/退租详情展开态。 |
| O01 订单确认 | `375/390-07-O01-confirmed-top.png` 与 `08-O01-confirmed-bottom.png`：仓位/租期/费用/首次应付金额与底部确认按钮；`09-O01-agreement-guard.png`：未确认协议时阻断按钮；`10-O01-payment-pending.png`：支付流程面板 | 当前布局及主动协议确认路径有截图支持；需人工复核长费用行、优惠/押金/管理费的对齐、协议正文入口和错误状态反馈。 |
| QUICK/BOOKING | 同 SHA results JSON 显示 375/390 预约 empty/error/saved、快捷下单容量继承、显式租期、城市/门店切换、组合仓至 O01 均 PASS | 自动化证据齐全；仍需手动体验真实操作顺序与返回修改后的状态保留。 |

## 3. 本轮缺陷裁定

- 未发现能由本轮长页截图直接确认的 P0/P1 视觉缺陷。
- **未验证不等于 PASS**：S02 交通路线 tab 展开内容；S5 长门店名/价格极值/促销拥挤；M01 续租/退租详情展开；O01 费用极值/协议正文/失败恢复仍是人工检查项。
- 已冻结规则继续有效：S02 保留交通路线；S5 使用小尺寸照片；S01/S5 共享信息层级与照片规格，但不强制同一 DOM/卡片结构；不恢复 U01/对比。
- 不在原型阶段要求真实库存、真实公里数或支付后端验证；模拟数据仅用于体验结构。协议与隐私的法务真实性不属于原型截图验收范围。

## 4. UAT 私站状态（重新核验）

### 首选站点 `mini-koala-rc2-uat-private`
- Site ID `cd152147-e886-44fa-8305-c96b3ea27ec9`。
- 当前部署 `6aec435e9496fc5463be573d`，ready，发布日期 2026-11-05。
- deploy `commit_ref=null`、branch=null、review_id=null、deploy_source=drop；元数据说明上传了53个文件/6个生成页面/47项资产，但**无法将其绑定到本轮 PR #176 SHA**。
- Team SSO 要求对全站启用；未进行受邀用户登录实测。
- 站点存在 ready deploy 仅证明旧包可服务，不证明当前候选已部署。

### 第二站点 `mini-koala-rc2-uat-pr96-20261110`
- Site ID `bc2df934-a53b-4b99-b751-810b8781577f`，ready。
- 当前部署 commit `be4b8d1aee72357cb38c2e6d61ad2adf90dfc6cf`，不是当前 #176 SHA。
- Team SSO 全站启用；未进行受邀用户登录实测。

**结论：两站均不能作为 #176 当前 SHA 的 UAT 证据。** 本轮没有部署、没有改变站点访问设置，也没有切换生产/预览 alias。

## 5. 准入与归并门禁

`automated_regression=e275871:PASS`；`longpage_visual_precheck=PARTIAL`；`human_visual_signoff=false`；`online_uat_admitted=false`；`main_merge_allowed=false`；`deployment_allowed=false`；PR Draft/HOLD。

进入内部在线 UAT 前必须：明确指定仅用于 UAT 的站点和访问人员；获准部署；将本轮唯一 SHA 与 ZIP SHA-256/manifest/线上 `rc2-uat-version.json` 绑定；部署后读取站点版本标识；验证 Team SSO 邀请账号及拒绝未授权访问；进行人工长页/关键交互签收。不能拿旧站点 ready 或旧部署 screenshot 替代。

下一步：`RC2-CLEAN-MIGRATION-02H`，若取得内部 UAT 专用部署授权，复用 `mini-koala-rc2-uat-private` 上传指定构建包并验证 SHA/SSO；若未授权，则继续离线签收，不部署、不合并 main。
