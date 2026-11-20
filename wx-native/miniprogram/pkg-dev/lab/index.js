// 演示工具（仅演示数据下可达，正式提审前由 config.DEMO_TOOLS 关闭）：
// 1) 切换演示场景：一键变成某类用户；2) 切换网络档位：让加载态、失败态真实出现；
// 3) 组件校准：把按钮、标签、文字角色、颜色、图标集中在一页，供微信开发者工具和真机一次截图核对。
const demo = require('../../services/demo');
const ICONS = require('./icons');
const L = {
  sceneTitle: '演示场景', sceneTip: '切换后登录态、定位、需求和订单一起重置，只影响本机演示数据。', netTitle: '网络档位', calibTitle: '组件校准',
  goHome: '回首页查看', applied: '已切换：', on: '当前',
  btn: '按钮', tag: '标签与选项', text: '文字角色', color: '颜色', icon: '图标', form: '输入框',
  btns: [{ m: '', t: '主按钮 通栏' }, { m: 'mk-btn--ghost', t: '次按钮 通栏' }, { m: 'mk-btn--disabled', t: '不可用' }],
  btnRow: [{ m: 'mk-btn--md', t: '中按钮' }, { m: 'mk-btn--sm', t: '小按钮' }, { m: 'mk-btn--sm mk-btn--ghost', t: '小次按钮' }],
  bare: '文字按钮',
  tags: [{ c: 'mk-tag', t: '近地铁' }, { c: 'mk-tag mk-tag--brand', t: '距离最近' }, { c: 'mk-tag mk-tag--promo', t: '特价仓' }, { c: 'mk-tag mk-tag--error', t: '已逾期' }],
  chips: [{ c: 'mk-chip', t: '6个月' }, { c: 'mk-chip mk-chip--on', t: '12个月' }],
  texts: [{ c: 'mk-t-display', t: '大标题 24', s: 'mk-t-display' }, { c: 'mk-h2', t: '页面标题 18', s: 'mk-h2' }, { c: 'mk-t-title', t: '卡片标题 16', s: 'mk-t-title' }, { c: 'mk-t-body', t: '正文 14：家具、行李、闲置物品', s: 'mk-t-body' }, { c: 'mk-t-caption', t: '次级说明 13：存取时间 09:00-21:00', s: 'mk-t-caption / mk-sub' }, { c: 'mk-t-hint', t: '辅助说明 12：价格以下单页为准', s: 'mk-t-hint / mk-mute' }, { c: 'mk-t-hint mk-t-off', t: '占位与禁用 12：请输入手机号', s: 'mk-t-off' }],
  price: { cur: '¥', n: '1,680', u: '/月' },
  colors: [['brand-fill', '#14AE68'], ['action-primaryFill', '#0B7A48'], ['brand-tint', '#E6F6EE'], ['canvas-sunken', '#F5F7F6'], ['ink-primary', '#1F2A24'], ['ink-secondary', '#5F6B65'], ['ink-hint', '#66716B'], ['ink-tertiary', '#8A948F'], ['line-hairline', '#E3E8E5'], ['accent-promoFill', '#FFF1E6'], ['accent-promoText', '#B4530A'], ['status-errorText', '#B42318']],
  placeholder: '请输入手机号', error: '请输入 11 位手机号'
};
Page({
  data: { L, scenes: [], nets: [], cur: {}, icons: ICONS.map((s) => ({ s, src: '/assets/icons/' + s + '.svg' })), colors: L.colors.map((c) => ({ k: c[0], hex: c[1], bg: 'background: var(--mk-color-' + c[0] + ')' })) },
  onLoad() { if (!demo.enabled()) { wx.navigateBack({ delta: 1 }); return; } this.sync(); },
  sync() { const cur = demo.current(); this.setData({ cur, scenes: demo.LIST.map((x) => Object.assign({ on: x.id === cur.scenario }, x)), nets: demo.NET.map((x) => Object.assign({ on: x.id === cur.net }, x)) }); },
  onScene(e) { const sc = demo.applyScenario(e.currentTarget.dataset.id); if (sc) wx.showToast({ title: L.applied + sc.name, icon: 'none' }); this.sync(); },
  onNet(e) { demo.setNet(e.currentTarget.dataset.id); this.sync(); },
  onHome() { wx.reLaunch({ url: '/pages/home/index' }); }
});
