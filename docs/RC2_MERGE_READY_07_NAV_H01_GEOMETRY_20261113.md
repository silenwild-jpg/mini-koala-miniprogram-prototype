# RC2-MERGE-READY-07｜NAV底栏视觉同源定向修复与归并门禁

**2026-11-13 · PR #174 · 上游唯一业务候选PR #173 HEAD** `23b58f200b8efcd6748a550a1b927156f9b18456`

## 有效裁定

- H01的`home.html`及`assets/nav_original_375/390.png`是**获批视觉参考，绝不修改**；S01、M01向其**视觉几何、字号和底部安全区**对齐。
- H01底栏实测：375屏`61.546875px`，390屏`64.015625px`；S01原`74px`，M01原`76px`。
- 本PR在`visual-align.css`中使用统一`--mk-h01-tabbar-height:clamp(0px,16.4146868vw,64.016px)`、四等分100%可点击列、10px字、26px既有图标源，45px以上点击高度；`S01 iframe`与`M01 scroll`的可视高度同步。
- 不修改H01既有NAV热区，不引入新的边框/阴影/卡片/结构；S01/M01保留`assets/nav-current-01c/`现有双态SVG图标。
- `app.js`仅给S01/M01的当前导航项增加`aria-current="page"`，非当前项不带；路由动作不变，预约订单仍弹出`预约用仓/快捷下单`二选项。
- **剩余待签**：H01原始PNG图标与S01/M01的SVG图形笔触/轮廓非完全相同。只有在用户允许从H01母版**提取或重绘同源图标**后，才能判定图标像素级同源完成。不要自行修改已获批H01母版或把不同SVG宣称已100%同源。

## 验收标准

1. `375×812`及`390×844`的真实浏览器同SHA截图：H01高度与S01/M01差异不超过1px；四个图标区域左边界按25%分栏，触控宽/高均≥44px，文字10px且无换行；S01列表及M01内容与底栏边界对齐。
2. `aria-current="page"`只出现在当前高亮的S01或M01项；全程保留键盘焦点可见与导航按钮可操作。
3. 点S01`预约订单`能看到`预约用仓/快捷下单`两入口、进入QUICK；M01点击`附近门店`返回S01；核心页面状态不丢。
4. 用原全站流水线同SHA重做H01、CAP、ITEMS、S01、S02、S5、BOOKING、QUICK、O01、M01、价格、定位、订单和NAV像素保护；**即使技术全部PASS，仍需用户人工母版视觉批准**。
5. 不合并main、不部署Netlify、不声称已转成微信原生。

**相关**：[Issue #152](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/152)、[Issue #164](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/164)、[PR #173](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/173)。
