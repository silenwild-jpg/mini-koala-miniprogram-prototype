// 找仓域（首页 / 附近门店 / 门店详情 / 仓位推荐 / 估算两页）的可调数值。全站通用的数值仍在 core/config.js。
// 每项注明来源：裁定编号 / 冻结稿脚本 / 自定（本轮开发自定，待确认）/ 待业务。
module.exports = {
  recommend: {
    cheaperRadiiKm: [3, 5, 10], // 冻结稿 runtime/recommendation-policy.js、home-recommend-policy.js：第二位在 3 → 5 → 10km 内找更低价
    homeCards: 3,               // 冻结稿 home-recommend-policy.js：最近 + 半径内更低价 + 运营位
    matchCards: 2,              // 冻结稿 w2-render.js s5CandidateList().slice(0,2)
    expandedKm: 3,              // 冻结稿 s5CandidateList：全部候选都在 3km 外时写「已扩大范围」
    operatingTag: '特价仓'      // 冻结稿 home-recommend-policy.js：运营位优先取带此标记的门店
  },
  list: {
    pageSize: 10,               // 冻结稿 w1-render.js DEFAULT_FILTERS.visibleLimit
    standardCards: 2,           // 交接 §4.4-6：前 2 家标准卡
    estoreSlot: 2,              // 交接 §4.4-6：第 3 位考拉E存卡（下标 2）
    distanceOptionsKm: [3, 5, 10], // 自定：冻结稿只画了「3km内」一个已选态，没有画选项层；取与推荐半径相同的三档
    expandedKm: 5,              // 自定（FIX-01 A-22）：有需求时列表首位门店超过这个距离，写一句「已扩大范围」
    serviceOptionsMax: 8        // 自定：服务筛选层最多列出的门店标签数
  },
  panel: {
    areaChipsDefault: 8,        // 交接 §4.2-5：商圈默认 8 个，其余展开
    searchStoreMax: 6           // 冻结稿 w14.js：门店结果最多 6 条
  },
  // 库存紧张提示（GAPS-01，张坤 2026-11-20 要求添加；D-170 曾去掉同类提示，见 PENDING_RULINGS PR-40）。
  // 数量 = 本店可租仓位总数，不超过 maxLeft 时在门店卡和门店详情的标签行提示；满仓不提示（另有「暂无可租仓位」）。show 关掉即全站不显示。
  // maxLeft 是自定值：演示库存里每家门店各容量只有 1 个仓位，旧冻结稿的「同容量仅剩 N 个」口径在这份数据上会每行都出现，所以改按门店总数。
  lowStock: { show: true, maxLeft: 2 },
  detail: {
    soldFoldMax: 3,             // 冻结稿 w2-render.js soldFold(3)
    alternativesMax: 3,         // 冻结稿 w2-render.js alternatives().slice(0,3)
    comboAlwaysFromM3: 10,      // 冻结稿 w2-render.js：需求超过 10m³ 时，有匹配仓也给出组合方案入口
    defaultOrderTerm: 12,       // D-158：未选过租期时默认 12 个月并视为已选
    galleryMin: 3,              // 自定（IMPL-01）：门店详情顶部横滑图至少几张，不够从共用图池补
    tabScrollMs: 250,           // 自定（IMPL-01）：点页签滚到对应分段的时长
    tabLockMs: 400,             // 自定（IMPL-01）：点页签后这段时间内不按滚动位置改页签高亮（等滚动结束）
    tabBarRpx: 88,              // 自定（IMPL-01）：吸顶页签高度（rpx），与 pages/store/detail.wxss .sd-tabs 一致；滚动定位时扣掉
    mapScale: 16,               // 到店指引地图与 wx.openLocation 的缩放级别（原 openLocation 写死 16）
    mapMarkerPx: 32             // 自定（IMPL-01）：地图上门店标记的边长（px）
  },
  // 仓型（冻结稿 w2-render.js category）：上限含本数
  unitCategories: [{ key: 'mini', maxM3: 1.5 }, { key: 'small', maxM3: 5 }, { key: 'medium', maxM3: 10 }, { key: 'large', maxM3: Infinity }],
  // 仓位空间示意图的分档（冻结稿 w2-render.js thumb）：上限含本数。注意中型仓到 15m³，与上面仓型筛选的 10m³ 不同，照冻结稿
  unitThumbBands: [{ key: 'mini', maxM3: 1.5 }, { key: 'small', maxM3: 5 }, { key: 'medium', maxM3: 15 }, { key: 'large', maxM3: Infinity }],
  // 仓位用途短句的分档（冻结稿 runtime/br03-policy.js generic）；文字在 i18n/find.js usage
  usageBandsM3: [1.5, 5, 10, 25, 50],
  estimate: {
    capStepM3: 0.5,             // 冻结稿 cap.html：加减按钮每次 0.5
    aiEnabled: false,           // D-133：AI 估算不实现。IMPL-01（张坤 2026-11-21）：关着时两页的入口整个隐藏、不留占位；功能开放时改 true 即恢复
    // IMPL-01 容量滑杆：快捷档（core/config.js capacityQuickPicks）在滑杆上的位置（0–1）。等距排，小容量段更细（自定）；滑杆左端是最小值
    sliderStops: [0.1, 0.325, 0.55, 0.775, 1],
    // IMPL-01 示意区与动效（自定）：仓库示意随容量缩放的下限；一次最多同时飞几个箱子 / 物品图；连拖时两次飞入的最小间隔；飞行时长与错峰；数量弹窗退场时长
    numDigitRpx: 46, numPadRpx: 24, numEmptyRpx: 150, numMaxRpx: 330, // 容量大数字输入框按字符估宽（72rpx 字号下每位数字约 46rpx）
    stageScaleMin: 0.62, flyBurst: 3, flyMax: 4, flyGapMs: 90, flyMs: 300, flyStaggerMs: 60, dialogOutMs: 180,
    toastMs: 2400               // 冻结稿 w1-render.js toast
  },
  hero: { backdrop: 72, solidAfter: 24 }, // 首页顶部浅绿底带（px）：顶栏以下再延伸多少（IMPL-01 自定，首屏卡压在它上面）；滚动多少后顶栏变实底（自定）
  // 首页（IMPL-01，张坤 2026-11-21 第 3 段）。
  // banners：首屏卡上半部分的品牌与运营轮播。图不带字，标题与副标题由页面叠在图上；route 是 services/routes.js 的常量名；
  //   tone = 叠字颜色（light 白字 / dark 深字）；hideWithNeed = 已有找仓需求时不出（M-04：有需求时不再出「估大小算价格」入口）。
  //   三张的文案与排序都是演示数据，运营内容上线前由业务提供。
  home: {
    bannerIntervalMs: 4000,     // 自定：轮播停留
    bannerDurationMs: 300,      // 自定：轮播切换时长（动效上限 300ms）
    navLockMs: 600,             // 自定：一次跳转发起后，这段时间内的重复点击不再跳（防快速连点开出两页）
    banners: [
      { key: 'brand', image: '/assets/images/home/banner/brand.webp', title: '让城市生活更轻松', sub: '家具、行李、闲置物品，找到附近适合的存储空间', route: 'BRAND', tone: 'light' },
      { key: 'estimate', image: '/assets/images/home/banner/estimate.webp', title: '估大小算价格', sub: '不知道租多大？', route: 'CAPACITY', tone: 'dark', hideWithNeed: true },
      { key: 'estore', image: '/assets/images/home/banner/estore.webp', title: '考拉E存', sub: '上门取送，不需要到店', route: 'ESTORE', tone: 'dark' }
    ],
    // 六个场景的圆形图标（design-src/icons.json），顺序与 i18n/find.js home.sceneList 一一对应
    sceneIcons: ['scenemove-brand', 'scenereno-brand', 'scenebag-brand', 'sceneseason-brand', 'scenehobby-brand', 'sceneidle-brand'],
    // 品牌区五城地标线条画，顺序与 i18n/find.js home.cities 一一对应
    cityImages: ['/assets/images/home/city/beijing.svg', '/assets/images/home/city/shanghai.svg', '/assets/images/home/city/shenzhen.svg', '/assets/images/home/city/hangzhou.svg', '/assets/images/home/city/guangzhou.svg'],
    // 品牌区三张资质配图：占位示意（其中有与事实不符的），上线前必须换正式件；说明文字在 i18n/find.js home.proofCaptions
    proofImages: ['/assets/images/home/proof/proof1.webp', '/assets/images/home/proof/proof2.webp', '/assets/images/home/proof/proof3.webp']
  },
  moveSceneIndex: 0,            // 自定：首页场景里「搬家过渡」的位置；从它进入后，用仓位置面板显示搬家提示（交接 §4.2-5）
  hotline: '400-035-8885',      // 合同《使用协议》附件 3（冻结稿 model/mk-contract-text.json service.hotline）
  locateResolveKm: 80           // 自定（仅演示数据适配器用）：定位点距最近门店不超过此距离，视为在该门店所在城市
};
