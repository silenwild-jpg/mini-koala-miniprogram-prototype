const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const prototype = path.resolve(__dirname, '..', 'prototype');
const values = new Map();
const storage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
  clear: () => values.clear()
};
const location = {href: 'http://demo.local/prototype/product_demo_hub_v1.html', search: '', pathname: '/prototype/product_demo_hub_v1.html'};
const window = {};
const listeners = {};
const document = {
  readyState: 'loading',
  addEventListener: (type, listener) => { (listeners[type] ||= []).push(listener); },
  scripts: [],
  head: {appendChild: () => {}},
  getElementById: () => null,
  querySelector: () => null,
  createElement: () => ({})
};
const context = {window, document, location, localStorage: storage, sessionStorage: storage,
  URL, URLSearchParams, Date, console};
vm.createContext(context);
for (const name of ['mini_storage_business_ssot_v274.js', 'mini_storage_demo_fixture_v2.js', 'mini_storage_coupon_benefit_v1.js', 'mini_koala_internal_demo_v1.js']) {
  vm.runInContext(fs.readFileSync(path.join(prototype, name), 'utf8'), context, {filename: name});
}
const D = window.MINI_KOALA_DEMO_V2;
const C = window.MINI_KOALA_COUPON_V1;
const I = window.MINI_KOALA_INTERNAL_DEMO_V1;
const read = key => JSON.parse(storage.getItem(key) || 'null');

I.startStory('coupon');
I.goStep('coupon', 3);
const quoted = read(D.K.quote);
assert.equal(quoted.upfront_payable, 3863);
assert.equal(quoted.coupon_id, 'CPN-001');
assert.equal(read(D.K.price).upfront_payable, quoted.upfront_payable);
I.goStep('coupon', 4);
const ordered = read(D.K.quote);
assert.equal(ordered.quote_id, quoted.quote_id);
assert.equal(ordered.upfront_payable, 3863);
assert.equal(ordered.coupon_id, 'CPN-001');
I.goStep('coupon', 5);
assert.equal(read(D.K.order).payable_total, 3863);
assert.equal(read(D.K.quote).upfront_payable, 3863);
assert.deepEqual(read(D.K.pay) || [], []);
assert.equal(read('mini_storage_payment_result_current').status, 'PAID');
const paid = {...read(D.K.order), status: 'PAID', payment_status: 'PAID', paid_total: 3863};
const repo = window.MINI_STORAGE_REPO_V242;
repo.saveCurrent(paid);
repo.ensureInitialPayment(paid);
location.pathname = '/prototype/mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html';
listeners.DOMContentLoaded.forEach(listener => listener());
const payment = repo.getPayments().find(row => row.order_no === paid.order_no);
assert.equal(payment.amount, 3863);
assert.equal(payment.breakdown.rent, 3240);
assert.equal(payment.breakdown.rent_before_coupon, 3440);
assert.equal(payment.breakdown.coupon_discount_amount, 200);
assert.equal(payment.breakdown.rent + payment.breakdown.deposit + payment.breakdown.management_fee, payment.amount);
assert.equal(C.wallet().find(row => row.user_coupon_id === paid.user_coupon_id).status, 'REDEEMED');

I.startStory('exception');
I.goStep('exception', 2);
assert.equal(read(D.K.order).payable_total, 3863);
assert.deepEqual(read(D.K.pay) || [], []);
assert.equal(read('mini_storage_payment_result_current').status, 'PAYMENT_FAILED');
I.goStep('exception', 3);
assert.deepEqual(read(D.K.pay) || [], []);
assert.equal(read('mini_storage_payment_result_current').status, 'INVENTORY_CHANGED');

I.startStory('coupon');
C.setSelection('none', null);
I.goStep('coupon', 3);
assert.equal(read(D.K.quote).upfront_payable, 4063);
assert.equal(read(D.K.quote).coupon_id, null);
I.goStep('coupon', 4);
assert.equal(read(D.K.quote).upfront_payable, 4063);
assert.equal(read(D.K.price).upfront_payable, 4063);

console.log('PASS Internal Demo Financial Consistency V1: quote/order/payment agree; no phantom payment; coupon choice persists');
