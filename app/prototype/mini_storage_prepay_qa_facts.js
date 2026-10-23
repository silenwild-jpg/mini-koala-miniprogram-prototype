// QA facts adapter. Normal sessions return before touching data or business helpers.
(function () {
  'use strict';
  const key = 'mini_koala_prepay_qa_facts_v1';
  let facts;
  try { facts = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return; }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)) return;
  if (!facts || facts.source !== 'PREPAY_QA_CONSOLE' || facts.version !== 1) return;
  const age = Date.now() - Number(facts.created_at);
  if (age < 0 || age > 30 * 60 * 1000) return;
  if (!['price_change', 'stock_change'].includes(facts.kind)) return;
  if (facts.store_id !== 'MK_BJ_2CDB7BEE' || facts.size_option_id !== 'MK_BJ_2CDB7BEE__4.72') return;
  const data = window.MINI_KOALA_DATA;
  const option = data?.getSizeOption(facts.store_id, facts.size_option_id);
  if (!option) return;
  const before = { price: data.positivePrice(option), available_count: option.available_count };
  if (facts.kind === 'price_change') {
    option.display_price_min = before.price + 120;
    option.display_price_max = Math.max(Number(option.display_price_max || 0), option.display_price_min);
  } else option.available_count = 0;
  window.MINI_KOALA_PREPAY_QA_FACTS = {
    kind: facts.kind, source: facts.source, before,
    after: { price: data.positivePrice(option), available_count: option.available_count },
    store_id: facts.store_id, size_option_id: facts.size_option_id
  };
})();
