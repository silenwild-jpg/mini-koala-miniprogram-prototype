// 规则配置：全站可调数值只在这里出现一次。来源《规则配置表》（知识库 MK_Miniprogram_rules_config_20261118.json）。
// status：ruled = 张坤给的数；example = 结构示例，等财务定；self = 设计侧自定且已裁定保留；pending = 等业务数据。
// 财务定档后只改这个文件（或改为由接口下发，见 services/api.js 的 getRules）。
module.exports = {
  DATA_SOURCE: 'mock', // 'mock' = 演示数据；'http' = 真实接口（第 5 批）
  API_BASE: '',
  DEMO_SEED_ORDERS: true, // 演示环境：登录后带 5 笔覆盖各阶段的演示订单；设为 false 则从空订单开始
  pricing: {
    termRules: [ // 12–60 月 0.65 为 ruled（D-156）；其余三档 example
      { min: 1, max: 2, factor: 0.80 },
      { min: 3, max: 5, factor: 0.75 },
      { min: 6, max: 11, factor: 0.70 },
      { min: 12, max: 60, factor: 0.65 }
    ],
    depositMonths: 1,
    managementFee: 50,
    fullReductionTiers: [ // example（D-157）
      { min: 5000, off: 150 },
      { min: 10000, off: 400 },
      { min: 20000, off: 1000 }
    ],
    nudgeMonths: 3,      // self（D-159）
    upsizeRatio: 0.85    // self（D-161）
  },
  freeTransport: { minKm: 5, minTerm: 6, minFactor: 0.6 }, // ruled（D-173）
  matching: {
    salesOnlyFromM3: 30,     // >=，ruled（D-101）
    advisorCapacityM3: 15,   // >，ruled（D-97）
    advisorRentTotal: 3000,  // >=，ruled（D-182）
    nearRatio: 0.8,          // ruled（D-99）
    nearbyRadiusKm: 5,       // ruled（D-128）
    nearbyFallbackStores: 3
  },
  requirement: {
    capacityMinM3: 0.5, capacityDecimals: 2,
    areaMinM2: 0.2, areaMaxM2: 200, areaDecimals: 1, // 上限 ruled（D-183）
    areaLayerHeightM: 2.4, // pending（D-178）：等实际仓位长宽高，全站只此一处
    capacityQuickPicks: [1, 3, 8, 15, 20],
    cartonVolumeM3: 0.096, cartonFillRatio: 0.8,
    termPresets: [1, 3, 6, 12], termOtherQuick: [18, 24, 36],
    termMin: 1, termMax: 60, termDefault: 12,
    itemQtyMax: 999, itemQtyQuick: [10, 20, 50],
    itemsAdvisorHintFromM3: 15
  },
  volumeModel: { version: 'MK-VOL-0.2', kFloor: 0.5, roundUpTo: 0.1 }, // 系数 pending（没有门店实测）
  timers: {
    quoteTtlHours: 3,         // ruled（D-120）
    pendingOrderTtlHours: 3,  // ruled（D-96）
    renewQuoteTtlHours: 24,
    locationBubbleSeconds: 5,
    recentLocationsKept: 3
  },
  service: { hourStart: 9, hourEnd: 20 }, // ruled（D-149）
  subscribeTemplates: { booking: [], renewQuote: [], inspect: [], expire: [] }, // pending：后台申请模板后填 ID
  defaultCity: '北京'
};
