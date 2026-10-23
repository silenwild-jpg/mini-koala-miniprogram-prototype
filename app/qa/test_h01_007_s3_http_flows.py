"""H01-007-S3 (D-07 quote expiry protection / D-12 payment-failure recovery) real HTTP browser flows.

Serves the package over a local http.server and drives real page navigations in Chromium
(localStorage seeding + user-like clicks only; no DOM injection of business logic).

Usage:
  python qa/test_h01_007_s3_http_flows.py --out outputs/h01_007_s3/<label> [--root <package root>] [--port 4183] [--expect fixed|baseline]

Cases: QUOTE_24H, QUOTE_49H, QUOTE_CHANGED, PAY_FAIL (+ ORDER_ID_PRESERVED, NO_FALSE_SUCCESS), CROSS_S2.
Viewports: 375x812 and 390x844 (DPR 2). Produces results.json, per-step screenshots and a console log.
Exit code 0 when every check matches the requested expectation (fixed: all pass; baseline: defect checks fail, invariants pass).
"""
import argparse, json, subprocess, sys, time, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_h01_007_s1_http_flows import Flow, free_port, qs, page_name, req, PAGES, REQ_KEY, ORDER_KEY, PRICE_KEY, QUOTE_KEY
from test_h01_007_s2_http_flows import WALLET_KEY, HIST_KEY, UNIT_A, UNIT_B, u01, o01_state, pay, order_brief, wallet
from playwright.sync_api import sync_playwright

RESULT_KEY = 'mini_storage_payment_result_current'
HOUR = 3600 * 1000


def start_server(root, port):
    proc = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=root,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{port}/README_CURRENT.md', timeout=1); return proc
        except Exception:
            time.sleep(0.2)
    proc.kill(); raise SystemExit('http.server did not start')


def js_round(x):
    import math
    return int(math.floor(x + 0.5))


def setls(f, key, value):
    f.page.evaluate("([k,v])=>localStorage.setItem(k,JSON.stringify(v))", [key, value])


def rmls(f, key):
    f.page.evaluate("k=>localStorage.removeItem(k)", key)


def visible(f, sel):
    return f.page.evaluate("s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return !e.classList.contains('hidden')&&r.width>0&&r.height>0}", sel)


def attr(f, sel, name):
    return f.page.evaluate("([s,n])=>document.querySelector(s)?.getAttribute(n)??null", [sel, name])


def q01_state(f):
    return {'notice': f.text('#quoteExpiredNotice'), 'total': f.text('#total'), 'initialPayableRow': f.text('#initialPayableRow'), 'save_disabled': f.page.evaluate("()=>document.getElementById('save')?.disabled"),
            'edit_label': f.text('#edit'), 'gate': f.page.evaluate("()=>window.MINI_KOALA_PRICE_GATE_STATUS"), 'quoteId': f.text('#quoteId')}


def u01_requote(f):
    return {'notice': f.text('#requoteNotice'), 'result': attr(f, '#requoteNotice', 'data-requote-result'), 'ack_visible': visible(f, '#requoteAck'), 'payable': f.text('#initialPayable'),
            'snapshot': {k: (f.ls(PRICE_KEY) or {}).get(k) for k in ['total_rent', 'coupon_discount_amount', 'upfront_payable', 'coupon_applied', 'coupon_id']}}


def o01_resume(f):
    s = o01_state(f)
    s.update({'resume_notice': f.text('#orderResumeNotice'), 'resume_result': attr(f, '#orderResumeNotice', 'data-resume-result'), 'reprice_visible': visible(f, '#orderResumeReprice'), 'query_orderNo': qs(f.page.url).get('orderNo')})
    return s


