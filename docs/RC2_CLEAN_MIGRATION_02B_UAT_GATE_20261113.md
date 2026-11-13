# RC2-CLEAN-MIGRATION-02B｜独立内部 UAT 与最终视觉准入台账

日期：2026-11-13。性质：**准入审查记录，不是视觉签收证书，不代表完成部署**。

## 1. 唯一候选与回归来源

- PR：#176，分支 `integration/rc2-clean-migration-01-20261113`，Draft/HOLD。
- `main` 起点：`274c5110aa18af7ed71d92533ab126ebbbd11f75`；未合并。
- 已通过完整自动化测试的运行时版本：`345ee13fe0aa576ce0a5fedd2ced682dbedf40ed`，Actions [#43366861599](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43366861599)，结论 success。
- 本次检查时 PR HEAD：`c140a61e0e16f2dda03d79f299aae47dfca372ed`。对比已测试 SHA：ahead 7、behind 0，差异仅 `.github/workflows/site-access-03c-s5-route-qa.yml`、`.github/workflows/site-connect-03a-rc1-p1-preflight.yml`、`docs/RC2_CLEAN_MIGRATION_01_MANIFEST_20261113.md`、`netlify.toml`，**没有 app 运行时差异**。本台账提交本身会使 HEAD 再增加一个文档提交；下次审核须重新获取实际 HEAD。
- QA证据：[Artifact #14010822125](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43366861599/artifacts/14010822125)，同 SHA 375/390 截图与 JSON。
- 离线评审包：[Artifact #14011450466](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43366861599/artifacts/14011450466)；包内 `MiniKoala_RC2_CLEAN_MIGRATION_01.zip`，SHA-256 `9e10f5e632bc7cf4b452f76fdde690eaa382b5a7f7c2a785faf92b1dc601478a`（来源 PR 说明，仍需下载后独立校验）。
- 上述 Artifacts 的失效日期为 2026-11-20 UTC；长期留存前须迁移受控存储。
- **同一运行时代码不等于新 HEAD 全量重新跑过所有 CI，更不等于 UAT 站部署了该版本。**

## 2. Netlify 站点发现与复用决定

| 站点 | site ID | 当前部署 ID | 实际版本 | 访问控制 | RC2 #176 准入 |
|---|---|---|---|---|---|
| `mini-koala-rc2-uat-private` | `cd152147-e886-44fa-8305-c96b3ea27ec9` | `6aec435e9496fc5463be573d` | 2026-11-05 已发布，commit_ref 缺失 | Team SSO，全站 | **未准入**；优先复用候选 |
| `mini-koala-rc2-uat-pr96-20261110` | `bc2df934-a53b-4b99-b751-810b8781577f` | `6af3442d0a6cc685b78ebe74` | `be4b8d1aee72357cb38c2e6d61ad2adf90dfc6cf` | Team SSO，全站 | **未准入**；较旧版本 |
| 旧 `mini-koala-internal-rc1-review` | `e8bba69f-09d5-4866-842d-43c30411114e` | 不用于 RC2 | 旧 RC1；RC2 PR 的 preview 仅跳过构建 | Team SSO，全站 | **禁止用于 RC2 UAT** |

选择已有 `mini-koala-rc2-uat-private` 作为候选，不再创建第三个站点；**未执行任何部署**。其现有 ready 状态仅表示旧版本可用，不表示 #176 已在该站运行。

## 3. 375/390 人工视觉签收单（全部待产品确认）

签收原则：以同一 SHA 的构建与截图逐屏核对；禁止将自动化截图数量、JS 无异常或像素检查等同于人工签收。每项需记录 375x812、390x844 的截图 ID、差异/缺陷编号、验收人、日期和结论。

| 页面/流程 | 必须核对的批准规则 | 自动化证据 | 人工签收 |
|---|---|---|---|
| H01 | 深绿走廊背景、双/三任务卡探索范围、为您推荐、第一张距离最近、运营位、门店横滑与底栏图形 | H01 20态双尺寸；NAV | PENDING |
| S01 | 搜索入口、排序/距离/服务三筛选、特价/送搬运标签、前两张匹配卡、第三考拉E存、第四起紧凑卡、底部导航 | S01双尺寸 | PENDING |
| S02 | 门店实景大图、存取时间角标、地址距离、导航/400电话图标、服务标签排序、仓位直接下单、估算入口 | S02双尺寸 | PENDING |
| CAP/ITEMS | 容量优先、平方米理解辅助、0.5m³步进与估算、快捷仓型图、报价入口；仓型大图重建此前已暂缓 | CAP/ITEMS双尺寸 | PENDING |
| S5 | 已确认容量与租期合并显示、地址地图入口、两个匹配门店+考拉E存、仅最匹配仓位、无对比功能、CTA可达 | 16态/12流程 | PENDING |
| M01 | 首要任务与个人记录、在租/待支付/支付恢复、各状态回退、无冗余卡与入口；核对隔离 PR #126 增量是否包含在本候选 | M01/生命周期双尺寸 | PENDING |
| BOOKING/QUICK/O01 | 预约、快捷选仓自动继承容量、租期主动确认、手机号验证、三小时支付/取消/失败/恢复 | 6条测试+生命周期 | PENDING |
| 全站 NAV/MOTION | H01/S01/M01 底栏图标与原曲线，点击区域，操作反馈不抢注意力，无视觉回退 | NAV像素/路径 | PENDING |

特别提示：**PR #126 为独立 Draft，不得仅因它存在就宣称 M01 增量已经纳入 PR #176**；须以 blob 比对或同构测试确认。

## 4. 内部 UAT 严格准入条件

- [x] 干净迁移 PR 与已测试运行时来源锁定。
- [x] 旧 RC1 CI 作业针对 RC2 PR 已跳过；不能算 RC2 测试 PASS。
- [x] 旧 Netlify RC1 站对 #176 跳过构建；GitHub 的 success 不代表在线 RC2 部署。
- [x] 已发现现有两处受 Team SSO 保护的 RC2 评审站。
- [ ] 在指定 RC2 私有站点部署已审核构建包；必须经部署单独授权，不能从 Draft/HOLD 自动推导。
- [ ] 站点 `rc2-uat-version.json`、build-summary、源代码 SHA、构建 ZIP 文件哈希逐项一致；排除旧版本。
- [ ] 产品负责人逐屏视觉签收 375/390，含 NAV 主视觉；发现问题登记 P0/P1。
- [ ] 被邀请评审账号通过 SSO 登录，并完整访问全部页面；验证未授权用户无法访问。
- [ ] H01→S01→S02→O01、H01→CAP→S5→O01、QUICK/BOOKING 和 M01 各任务态真实点击回放。
- [ ] 页面无阻断性错误/关键交互空转/横向溢出，发布版本与缺陷记录相符。
- [ ] 指定人员批准 **仅内部 UAT** 的范围与用户，不视为正式上线许可。

## 5. 归并门禁

当前状态：`internal_uat_online_allowed=false`；`visual_human_signoff=false`；`main_merge_allowed=false`；`deployment_allowed=false`。

此台账只记录证据与缺口，不修改这些门禁。微信原生 TabBar/真机、CRM/企业微信/支付后端、协议与隐私、定价临界点及 QUICK 边界属于后续开发/上线门禁，不能在 Web 原型 UAT 报告中宣称通过。

下一步：`RC2-CLEAN-MIGRATION-02C`，在明确批准内部部署后，复用独立私有站执行同一版本身份核验、受邀账号访问测试与人工视觉签收；不自动合并 `main`。
