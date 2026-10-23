"""H01-007-S2 (D-05 / D-06) real HTTP browser flows.

Serves the prototype over a local http.server and drives real page navigations in Chromium
(no DOM injection of business logic; only localStorage seeding + user-like clicks).

Usage:
  python qa/test_h01_007_s2_http_flows.py --out outputs/h01_007_s2/<label> [--root <package root>] [--port 4182] [--expect fixed|baseline]

Viewports: 375x812 and 390x844. Produces results.json, per-step screenshots and a console log.
Cases: FRESH, REPEAT, OWN_LOCK (back / 继续支付 / M01 resume, then pay), OTHER_LOCK, INVALID.
"""
import argparse, json, subprocess, sys, time, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_h01_007_s1_http_flows import Flow, free_port, qs, page_name, req, PAGES, REQ_KEY, ORDER_KEY, PRICE_KEY
from playwright.sync_api import sync_playwright

PAGES['C02'] = 'prototype/mini_storage_coupon_select_c02_v1.html'
WALLET_KEY = 'mini_koala_coupon_wallet_v1'
HIST_KEY = 'mini_storage_order_history_v242'
UNIT_A = ('jianguo', 'BJ0498S01B001')     # order A identity (same unit as S1)
UNIT_B = ('shuangjing', 'BJ0494S01D003')  # a different store for order B; 6-month rent ≈ ¥3,226 > ¥2,000 so only the lock can block CPN-001


def start_server(root, port):
    proc = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=root,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{port}/README_CURRENT.md', timeout=1); return proc
        except Exception:
            time.sleep(0.2)
    proc.kill(); raise SystemExit('http.server did not start')


def wallet(f):
    rows = f.ls(WALLET_KEY) or []
    return {r['coupon_id']: {k: r.get(k) for k in ['status', 'locked_order_id', 'redeemed_order_id', 'user_coupon_id']} for r in rows}


def u01(f, store, unit, term):
    f.goto('U01', f'unit={unit}&store={store}&target=5.0&term={term}&fromS01State=estimated'); f.page.wait_for_timeout(600)
    snap = f.ls(PRICE_KEY) or {}
    return {'panel': f.text('#couponU01PanelV1'), 'payable': f.text('#initialPayable'),
            'snapshot': {k: snap.get(k) for k in ['store_id', 'unit_id', 'term_months', 'total_rent', 'coupon_applied', 'coupon_id', 'coupon_discount_amount', 'coupon_customer_first_purchase', 'upfront_payable']}}


def c02_state(f):
    def cards(sel):
        return f.page.evaluate("s=>[...document.querySelectorAll(s+' .coupon-card')].map(c=>({name:c.querySelector('.coupon-card-name')?.textContent.trim(),desc:c.querySelector('.coupon-card-desc')?.textContent.trim(),btn:c.querySelector('.coupon-action')?.textContent.trim()||null}))", sel)
    return {'usable': cards('#usable'), 'unusable': cards('#unusable')}


def o01_state(f):
    return {'notice': f.text('#priceRecheckNotice'), 'coupon_row': f.text('#couponO01RowV1'), 'rentFee': f.text('#rentFee'), 'payableTotal': f.text('#payableTotal'),
            'pay_label': f.text('#pay'), 'pay_disabled': f.page.evaluate("()=>document.getElementById('pay')?.disabled"), 'gate': f.page.evaluate("()=>window.MINI_KOALA_PRICE_GATE_STATUS")}


def pay(f):
    # baseline mode may land on a gate-blocked O01 (pay disabled); record instead of hanging on a disabled button
    if f.page.evaluate("()=>!document.getElementById('pay')||document.getElementById('pay').disabled"): return False
    f.page.click('#pay'); f.page.wait_for_timeout(400)
    if f.page.query_selector('#phoneAuthSheet.show'):
        with f.page.expect_navigation(timeout=10000):
            f.page.click('#phoneAuthAllow')
    f.page.wait_for_timeout(600)


