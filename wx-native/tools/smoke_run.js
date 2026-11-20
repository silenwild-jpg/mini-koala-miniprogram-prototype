// 冒烟运行：在 Node 里用假的 wx 加载每个页面和组件，把生命周期和每个处理函数各调一遍，
// 组合「已登录 / 未登录 × 有需求 / 无需求 × 接口成功 / 失败」，只为抓 JS 运行时错误。不能证明界面或微信接口行为正确。
// 组件里的内部函数 finish（参数是 Promise，不是事件）不在逐个调用之列，由 tests/flow.test.js 覆盖。
// 用法：node tools/smoke_run.js <miniprogram 目录>
const path = require('path'), fs = require('fs');
const root = path.resolve(process.argv[2]);
const env = require('./fake_wx').install(root);
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean); // 例：ONLY=pkg-trade,pages/orders 只跑这些前缀
const pick = (x) => !ONLY.length || ONLY.some((o) => x.indexOf(o) === 0);
const pages = app.pages.concat(...(app.subpackages || []).map((s) => s.pages.map((p) => s.root + '/' + p))).filter(pick);
const comps = fs.readdirSync(path.join(root, 'components')).map((d) => 'components/' + d + '/index').filter(pick);
const errors = []; let calls = 0;
process.on('unhandledRejection', (e) => errors.push('unhandledRejection: ' + (e && e.stack || JSON.stringify(e))));
const state = require(path.join(root, 'services/state'));
env.loadApp();
const ev = () => ({ detail: { value: '3.5', months: 6, id: 'SIM_BJ01', storeId: 'SIM_BJ01', unitId: 'SIM_BJ01_U03', cta: '立即下单', code: 'c' }, currentTarget: { dataset: { id: 'SIM_BJ01', i: 0, k: 'PROFILE', m: 6, v: 3, u: 'm2', city: '上海', larger: '0' } } });
const LIFE = ['onLoad', 'onShow', 'onReady', 'onHide', 'onUnload', 'data', 'options', 'route', 'setData'];
const wait = () => new Promise((r) => setTimeout(r, 15));
(async () => {
  for (const loggedIn of [false, true]) for (const need of [null, { capacity_m3: 3.5, input_unit: 'm3', input_value: 3.5, term_months: 6 }, { capacity_m3: 31, input_unit: 'm3', input_value: 31, term_months: 12 }]) for (const mode of ['ok', 'fail']) {
    for (const p of pages) {
      state.reset(); if (loggedIn) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 't' }); state.set('requirement', need); env.mode = mode;
      const tag = `${p} [${loggedIn ? '已登录' : '未登录'}/${need ? need.capacity_m3 : '无需求'}/${mode}]`;
      try {
        const inst = env.newPage(p, { id: 'SIM_BJ01', login: '1' }); await wait();
        if (inst.__blocked) continue;
        for (const k of Object.keys(inst)) { if (typeof inst[k] !== 'function' || LIFE.includes(k)) continue; try { inst[k](ev()); calls++; await wait(); } catch (e) { errors.push(tag + ' ' + k + ': ' + e.stack.split('\n').slice(0, 2).join(' ')); } }
        if (inst.onHide) inst.onHide();
      } catch (e) { errors.push(tag + ' 加载: ' + e.stack.split('\n').slice(0, 3).join(' ')); }
    }
  }
  for (const mode of ['ok', 'fail']) for (const c of comps) {
    env.mode = mode; state.reset();
    try {
      const card = { id: 'SIM_BJ01', row: { id: 'u', cta: '查看报价' }, larger: { id: 'u2', cta: '查看报价' } };
      const inst = env.newComponent(c, { visible: true, card, value: 18, amount: 1680 });
      inst.setData({ visible: true, value: 12, amount: 3120, phone: '13800008000', code: '123456', agreed: mode === 'ok' });
      for (const k of Object.keys(inst)) { if (typeof inst[k] !== 'function' || ['setData', 'triggerEvent', '__detach', 'finish'].includes(k)) continue; try { inst[k](ev()); calls++; await wait(); } catch (e) { errors.push(c + ' ' + k + ': ' + e.stack.split('\n').slice(0, 2).join(' ')); } }
      inst.__detach();
    } catch (e) { errors.push(c + ' 加载: ' + e.stack.split('\n').slice(0, 3).join(' ')); }
  }
  await wait();
  console.log(JSON.stringify({ pages: pages.length, components: comps.length, handler_calls: calls, errors: errors.length }));
  errors.slice(0, 200).forEach((e) => console.log(' -', e));
  process.exit(errors.length ? 1 : 0);
})();
