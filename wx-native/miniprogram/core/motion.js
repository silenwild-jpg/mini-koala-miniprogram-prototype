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
module.exports = { bump, dispose };
