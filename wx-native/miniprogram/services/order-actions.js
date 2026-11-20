// 订单相关的几个通用动作（W34 交易域）：门店导航、联系门店、一键开锁提示。任务卡与订单详情共用。
const CT = require('../core/config-trade');
const T = require('../i18n/trade');
const toast = (title) => wx.showToast({ title, icon: 'none', duration: 2500 });
// 门店导航：门店数据带坐标时打开地图；演示数据没有坐标，改为复制地址（等门店坐标数据，交接 v1.0 §9「等外部接入：地图」）
function navigate(store) {
  if (!store) return;
  const lat = Number(store.latitude), lng = Number(store.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) {
    wx.openLocation({ latitude: lat, longitude: lng, name: store.name || '', address: store.address || '', fail() { copyAddress(store); } });
    return;
  }
  copyAddress(store);
}
function copyAddress(store) { wx.setClipboardData({ data: String(store.address || store.name || ''), success() { toast(T.order.navCopied); }, fail() {} }); }
// 联系门店：门店没有电话时拨客服电话
function call(store) { wx.makePhoneCall({ phoneNumber: String((store && store.phone) || CT.hotline).replace(/-/g, ''), fail() {} }); }
function callService() { wx.makePhoneCall({ phoneNumber: CT.hotline.replace(/-/g, ''), fail() {} }); }
// 开锁未接入（D-151、D-175）：按钮文字不变，点击只提示
function unlock() { toast(T.order.unlockToast); }
// 每秒刷新用的定时器。小程序里 setInterval 返回数字；在 Node 测试环境里返回对象，unref 后不会拖住进程退出。
function every(fn, ms) { const t = setInterval(fn, ms); if (t && typeof t.unref === 'function') t.unref(); return t; }
module.exports = { navigate, call, callService, unlock, toast, every };
