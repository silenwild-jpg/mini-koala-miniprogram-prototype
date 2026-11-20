// 自定义导航栏（首页用）：状态栏高度和胶囊位置运行时取，不写死设计稿的 44px。
const env = require('../../utils/env');

Component({
  properties: { city: { type: String, value: '北京' }, dot: { type: Boolean, value: false } },
  data: { status: 20, barHeight: 44, total: 64, rightInset: 104, menuOk: true },
  lifetimes: {
    attached() {
      const m = env.navMetrics();
      this.setData(m);
      this.triggerEvent('measure', m);
    }
  },
  methods: {
    onCity() { this.triggerEvent('city'); },
    onSearch() { this.triggerEvent('search'); }
  }
});
