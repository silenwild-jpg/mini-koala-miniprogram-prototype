const log = require('../../utils/log');
const env = require('../../utils/env');
const cases = require('../../utils/cases');

const WORD = { pass: '通过', fail: '不通过', na: '测不了', '': '未测' };

function build() {
  const e = env.collect();
  const v = log.verdicts();
  const rows = cases.map((c) => {
    const s = v[c.id] || {};
    return { id: c.id, title: c.title, v: s.v || '', word: WORD[s.v || ''], note: s.note || '' };
  });
  const count = { pass: 0, fail: 0, na: 0, none: 0 };
  rows.forEach((r) => { count[r.v || 'none'] += 1; });
  return { e: e, rows: rows, count: count, logs: log.logs() };
}

function toText(d) {
  const e = d.e;
  const lines = [];
  lines.push('【迷你考拉仓 真机探针结果】');
  lines.push('机型：' + e.brand + ' ' + e.model + '｜系统：' + e.system);
  lines.push('微信：' + e.wechat + '｜基础库：' + e.sdk + '｜版本：' + (e.envVersion || '-') + '｜AppID：' + (e.appId || '-'));
  lines.push('状态栏 ' + e.statusBarHeight + '｜胶囊 上' + e.menu.top + ' 左' + e.menu.left + ' 宽' + e.menu.width + ' 高' + e.menu.height + '｜底部安全区 ' + e.safeBottomInset + '｜窗口 ' + e.window + '｜字号 ' + e.fontSizeSetting);
  lines.push('合计：通过 ' + d.count.pass + '，不通过 ' + d.count.fail + '，测不了 ' + d.count.na + '，未测 ' + d.count.none);
  lines.push('');
  lines.push('【人工判断】');
  d.rows.forEach((r) => { lines.push(r.id + ' ' + r.word + (r.note ? '｜' + r.note : '')); });
  lines.push('');
  lines.push('【接口记录】');
  d.logs.forEach((l) => { lines.push(l.t + ' ' + l.id + ' ' + l.action + (l.data ? ' ' + JSON.stringify(l.data) : '')); });
  return lines.join('\n');
}

Page({
  data: { rows: [], count: { pass: 0, fail: 0, na: 0, none: 0 }, logN: 0, tail: [] },

  onShow() { this.refresh(); },

  refresh() {
    const d = build();
    this.cache = d;
    const tail = d.logs.slice(-12).reverse().map((l, i) => ({ k: i, line: l.t + ' ' + l.id + ' ' + l.action }));
    this.setData({ rows: d.rows, count: d.count, logN: d.logs.length, tail: tail });
  },

  onCopy() {
    wx.setClipboardData({ data: toText(this.cache || build()) });
  },

  onClear() {
    wx.showModal({
      title: '清空本机记录',
      content: '换下一台手机前不需要清空；只有要在同一台手机上重测时才清。',
      confirmText: '清空',
      success: (res) => { if (res.confirm) { log.clearAll(); this.refresh(); } }
    });
  }
});
