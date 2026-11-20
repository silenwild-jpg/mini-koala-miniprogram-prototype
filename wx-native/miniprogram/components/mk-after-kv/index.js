// 键值行列表。rows: [{ k, v, long（上下排）, soft（值用次要色）, strong, link（值后的链接文字）, key }]；点链接触发 link 事件，detail.key
Component({
  options: { addGlobalClass: true },
  properties: { rows: { type: Array, value: [] } },
  methods: { onLink(e) { this.triggerEvent('link', { key: e.currentTarget.dataset.key }); } }
});
