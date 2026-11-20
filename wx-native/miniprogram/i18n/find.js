// 找仓域界面文字：首页、附近门店、门店详情、仓位推荐、估算两页，以及用仓位置面板、需求卡、修改需求弹层、考拉E存卡。
// 文案照冻结稿（W27）原文；标「自写」的是冻结稿没有、本轮补的句子。用词遵守交接 v1.0 §4.11。
module.exports = {
  unit: { m3: 'm³', m2: '㎡', month: '个月', piece: '件', box: '箱', km: 'km' },
  // 仓位用途短句（冻结稿 runtime/br03-policy.js）：与 core/config-find.js usageBandsM3 一一对应，最后一项是超出最大档
  usage: { prefix: '适合', bands: ['行李箱、换季衣物', '纸箱、小件家具', '小件家具、家电', '沙发、家庭家具', '大件家具、家电', '大量家具、物资'] },
  unitCategories: { all: '全部', mini: '迷你仓', small: '小型仓', medium: '中型仓', large: '大型仓' },
  price: { fromMonth: '/月起', month: '/月', cubicFrom: '/m³/月起', special: '特价仓', totalPrefix: '整期 ', fullOff: '满额减 ', none: '暂无价格' },
  cta: { order: '立即下单', quote: '查看报价', viewUnits: '查看仓位', viewStore: '查看门店', moreUnits: '查看更多仓位', advisor: '预约顾问', toAdvisor: '提交给顾问' },
  card: {
    range: '可租容量', freeTransport: '满6个月免费运输', more: (n) => '另有 ' + n + ' 个可租 · 查看门店',
    noMatch: '该店暂无匹配仓位', noStock: '暂无可租仓位', combo: '组合仓 ', bigger: '大一档',
    first: '距离最近', second: '区域低价',
    diff: (dv) => '大 ' + dv + 'm³', diffMore: (yuan) => '，每月多 ' + yuan,
    reasonEqual: (v) => '需求与 ' + v + 'm³ 仓相当，大一档更好放',
    reasonRatio: (v, pct) => '需求约占 ' + v + 'm³ 仓的 ' + pct + '%，大一档更好放',
    reasonLong: '清单含长件，大一档更好放'
  },
  advisor: {
    normal: { title: '需要顾问帮您确认方案？', sub: '协助确认仓位、费用及搬运安排' },
    big: { title: '可申请专属方案', sub: (cap, yuan) => cap + 'm³ 以上或整期满 ' + yuan + '，由顾问确认方案与价格' },
    leave: { title: '留下用仓需求', sub: '顾问电话与您确认可行的方案' },
    capHint: (cap) => '超过 ' + cap + 'm³ 可预约顾问协助，不影响自助找仓。'
  },
  lead: { inHours: '预计 10 分钟内与您联系', offHours: '已收到，顾问上班后将优先联系您', hoursNote: '服务时段：每日 9:00–20:00' },
  estore: {
    name: '考拉E存',
    list: { kicker: '上门取送', sub: '', link: '了解服务 ›' },
    match: { kicker: '另一种存储方式', sub: '按需存储 · 上门取送', link: '了解考拉E存 ›' },
    far: { kicker: '不方便到店', sub: '上门取送，不需要到店', link: '了解考拉E存 ›' }
  },
  need: {
    kicker: '找仓进度', title: '继续查看仓位', badge: '已保存需求', sub: '已估算用仓需求',
    capLabel: '预计容量', areaLabel: (m3) => '预计面积 · 约' + m3 + 'm³', termLabel: '租期',
    modify: '修改需求', view: '查看推荐仓位', stripTail: '，查看推荐仓位'
  },
  demand: {
    title: '修改需求', coldTitle: '填写需求', capLabel: '预计容量', termLabel: '租期',
    note: '估算值，以实际仓位为准', rangeNote: '可填 0.5m³–200㎡，估算值，以实际仓位为准',
    approx: (v) => '约 ' + v + ' m³', toEstimate: '不确定大小？去估算',
    cancel: '取消', update: '更新推荐', view: '查看推荐', viewStores: '查看门店',
    errCap: '请输入有效容量', errArea: '面积不能超过200㎡'
  },
  panel: {
    title: '用仓位置', placeholder: '搜索门店、商圈或区域', cancel: '取消',
    useCurrent: '使用当前位置', useCurrentSub: '开启定位后按距离排序', enable: '开启',
    current: '当前位置', relocate: '重新定位',
    recents: '最近使用', clear: '清除', city: '城市',
    byDistrict: (c) => c + ' · 按区域', byArea: (c) => c + ' · 按商圈', allAreas: (n) => '全部 ' + n + ' 个商圈',
    groupArea: '商圈与区域', groupStore: '门店',
    areaSub: (n) => '商圈 · ' + n + ' 家门店', districtSub: (n) => '区域 · ' + n + ' 家门店',
    noneTitle: (k) => '没有找到「' + k + '」相关的门店或商圈', noneSub: '目前可以搜索门店名、商圈、区域和门店所在小区。',
    areasWithStores: (c) => c + ' · 有门店的商圈', other: '其他方式',
    estoreSub: '上门取送，不需要到店', leave: '留下用仓需求', leaveSub: '顾问电话与您确认可行的方案',
    moveNote: '搬家用仓：搬出地、搬入地都可以查。先选一处，另一处会留在「最近使用」，可随时切换对比。',
    transportNote: '免费运输按用仓位置到门店的距离判断，请先选择用仓位置。',
    near: (district, area) => district + (area ? ' ' + area + '附近' : ''), allCity: '全城门店'
  },
  locate: {
    tip: '开启定位，查看离您近的门店', enable: '开启', goEnable: '去开启',
    systemOff: '手机定位未开启', howTo: '查看方法', timeout: '暂未获取到位置', retry: '重试',
    settingsTitle: '开启位置权限', settingsBody: '在小程序设置中，将「位置信息」改为「使用小程序时」。不开启也可以手动选择城市。',
    settingsNo: '暂不开启', settingsYes: '去设置',
    systemBody: '请在手机「设置」里打开定位服务，并允许微信使用位置信息，然后回到这里重试。不开启也可以手动选择城市。', // 自写：冻结稿只有按钮「查看方法」，没有画方法内容
    known: '知道了',
    located: (d) => '已定位到' + d,
    noStoreCity: (city, fallback) => city + '暂无门店，已为您显示' + fallback + '门店', switchCity: '切换城市'
  },
  home: {
    search: '搜索门店、商圈或区域',
    heroTitle: '让城市生活更轻松', heroSub: '家具、行李、闲置物品，找到附近适合的存储空间',
    findStores: '找附近门店', findSub: '查看门店与仓位', findLink: '查看门店 ›',
    estimate: '估大小算价格', estimateSub: '不知道租多大？', estimatedSub: '已估算用仓需求', estimateLink: '开始估算 ›',
    recommend: '为您推荐', allStores: '查看全部门店 ›', expand: '展开', collapse: '收起',
    scenes: '常见存储场景', sceneList: ['搬家过渡', '装修暂存', '行李寄存', '换季收纳', '兴趣收藏', '闲置物品'],
    business: { title: '企业存储', tag: '企业', sub: '灵活空间，满足商家备货与企业存储需求', link: '了解企业存储 ›' },
    proof: [{ n: '14年', t: '稳定运营' }, { n: '590+', t: '直营门店' }, { n: '30万+', t: '累计服务用户' }], // 口径待业务确认
    about: '了解迷你考拉仓 ›'
  },
  stores: {
    sort: '排序', sortOptions: { recommended: '综合排序', distance: '距离优先', price: '价格优先' },
    distance: '距离', within: (km) => km + 'km内', anyDistance: '不限距离',
    services: '服务', servicesOn: '已选服务', clearServices: '清空',
    promo: '特价仓', freeTransport: '免费运输',
    cancel: '取消', confirm: '确定',
    demandPrefix: '', modify: '修改 ›', unsure: '拿不准要多大空间？', estimateNow: '估算大小 ›',
    total: (n) => '共' + n + '家门店', shown: (n) => ' · 已显示前' + n + '家', inArea: (a) => a + ' · ',
    more: '查看更多门店', allStores: '查看全部门店',
    emptyTitle: '当前需求暂无可租仓位', emptySub: '可调整容量或租期，或由顾问协助寻找合适仓位',
    clearFilters: '清除筛选', helpFind: '顾问帮我找仓', browseFirst: '可先浏览附近门店', nearbyTitle: '附近门店',
    salesTitle: '30m³ 及以上的需求由顾问为您配置方案', salesCta: '提交给顾问',
    salesSub: (inHours) => '顾问会按物品与租期组合仓位并确认费用。提交后' + inHours,
    salesHours: (note, off) => note + '；非服务时段提交的：' + off,
    farTitle: (km) => '附近 ' + km + 'km 内暂无门店', farSub: (n) => '以下是离您最近的 ' + n + ' 家'
  },
  detail: {
    hours: '存取时间：', tabs: ['可选仓位', '服务设施', '到店指引'], booking: '预约用仓',
    navigate: '到店导航', call: '电话', favorite: '收藏', share: '分享',
    favOn: '已收藏', favOff: '已取消收藏', // 自写：冻结稿没有画收藏后的提示
    demandPrefix: '', modify: '修改 ›', unsure: '拿不准要多大空间？', estimateNow: '估算大小 ›',
    goneTitle: '所选仓位已售出', goneSub: '该仓位刚被租出或已下架，请重新选择仓位。', consult: '立即咨询',
    noSingle: (v) => '本店没有不小于 ' + v + 'm³ 的单个仓位。',
    comboTitle: '组合方案', comboTag: (n) => n + ' 间组合', comboSub: (codes) => '一笔订单 · 同一门店 · ' + codes, showCombos: '查看组合仓位',
    nearTitle: '容量接近的仓位', smallTitle: '比需求小的仓位', rematch: (v) => '按 ' + v + 'm³ 重新匹配',
    soldFold: '查看已租出的仓位', soldOut: '已租出', notRentable: '暂不可租',
    catEmpty: '当前仓型暂无可租仓位。', allCats: '查看全部仓型',
    noMatchTitle: '本店暂无匹配仓位', noStockTitle: '本店暂无可租仓位', otherSub: '可查看其他门店的仓位', otherStores: '查看其他门店',
    salesTitle: '30m³ 及以上的需求由顾问为您配仓', salesSub: (inHours) => '提交后' + inHours + '。', modifyCap: '修改容量',
    altTitle: '其他匹配门店和仓位', altCombo: ' · 组合方案', altView: '查看匹配方案', altNone: '当前没有满足容量的可用方案。可联系顾问协助',
    svc: {
      access: '存取与安防', hours: '存取时间', daily: '，每日', entry: '进门方式', entryText: '一键开锁（暂未开通），租后在「我的仓位」操作',
      security: '安防', securityText: '全天监控，独立门锁', env: '仓内环境', climate: '控温防潮', climateText: '仓区恒温除湿',
      move: '到店与搬运', seeRoute: '看路线', lift: '电梯', cart: '推车', dock: '装卸区域', park: '停车', metro: '地铁',
      transport: '预约运输 / 搬运', transportSub: '下单前可预约，由顾问电话确认，不计入本次应付',
      securityTags: ['全天监控', '独立安防'], climateTag: '控温防潮'
    },
    route: {
      map: '位置示意', copy: '复制地址', copied: '地址已复制', // 「地址已复制」自写
      entry: '入口与停车卸货', path: '进仓路径', transit: '地铁与公交', moreTransit: '其他到店方式',
      ask: '对到店方式有疑问？', askPartial: '停车、卸货和进仓路径可向门店确认', askBtn: '咨询到店方式',
      mapFail: '地图暂时无法加载', reload: '重新加载',
      destTitle: '导航到哪个入口', destNote: '选择后打开地图导航', storePin: '门店位置',
      navFail: '暂时无法打开地图，地址已复制，可在地图应用中搜索', // 自写：冻结稿没有画导航失败
      callFail: '暂时无法拨号，客服电话 ' // 自写：冻结稿没有画拨号失败
    }
  },
  match: {
    needTitle: '您的用仓需求', modify: '修改', origin: '用仓位置', approx: (v) => '约' + v + 'm³',
    recommendN: () => '为您推荐', recommending: '为您推荐门店', matching: '正在按容量与租期匹配',
    subNear: () => '为您找到以下容量接近的仓位', subExpanded: '已扩大范围', subCombo: '支持组合仓位',
    fromItems: (net, rec) => '按物品估算：物品约 ' + net + 'm³，留出码放空隙后建议 ' + rec + 'm³。下方是不小于 ' + rec + 'm³ 的仓位。',
    fromItemsTiny: (net) => '按物品估算：物品约 ' + net + 'm³，小于最小仓位，按 0.5m³ 为您匹配。', // 由物品页同句改写：冻结稿只在物品页画了这一句
    longNote: (names) => '清单含长件（' + names + '），请对照仓位的长宽高。',
    noneTitle: '暂无匹配的仓位', noneSub: () => '当前没有满足容量的可用方案。可联系顾问协助',
    allCity: '查看全城门店', modifyCap: '修改容量',
    goneTitle: '所选仓位已售出', goneSub: '该仓位刚被租出或已下架，请重新选择仓位。', consult: '立即咨询',
    salesTitle: '30m³ 及以上的需求由顾问为您配仓',
    salesSub: '提交后预计 10 分钟内与您联系。非服务时段提交的，顾问上班后将优先联系您。',
    fees: {
      title: '费用明细', rent: '整期租金', saved: '已省', savedSub: (yuan) => '较月基价 ' + yuan + '/月',
      full: '满额减', fullSub: (yuan) => '整期满 ' + yuan, afterFull: (yuan) => '减后整期租金 ' + yuan,
      coupon: '优惠券', couponNone: '暂无适用优惠', deposit: '押金', depositSub: '1个月月租', depositSubCombo: '各仓月租合计',
      fee: '整单管理费', payable: '本次应付', ok: '知道了', formula: (yuan, m) => yuan + '/月 × ' + m + '个月',
      failed: '费用明细暂时无法获取，请稍后重试' // 自写
    }
  },
  cap: {
    title: '您需要多大空间？', placeholderM3: '如 3', placeholderM2: '如 2',
    approx: (v) => '约 ' + v + ' m³',
    cartons: (n) => '全放标准纸箱约 ' + n + ' 箱', seeRef: ' · 看示意', unsure: '不确定多大？', byItems: '按物品估算 ›',
    fromItems: (v, kinds, count) => '按物品估算 ' + v + 'm³ · ' + kinds + ' 种 ' + count + ' 件', editList: '修改清单 ›',
    edited: (v) => '已改为手动填写 · 物品估算为 ' + v + 'm³', restore: '恢复',
    term: '租期', advisor: '顾问协助', ai: 'AI估算', aiOff: '暂未开放', aiToast: 'AI 估算暂未开放，可按物品估算或直接填写容量',
    salesTitle: '30m³ 及以上由顾问为您配仓',
    salesIn: '提交后预计 10 分钟内与您联系。', salesOff: '提交后顾问上班将优先联系您。服务时段：每日 9:00–20:00', // salesOff 为任务书 §6 第 7 项自定句
    hintTitle: '需要顾问帮您确认方案？',
    ref: '空间参考', refFits: ' 大致能放', refWithin: (b) => b + 'm³ 以内', refOver: (a) => a + 'm³ 以上', refRange: (a, b) => a + '–' + b + 'm³',
    refEmpty: '填写容量，参考空间',
    sumSales: ' · 由顾问配仓', needFill: '还需填写容量', needFixCap: '还需修改容量', needFixArea: '还需修改面积', dash: '—',
    submit: '查看仓位报价', toAdvisor: '提交给顾问',
    // 说明：冻结稿的容量错误句是「请输入有效容量」；tests/flow.test.js 仍锁定旧句，改测试后把下面三项换成 demand.errCap
    err: { min: '请输入有效容量', decimals_m3: '请输入有效容量', format: '请输入数字', range: '面积不能超过200㎡', decimals_m2: '面积不能超过200㎡' }
  },
  items: {
    toCap: '直接填容量', advisor: '顾问协助', ai: 'AI 估算 · 暂未开放', aiToast: 'AI 估算暂未开放，可按物品估算或直接填写容量',
    byItem: '按物品分类', byScene: '按场景分类', all: '全部物品', count: (n) => n + '项', result: '搜索结果',
    search: '搜索物品名称',
    selected: (kinds, count) => '已选 ' + kinds + ' 种、' + count + ' 件 · 查看清单 ›',
    longHint: (names) => '含长件：' + names + '。选仓时请对照仓位的长宽高。',
    variant: (name) => '规格 · ' + name, per: (v, u) => '约 ' + v + 'm³/' + u, subtotal: (v) => '小计 ' + v + 'm³',
    estNote: (net, rec) => '建议 ' + rec + 'm³',
    tinyNote: () => '建议 0.5m³',
    biz: { title: '商家 / 企业用仓', sub: '为满足企业客户多样化用仓需求，可预约咨询专属配仓顾问', btn: '立即提交' },
    none: { title: '没有找到相关物品', sub: '可换个名称，或选一件大小相近的物品代替', all: '查看全部物品', toCap: '直接填写容量', advisor: '顾问协助' },
    footNone: '还没有选择物品', footNet: (net, count) => '物品约 ' + net + 'm³ · ' + count + ' 件',
    suggest: (v) => '建议 ' + v + 'm³', tiny: '按 0.5m³ 匹配', zero: '0m³',
    pickFirst: '请先选物品', submit: '查看仓位报价', toAdvisor: '提交给顾问',
    cart: {
      title: (kinds, count) => '已选物品（' + kinds + '种，共' + count + '件）', clear: '清空', del: '删除',
      line: (variant, count, v) => variant + ' · ' + count + '件 · 约' + v + 'm³', empty: '暂未添加物品，关闭后可继续选择。',
      total: '建议容量', totalSub: (net) => '物品合计约 ' + net + 'm³，留出码放空隙后的建议值', done: '完成'
    },
    clearTitle: '清空已选物品？', clearBody: '会删除当前选择的物品与数量。', clearYes: '清空', cancel: '取消', confirm: '确定',
    variantTitle: '选择规格', variantNote: (name) => name + ' · 换规格后数量不变，小计按新规格计算。', variantPer: (v) => '约 ' + v + 'm³/件',
    qtyTitle: '填写数量', qtyQuick: (n) => n + ' 件', qtyMax: (n) => '单种物品最多填 ' + n + ' 件，更多请交给顾问配仓',
    termTitle: '租期', restored: '已保留上次选择的物品，可继续增减',
    abbr: { suitcase: '箱', furniture: '家', electric: '电', organize: '收', hobby: '藏', business: '商', office: '办', other: '物' }
  }
};
