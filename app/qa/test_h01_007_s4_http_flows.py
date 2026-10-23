"""H01-007-S4 (D-01 browse vs. requirement-resume separation / D-02 S01 return-state restore) real HTTP browser flows.

Serves the package over a local http.server and drives real page navigations in Chromium
(localStorage seeding + user-like clicks only; no DOM injection of business logic).

Usage:
  python qa/test_h01_007_s4_http_flows.py --out outputs/h01_007_s4/<label> [--root <package root>] [--port 4184] [--expect fixed|baseline]

Cases: FRESH_BROWSE, HISTORY_BROWSE, CONTINUE_REQUIREMENT, NO_TERM, STORE_CARD, FILTER_RETURN, PAYMENT_FAILED_HOME, QUOTE_EXPIRED_HOME.
Viewports: 375x812 and 390x844 (DPR 2). Produces results.json, per-step screenshots and a console log.
Exit code 0 when every check matches the requested expectation (fixed: all pass; baseline: defect checks fail, invariants pass).
"""
import argparse, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_h01_007_s1_http_flows import Flow, free_port, qs, page_name, req, PAGES, REQ_KEY, ORDER_KEY, PRICE_KEY, QUOTE_KEY
from test_h01_007_s2_http_flows import HIST_KEY, UNIT_A, u01, pay, order_brief
from test_h01_007_s3_http_flows import start_server, visible, attr, setls, rmls, q01_state, u01_requote, o01_resume, save_quote, RESULT_KEY
from playwright.sync_api import sync_playwright

LOC_KEY = 'mini_koala_location_permission_demo_v1'   # sessionStorage: 'allowed' = the demo location layer is already granted
PAGES['S02'] = 'prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'


def allow_location(f):
    f.page.evaluate("([k,v])=>sessionStorage.setItem(k,v)", [LOC_KEY, 'allowed'])


def open_home(f, seed=None):
    """Open H01 like a returning user: the demo location layer is granted, business state lives in localStorage."""
    f.goto('H01'); allow_location(f)
    if seed is not None: f.seed(seed)
    f.page.reload(wait_until='load'); f.page.wait_for_timeout(500)


def home_state(f):
    return {'estimated_visible': visible(f, '#estimatedCard'), 'pending_visible': visible(f, '#pendingCard'), 'quoted_visible': visible(f, '#quotedCard'),
            'continueFind': f.text('#continueFind'), 'estimatedDesc': f.text('#estimatedDesc'), 'storeLink': f.text('#storeLink'), 'pendingTitle': f.text('#pendingTitle'), 'quotedTitle': f.text('#quotedTitle'),
            'focused_task': f.page.evaluate("()=>document.querySelector('.hsi-focused')?.id||null"),
            'store_cards': f.page.evaluate("()=>[...document.querySelectorAll('.unified-store')].map(c=>({id:c.dataset.storeId,mode:c.dataset.mode||null,price:(c.querySelector('[data-home-price],[data-matched-price]')?.textContent||'').trim()}))")}


def s01_state(f):
    return {'active_chip': f.page.evaluate("()=>document.querySelector('.stagechip.active')?.dataset.state||null"),
            'body_state': f.page.evaluate("()=>[...document.body.classList].filter(c=>c.startsWith('v274-'))"),
            'strip_title': f.text('#browseStripTitle'), 'strip_action': f.text('#browseStripAction'), 'demand_summary': f.text('#demandSummary'),
            'sort': f.text('#sortFilterValue'), 'distance': f.text('#distanceFilterValue'), 'service': f.text('#serviceFilterValue'),
            'quick': f.page.evaluate("()=>[...document.querySelectorAll('[data-quick][aria-pressed=\"true\"]')].map(b=>b.dataset.quick)"),
            'visible_stores': f.page.evaluate("()=>[...document.querySelectorAll('.store[data-id]')].filter(c=>c.offsetParent!==null).map(c=>c.dataset.id)"),
            'loadMore': f.text('#loadMore'), 'loadMore_hidden': f.page.evaluate("()=>document.getElementById('loadMore')?.classList.contains('hidden')"),
            'scrollTop': f.page.evaluate("()=>document.getElementById('page')?.scrollTop||0"), 'query': qs(f.page.url)}


