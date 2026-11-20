# D-36 · 「我的」信息架构 · 裁定落地记录（VIS-REDESIGN-01A W6 · 2026-11-17）

**裁定（张坤 2026-11-17）**：方案 A 单一「我的」；运输需求保留成页；推荐有礼单独成页；「报价方案」与「最近找仓」合并。
**来源**：`docs/D36_My_IA_Merge_Proposal.md`（W5，事实盘点与三案）。本文件只记录裁定后的最终结构与两套旧视图的去向。

## 1. 最终结构（T7 模板）

```
Tab「我的」= M01 首页（pages/m01.html）
├─ UserCard（头像 · 我的迷你考拉 / 欢迎使用迷你考拉 · 手机号脱敏 · 个人信息 ›）
├─ 当前任务卡 = H01 DemandCard（同一组件同一数据：H01_STATE_POLICY.derive）
│    · 运行时规则沿用：key=active 且有在租仓位 → 不显示；key=new 且有历史订单 → 不显示
│    · key=new 且无订单 → 「尚未用仓 / 找一个合适的仓位 / 可从附近门店开始 / 找附近门店」（m01 原文案）
├─ 我的仓位（有 active / upcoming / returning / expired 仓位时；最多 2 行；>2 → 「查看全部 N处」→ OH01）
├─ 我的记录    ：我的订单 → OH01 ｜ 我的需求 → ACC needs ｜ 找仓进度 → ACC progress
├─ 服务与权益  ：我的收藏 → ACC favorites ｜ 优惠与权益 → ACC coupons ｜ 消息 → ACC messages
└─ 更多服务    ：运输需求 → ACC transport ｜ 推荐有礼 → ACC referral ｜ 联系顾问 → ACC support ｜ 关于迷你考拉 → ACC brand
TabBar「我的」
```

二级页（`pages/acc.html?view=…`，TopBar.page 居中标题 + 返回，无 TabBar）共 **12 个** + OH01（`pages/oh01.html`，TabBar「预约订单」）：

| # | 视图 | 承接的旧视图 | 内容 | 写操作（runtime API） |
|---|---|---|---|---|
| 1 | OH01 订单记录 | M01.orders + M01.assets（全部）+ account.orders | OrderCard 列表（history 倒序）| — |
| 2 | needs 我的需求 | M01.booking + account.needs | 个人 / 企业 / 顾问线索卡 + 状态 | editLead / withdrawLead / 企业 → business.html |
| 3 | progress 找仓进度 | **M01.quotes + M01.recent（合并）** | 需求卡（= H01 DemandCard estimated/selected 态）+ 报价方案卡 | — |
| 4 | favorites 我的收藏 | M01.favorites + account.favorites | 门店行 / 仓位行 | —（sessionStorage `mk_visual_align_ui_v1`）|
| 5 | coupons 优惠与权益 | M01.coupons + account.coupons | 优惠券 / 服务权益 / 赠送租期 + 金额门禁 | claimCoupons / requestPhone |
| 6 | messages 消息 | M01.messages + account.messages | 消息行（未读点）+ 关联订单 | readMessages |
| 7 | profile 个人信息 | M01.account + account.profile | 验证手机号 / 联系手机号 | setContact / requestPhone（OVL 联系电话抽屉）|
| 8 | identity 身份验证 | account.identity | 订单摘要 + 三步进度 | requestIdentityVerification / identity（review=1）（OVL 身份资料抽屉）|
| 9 | access 入仓指引 | account.access | 订单摘要 + 四步 + 开门信息 | enterStorage（OVL 开锁对话框）|
| 10 | transport 运输需求 | account.transport | 选订单 → 表单 + 运输记录 | requestTransport |
| 11 | referral 推荐有礼 | account.referral（M01.help 链接） | 邀请说明 + 分享链接 + 复制 | — |
| 12 | support 联系顾问 | account.support（M01.help 链接） | 咨询类型 + 内容 +（订单上下文）| saveSupport |
| 13 | brand 关于迷你考拉 | account.brand（M01.help 链接） | H01 品牌区同一组件 + 原文四段 | — |

取消的子视图：M01.services「租后服务」（入口已在 O03 服务行；我的仓位行直达 O03）、M01.assets（并入 OH01 / 首页我的仓位块）、M01.help（拆成三行）、account.mine（评审工具 → `?review=1` 面板，不设计）、account.order / renew / exit / deposit / invoice（仓库已重定向到中央路由 O03 / RN01 / EX01 / DP01 / IV01）。

## 2. 代码侧改动清单（D-64，不在本阶段实施）
1. `account.html` / `account.js` / `account.css` 退役；`account.js` 的 `centralPage` 重定向表扩展为：profile / needs / favorites / messages / coupons / identity / access / transport / referral / support / brand → `index.html?page=M01&view=<同名>`（带 `order` 参数的服务视图透传订单 id）。
2. `m01-rebaseline-01.js`：`names` 增加 `progress:'找仓进度'`、`transport:'运输需求'`、`referral:'推荐有礼'`、`support:'联系顾问'`、`brand:'关于迷你考拉'`、`identity`、`access`；删除 `quotes` / `recent` / `services` / `help`；`listView` 并入 account.js 对应视图的渲染与写操作（editLead / withdrawLead / setContact / saveSupport / requestTransport / requestIdentityVerification / identity / enterStorage / claimCoupons / readMessages 都已是 demo-core API，无需新增）。
3. `app.js` handlers：`m01Identity` / `m01Access` 从 `location.href='account.html?…'` 改为 `M01_REBASELINE_01.setView('identity'|'access')`；`O03` 服务行「身份验证 / 入仓指引」同样改为 M01 子视图。
4. H01 `demandCard` 服务变体的四格链接：更多服务 → O03（本订单）、我的订单 → OH01（本包已按此渲染）。
5. 「载入订单样本」评审工具迁入 `?review=1` 面板。
6. 消息未读：runtime `messages[].read` 已存在；M01 首页「消息」计数改为未读数（本包口径，D-69）。
