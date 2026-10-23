(function () {
  'use strict';
  const D = window.MINI_KOALA_DEMO_V2, C = window.MINI_KOALA_COUPON_V1;
  const key = 'mini_koala_prepay_qa_facts_v1';
  const traceKey = 'mini_koala_prepay_qa_seed_v1';
  function reset() { window.MINI_KOALA_INTERNAL_DEMO_V1.clearAll(); }
  function baseSnapshot(option) {
    const H = window.MINI_STORAGE_BUSINESS_HELPERS_V274, base = window.MINI_KOALA_DATA.positivePrice(option);
    const rent = H.contractRent(base, D.C.term, D.C.store_id), monthly = H.monthlyReference(base, D.C.term, D.C.store_id);
    return { ...D.priceSnapshot(), base_monthly_price: base, total_rent: rent, monthly_average: monthly, deposit: monthly,
      upfront_payable: rent + monthly + D.C.fee, rent_before_coupon: rent, rent_after_coupon: rent,
      actual_unit_id: option.id, unit_id: option.id, representative_unit_no: option.id, size_option_id: option.size_option_id, volume_exact_m3: option.v };
  }
  function put(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function pending(snapshot, no) {
    return { order_no: no, status: 'PENDING_PAYMENT', payment_status: 'NOT_PAID', store_id: snapshot.store_id,
      unit_id: snapshot.unit_id, actual_unit_id: snapshot.actual_unit_id, size_option_id: snapshot.size_option_id,
      volume: snapshot.volume_exact_m3, term_months: snapshot.term_months, monthly_price: snapshot.monthly_average,
      total_price: snapshot.total_rent, deposit_amount: snapshot.deposit, management_fee: snapshot.management_fee,
      coupon_id: snapshot.coupon_id, user_coupon_id: snapshot.user_coupon_id, coupon_discount_amount: snapshot.coupon_discount_amount,
      payable_total: snapshot.upfront_payable, price_snapshot: snapshot, created_at: new Date().toISOString() };
  }
  function unitUrl(snapshot) {
    return D.P.U01 + '?' + new URLSearchParams({ store: snapshot.store_id, unit: snapshot.unit_id,
      actualUnit: snapshot.actual_unit_id, representativeUnit: snapshot.representative_unit_no,
      sizeOption: snapshot.size_option_id, target: String(D.C.target), term: String(snapshot.term_months), source: 'prepay_qa' });
  }
  function seed(kind) {
    reset(); D.seed('estimated'); C.ensureAcquisitionWallet(); C.setSelection('none', null);
    const option = window.MINI_KOALA_DATA.getLegacyUnits(D.C.store_id).find(x => x.size_option_id === D.C.size_option_id);
    let snap = baseSnapshot(option); put(D.K.price, snap);
    const trace = { source: 'PREPAY_QA_CONSOLE', scenario: kind, created_at: new Date().toISOString(), original_snapshot: snap };
    let url;
    if (kind === 'price_change' || kind === 'stock_change') {
      const order = pending(snap, 'O-QA-' + kind.toUpperCase()); put(D.K.order, order); put(D.K.hist, [order]);
      sessionStorage.setItem(key, JSON.stringify({ version: 1, source: trace.source, kind, store_id: D.C.store_id,
        size_option_id: D.C.size_option_id, created_at: Date.now() }));
      trace.original_option = { price: option.base, available_count: option.available_count }; trace.order_no = order.order_no;
      url = D.P.O01 + '?' + new URLSearchParams({ orderNo: order.order_no, store: snap.store_id, unit: snap.unit_id,
        representativeUnit: snap.unit_id, actualUnit: snap.actual_unit_id, sizeOption: snap.size_option_id,
        volume: String(D.C.volume), target: String(D.C.target), term: String(snap.term_months), source: 'prepay_qa' });
    } else {
      C.setSelection('auto', null);
      let rows = C.wallet(); const row = rows.find(x => x.coupon_id === 'CPN-001');
      if (kind.includes('locked')) {
        const own = kind === 'locked-own';
        row.status = 'LOCKED'; row.locked_order_id = own ? 'O-QA-LOCK-OWN' : 'O-QA-LOCK-OTHER';
        const other = window.MINI_KOALA_DATA.getLegacyUnits(D.C.store_id).find(x => x.available_count > 0 && x.size_option_id !== option.size_option_id);
        const owner = pending(own ? snap : baseSnapshot(other), row.locked_order_id);
        put(D.K.order, owner); put(D.K.hist, [owner]); trace.lock_owner = owner.order_no;
      }
      if (kind === 'art-expired') row.expire_time = new Date(Date.now() - 86400000).toISOString();
      if (kind === 'art-used') row.status = 'USED';
      if (kind === 'art-old' || kind === 'art-no-wallet') {
        put(D.K.hist, [{ ...pending(snap, 'O-QA-PRIOR-PAID'), status: 'PAID', payment_status: 'PAID', paid_total: snap.upfront_payable }]);
        if (kind === 'art-no-wallet') rows = [];
      }
      put(C.WALLET_KEY, rows);
      if (kind.includes('locked')) { const owner = JSON.parse(localStorage.getItem(D.K.order)); put(D.K.order, pending(C.applyToSnapshot(owner.price_snapshot), owner.order_no)); }
      snap = C.applyToSnapshot(snap); put(D.K.price, snap);
      if (kind === 'locked-own') { const order = pending(snap, row.locked_order_id); put(D.K.order, order); put(D.K.hist, [order]); }
      if (kind.startsWith('art-')) url = D.P.EST + '?' + new URLSearchParams({ entry: 'resume_recommend', target: String(D.C.target), term: '6', source: 'prepay_qa' });
      else { localStorage.setItem('mini_koala_coupon_return_href_v1', unitUrl(snap)); url = 'mini_storage_coupon_select_c02_v1.html'; }
    }
    sessionStorage.setItem(traceKey, JSON.stringify(trace)); location.href = url;
  }
  document.querySelectorAll('[data-qa]').forEach(button => button.onclick = () => seed(button.dataset.qa));
  document.getElementById('reset').onclick = () => { reset(); document.getElementById('status').textContent = '已清除QA会话事实与全部演示状态。'; };
})();