def s02_state(f):
    return {'active_chip': f.page.evaluate("()=>document.querySelector('.stagechip.active')?.dataset.state||null"), 'demand_summary': f.text('#demandSummary'), 'query': qs(f.page.url)}


def req_brief(r):
    r = r or {}
    return {k: r.get(k) for k in ['requirement_id', 'target_volume', 'term_months', 'selected_store_id', 'selection_source', 'updated_at']}


def pick_sort(f, choice):
    f.page.click('#sortFilterBtn'); f.page.wait_for_timeout(200); f.page.click(f'.quick-sort-option[data-sort-choice="{choice}"]'); f.page.wait_for_timeout(300)


def pick_distance(f, choice):
    f.page.click('#distanceFilterBtn'); f.page.wait_for_timeout(200); f.page.click(f'.quick-distance-option[data-distance-choice="{choice}"]'); f.page.wait_for_timeout(300)


def pick_service(f, value):
    f.page.click('#filterBtn'); f.page.wait_for_timeout(200); f.page.click(f'#filterSheet .pill[data-value="{value}"]'); f.page.wait_for_timeout(100); f.page.click('#applyFilter'); f.page.wait_for_timeout(300)


def run_cases(ctx, base, out, vp, console):
    R = {}
    # ---------------- FRESH_BROWSE: a new user (no saved state) browses stores from the home task card ----------------
    f = Flow(ctx, base, out, vp, console)
    open_home(f, {}); F = {'home': home_state(f)}; f.shot('FRESH_BROWSE_H01')
    url = f.click_nav('#storeLink'); f.page.wait_for_timeout(500); F['landing'] = page_name(url); F['s01'] = s01_state(f); f.shot('FRESH_BROWSE_S01')
    R['FRESH_BROWSE'] = F; f.page.close()
    # ---------------- HISTORY_BROWSE: a saved 5m3 / 6-month requirement must not turn "查看附近门店" into a matched list ----------------
    f = Flow(ctx, base, out, vp, console)
    open_home(f, {REQ_KEY: req(6)}); H = {'home': home_state(f), 'req_before': req_brief(f.ls(REQ_KEY))}; f.shot('HISTORY_BROWSE_H01')
    url = f.click_nav('#storeLink'); f.page.wait_for_timeout(500); H['landing'] = page_name(url); H['s01'] = s01_state(f); H['req_after_s01'] = req_brief(f.ls(REQ_KEY)); f.shot('HISTORY_BROWSE_S01')
    # the explicit switch offered on the browse list still restores the requirement
    if H['landing'] == 'S01' and visible(f, '#estimateStrip'):
        url = f.click_nav('#estimateStrip'); f.page.wait_for_timeout(500); H['strip_landing'] = page_name(url); H['strip_s01'] = s01_state(f); f.shot('HISTORY_BROWSE_S01_strip_switch')
    # bottom tab 门店 from home
    open_home(f); url = f.click_nav('#navStores'); f.page.wait_for_timeout(400); H['tab_landing'] = page_name(url); H['tab_query'] = qs(url); H['tab_chip'] = f.page.evaluate("()=>document.querySelector('.stagechip.active')?.dataset.state||null")
    H['req_final'] = req_brief(f.ls(REQ_KEY))
    R['HISTORY_BROWSE'] = H; f.page.close()
    # ---------------- CONTINUE_REQUIREMENT: only the explicit 继续找仓 card restores the saved requirement ----------------
    f = Flow(ctx, base, out, vp, console)
    open_home(f, {REQ_KEY: req(6)}); C = {'home': home_state(f)}
    url = f.click_nav('#continueFind'); f.page.wait_for_timeout(500); C['landing'] = page_name(url); C['s01'] = s01_state(f); C['req_after'] = req_brief(f.ls(REQ_KEY)); f.shot('CONTINUE_REQUIREMENT_S01')
    R['CONTINUE_REQUIREMENT'] = C; f.page.close()
    # ---------------- NO_TERM: capacity without a term never gets a silent default month count ----------------
    f = Flow(ctx, base, out, vp, console)
    open_home(f, {REQ_KEY: req(0)}); N = {'home': home_state(f)}; f.shot('NO_TERM_H01')
    url = f.click_nav('#continueFind'); f.page.wait_for_timeout(400); N['continue'] = {'landing': page_name(url), 'query': qs(url), 'req_after': req_brief(f.ls(REQ_KEY))}; f.shot('NO_TERM_continue_landing')
    open_home(f); url = f.click_nav('#storeLink'); f.page.wait_for_timeout(400); N['browse'] = {'landing': page_name(url), 's01': s01_state(f), 'req_after': req_brief(f.ls(REQ_KEY))}; f.shot('NO_TERM_S01')
    open_home(f); url = f.click_nav('.unified-store'); f.page.wait_for_timeout(500); N['card'] = {'landing': page_name(url), 's02': s02_state(f), 'req_after': req_brief(f.ls(REQ_KEY))}; f.shot('NO_TERM_S02_from_card')
    R['NO_TERM'] = N; f.page.close()
    # ---------------- STORE_CARD: the home recommendation cards keep plain browse intent even with a saved requirement ----------------
    f = Flow(ctx, base, out, vp, console)
    open_home(f, {REQ_KEY: req(6)}); S = {'home': home_state(f), 'req_before': req_brief(f.ls(REQ_KEY))}
    url = f.click_nav('.unified-store'); f.page.wait_for_timeout(500); S['card'] = {'landing': page_name(url), 's02': s02_state(f), 'req_after': req_brief(f.ls(REQ_KEY))}; f.shot('STORE_CARD_S02')
    if S['card']['landing'] == 'S02':
        url = f.click_nav('#backBtn'); f.page.wait_for_timeout(500); S['back'] = {'landing': page_name(url), 's01': s01_state(f)}; f.shot('STORE_CARD_back_S01')
    open_home(f)
    if f.page.query_selector('.storeUnits'):
        url = f.click_nav('.storeUnits'); f.page.wait_for_timeout(400); S['units_btn'] = {'landing': page_name(url), 's02': s02_state(f)}
    S['req_final'] = req_brief(f.ls(REQ_KEY))
    R['STORE_CARD'] = S; f.page.close()
    # ---------------- FILTER_RETURN: S01 (sort / distance / service / loaded / scroll) -> S02 -> back keeps the list the user built ----------------
    f = Flow(ctx, base, out, vp, console)
    open_home(f, {}); url = f.click_nav('#storeLink'); f.page.wait_for_timeout(500); G = {'landing': page_name(url), 'initial': s01_state(f)}
    pick_sort(f, 'price'); pick_distance(f, '10'); pick_service(f, 'elevator')
    f.page.click('[data-quick="special"]'); f.page.wait_for_timeout(300)
    if f.page.query_selector('#loadMore') and not f.page.evaluate("()=>document.getElementById('loadMore').classList.contains('hidden')"):
        f.page.evaluate("()=>document.getElementById('loadMore').scrollIntoView()"); f.page.click('#loadMore'); f.page.wait_for_timeout(300)
    f.page.evaluate("()=>{document.getElementById('page').scrollTop=420}"); f.page.wait_for_timeout(200)
    G['before'] = s01_state(f); f.shot('FILTER_RETURN_S01_before')
    target_store = G['before']['visible_stores'][min(2, len(G['before']['visible_stores']) - 1)] if G['before']['visible_stores'] else None
    G['target_store'] = target_store
    if target_store:
        f.page.evaluate("id=>document.querySelector(`.store[data-id=\"${id}\"]`).scrollIntoView({block:'center'})", target_store); f.page.wait_for_timeout(150)
        G['before']['scrollTop'] = f.page.evaluate("()=>document.getElementById('page')?.scrollTop||0")   # the position the user actually leaves from
        G['before']['card_top'] = f.page.evaluate("id=>Math.round(document.querySelector(`.store[data-id=\"${id}\"]`).getBoundingClientRect().top)", target_store)
        url = f.click_nav(f'.store[data-id="{target_store}"]'); f.page.wait_for_timeout(500); G['s02'] = {'landing': page_name(url), 'query': qs(url)}; f.shot('FILTER_RETURN_S02')
        url = f.click_nav('#backBtn'); f.page.wait_for_timeout(700); G['after'] = {'landing': page_name(url), **s01_state(f)}
        G['after']['card_top'] = f.page.evaluate("id=>{const e=document.querySelector(`.store[data-id=\"${id}\"]`);return e?Math.round(e.getBoundingClientRect().top):null}", target_store); f.shot('FILTER_RETURN_S01_after')
    R['FILTER_RETURN'] = G; f.page.close()
    # ---------------- PAYMENT_FAILED_HOME: the S3 failed-payment task card keeps working next to a saved requirement ----------------
    f = Flow(ctx, base, out, vp, console)
    f.goto('U01'); f.seed({REQ_KEY: req(6)}); allow_location(f); u = u01(f, *UNIT_A, 6)
    url = f.click_nav('#confirm'); f.page.goto(url + '&demoAutoAgree=1&review=1&simulatePayment=PAYMENT_FAILED', wait_until='load'); f.page.wait_for_timeout(500); pay(f)
    on1 = (f.ls(ORDER_KEY) or {}).get('order_no')
    f.goto('O02', f'orderNo={on1}'); f.page.wait_for_timeout(400)
    P = {'order': order_brief(f.ls(ORDER_KEY)), 'o02_title': f.text('#statusTitle')}
    open_home(f); P['home'] = home_state(f); f.shot('PAYMENT_FAILED_HOME_H01')
    url = f.click_nav('#storeLink'); f.page.wait_for_timeout(400); P['browse'] = {'landing': page_name(url), 's01': s01_state(f)}; f.shot('PAYMENT_FAILED_HOME_S01')
    open_home(f); url = f.click_nav('#pendingPay'); f.page.wait_for_timeout(700); P['pay'] = {'landing': page_name(url), **o01_resume(f)}; f.shot('PAYMENT_FAILED_HOME_O01')
    P['order_after'] = order_brief(f.ls(ORDER_KEY)); P['req_after'] = req_brief(f.ls(REQ_KEY))
    R['PAYMENT_FAILED_HOME'] = P; f.page.close()
    # ---------------- QUOTE_EXPIRED_HOME: an expired saved quote still restores through the S3 re-check path ----------------
    f = Flow(ctx, base, out, vp, console)
    seed = save_quote(f, -1); allow_location(f)
    open_home(f); Q = {'seed': seed['quote'], 'home': home_state(f)}; f.shot('QUOTE_EXPIRED_HOME_H01')
    url = f.click_nav('#storeLink'); f.page.wait_for_timeout(400); Q['browse'] = {'landing': page_name(url), 's01': s01_state(f)}
    open_home(f); url = f.click_nav('#homeViewQuote'); f.page.wait_for_timeout(500); Q['q01'] = {'landing': page_name(url), 'query_status': qs(url).get('quoteStatus'), **q01_state(f)}; f.shot('QUOTE_EXPIRED_HOME_Q01')
    url = f.click_nav('#edit'); f.page.wait_for_timeout(700); Q['recheck'] = {'landing': page_name(url), 'query': {k: qs(url).get(k) for k in ['requote', 'term', 'store']}}
    if page_name(url) == 'U01': Q['recheck']['u01'] = u01_requote(f); f.shot('QUOTE_EXPIRED_HOME_U01')
    R['QUOTE_EXPIRED_HOME'] = Q; f.page.close()
    return R


