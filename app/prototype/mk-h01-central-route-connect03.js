/* BR01-H01-CONNECT-03: isolated H01 route registry; no side effects until explicitly called. */
(function(global) {
  'use strict';
  const routes = Object.freeze({
    S01: 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
    CAP: 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
    S02: 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'
  });
  const normalized = value => String(value == null ? '' : value).trim();
  function resolve(page, payload, options) {
    const key = normalized(page);
    const data = payload || {};
    const settings = options || {};
    if (key === 'BOOKING' || key === 'QUICK_ORDER') return { status:'unbound', page:key, reason:'central-handler-unverified' };
    if (!Object.prototype.hasOwnProperty.call(routes, key)) return { status:'unsupported', page:key };
    let destination = key;
    const args = new URLSearchParams();
    args.set('source','H01');
    const city = normalized(data.city);
    if (city) args.set('city',city);
    const query = normalized(data.query);
    if (query && key === 'S01') args.set('query',query);
    if (key === 'S02') {
      const storeId = normalized(data.storeId);
      const approvedIds = settings.approvedStoreIds;
      if (!storeId || !Array.isArray(approvedIds) || !approvedIds.includes(storeId)) {
        destination='S01';
        args.set('fromDemoStore','1');
      } else args.set('store',storeId);
    }
    return { status:'resolved', page:destination, url: routes[destination] + '?' + args.toString() };
  }
  global.MK_H01_CENTRAL_ROUTE = Object.freeze({resolve, routes});
})(window);
