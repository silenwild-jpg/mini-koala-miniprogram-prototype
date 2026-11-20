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
    serviceOptionsMax: 8        // 自定：服务筛选层最多列出的门店标签数
  },
  panel: {
    areaChipsDefault: 8,        // 交接 §4.2-5：商圈默认 8 个，其余展开
    searchStoreMax: 6           // 冻结稿 w14.js：门店结果最多 6 条
  },
  detail: {
    soldFoldMax: 3,             // 冻结稿 w2-render.js soldFold(3)
    alternativesMax: 3,         // 冻结稿 w2-render.js alternatives().slice(0,3)
    comboAlwaysFromM3: 10,      // 冻结稿 w2-render.js：需求超过 10m³ 时，有匹配仓也给出组合方案入口
    defaultOrderTerm: 12        // D-158：未选过租期时默认 12 个月并视为已选
  },
  // 仓型（冻结稿 w2-render.js category）：上限含本数
  unitCategories: [{ key: 'mini', maxM3: 1.5 }, { key: 'small', maxM3: 5 }, { key: 'medium', maxM3: 10 }, { key: 'large', maxM3: Infinity }],
  // 仓位用途短句的分档（冻结稿 runtime/br03-policy.js generic）；文字在 i18n/find.js usage
  usageBandsM3: [1.5, 5, 10, 25, 50],
  estimate: {
    capStepM3: 0.5,             // 冻结稿 cap.html：加减按钮每次 0.5
    aiEnabled: false,           // D-133：AI 估算保留占位，不实现
    toastMs: 2400               // 冻结稿 w1-render.js toast
  },
  moveSceneIndex: 0,            // 自定：首页场景里「搬家过渡」的位置；从它进入后，用仓位置面板显示搬家提示（交接 §4.2-5）
  hotline: '400-035-8885',      // 合同《使用协议》附件 3（冻结稿 model/mk-contract-text.json service.hotline）
  locateResolveKm: 80           // 自定（仅演示数据适配器用）：定位点距最近门店不超过此距离，视为在该门店所在城市
};
