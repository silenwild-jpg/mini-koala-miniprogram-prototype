// 数值变化反馈：给绑定了 class="{{key}}" 的元素重放一次 mk-bump 动画。
// 快速连点时每次都从头重放；页面卸载后的回调不再 setData。
const timers = new WeakMap();
function bump(ctx, key, cls) {
  if (!ctx || typeof ctx.setData !== 'function' || ctx.__mkGone) return;
  const name = cls || 'mk-bump';
  let map = timers.get(ctx); if (!map) { map = {}; timers.set(ctx, map); }
  if (map[key]) clearTimeout(map[key]);
  ctx.setData({ [key]: '' });
  map[key] = setTimeout(() => { map[key] = null; if (!ctx.__mkGone) ctx.setData({ [key]: name }); }, 20);
}
// 页面 onUnload / 组件 detached 里调用，之后的延时回调不再写数据。
function dispose(ctx) {
  if (!ctx) return; ctx.__mkGone = true;
  const map = timers.get(ctx); if (map) Object.keys(map).forEach((k) => { if (map[k]) clearTimeout(map[k]); map[k] = null; });
}
// 退场：wx:if 控制的面板、对话框关闭时先播退场再移除。
// 用法：WXML 里 wx:if="{{open}}"，面板 class 拼 {{openLeave}}（值为 '' 或 'mk-leave'，遮罩同理）；
// 关闭时不直接 setData({ open: false })，改成 motion.leave(this, 'open')。打开时照旧 setData({ open: true })（如有残留退场先 motion.cancelLeave(this, 'open')）。
// key 可以是任意真值字段（如 'drop' 的值是面板名）；offValue 是关闭后的值，默认 false。返回 Promise，移除后 resolve。
// 退场中再次调用同一个 key 不重复计时；页面卸载后不再 setData。时长取 config.motion.leaveMs。
function leave(ctx, key, offValue, extra) {
  const ms = require('./config').motion.leaveMs;
  return new Promise((resolve) => {
    if (!ctx || typeof ctx.setData !== 'function' || ctx.__mkGone) return resolve(false);
    let map = timers.get(ctx); if (!map) { map = {}; timers.set(ctx, map); }
    const tk = 'leave:' + key;
    if (map[tk]) return resolve(false);
    ctx.setData({ [key + 'Leave']: 'mk-leave' });
    map[tk] = setTimeout(() => {
      map[tk] = null; if (ctx.__mkGone) return resolve(false);
      ctx.setData(Object.assign({ [key]: offValue === undefined ? false : offValue, [key + 'Leave']: '' }, extra || {})); resolve(true);
    }, ms);
  });
}
// 退场途中又要打开同一个面板时调用：取消计时并清掉退场类。
function cancelLeave(ctx, key) {
  const map = ctx && timers.get(ctx); const tk = 'leave:' + key;
  if (map && map[tk]) { clearTimeout(map[tk]); map[tk] = null; }
  if (ctx && !ctx.__mkGone && ctx.data && ctx.data[key + 'Leave']) ctx.setData({ [key + 'Leave']: '' });
}
module.exports = { bump, dispose, leave, cancelLeave };