def save_quote(f, hours_left, changed=False):
    """U01 -> 保存方案(Q01) -> 保存 -> H01. Then age the saved quote so valid_until = now + hours_left (optionally with changed amounts)."""
    f.goto('U01'); f.seed({REQ_KEY: req(6)}); u = u01(f, *UNIT_A, 6)
    url = f.click_nav('#saveQuote'); assert page_name(url) == 'Q01', url
    f.page.wait_for_timeout(300); draft = q01_state(f)
    with f.page.expect_navigation(timeout=8000):
        f.page.click('#save')
    f.page.wait_for_timeout(300)
    q = f.ls(QUOTE_KEY) or {}
    now = f.page.evaluate('()=>Date.now()')
    valid = now + hours_left * HOUR; saved = valid - 48 * HOUR
    import datetime
    iso = lambda ms: datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    q['saved_at'] = iso(saved); q['valid_until'] = iso(valid)
    ps = q.get('price_snapshot') or {}
    if ps: ps['pricing_timestamp'] = iso(saved)
    if changed and ps:
        term = int(ps['term_months']); total = int(ps['total_rent']) + 300; monthly = js_round(total / term); disc = int(ps.get('coupon_discount_amount') or 0); fee = int(ps['management_fee'])
        ps.update({'total_rent': total, 'monthly_average': monthly, 'monthly_price': monthly, 'deposit': monthly, 'upfront_payable': total - disc + monthly + fee, 'base_monthly_price': int(ps.get('base_monthly_price') or 0) + 50})
        if ps.get('coupon_applied'): ps.update({'rent_before_coupon': total, 'rent_after_coupon': total - disc})
        q.update({'total_price': total, 'total_rent': total, 'monthly_price': monthly, 'monthly_average': monthly, 'deposit_amount': monthly, 'initial_payable': ps['upfront_payable'], 'upfront_payable': ps['upfront_payable']})
        if 'rent_before_coupon' in q: q.update({'rent_before_coupon': total, 'rent_after_coupon': total - disc})
    q['price_snapshot'] = ps
    setls(f, QUOTE_KEY, q); rmls(f, PRICE_KEY)   # the user browsed elsewhere since; the saved quote is what gets restored
    return {'u01': u, 'q01_draft': draft, 'quote': {k: q.get(k) for k in ['quote_id', 'status', 'term_months', 'total_price', 'initial_payable', 'saved_at', 'valid_until']}}


def quote_resume_flow(f, label, via):
    """Open the saved quote from H01 (via='H01') or M01 (via='M01'), then press 继续下单 and follow the trade path to O01."""
    R = {'via': via}
    if via == 'H01':
        f.goto('H01'); f.page.wait_for_timeout(500)
        R['h01'] = {'quoted_visible': visible(f, '#quotedCard'), 'quotedTitle': f.text('#quotedTitle'), 'quotedDesc': f.text('#quotedDesc'), 'cta': f.text('#homeViewQuote')}
        f.shot(f'{label}_H01'); url = f.click_nav('#homeViewQuote')
    else:
        f.goto('M01'); f.page.wait_for_timeout(400); R['m01'] = {'card': f.text('#assetQuote'), 'badge': f.text('#quoteBadge')}; f.shot(f'{label}_M01'); url = f.click_nav('#assetQuote')
    R['q01_landing'] = page_name(url); R['q01_query_status'] = qs(url).get('quoteStatus'); f.page.wait_for_timeout(400)
    R['q01'] = q01_state(f); f.shot(f'{label}_Q01_{via}')
    url = f.click_nav('#edit'); f.page.wait_for_timeout(500); R['after_edit_landing'] = page_name(url); R['after_edit_query'] = {k: qs(url).get(k) for k in ['requote', 'quoteId', 'term', 'store', 'sizeOption']}
    if R['after_edit_landing'] == 'U01':
        f.page.wait_for_timeout(600); R['u01_requote'] = u01_requote(f); f.shot(f'{label}_U01_requote_{via}')
        # first 立即下单 attempt (blocked until the user acknowledges a change)
        before = f.page.url; f.page.click('#confirm'); f.page.wait_for_timeout(700); R['confirm_first_landing'] = page_name(f.page.url); R['confirm_first_toast'] = f.text('#toast')
        if page_name(f.page.url) == 'U01':
            if visible(f, '#requoteAck'):
                f.page.click('#requoteAck'); f.page.wait_for_timeout(300); R['ack_clicked'] = True; f.shot(f'{label}_U01_acked_{via}')
            url = f.click_nav('#confirm'); R['confirm_second_landing'] = page_name(url)
        f.page.wait_for_timeout(500)
    if page_name(f.page.url) == 'O01':
        R['o01'] = o01_state(f); f.shot(f'{label}_O01_{via}')
    return R