def evaluate(R):
    """Returns [(name, ok, note, kind)] with kind 'defect' (expected to FAIL on the un-patched tree) or 'invariant' (must pass on both)."""
    checks = []
    def c(name, ok, note='', kind='defect'): checks.append((name, bool(ok), str(note)[:700], kind))
    def browse_query(q): return q.get('state') == 'browse' and q.get('entry') == 'browse_nearby' and 'target' not in q and 'term' not in q
    fb = R['FRESH_BROWSE']
    c('FRESH_BROWSE 查看附近门店 opens the plain browse list (no target/term carried)', fb['landing'] == 'S01' and browse_query(fb['s01']['query']) and fb['s01']['active_chip'] == 'browse' and fb['s01']['visible_stores'], f"{fb['landing']} {fb['s01']['query']} chip={fb['s01']['active_chip']}", 'invariant')
    c('FRESH_BROWSE browse strip invites estimation (no saved requirement)', (fb['s01']['strip_title'] or '').startswith('不确定'), fb['s01']['strip_title'], 'invariant')
    hb = R['HISTORY_BROWSE']
    c('HISTORY_BROWSE 查看附近门店 stays plain browse although a 5m3/6-month requirement is saved', hb['landing'] == 'S01' and browse_query(hb['s01']['query']) and hb['s01']['active_chip'] == 'browse' and 'v274-browse-state' in hb['s01']['body_state'], f"{hb['landing']} {hb['s01']['query']} chip={hb['s01']['active_chip']} body={hb['s01']['body_state']}")
    c('HISTORY_BROWSE browse list shows the saved requirement as an explicit switch, not as the active filter', '您已有找仓需求' in (hb['s01']['strip_title'] or '') and '按我的需求匹配' in (hb['s01']['strip_action'] or ''), f"{hb['s01']['strip_title']} / {hb['s01']['strip_action']}")
    c('HISTORY_BROWSE explicit 按我的需求匹配 restores 5.0m3 / 6 months', hb.get('strip_landing') == 'S01' and hb.get('strip_s01', {}).get('query', {}).get('state') == 'estimated' and hb.get('strip_s01', {}).get('query', {}).get('target') == '5.0' and hb.get('strip_s01', {}).get('query', {}).get('term') == '6' and hb.get('strip_s01', {}).get('active_chip') == 'estimated', f"{hb.get('strip_landing')} {hb.get('strip_s01', {}).get('query')}")
    c('HISTORY_BROWSE bottom tab 门店 from home is plain browse too', hb['tab_landing'] == 'S01' and browse_query(hb['tab_query']) and hb['tab_chip'] == 'browse', f"{hb['tab_landing']} {hb['tab_query']} chip={hb['tab_chip']}")
    c('HISTORY_BROWSE the saved requirement is never deleted by browsing', hb['req_final']['target_volume'] == 5 and hb['req_final']['term_months'] == 6 and hb['req_after_s01']['target_volume'] == 5, f"{hb['req_after_s01']} {hb['req_final']}", 'invariant')
    cr = R['CONTINUE_REQUIREMENT']
    c('CONTINUE_REQUIREMENT 继续找仓 card is shown with 继续看推荐 and restores target=5.0 term=6 into the matched list', cr['home']['estimated_visible'] and cr['home']['continueFind'] == '继续看推荐' and cr['landing'] == 'S01' and cr['s01']['query'].get('state') == 'estimated' and cr['s01']['query'].get('target') == '5.0' and cr['s01']['query'].get('term') == '6' and cr['s01']['active_chip'] == 'estimated' and '6个月' in (cr['s01']['demand_summary'] or ''), f"{cr['home']['continueFind']} {cr['landing']} {cr['s01']['query']} {cr['s01']['demand_summary']}", 'invariant')
    nt = R['NO_TERM']
    c('NO_TERM 继续找仓 without a term goes to term selection (requireTerm=1), never a default month count', nt['home']['continueFind'] == '选择租期' and nt['continue']['landing'] == 'S5' and nt['continue']['query'].get('requireTerm') == '1' and float(nt['continue']['query'].get('knownSize') or 0) == 5.0 and 'term' not in nt['continue']['query'] and not nt['continue']['req_after']['term_months'], f"{nt['home']['continueFind']} {nt['continue']}", 'invariant')
    c('NO_TERM 查看附近门店 is plain browse and leaves term_months empty', nt['browse']['landing'] == 'S01' and browse_query(nt['browse']['s01']['query']) and not nt['browse']['req_after']['term_months'], f"{nt['browse']['landing']} {nt['browse']['s01']['query']} {nt['browse']['req_after']}", 'invariant')
    c('NO_TERM home store card opens S02 in browse (no matched state built from a term-less requirement)', nt['card']['landing'] == 'S02' and nt['card']['s02']['query'].get('state') == 'browse' and 'target' not in nt['card']['s02']['query'] and 'term' not in nt['card']['s02']['query'] and not nt['card']['req_after']['term_months'], f"{nt['card']['landing']} {nt['card']['s02']['query']} req={nt['card']['req_after']}")
    sc = R['STORE_CARD']
    c('STORE_CARD home recommendation card enters S02 with browse intent (no target/term/matched) despite the saved requirement', sc['card']['landing'] == 'S02' and sc['card']['s02']['query'].get('state') == 'browse' and 'target' not in sc['card']['s02']['query'] and 'term' not in sc['card']['s02']['query'] and sc['card']['s02']['active_chip'] == 'browse', f"{sc['card']['landing']} {sc['card']['s02']['query']} chip={sc['card']['s02']['active_chip']}")
    if sc.get('units_btn') is not None: c('STORE_CARD 查看仓位 button on the card behaves the same', sc['units_btn'].get('landing') == 'S02' and sc['units_btn'].get('s02', {}).get('query', {}).get('state') == 'browse', sc['units_btn'])
    c('STORE_CARD back from S02 returns to the browse list', sc.get('back', {}).get('landing') == 'S01' and sc.get('back', {}).get('s01', {}).get('active_chip') == 'browse' and 'v274-browse-state' in sc.get('back', {}).get('s01', {}).get('body_state', []), sc.get('back', {}).get('s01', {}).get('query'))
    c('STORE_CARD the saved requirement survives the card visit', sc['req_final']['target_volume'] == 5 and sc['req_final']['term_months'] == 6, sc['req_final'], 'invariant')
    fr = R['FILTER_RETURN']; b = fr.get('before', {}); a = fr.get('after', {})
    c('FILTER_RETURN the user could build a filtered list (price sort, 10km, elevator, special, more loaded, scrolled)', fr['landing'] == 'S01' and b.get('sort') and b.get('sort') != fr['initial'].get('sort') and '10' in b.get('distance', '') and '服务' in b.get('service', '') and '(' in b.get('service', '') and b.get('quick') == ['special'] and b.get('scrollTop', 0) > 0 and fr.get('target_store'), b, 'invariant')
    c('FILTER_RETURN back from S02 lands on the browse list', a.get('landing') == 'S01' and a.get('active_chip') == 'browse', f"{a.get('landing')} {a.get('query')}", 'invariant')
    c('FILTER_RETURN sort is restored', a.get('sort') == b.get('sort'), f"before={b.get('sort')} after={a.get('sort')} query={a.get('query')}")
    c('FILTER_RETURN distance filter is restored', a.get('distance') == b.get('distance'), f"before={b.get('distance')} after={a.get('distance')}")
    c('FILTER_RETURN service filter is restored', a.get('service') == b.get('service'), f"before={b.get('service')} after={a.get('service')}")
    c('FILTER_RETURN quick tag is restored', a.get('quick') == b.get('quick'), f"before={b.get('quick')} after={a.get('quick')}", 'invariant')
    c('FILTER_RETURN loaded store count is restored', a.get('visible_stores') == b.get('visible_stores'), f"before={len(b.get('visible_stores', []))} after={len(a.get('visible_stores', []))} loadMore={a.get('loadMore')}")
    left_at = int(fr.get('s02', {}).get('query', {}).get('scroll') or 0)   # the offset S01 reported when the user left (Chromium may nudge the list while tapping the card)
    c('FILTER_RETURN scroll position is restored (the tapped store card sits where the user left it)', a.get('scrollTop', 0) > 0 and left_at > 0 and a.get('card_top') is not None and abs(a['card_top'] - b.get('card_top', -999)) <= 4, f"before_tap: scrollTop={b.get('scrollTop')} card_top={b.get('card_top')} | left_at={left_at} | after: scrollTop={a.get('scrollTop')} card_top={a.get('card_top')}")
    pf = R['PAYMENT_FAILED_HOME']
    c('PAYMENT_FAILED_HOME the failed-payment task card wins over the saved requirement', pf['home']['pending_visible'] and pf['home']['focused_task'] == 'pendingCard' and '未完成' in (pf['home']['pendingTitle'] or '') and pf['order']['status'] == 'PAYMENT_FAILED', f"{pf['home']['focused_task']} {pf['home']['pendingTitle']} {pf['order']}", 'invariant')
    c('PAYMENT_FAILED_HOME 继续支付 reopens the same order in O01 with the S3 re-check and pay enabled', pf['pay']['landing'] == 'O01' and pf['pay']['query_orderNo'] == pf['order']['order_no'] and pf['pay']['resume_result'] == 'ok' and pf['pay']['pay_disabled'] is False and pf['order_after']['order_no'] == pf['order']['order_no'] and pf['order_after']['status'] == 'PAYMENT_FAILED', f"{pf['pay']} {pf['order_after']}", 'invariant')
    c('PAYMENT_FAILED_HOME 查看附近门店 is still plain browse next to the failed order', pf['browse']['landing'] == 'S01' and browse_query(pf['browse']['s01']['query']) and pf['browse']['s01']['active_chip'] == 'browse', f"{pf['browse']['landing']} {pf['browse']['s01']['query']}")
    qe = R['QUOTE_EXPIRED_HOME']
    c('QUOTE_EXPIRED_HOME the expired quote is shown as the home task (原方案已过参考期)', qe['home']['quoted_visible'] and qe['home']['focused_task'] == 'quotedCard' and '已过参考期' in (qe['home']['quotedTitle'] or ''), f"{qe['home']['focused_task']} {qe['home']['quotedTitle']}", 'invariant')
    c('QUOTE_EXPIRED_HOME Q01 shows the expiry notice and the re-check path reaches U01 with an unchanged price', qe['q01']['landing'] == 'Q01' and qe['q01']['query_status'] == 'expired' and qe['q01']['notice'] and '48' in qe['q01']['notice'] and qe['recheck']['landing'] == 'U01' and qe['recheck']['query'].get('requote') == '1' and qe['recheck'].get('u01', {}).get('result') == 'same', f"{qe['q01']} {qe['recheck']}", 'invariant')
    c('QUOTE_EXPIRED_HOME 查看附近门店 is plain browse next to the saved quote + requirement', qe['browse']['landing'] == 'S01' and browse_query(qe['browse']['s01']['query']), f"{qe['browse']['landing']} {qe['browse']['s01']['query']}")
    return checks


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--root', default=str(Path(__file__).resolve().parents[1])); ap.add_argument('--port', type=int, default=4184); ap.add_argument('--expect', choices=['fixed', 'baseline'], default='fixed')
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