def order_brief(o):
    o = o or {}
    return {k: o.get(k) for k in ['order_no', 'status', 'payment_status', 'store_id', 'unit_id', 'term_months', 'total_price', 'payable_total', 'coupon_id', 'coupon_discount_amount', 'rent_after_coupon']}


def run_cases(ctx, base, out, vp, console):
    R = {}
    # ---------------- FRESH: true new customer, coupon applied end to end ----------------
    f = Flow(ctx, base, out, vp, console)
    f.goto('U01'); f.seed({REQ_KEY: req(6)})
    u = u01(f, *UNIT_A, 6); f.shot('FRESH_U01')
    url = f.click_nav('#confirm'); f.page.goto(url + '&demoAutoAgree=1', wait_until='load'); f.page.wait_for_timeout(500)
    o = o01_state(f); f.shot('FRESH_O01'); pay(f); f.shot('FRESH_O02')
    order_a = f.ls(ORDER_KEY) or {}
    R['FRESH'] = {'u01': u, 'o01': o, 'landing': page_name(f.page.url), 'o02_title': f.text('#statusTitle'), 'order': order_brief(order_a), 'wallet_after': wallet(f)}
    paid_order_a = dict(order_a); f.page.close()
    # ---------------- REPEAT: paid order A in history + new pending order B current ----------------
    f = Flow(ctx, base, out, vp, console)
    hist_a = {**paid_order_a, 'order_no': 'O-HIST-A-PAID'}
    pending_b = {'order_no': 'O-CUR-B-PENDING', 'status': 'PENDING_PAYMENT', 'payment_status': 'PAYING', 'store_id': UNIT_B[0], 'unit_id': UNIT_B[1], 'representative_unit_no': UNIT_B[1], 'size_option_id': 'MK_BJ_8D13DAA8__5.29', 'term_months': 6, 'volume': 5, 'created_at': '2026-10-13T01:00:00.000Z', 'updated_at': '2026-10-13T01:00:00.000Z'}
    fresh_wallet = [{'user_coupon_id': f'UC-{c}-SEED', 'coupon_id': c, 'status': 'CLAIMED', 'claim_time': '2026-10-13T00:00:00.000Z', 'expire_time': '2027-01-01T00:00:00.000Z', 'source': 'SEED'} for c in ['CPN-001', 'CPN-002', 'CPN-003']]
    f.goto('U01'); f.seed({REQ_KEY: req(6), HIST_KEY: [hist_a], ORDER_KEY: pending_b, WALLET_KEY: fresh_wallet})
    u = u01(f, *UNIT_A, 6); f.shot('REPEAT_U01')
    f.page.click('#couponChangeV1'); f.page.wait_for_timeout(500); c02 = c02_state(f); f.shot('REPEAT_C02'); f.page.click('#back'); f.page.wait_for_timeout(500)
    url = f.click_nav('#confirm'); f.page.goto(url + '&demoAutoAgree=1', wait_until='load'); f.page.wait_for_timeout(500)
    o = o01_state(f); f.shot('REPEAT_O01'); pay(f); f.shot('REPEAT_O02')
    R['REPEAT'] = {'u01': u, 'c02': c02, 'o01': o, 'landing': page_name(f.page.url), 'o02_title': f.text('#statusTitle'), 'order': order_brief(f.ls(ORDER_KEY)), 'wallet_after': wallet(f), 'history_len': len(f.ls(HIST_KEY) or [])}
    f.page.close()
    # ---------------- OWN_LOCK: order A locks its coupon (payment pending), then comes back three ways and pays ----------------
    f = Flow(ctx, base, out, vp, console)
    f.goto('U01'); f.seed({REQ_KEY: req(6)})
    u = u01(f, *UNIT_A, 6)
    url = f.click_nav('#confirm'); f.page.goto(url + '&demoAutoAgree=1&review=1&simulatePayment=PENDING', wait_until='load'); f.page.wait_for_timeout(500)
    pay(f); f.shot('OWN_LOCK_O02_pending')
    order_pending = f.ls(ORDER_KEY) or {}; w_locked = wallet(f); o02_title = f.text('#statusTitle'); o02_primary = f.text('#primaryBtn')
    # (1) browser back to O01 (page reload of the same order URL)
    f.page.go_back(wait_until='load'); f.page.wait_for_timeout(600); back = o01_state(f); f.shot('OWN_LOCK_O01_after_back')
    # (2) O02 -> 继续支付
    f.page.go_forward(wait_until='load'); f.page.wait_for_timeout(400)
    url2 = f.click_nav('#primaryBtn'); f.page.wait_for_timeout(500); cont = o01_state(f); cont['query_orderNo'] = qs(url2).get('orderNo'); f.shot('OWN_LOCK_O01_after_continue')
    # (3) M01 -> 待支付订单 -> O01
    f.goto('M01'); f.page.wait_for_timeout(500); m01_card = f.text('#assetOrder'); f.shot('OWN_LOCK_M01')
    url3 = f.click_nav('#assetOrder') if f.page.query_selector('#assetOrder') else None
    f.page.wait_for_timeout(500); m01 = o01_state(f) if url3 and page_name(url3) == 'O01' else None; m01_landing = page_name(url3) if url3 else None; f.shot('OWN_LOCK_O01_after_M01')
    # C02 from the recovered O01? (O01 has no coupon entry) -> instead check C02 directly with the locked wallet
    f.goto('C02'); f.page.wait_for_timeout(400); c02 = c02_state(f); f.shot('OWN_LOCK_C02')
    # pay for real from the M01-recovered O01 (fall back to the continue URL)
    f.page.goto((url3 if url3 and page_name(url3) == 'O01' else url2).replace('&review=1', '') + '&demoAutoAgree=1', wait_until='load'); f.page.wait_for_timeout(500)
    final_o01 = o01_state(f); pay(f); f.shot('OWN_LOCK_O02_paid')
    R['OWN_LOCK'] = {'u01': u, 'pending_order': order_brief(order_pending), 'o02_pending_title': o02_title, 'o02_primary': o02_primary, 'wallet_locked': w_locked,
                     'o01_after_back': back, 'o01_after_continue': cont, 'm01_card': m01_card, 'm01_landing': m01_landing, 'o01_after_m01': m01, 'c02_with_own_lock': c02,
                     'o01_before_final_pay': final_o01, 'landing': page_name(f.page.url), 'o02_title': f.text('#statusTitle'), 'order': order_brief(f.ls(ORDER_KEY)), 'wallet_after': wallet(f), 'history_len': len(f.ls(HIST_KEY) or [])}
    f.page.close()
    # ---------------- OTHER_LOCK: A pending with LOCKED coupon; a different store's flow (order B) must not use it ----------------
    f = Flow(ctx, base, out, vp, console)
    locked_wallet = [{**r, 'status': 'LOCKED', 'locked_order_id': order_pending.get('order_no'), 'applied_quote_id': None} if r['coupon_id'] == 'CPN-001' else r for r in fresh_wallet]
    f.goto('U01'); f.seed({REQ_KEY: req(6), ORDER_KEY: order_pending, WALLET_KEY: locked_wallet})
    u = u01(f, *UNIT_B, 6); f.shot('OTHER_LOCK_U01')
    f.page.click('#couponChangeV1'); f.page.wait_for_timeout(500); c02 = c02_state(f); f.shot('OTHER_LOCK_C02'); f.page.click('#back'); f.page.wait_for_timeout(500)
    url = f.click_nav('#confirm'); f.page.goto(url + '&demoAutoAgree=1', wait_until='load'); f.page.wait_for_timeout(500)
    o = o01_state(f); f.shot('OTHER_LOCK_O01')
    # same wallet, but order A's own identity still recovers (control)
    f.goto('U01'); f.seed({REQ_KEY: req(6), ORDER_KEY: order_pending, WALLET_KEY: locked_wallet}); ua = u01(f, *UNIT_A, 6)
    R['OTHER_LOCK'] = {'u01_B': u, 'c02_B': c02, 'o01_B': o, 'wallet_after_B': wallet(f), 'u01_A_control': ua}
    f.page.close()
    # ---------------- INVALID: thresholds and expiry still block ----------------
    f = Flow(ctx, base, out, vp, console)
    f.goto('U01'); f.seed({REQ_KEY: req(1)}); u1 = u01(f, *UNIT_A, 1); f.page.click('#couponChangeV1'); f.page.wait_for_timeout(400); c1 = c02_state(f); f.shot('INVALID_C02_term1')
    expired = [{**r, 'expire_time': '2026-01-01T00:00:00.000Z'} if r['coupon_id'] == 'CPN-001' else r for r in fresh_wallet]
    f.goto('U01'); f.seed({REQ_KEY: req(6), WALLET_KEY: expired}); u2 = u01(f, *UNIT_A, 6); f.page.click('#couponChangeV1'); f.page.wait_for_timeout(400); c2 = c02_state(f); f.shot('INVALID_C02_expired')
    R['INVALID'] = {'term1_u01': u1, 'term1_c02': c1, 'expired_u01': u2, 'expired_c02': c2}
    f.page.close()
    return R


