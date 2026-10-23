# UX-PATCH A2｜确认物品页受控实施与交接

- 输入：A1.1 ZIP SHA-256 `f749f18bdaf06a7750d11d8b6af4bab2002dffffebe9bc7f95f8f1dac9f81b3c`；原始 ZIP 未覆盖。
- 范围：仅 S4 页面 HTML/状态呈现、`mini_koala_estimator_item_fallback_p0_v1.js` 的 S4 分组与单件展示、S4 独立 CSS、专项 QA；没有更改底层 `calc()`、`itemVol()`、`sceneCfg`、`sceneItems`、`items`、`ITEM_ICON_SAMPLE_V1` 或 45 张 WebP。
- 页面：保留场景摘要；正文标题“选择存储物品”；容量区与固定底栏“需要存储容量”；所有当前场景物品自然列表展示（包括数量 0），原“先确认这些／可能还要加”分组退场；图、规格、加减和按类别补充/自定义尺寸仍可用。
- 清空：一键全部数量归 0，不清空场景、所选容量档及规格，允许重新添加，空状态“待添加物品”，0m³ 不允许查看推荐；从物品编辑返回继续沿用旧草稿取消/恢复机制。
- 显示事实：物品小字显示当前规格**单件** `m³/件`，整页总量由现有 `calc()` 计算。原 EST45/VIS06E 旧测试检查“当前数量合计”且禁止 `m³/件`，因此在本候选存在**新增测试契约冲突（EXPECTED_FAIL）**；旧脚本保留不改，新 A2 测试覆盖 51 规格 × 5 数量、清空及 8 场景。需在后续统一验收中正式版本化新旧展示断言，不可以把旧 FAIL 当作 PASS。
- A1.1：5m³ 即时分流仍保持；A3 12 月默认、运输卡、推荐仓位卡及 U01 入口未提前修改。
- 浏览器 375×812 / 390×844：`BLOCKED`（HTTP Chromium `ERR_BLOCKED_BY_ADMINISTRATOR`），未获取可信页面截图、DOM 命中或完整路径证明。微信真机 `NOT_TESTED`。
- 发布：仅源码级试装候选，Release Gate = `HOLD`，管理母版未覆盖。
