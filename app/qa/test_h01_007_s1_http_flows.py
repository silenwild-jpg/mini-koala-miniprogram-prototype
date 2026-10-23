"""H01-007-S1 (D-03 / D-04) real HTTP browser flows.

Runs the prototype through a local http.server and drives real page navigations in Chromium
(no DOM injection of business logic; only localStorage seeding + user-like clicks).

Usage:
  python qa/test_h01_007_s1_http_flows.py --out outputs/h01_007_s1/<label> [--port 4181] [--expect fixed|baseline]

Viewports: 375x812 and 390x844. Produces results.json, per-step screenshots and a console log.
Exit code 0 when every case matches the expectation for the requested mode.
"""
import argparse, json, subprocess, sys, time, socket, urllib.request
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    'M01': 'prototype/mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html',
    'S01': 'prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
    'U01': 'prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
    'Q01': 'prototype/mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
    'O01': 'prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
    'O02': 'prototype/mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html',
    'S5': 'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
    'H01': 'prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
}
UNIT = 'BJ0498S01B001'   # jianguo, 6.24 m3 demo unit
REQ_KEY = 'mini_storage_requirement_current'
ORDER_KEY = 'mini_storage_order_current'
QUOTE_KEY = 'mini_storage_quote_current'
PRICE_KEY = 'mini_storage_price_snapshot_current'


def free_port(preferred):
    s = socket.socket(); s.settimeout(0.2)
    try:
        s.bind(('127.0.0.1', preferred)); s.close(); return preferred
    except OSError:
        s.close(); s2 = socket.socket(); s2.bind(('127.0.0.1', 0)); p = s2.getsockname()[1]; s2.close(); return p


def start_server(port):
    proc = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{port}/README_CURRENT.md', timeout=1); return proc
        except Exception:
            time.sleep(0.2)
    proc.kill(); raise SystemExit('http.server did not start')


def qs(url):
    return {k: v[0] for k, v in parse_qs(urlparse(url).query).items()}


def page_name(url):
    path = urlparse(url).path
    for k, v in PAGES.items():
        if path.endswith(Path(v).name): return k
    return path.rsplit('/', 1)[-1]


class Flow:
    def __init__(self, ctx, base, out, vp_label, console):
        self.page = ctx.new_page(); self.base = base; self.out = out; self.vp = vp_label; self.shots = []; self.console = console
        self.page.on('console', lambda m: console.append(f'[{vp_label}] {m.type}: {m.text}'))
        self.page.on('pageerror', lambda e: console.append(f'[{vp_label}] PAGEERROR: {e}'))

    def goto(self, key, params=''):
        self.page.goto(f'{self.base}/{PAGES[key]}' + (f'?{params}' if params else ''), wait_until='load'); self.page.wait_for_timeout(250)

    def seed(self, data):
        # the prototype keeps business state in localStorage; seed on the same origin, then reload.
        self.page.evaluate("d=>{localStorage.clear();for(const [k,v] of Object.entries(d))localStorage.setItem(k,JSON.stringify(v));}", data)

    def ls(self, key):
        return self.page.evaluate("k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}", key)

    def shot(self, name):
        p = self.out / f'{self.vp}_{name}.png'; self.page.screenshot(path=str(p), full_page=False); self.shots.append(p.name); return p.name

    def text(self, sel):
        el = self.page.query_selector(sel); return (el.inner_text().strip() if el else None)

    def pick_term(self, months):
        # the U01 term editor sits inside a collapsed <details>; open it like a user would, then tap the quick option.
        if not self.page.evaluate("()=>document.querySelector('#termDetails')?.open"):
            self.page.click('#termDetails summary'); self.page.wait_for_timeout(200)
        self.page.click(f'[data-quick="{months}"]'); self.page.wait_for_timeout(300)

    def click_nav(self, sel, timeout=8000):
        before = self.page.url
        with self.page.expect_navigation(timeout=timeout):
            self.page.click(sel)
        self.page.wait_for_timeout(250)
        return self.page.url


def req(term, **extra):
    r = {'requirement_id': 'R-S1TEST', 'target_volume': 5, 'min_volume': 4.5, 'max_volume': 5.8, 'size_mode': 'about',
         'travel_mode': 'drive', 'search_origin_key': 'guomao', 'source': 'ESTIMATOR', 'customer_type': 'personal',
         'updated_at': '2026-10-13T00:00:00.000Z'}
    r['term_months'] = term
    r.update(extra); return r


