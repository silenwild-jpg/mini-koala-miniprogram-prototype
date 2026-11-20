// 价格：¥ + 数字 + 单位 + 折扣 / 特价仓标签。金额千分位在这里统一处理。size: sm | md | lg；weak = 门店详情店名右侧的弱化显示（D-138）。
Component({
  options: { addGlobalClass: true },
  properties: { amount: { type: Number, value: 0 }, unit: { type: String, value: '' }, size: { type: String, value: 'md' }, discount: { type: String, value: '' }, weak: { type: Boolean, value: false } },
  observers: { amount(v) { this.setData({ text: String(Math.round(Number(v) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }); } },
  data: { text: '0' }
});
