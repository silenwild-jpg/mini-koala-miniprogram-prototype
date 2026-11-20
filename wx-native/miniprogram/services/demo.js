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
  if (sc.favorites) state.set('favorites', { stores: sc.favorites.stores.slice(), units: sc.favorites.units.slice() });
  return sc;
}
function setNet(id) { if (scenarios.NET.some((x) => x.id === id)) scenarios.write({ net: id }); return scenarios.net(); }
function setStock(id) { if (enabled() && scenarios.STOCK.some((x) => x.id === id)) scenarios.write({ stock: id }); return scenarios.stock(); }
function toggleEvent(id) { if (!enabled()) return false; const on = !scenarios.eventOn(id); scenarios.setEvent(id, on); return on; }
const current = () => ({ scenario: (scenarios.scenario() || {}).id || '', net: scenarios.net().id, stock: scenarios.stock().id, events: Object.assign({}, scenarios.read().events) });
module.exports = { ROUTE, enabled, applyScenario, setNet, setStock, toggleEvent, current, LIST: scenarios.LIST, NET: scenarios.NET, STOCK: scenarios.STOCK, EVENTS: scenarios.EVENTS };