def run_cases(ctx, base, out, vp_label, console):
    R = {}
    # ---------------- NO_TERM: M01 resume ----------------
    f = Flow(ctx, base, out, vp_label, console)
    f.goto('M01'); f.seed({REQ_KEY: req(0)}); f.page.reload(wait_until='load'); f.page.wait_for_timeout(300)
    badge = f.text('#reqBadge'); card = f.text('#assetRequirement'); f.shot('NO_TERM_M01_before_click')
    url = f.click_nav('#assetRequirement'); f.shot('NO_TERM_M01_after_click')
    R['NO_TERM_M01'] = {'badge': badge, 'card': card, 'landing': page_name(url), 'query': qs(url), 'requirement_after': f.ls(REQ_KEY)}
    f.page.close()
    # ---------------- NO_TERM: S01 browse strip ----------------
    f = Flow(ctx, base, out, vp_label, console)
    f.goto('S01', 'state=browse&entry=browse_nearby'); f.seed({REQ_KEY: req(0)}); f.page.reload(wait_until='load'); f.page.wait_for_timeout(400)
    strip = f.text('#browseStripTitle'); f.shot('NO_TERM_S01_strip')
    url = f.click_nav('#estimateStrip'); f.shot('NO_TERM_S01_strip_after_click')
    R['NO_TERM_S01_STRIP'] = {'strip_title': strip, 'landing': page_name(url), 'query': qs(url), 'requirement_after': f.ls(REQ_KEY)}
    f.page.close()
    # ---------------- NO_TERM: S01 estimated entry without term ----------------
    f = Flow(ctx, base, out, vp_label, console)
    f.goto('S01'); f.seed({REQ_KEY: req(0)})
    f.goto('S01', 'state=estimated&target=5.0&source=test_no_term'); f.page.wait_for_timeout(600)
    url = f.page.url; f.shot('NO_TERM_S01_estimated')
    R['NO_TERM_S01_ESTIMATED'] = {'landing': page_name(url), 'query': qs(url), 'demand_summary': f.text('#demandSummary') if page_name(url) == 'S01' else None, 'requirement_after': f.ls(REQ_KEY)}
    f.page.close()
    # ---------------- NO_TERM: U01 with invalid term param ----------------
    f = Flow(ctx, base, out, vp_label, console)
    f.goto('U01'); f.seed({REQ_KEY: req(0)})
    f.goto('U01', f'unit={UNIT}&store=jianguo&target=5.0&term=0&fromS01State=estimated'); f.page.wait_for_timeout(400)
    term_input = f.page.input_value('#termInput') if f.page.query_selector('#termInput') else None
    f.shot('NO_TERM_U01')
    f.page.click('#confirm'); f.page.wait_for_timeout(500)
    R['NO_TERM_U01'] = {'term_input': term_input, 'term_summary': f.text('#termSummaryText'), 'term_human': f.text('#termHuman'), 'after_confirm_page': page_name(f.page.url), 'toast': f.text('#toast'), 'price_snapshot': f.ls(PRICE_KEY), 'requirement_after': f.ls(REQ_KEY)}
    f.shot('NO_TERM_U01_after_confirm'); f.page.close()
    # ---------------- HAS_TERM: 6 months survives resume ----------------
    f = Flow(ctx, base, out, vp_label, console)
    f.goto('M01'); f.seed({REQ_KEY: req(6)}); f.page.reload(wait_until='load'); f.page.wait_for_timeout(300)
    badge = f.text('#reqBadge'); url = f.click_nav('#assetRequirement'); f.page.wait_for_timeout(400); f.shot('HAS_TERM_S01')
    s01q = qs(url); req_after = f.ls(REQ_KEY)
    f.goto('U01', f'unit={UNIT}&store=jianguo&target=5.0&fromS01State=estimated'); f.page.wait_for_timeout(400)
    R['HAS_TERM'] = {'badge': badge, 'landing': page_name(url), 'query': s01q, 'demand_summary': f.text('#demandSummary'), 'requirement_after_s01': req_after, 'u01_term_input': f.page.input_value('#termInput'), 'u01_term_summary': f.text('#termSummaryText'), 'u01_term_human': f.text('#termHuman')}
    f.shot('HAS_TERM_U01'); f.page.close()
    # ---------------- TERM_CHANGE: 6 -> U01 12 -> Q01 -> O01 -> O02 ----------------
    f = Flow(ctx, base, out, vp_label, console)
    f.goto('U01'); f.seed({REQ_KEY: req(6)})
    f.goto('U01', f'unit={UNIT}&store=jianguo&target=5.0&term=6&fromS01State=estimated'); f.page.wait_for_timeout(400)
    f.shot('TERM_CHANGE_U01_6'); f.pick_term(12); f.shot('TERM_CHANGE_U01_12')
    u01_term = f.page.input_value('#termInput'); u01_summary = f.text('#termSummaryText')
    url = f.click_nav('#saveQuote'); f.page.wait_for_timeout(400); f.shot('TERM_CHANGE_Q01')
    q01q = qs(url); req_after_u01 = f.ls(REQ_KEY); price_after_u01 = f.ls(PRICE_KEY)
    q01_total = f.text('#total'); q01_term_text = f.text('#termHumanText')
    # save the quote (persists quote_current, then redirects home); capture snapshot, then come back the same way
    f.click_nav('#save', timeout=10000); quote_saved = f.ls(QUOTE_KEY)
    f.goto('U01', f'unit={UNIT}&store=jianguo&target=5.0&term=6&fromS01State=estimated'); f.page.wait_for_timeout(300)
    f.pick_term(12); f.click_nav('#saveQuote'); f.page.wait_for_timeout(300)
    url = f.click_nav('#edit'); f.page.wait_for_timeout(400)
    o01q = qs(url); req_after_q01 = f.ls(REQ_KEY)
    f.page.goto(url + '&demoAutoAgree=1', wait_until='load'); f.page.wait_for_timeout(400); f.shot('TERM_CHANGE_O01')
    o01 = {'termText': f.text('#termText'), 'rentFee': f.text('#rentFee'), 'payableTotal': f.text('#payableTotal'), 'pay_label': f.text('#pay')}
    f.page.click('#pay'); f.page.wait_for_timeout(400)
    if f.page.query_selector('#phoneAuthSheet.show'):
        with f.page.expect_navigation(timeout=10000):
            f.page.click('#phoneAuthAllow')
    f.page.wait_for_timeout(500); f.shot('TERM_CHANGE_O02')
    order = f.ls(ORDER_KEY) or {}
    R['TERM_CHANGE'] = {'u01_term_after_click': u01_term, 'u01_term_summary': u01_summary, 'q01_query_term': q01q.get('term'), 'q01_total': q01_total, 'q01_term_text': q01_term_text,
                        'requirement_after_u01_commit': req_after_u01, 'price_snapshot_after_u01': price_after_u01,
                        'quote_saved': {k: quote_saved.get(k) for k in ['quote_id', 'term_months', 'total_price', 'initial_payable', 'unit_id', 'store_id']} if quote_saved else None,
                        'quote_saved_requirement_snapshot': (quote_saved or {}).get('requirement_snapshot'),
                        'o01_query_term': o01q.get('term'), 'requirement_after_q01_order': req_after_q01, 'o01': o01,
                        'landing_after_pay': page_name(f.page.url), 'o02_status_title': f.text('#statusTitle'),
                        'order': {k: order.get(k) for k in ['order_no', 'status', 'store_id', 'unit_id', 'volume', 'term_months', 'monthly_price', 'total_price', 'deposit_amount', 'management_fee', 'payable_total']},
                        'order_price_snapshot_term': (order.get('price_snapshot') or {}).get('term_months'), 'order_price_snapshot_upfront': (order.get('price_snapshot') or {}).get('upfront_payable'),
                        'order_requirement_snapshot': order.get('requirement_snapshot')}
    f.page.close()
    # ---------------- DIRECT_ORDER: U01 -> O01 -> O02 at the carried 6 months ----------------
    f = Flow(ctx, base, out, vp_label, console)
    f.goto('U01'); f.seed({REQ_KEY: req(6)})
    f.goto('U01', f'unit={UNIT}&store=jianguo&target=5.0&term=6&fromS01State=estimated'); f.page.wait_for_timeout(400)
    url = f.click_nav('#confirm'); f.page.wait_for_timeout(300); o01q = qs(url)
    f.page.goto(url + '&demoAutoAgree=1', wait_until='load'); f.page.wait_for_timeout(400); f.shot('DIRECT_ORDER_O01')
    o01 = {'termText': f.text('#termText'), 'rentFee': f.text('#rentFee'), 'payableTotal': f.text('#payableTotal'), 'pay_label': f.text('#pay')}
    f.page.click('#pay'); f.page.wait_for_timeout(400)
    if f.page.query_selector('#phoneAuthSheet.show'):
        with f.page.expect_navigation(timeout=10000):
            f.page.click('#phoneAuthAllow')
    f.page.wait_for_timeout(500); f.shot('DIRECT_ORDER_O02')
    order = f.ls(ORDER_KEY) or {}
    R['DIRECT_ORDER'] = {'o01_query_term': o01q.get('term'), 'o01': o01, 'landing_after_pay': page_name(f.page.url), 'o02_status_title': f.text('#statusTitle'),
                         'order': {k: order.get(k) for k in ['order_no', 'status', 'store_id', 'unit_id', 'volume', 'term_months', 'total_price', 'payable_total']},
                         'order_price_snapshot_term': (order.get('price_snapshot') or {}).get('term_months'), 'order_requirement_snapshot': order.get('requirement_snapshot'), 'requirement_after': f.ls(REQ_KEY)}
    f.page.close()
    # ---------------- H01 regression: continue-search card with / without term ----------------
    f = Flow(ctx, base, out, vp_label, console)
    f.goto('H01'); f.seed({REQ_KEY: req(0)}); f.page.reload(wait_until='load'); f.page.wait_for_timeout(500)
    h_no = {'estimatedTerm': f.text('#estimatedTerm'), 'estimatedDesc': f.text('#estimatedDesc')}
    f.seed({REQ_KEY: req(6)}); f.page.reload(wait_until='load'); f.page.wait_for_timeout(500)
    h_has = {'estimatedTerm': f.text('#estimatedTerm'), 'estimatedDesc': f.text('#estimatedDesc')}
    f.shot('H01_regression'); R['H01_CARD'] = {'no_term': h_no, 'has_term': h_has}
    f.page.close()
    return R