def evaluate(R):
    checks = []
    def c(name, ok, note=''): checks.append((name, bool(ok), str(note)))
    fr = R['FRESH']
    c('FRESH U01 applies CPN-001 -200 for a true new customer', fr['u01']['snapshot'].get('coupon_id') == 'CPN-001' and fr['u01']['snapshot'].get('coupon_discount_amount') == 200 and fr['u01']['snapshot'].get('coupon_customer_first_purchase') is True, fr['u01']['snapshot'])
    c('FRESH O01 valid with coupon row, order paid with discount', not fr['o01']['notice'] and fr['o01']['coupon_row'] and fr['landing'] == 'O02' and fr['order']['status'] == 'PAID' and fr['order']['coupon_discount_amount'] == 200, f"{fr['o01']['notice']} {fr['landing']} {fr['order']}")
    c('FRESH wallet: CPN-001 REDEEMED, other new-customer coupons INVALID', fr['wallet_after'].get('CPN-001', {}).get('status') == 'REDEEMED' and fr['wallet_after'].get('CPN-002', {}).get('status') == 'INVALID', fr['wallet_after'])
    rp = R['REPEAT']
    c('REPEAT U01: paid history + pending current -> no new-customer coupon applied', rp['u01']['snapshot'].get('coupon_applied') is False and rp['u01']['snapshot'].get('coupon_customer_first_purchase') is False and '暂不使用' in (rp['u01']['panel'] or ''), rp['u01'])
    c('REPEAT C02 shows CPN-001 as 仅限首次租仓', any(x['name'] == '新客租仓券' and '仅限首次租仓' in (x['desc'] or '') for x in rp['c02']['unusable']) and not rp['c02']['usable'], rp['c02'])
    c('REPEAT O01 still valid and pays full rent (no discount, no new order blocked)', not rp['o01']['notice'] and not rp['o01']['coupon_row'] and rp['landing'] == 'O02' and rp['order']['status'] == 'PAID' and not rp['order']['coupon_id'], f"{rp['o01']} {rp['order']}")
    c('REPEAT seeded coupons stay un-redeemed', rp['wallet_after'].get('CPN-001', {}).get('status') in ('CLAIMED', 'INVALID'), rp['wallet_after'])
    ol = R['OWN_LOCK']
    c('OWN_LOCK pending payment leaves order PENDING_PAYMENT and coupon LOCKED to that order', ol['pending_order']['status'] == 'PENDING_PAYMENT' and ol['wallet_locked'].get('CPN-001', {}).get('status') == 'LOCKED' and ol['wallet_locked']['CPN-001']['locked_order_id'] == ol['pending_order']['order_no'], f"{ol['pending_order']} {ol['wallet_locked']}")
    for key, label in [('o01_after_back', 'browser back'), ('o01_after_continue', 'O02 继续支付'), ('o01_after_m01', 'M01 待支付订单')]:
        s = ol.get(key)
        c(f'OWN_LOCK O01 via {label}: price gate valid, coupon row shown, pay enabled', s and not s['notice'] and s['coupon_row'] and s['pay_disabled'] is False and (s['gate'] or {}).get('valid') is True, s)
    c('OWN_LOCK C02 lists the own-locked coupon as usable', any(x['name'] == '新客租仓券' for x in ol['c02_with_own_lock']['usable']), ol['c02_with_own_lock'])
    c('OWN_LOCK final payment keeps the same order_no and redeems the coupon', ol['landing'] == 'O02' and ol['order']['status'] == 'PAID' and ol['order']['order_no'] == ol['pending_order']['order_no'] and ol['wallet_after'].get('CPN-001', {}).get('redeemed_order_id') == ol['pending_order']['order_no'] and ol['order']['coupon_discount_amount'] == 200, f"{ol['order']} {ol['wallet_after']}")
    c('OWN_LOCK no extra order created', ol['history_len'] == 1, ol['history_len'])
    ot = R['OTHER_LOCK']
    c('OTHER_LOCK order B (other store, rent ≥ ¥2,000) cannot use the coupon locked by A', ot['u01_B']['snapshot'].get('coupon_applied') is False and ot['u01_B']['snapshot'].get('coupon_id') is None and (ot['u01_B']['snapshot'].get('total_rent') or 0) >= 2000, ot['u01_B'])
    c('OTHER_LOCK C02 for B explains the coupon is in use by another order', any(x['name'] == '新客租仓券' and '其他订单' in (x['desc'] or '') for x in ot['c02_B']['unusable']), ot['c02_B'])
    c('OTHER_LOCK O01 for B valid without discount; wallet lock untouched', not ot['o01_B']['notice'] and not ot['o01_B']['coupon_row'] and ot['wallet_after_B'].get('CPN-001', {}).get('status') == 'LOCKED', f"{ot['o01_B']} {ot['wallet_after_B']}")
    c('OTHER_LOCK control: A\'s own identity still recovers the locked coupon', ot['u01_A_control']['snapshot'].get('coupon_id') == 'CPN-001', ot['u01_A_control'])
    iv = R['INVALID']
    c('INVALID 1-month rent below ¥2,000 blocked; 12-month coupon needs 12 months', iv['term1_u01']['snapshot'].get('coupon_applied') is False and any('2,000' in (x['desc'] or '') for x in iv['term1_c02']['unusable']) and any('12个月' in (x['desc'] or '') for x in iv['term1_c02']['unusable']), iv['term1_c02'])
    c('INVALID expired CPN-001 blocked (优惠券已过期)', iv['expired_u01']['snapshot'].get('coupon_id') != 'CPN-001' and any('已过期' in (x['desc'] or '') for x in iv['expired_c02']['unusable']), iv['expired_c02'])
    return checks


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--root', default=str(Path(__file__).resolve().parents[1])); ap.add_argument('--port', type=int, default=4182); ap.add_argument('--expect', choices=['fixed', 'baseline'], default='fixed')
    a = ap.parse_args(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True); root = Path(a.root).resolve()
    port = free_port(a.port); server = start_server(root, port); base = f'http://127.0.0.1:{port}'
    console = []; results = {'root': str(root), 'base_url': base, 'expect': a.expect, 'viewports': {}}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for vp in [(375, 812), (390, 844)]:
                label = f'{vp[0]}x{vp[1]}'
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2, is_mobile=True, has_touch=True)
                R = run_cases(ctx, base, out, label, console); checks = evaluate(R)
                results['viewports'][label] = {'cases': R, 'checks': [{'name': n, 'ok': ok, 'note': note} for n, ok, note in checks]}
                ctx.close()
            browser.close()
    finally:
        server.terminate()
    (out / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
    (out / 'browser_console.log').write_text('\n'.join(console), encoding='utf-8')
    all_ok = True
    for label, blk in results['viewports'].items():
        for ch in blk['checks']:
            print(('PASS' if ch['ok'] else 'FAIL') + f' [{label}] ' + ch['name'] + ('' if ch['ok'] else '  <- ' + ch['note'][:300])); all_ok = all_ok and ch['ok']
    print('MODE', a.expect, 'ALL_OK' if all_ok else 'HAS_FAILURES')
    sys.exit(0 if (all_ok or a.expect == 'baseline') else 1)


if __name__ == '__main__':
    main()