def run_cases(ctx, base, out, vp, console):
    R = {}
    # ---------------- QUOTE_24H: a quote inside its 48h window keeps the normal order path ----------------
    f = Flow(ctx, base, out, vp, console)
    seed = save_quote(f, 24); R['QUOTE_24H'] = {'seed': seed, 'H01': quote_resume_flow(f, 'QUOTE_24H', 'H01')}
    f.page.close()
    # ---------------- QUOTE_49H: expired quote (saved 49h ago), same current price ----------------
    f = Flow(ctx, base, out, vp, console)
    seed = save_quote(f, -1); R['QUOTE_49H'] = {'seed': seed, 'H01': quote_resume_flow(f, 'QUOTE_49H', 'H01')}
    f.goto('M01'); setls(f, QUOTE_KEY, dict(f.ls(QUOTE_KEY) or {})); rmls(f, PRICE_KEY); R['QUOTE_49H']['M01'] = quote_resume_flow(f, 'QUOTE_49H', 'M01')
    f.page.close()
    # ---------------- QUOTE_CHANGED: expired quote whose saved amounts no longer match the current price ----------------
    f = Flow(ctx, base, out, vp, console)
    seed = save_quote(f, -1, changed=True); R['QUOTE_CHANGED'] = {'seed': seed, 'H01': quote_resume_flow(f, 'QUOTE_CHANGED', 'H01')}
    f.page.close()
    # ---------------- PAY_FAIL / ORDER_ID_PRESERVED / NO_FALSE_SUCCESS ----------------
    f = Flow(ctx, base, out, vp, console)
    f.goto('U01'); f.seed({REQ_KEY: req(6)}); u = u01(f, *UNIT_A, 6)
    url = f.click_nav('#confirm'); f.page.goto(url + '&demoAutoAgree=1&review=1&simulatePayment=PAYMENT_FAILED', wait_until='load'); f.page.wait_for_timeout(500)
    pay(f); f.shot('PAY_FAIL_O02_review')
    order1 = f.ls(ORDER_KEY) or {}; on1 = order1.get('order_no'); result = f.ls(RESULT_KEY)
    f.goto('O02', f'orderNo={on1}'); f.page.wait_for_timeout(400)   # the gateway result record is processed by the real result page
    P = {'u01': u, 'order_after_o01': order_brief(order1), 'gateway_result': result, 'o02_title': f.text('#statusTitle'), 'o02_primary': f.text('#primaryBtn'), 'o02_secondary': f.text('#secondaryBtn'), 'order_after_result': order_brief(f.ls(ORDER_KEY))}
    f.shot('PAY_FAIL_O02_failed')
    # NO_FALSE_SUCCESS
    nfs = {}
    f.goto('O02', f'orderNo={on1}'); nfs['reopen_title'] = f.text('#statusTitle'); nfs['reopen_status'] = (f.ls(ORDER_KEY) or {}).get('status')
    setls(f, RESULT_KEY, {'order_no': 'O-OTHER-ORDER', 'status': 'PAID', 'paid_amount': 1, 'processed_at': '2026-10-13T00:00:00.000Z'})
    f.goto('O02', f'orderNo={on1}'); nfs['foreign_paid_result_title'] = f.text('#statusTitle'); nfs['foreign_paid_result_status'] = (f.ls(ORDER_KEY) or {}).get('status'); rmls(f, RESULT_KEY)
    f.goto('O02', 'orderNo=O-NOPE'); nfs['unknown_order_title'] = f.text('#statusTitle'); f.shot('NO_FALSE_SUCCESS_O02_unknown')
    f.goto('O02', f'orderNo={on1}'); f.page.wait_for_timeout(300)
    # H01 entry
    url = f.click_nav('#secondaryBtn'); f.page.wait_for_timeout(500)
    H = {'landing': page_name(url), 'pending_visible': visible(f, '#pendingCard'), 'pendingTitle': f.text('#pendingTitle'), 'pendingDesc': f.text('#pendingDesc'), 'pendingTotal': f.text('#pendingTotal'), 'active_visible': visible(f, '#activeCard'), 'hsi_task': f.page.evaluate("()=>document.querySelector('.hsi-focused')?.id||null")}
    f.shot('PAY_FAIL_H01'); nfs['h01_active_card_visible'] = H['active_visible']
    if H['pending_visible']:
        url = f.click_nav('#pendingPay'); f.page.wait_for_timeout(600); H['o01'] = {'landing': page_name(url), **o01_resume(f)}; f.shot('PAY_FAIL_O01_from_H01')
    P['H01'] = H
    # M01 entry
    f.goto('M01'); f.page.wait_for_timeout(400); M = {'card': f.text('#assetOrder'), 'badge': f.text('#orderBadge'), 'title': f.text('#primaryTitle')}; f.shot('PAY_FAIL_M01')
    if f.page.query_selector('#assetOrder'):
        url = f.click_nav('#assetOrder'); f.page.wait_for_timeout(600); M['landing'] = page_name(url)
        if M['landing'] == 'O01': M['o01'] = o01_resume(f)
        f.shot('PAY_FAIL_after_M01_click')
    P['M01'] = M
    # price snapshot overwritten by browsing another unit, then back through M01
    f.goto('U01', f'unit={UNIT_B[1]}&store={UNIT_B[0]}&target=5.0&term=6&fromS01State=browse'); f.page.wait_for_timeout(500)
    f.goto('M01'); f.page.wait_for_timeout(400); O = {}
    if f.page.query_selector('#assetOrder'):
        url = f.click_nav('#assetOrder'); f.page.wait_for_timeout(600); O['landing'] = page_name(url)
        if O['landing'] == 'O01': O['o01'] = o01_resume(f)
        f.shot('PAY_FAIL_O01_after_snapshot_overwrite')
    P['snapshot_overwritten'] = O
    # final real retry: from the recovered O01 when available, else via O02 重新支付 (baseline path)
    if page_name(f.page.url) != 'O01':
        f.goto('O02', f'orderNo={on1}'); f.page.wait_for_timeout(300); url = f.click_nav('#primaryBtn'); f.page.wait_for_timeout(500); P['final_path'] = 'O02_retry'
    else:
        P['final_path'] = 'M01_O01'
    P['final_o01'] = o01_resume(f)
    f.page.goto(f.page.url + '&demoAutoAgree=1', wait_until='load'); f.page.wait_for_timeout(500); pay(f); f.page.wait_for_timeout(300); f.shot('PAY_FAIL_final_O02')
    P['final'] = {'landing': page_name(f.page.url), 'o02_title': f.text('#statusTitle'), 'order': order_brief(f.ls(ORDER_KEY)), 'history_len': len(f.ls(HIST_KEY) or []), 'history_order_nos': [o.get('order_no') for o in (f.ls(HIST_KEY) or [])], 'order_no_before': on1}
    P['NO_FALSE_SUCCESS'] = nfs
    R['PAY_FAIL'] = P; f.page.close()
    # ---------------- CROSS_S2: pending order A locked a new-customer coupon; a PAID order B appears in history -> A must be re-priced, not paid with the old coupon ----------------
    f = Flow(ctx, base, out, vp, console)
    f.goto('U01'); f.seed({REQ_KEY: req(6)}); u = u01(f, *UNIT_A, 6)
    url = f.click_nav('#confirm'); f.page.goto(url + '&demoAutoAgree=1&review=1&simulatePayment=PENDING', wait_until='load'); f.page.wait_for_timeout(500); pay(f)
    order_a = f.ls(ORDER_KEY) or {}; w_locked = wallet(f)
    paid_b = {'order_no': 'O-HIST-B-PAID', 'status': 'PAID', 'payment_status': 'PAID', 'store_id': UNIT_B[0], 'unit_id': UNIT_B[1], 'representative_unit_no': UNIT_B[1], 'size_option_id': 'MK_BJ_8D13DAA8__5.29', 'term_months': 6, 'volume': 5, 'total_price': 2940, 'payable_total': 3480, 'start_date': '2026-10-01', 'created_at': '2026-10-12T01:00:00.000Z', 'updated_at': '2026-10-12T02:00:00.000Z', 'paid_at': '2026-10-12T02:00:00.000Z'}
    setls(f, HIST_KEY, [paid_b] + [o for o in (f.ls(HIST_KEY) or []) if o.get('order_no') != 'O-HIST-B-PAID'])
    f.goto('H01'); f.page.wait_for_timeout(500); X = {'u01': u, 'order_a': order_brief(order_a), 'wallet_locked': w_locked, 'h01_pending_visible': visible(f, '#pendingCard'), 'pendingTitle': f.text('#pendingTitle')}
    url = f.click_nav('#pendingPay'); f.page.wait_for_timeout(600); X['o01'] = {'landing': page_name(url), **o01_resume(f)}; f.shot('CROSS_S2_O01_resume')
    if X['o01'].get('reprice_visible'):
        url = f.click_nav('#orderResumeReprice'); f.page.wait_for_timeout(700); X['reprice_landing'] = page_name(url); X['u01_reprice'] = u01_requote(f); f.shot('CROSS_S2_U01_reprice')
        f.page.click('#confirm'); f.page.wait_for_timeout(600); X['confirm_first_landing'] = page_name(f.page.url)   # blocked until the change is acknowledged
        if page_name(f.page.url) == 'U01' and visible(f, '#requoteAck'): f.page.click('#requoteAck'); f.page.wait_for_timeout(300); X['ack_clicked'] = True; f.shot('CROSS_S2_U01_acked')
        url = f.click_nav('#confirm') if page_name(f.page.url) == 'U01' else f.page.url; f.page.wait_for_timeout(500); X['o01_after_reprice'] = {'landing': page_name(url), **o01_resume(f)}; f.shot('CROSS_S2_O01_after_reprice')
        f.page.goto(f.page.url + '&demoAutoAgree=1', wait_until='load'); f.page.wait_for_timeout(500); pay(f); f.page.wait_for_timeout(300); f.shot('CROSS_S2_final_O02')
        X['final'] = {'landing': page_name(f.page.url), 'o02_title': f.text('#statusTitle'), 'order': order_brief(f.ls(ORDER_KEY)), 'wallet_after': wallet(f), 'history_len': len(f.ls(HIST_KEY) or [])}
    R['CROSS_S2'] = X; f.page.close()
    return R