def evaluate(R, expect):
    """Return list of (case, ok, note). expect='fixed' asserts the D-03/D-04 behaviour; 'baseline' only records."""
    checks = []
    def c(name, ok, note=''): checks.append((name, bool(ok), note))
    a = R['NO_TERM_M01']
    c('NO_TERM_M01 lands on estimator with requireTerm=1 (no default term)', a['landing'] == 'S5' and a['query'].get('requireTerm') == '1' and 'term' not in a['query'], f"{a['landing']} {a['query']}")
    c('NO_TERM_M01 badge says term pending, not 1个月', a['badge'] and '租期待选择' in a['badge'] and '1个月' not in a['badge'], a['badge'])
    c('NO_TERM_M01 saved requirement still has no term', not (a['requirement_after'] or {}).get('term_months'), str((a['requirement_after'] or {}).get('term_months')))
    b = R['NO_TERM_S01_STRIP']
    c('NO_TERM_S01 strip title says term pending', b['strip_title'] and '租期待选择' in b['strip_title'], b['strip_title'])
    c('NO_TERM_S01 strip click goes to term selection', b['landing'] == 'S5' and b['query'].get('requireTerm') == '1', f"{b['landing']} {b['query']}")
    d = R['NO_TERM_S01_ESTIMATED']
    c('NO_TERM_S01 estimated entry without term redirects to term selection', d['landing'] == 'S5' and d['query'].get('requireTerm') == '1', f"{d['landing']} {d['query']}")
    c('NO_TERM_S01 estimated entry does not persist a default term', not (d['requirement_after'] or {}).get('term_months'), str((d['requirement_after'] or {}).get('term_months')))
    u = R['NO_TERM_U01']
    c('NO_TERM_U01 term=0 stays unselected (no 1-month price)', (u['term_input'] in ('', None)) and u['after_confirm_page'] == 'U01' and not u['price_snapshot'], f"input={u['term_input']!r} page={u['after_confirm_page']} snapshot={bool(u['price_snapshot'])}")
    h = R['HAS_TERM']
    c('HAS_TERM resume keeps 6 months in S01', h['query'].get('term') == '6' and (h['requirement_after_s01'] or {}).get('term_months') == 6, f"{h['query'].get('term')} / {(h['requirement_after_s01'] or {}).get('term_months')}")
    c('HAS_TERM U01 inherits 6 months from context', h['u01_term_input'] == '6', h['u01_term_input'])
    t = R['TERM_CHANGE']
    c('TERM_CHANGE Q01 receives 12', t['q01_query_term'] == '12', t['q01_query_term'])
    c('TERM_CHANGE requirement term is 12 after U01 commit', (t['requirement_after_u01_commit'] or {}).get('term_months') == 12, str((t['requirement_after_u01_commit'] or {}).get('term_months')))
    c('TERM_CHANGE original 6-month estimate preserved', ((t['requirement_after_u01_commit'] or {}).get('original_estimate') or {}).get('term_months') == 6, str((t['requirement_after_u01_commit'] or {}).get('original_estimate')))
    c('TERM_CHANGE saved quote snapshot term = 12', t['quote_saved'] and t['quote_saved'].get('term_months') == 12 and (t['quote_saved_requirement_snapshot'] or {}).get('term_months') == 12, f"{t['quote_saved']} / {(t['quote_saved_requirement_snapshot'] or {}).get('term_months')}")
    c('TERM_CHANGE order reaches O02 PAID', t['landing_after_pay'] == 'O02' and t['order'].get('status') in ('PAID', 'PENDING_PAYMENT'), f"{t['landing_after_pay']} {t['order'].get('status')}")
    c('TERM_CHANGE order term / price snapshot / requirement snapshot all 12', t['order'].get('term_months') == 12 and t['order_price_snapshot_term'] == 12 and (t['order_requirement_snapshot'] or {}).get('term_months') == 12, f"order={t['order'].get('term_months')} price={t['order_price_snapshot_term']} req={(t['order_requirement_snapshot'] or {}).get('term_months')}")
    c('TERM_CHANGE requirement snapshot identity = store/unit of the order', (t['order_requirement_snapshot'] or {}).get('selected_store_id') == t['order'].get('store_id') and (t['order_requirement_snapshot'] or {}).get('selected_unit_id') == t['order'].get('unit_id'), str({k: (t['order_requirement_snapshot'] or {}).get(k) for k in ['selected_store_id', 'selected_unit_id']}))
    c('TERM_CHANGE payable total equals authoritative price snapshot', t['order'].get('payable_total') == t['order_price_snapshot_upfront'], f"{t['order'].get('payable_total')} vs {t['order_price_snapshot_upfront']}")
    o = R['DIRECT_ORDER']
    c('DIRECT_ORDER legit 6-month order not blocked (O02 reached)', o['landing_after_pay'] == 'O02' and o['order'].get('status') == 'PAID', f"{o['landing_after_pay']} {o['order'].get('status')}")
    c('DIRECT_ORDER order / price / requirement snapshot all 6', o['order'].get('term_months') == 6 and o['order_price_snapshot_term'] == 6 and (o['order_requirement_snapshot'] or {}).get('term_months') == 6, f"order={o['order'].get('term_months')} price={o['order_price_snapshot_term']} req={(o['order_requirement_snapshot'] or {}).get('term_months')}")
    hc = R['H01_CARD']
    c('H01 card: no term -> 待选择, 6 months -> 6个月 (unchanged behaviour)', hc['no_term']['estimatedTerm'] == '待选择' and hc['has_term']['estimatedTerm'] == '6个月', str(hc))
    return checks


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--port', type=int, default=4181); ap.add_argument('--expect', choices=['fixed', 'baseline'], default='fixed')
    args = ap.parse_args(); out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    port = free_port(args.port); server = start_server(port); base = f'http://127.0.0.1:{port}'
    console = []; results = {'root': str(ROOT), 'base_url': base, 'expect': args.expect, 'viewports': {}}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for vp in [(375, 812), (390, 844)]:
                label = f'{vp[0]}x{vp[1]}'
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2, is_mobile=True, has_touch=True)
                R = run_cases(ctx, base, out, label, console)
                checks = evaluate(R, args.expect)
                results['viewports'][label] = {'cases': R, 'checks': [{'name': n, 'ok': ok, 'note': note} for n, ok, note in checks]}
                ctx.close()
            browser.close()
    finally:
        server.terminate()
    (out / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    (out / 'browser_console.log').write_text('\n'.join(console), encoding='utf-8')
    all_ok = True
    for label, blk in results['viewports'].items():
        for ch in blk['checks']:
            print(('PASS' if ch['ok'] else 'FAIL') + f' [{label}] ' + ch['name'] + ('' if ch['ok'] else '  <- ' + ch['note']))
            all_ok = all_ok and ch['ok']
    print('MODE', args.expect, 'ALL_OK' if all_ok else 'HAS_FAILURES')
    sys.exit(0 if (all_ok or args.expect == 'baseline') else 1)


if __name__ == '__main__':
    main()
