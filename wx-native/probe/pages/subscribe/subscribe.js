const log = require('../../utils/log');
const config = require('../../config');

function ids() {
  const t = config.tmplIds || {};
  return [t.booking, t.renewal, t.inspect, t.expire].filter((x) => !!x);
}

// 支付参数：没配置时用无效参数，只能看「调用有没有被拦」，得不出支付结论。
function payParams() {
  return config.payParams || { timeStamp: '0', nonceStr: 'probe', package: 'prepay_id=probe', signType: 'RSA', paySign: 'probe' };
}

Page({
  data: { n: 0, hasPay: false, o1: '', o2: '', o3: '' },

  onLoad() { this.setData({ n: ids().length, hasPay: !!config.payParams }); },

  out(key, obj) { const d = {}; d[key] = JSON.stringify(obj, null, 1); this.setData(d); },

  subscribe(tmplIds, caseId, action, key, done) {
    if (!tmplIds.length) {
      const r = { 结果: '未配置模板 ID，没有调用' };
      log.record(caseId, action, r); this.out(key, r); if (typeof done === 'function') done(r);
      return;
    }
    const t0 = Date.now();
    wx.requestSubscribeMessage({
      tmplIds: tmplIds,
      success: (res) => {
        const r = { 结果: '面板已返回', 耗时ms: Date.now() - t0, 选择: tmplIds.map((id) => res[id]) };
        log.record(caseId, action, r); this.out(key, r); if (typeof done === 'function') done(r);
      },
      fail: (err) => {
        const r = Object.assign({ 结果: '调用失败', 耗时ms: Date.now() - t0 }, log.brief(err));
        log.record(caseId, action, r); this.out(key, r); if (typeof done === 'function') done(r);
      }
    });
  },

  // E1：单个模板、全部模板
  onOne() { this.subscribe(ids().slice(0, 1), 'E1', '订阅 1 个模板', 'o1'); },
  onAll() { this.subscribe(ids(), 'E1', '一次订阅 ' + ids().length + ' 个模板', 'o1'); },

  // E2：订阅消息总开关、各模板「总是保持」的记录
  onSetting() {
    wx.getSetting({
      withSubscriptions: true,
      success: (res) => {
        const s = res.subscriptionsSetting || {};
        const r = { 总开关: s.mainSwitch, 已保持选择的模板数: s.itemSettings ? Object.keys(s.itemSettings).length : 0 };
        log.record('E2', '订阅设置', r); this.out('o2', r);
      }
    });
  },

  // D8-a：先订阅，面板关闭后在回调里调起支付（同一次点按）
  onSubThenPay() {
    this.subscribe(ids().slice(-1), 'D8', 'a 先订阅', 'o3', (sub) => {
      wx.requestPayment(Object.assign({}, payParams(), {
        complete: (res) => {
          const r = { 顺序: '先订阅后支付', 订阅: sub, 支付: log.brief(res) };
          log.record('D8', 'a 订阅回调里调起支付', r); this.out('o3', r);
        }
      }));
    });
  },

  // D8-b：先支付，在支付回调里调起订阅（官方文档写明「发起支付回调后」可以调起订阅界面）
  onPayThenSub() {
    wx.requestPayment(Object.assign({}, payParams(), {
      complete: (pay) => {
        const p = log.brief(pay);
        log.record('D8', 'b 先支付', p);
        this.subscribe(ids().slice(-1), 'D8', 'b 支付回调里调起订阅', 'o3', (sub) => {
          this.out('o3', { 顺序: '先支付后订阅', 支付: p, 订阅: sub });
        });
      }
    }));
  },

  // D8-c：对照——不在点按里调用（延迟 2 秒），预期被拦
  onDelayed() {
    this.out('o3', { 结果: '2 秒后调用…' });
    setTimeout(() => this.subscribe(ids().slice(-1), 'D8', 'c 对照：延迟 2 秒后订阅', 'o3'), 2000);
  }
});