def evaluate(R):
    """Returns [(name, ok, note, kind)] with kind 'defect' (expected to FAIL on the un-patched tree) or 'invariant' (must pass on both)."""
    checks = []
    def c(name, ok, note='', kind='defect'): checks.append((name, bool(ok), str(note)[:600], kind))
    a = R['QUOTE_24H']['H01']
    c('QUOTE_24H H01 shows the saved quote as current (not stale)', a['h01']['quoted_visible'] and '已过参考期' not in (a['h01']['quotedTitle'] or ''), a['h01'], 'invariant')
    c('QUOTE_24H Q01 no expiry notice, 保存方案 enabled, 继续下单 goes straight to O01', not a['q01']['notice'] and a['q01']['save_disabled'] is False and a['after_edit_landing'] == 'O01', f"{a['q01']} -> {a['after_edit_landing']}", 'invariant')
    c('QUOTE_24H O01 price gate valid and pay enabled', a.get('o01') and (a['o01']['gate'] or {}).get('valid') is True and a['o01']['pay_disabled'] is False, a.get('o01'), 'invariant')
    for via in ['H01', 'M01']:
        b = R['QUOTE_49H'][via]
        if via == 'H01': c('QUOTE_49H H01 marks the quote stale', '已过参考期' in (b['h01']['quotedTitle'] or ''), b['h01'], 'invariant')
        c(f'QUOTE_49H Q01 via {via}: quote still viewable (amounts shown) with a 48h expiry notice', b['q01']['notice'] and '48' in b['q01']['notice'] and b['q01']['total'] not in (None, '—', ''), b['q01'])
        c(f'QUOTE_49H Q01 via {via}: 保存方案 disabled, 继续下单 relabelled to re-check', b['q01']['save_disabled'] is True and b['q01']['edit_label'] != '继续下单', b['q01'])
        c(f'QUOTE_49H via {via}: 继续 routes to U01 re-check (requote=1), not directly to O01', b['after_edit_landing'] == 'U01' and b['after_edit_query'].get('requote') == '1', f"{b['after_edit_landing']} {b['after_edit_query']}")
        c(f'QUOTE_49H via {via}: U01 re-check reports the price unchanged and O01 is reached with a valid gate', b.get('u01_requote', {}).get('result') == 'same' and b.get('confirm_first_landing') == 'O01' and b.get('o01') and (b['o01']['gate'] or {}).get('valid') is True and b['o01']['pay_disabled'] is False, f"{b.get('u01_requote')} {b.get('confirm_first_landing')} {b.get('o01')}")
    d = R['QUOTE_CHANGED']['H01']; seed = R['QUOTE_CHANGED']['seed']['quote']
    c('QUOTE_CHANGED Q01 shows the expiry notice and routes to U01', d['q01']['notice'] and d['after_edit_landing'] == 'U01', f"{d['q01']} {d['after_edit_landing']}")
    c('QUOTE_CHANGED U01 reports a price change with old and new amounts and asks for confirmation', d.get('u01_requote', {}).get('result') == 'changed' and d.get('u01_requote', {}).get('ack_visible') and str(seed['initial_payable']) and f"{seed['initial_payable']:,}" in (d.get('u01_requote', {}).get('notice') or ''), d.get('u01_requote'))
    c('QUOTE_CHANGED first 立即下单 is blocked until the change is acknowledged', d.get('confirm_first_landing') == 'U01' and d.get('ack_clicked') is True and d.get('confirm_second_landing') == 'O01', f"{d.get('confirm_first_landing')} ack={d.get('ack_clicked')} {d.get('confirm_second_landing')}")
    cur = R['QUOTE_49H']['H01'].get('o01', {}).get('payableTotal')
    c('QUOTE_CHANGED O01 charges the current price, not the stale quote amount', d.get('o01') and d['o01']['payableTotal'] == cur and f"¥{seed['initial_payable']:,}" != d['o01']['payableTotal'] and (d['o01']['gate'] or {}).get('valid') is True, f"o01={d.get('o01')} current={cur} stale=¥{seed['initial_payable']:,}")
    p = R['PAY_FAIL']
    c('PAY_FAIL gateway failure leaves the order PAYMENT_FAILED with the same order_no', p['order_after_result']['status'] == 'PAYMENT_FAILED' and p['order_after_result']['order_no'] == p['order_after_o01']['order_no'] and '未完成' in (p['o02_title'] or ''), f"{p['order_after_result']} {p['o02_title']}", 'invariant')
    n = p['NO_FALSE_SUCCESS']
    c('NO_FALSE_SUCCESS reopening O02 / foreign PAID result / unknown order never shows success', '未完成' in (n['reopen_title'] or '') and '未完成' in (n['foreign_paid_result_title'] or '') and n['foreign_paid_result_status'] == 'PAYMENT_FAILED' and '不可用' in (n['unknown_order_title'] or '') and not n['h01_active_card_visible'], n, 'invariant')
    h = p['H01']
    c('PAY_FAIL H01 offers a clear entry for the failed order', h['landing'] == 'H01' and h['pending_visible'] and '未完成' in (h['pendingTitle'] or ''), h)
    c('PAY_FAIL H01 entry re-opens the same order in O01 with a re-check notice and pay enabled', h.get('o01') and h['o01']['landing'] == 'O01' and h['o01']['query_orderNo'] == p['order_after_o01']['order_no'] and h['o01']['resume_result'] == 'ok' and h['o01']['pay_disabled'] is False, h.get('o01'))
    m = p['M01']
    c('PAY_FAIL M01 shows the failed order as a pending task and opens O01 (not the paid-order detail page)', m.get('card') and '未完成' in (m['card'] or '') and m.get('landing') == 'O01' and m.get('o01', {}).get('resume_result') == 'ok', m)
    o = p['snapshot_overwritten']
    c('PAY_FAIL after browsing another unit the order still recovers its own price snapshot', o.get('landing') == 'O01' and (o.get('o01', {}).get('gate') or {}).get('valid') is True and o.get('o01', {}).get('pay_disabled') is False, o)
    fin = p['final']
    c('ORDER_ID_PRESERVED retry pays the same order_no, no second order', fin['landing'] == 'O02' and '成功' in (fin['o02_title'] or '') and fin['order']['status'] == 'PAID' and fin['order']['order_no'] == fin['order_no_before'] and fin['history_len'] == 1, f"{fin} via {p['final_path']}")
    x = R['CROSS_S2']
    c('CROSS_S2 pending order A with a locked coupon + paid order B in history: O01 explains the lost new-customer discount and blocks paying the old amount', x['o01']['landing'] == 'O01' and x['o01']['pay_disabled'] is True and x['o01']['resume_result'] == 'changed' and '新客' in (x['o01']['resume_notice'] or '') and x['o01']['reprice_visible'], x['o01'])
    c('CROSS_S2 re-pricing asks for confirmation (coupon lost) before continuing', x.get('u01_reprice', {}).get('result') == 'changed' and x.get('confirm_first_landing') == 'U01' and x.get('ack_clicked') is True, f"{x.get('u01_reprice')} {x.get('confirm_first_landing')} {x.get('ack_clicked')}")
    c('CROSS_S2 re-pricing drops the coupon, keeps order A\'s order_no and pays', x.get('final') and x['final']['order']['order_no'] == x['order_a']['order_no'] and x['final']['order']['status'] == 'PAID' and not x['final']['order']['coupon_id'] and x.get('u01_reprice', {}).get('snapshot', {}).get('coupon_applied') is False, f"{x.get('u01_reprice')} {x.get('final')}")
    c('CROSS_S2 S2 protection intact: order A never pays with the old coupon amount', not (x['o01']['pay_disabled'] is False and x['o01']['coupon_row']), x['o01'], 'invariant')
    return checks


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--root', default=str(Path(__file__).resolve().parents[1])); ap.add_argument('--port', type=int, default=4183); ap.add_argument('--expect', choices=['fixed', 'baseline'], default='fixed')
    a = ap.parse_args(); root = Path(a.root).resolve(); out = Path(a.out).resolve(); out.mkdir(parents=True, exist_ok=True)
    port = free_port(a.port); server = start_server(root, port); base = f'http://127.0.0.1:{port}'
    console = []; results = {'root': str(root), 'base_url': base, 'expect': a.expect, 'viewports': {}}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for vp in [(375, 812), (390, 844)]:
                label = f'{vp[0]}x{vp[1]}'
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2, is_mobile=True, has_touch=True)
                R = run_cases(ctx, base, out, label, console); checks = evaluate(R)
                results['viewports'][label] = {'cases': R, 'checks': [{'name': n, 'ok': ok, 'note': note, 'kind': kind} for n, ok, note, kind in checks]}
                ctx.close()
            browser.close()
    finally:
        server.kill()
    (out / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    (out / 'console.log').write_text('\n'.join(console), encoding='utf-8')
    bad = 0
    for label, blk in results['viewports'].items():
        print(f'== {label} ==')
        for ch in blk['checks']:
            expected = True if (a.expect == 'fixed' or ch['kind'] == 'invariant') else False
            mark = 'PASS' if ch['ok'] else 'FAIL'; meets = ch['ok'] == expected; bad += (not meets)
            print(f"  {mark} [{ch['kind']}] {ch['name']}" + ('' if ch['ok'] else f"  -- {ch['note']}") + ('' if meets else '   <<< unexpected for this mode'))
    errs = [l for l in console if 'PAGEERROR' in l or ' error: ' in l]
    print(f'console error lines: {len(errs)}')
    for e in errs[:20]: print('   ', e)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
