// 演示工具服务：切换演示场景与网络档位。只在演示数据（config.DATA_SOURCE = 'mock'）且 DEMO_TOOLS 打开时可用。
const C = require('../core/config');
const state = require('./state');
const scenarios = require('../mock/scenarios');
const ROUTE = '/pkg-dev/lab/index';
const enabled = () => C.DATA_SOURCE === 'mock' && !!C.DEMO_TOOLS;
function applyScenario(id) {
  const sc = scenarios.LIST.find((x) => x.id === id);
  if (!sc || !enabled()) return null;
  scenarios.write({ scenario: sc.id });
  require('./mock-ext/_db').resetDb();
  state.reset();
  if (sc.login) state.setSession({ loggedIn: true, phoneMasked: '138****8000', token: 'demo' });
  if (sc.located) { state.patch('flags', { locationAsked: true }); state.patch('location', { status: 'granted' }); }
  if (sc.need) state.set('requirement', Object.assign({}, sc.need));
  return sc;
}
function setNet(id) { if (scenarios.NET.some((x) => x.id === id)) scenarios.write({ net: id }); return scenarios.net(); }
const current = () => ({ scenario: (scenarios.scenario() || {}).id || '', net: scenarios.net().id });
module.exports = { ROUTE, enabled, applyScenario, setNet, current, LIST: scenarios.LIST, NET: scenarios.NET };
