"""H01-007-P1: real HTTP C02 layout and pending -> switch/no coupon -> payment.
Usage: python3 qa/test_h01_007_p1_http_flows.py --out outputs/p1_http
Requires Python Playwright and its Chromium. NOT run in the producing environment.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from test_h01_007_s1_http_flows import Flow, free_port, req, REQ_KEY, ORDER_KEY, qs
from test_h01_007_s2_http_flows import start_server, u01, pay, wallet, UNIT_A

def run_case(ctx, base, out, label, mode, console):
    f = Flow(ctx, base, out, label, console)
    f.goto('U01')
    f.seed({REQ_KEY: req(12), 'mini_koala_coupon_selection_v1': {'mode': 'manual', 'coupon_id': 'CPN-001'}})
    u01(f, *UNIT_A, 12)
    url = f.click_nav('#confirm')
    f.page.goto(url + '&demoAutoAgree=1&review=1&simulatePayment=PENDING', wait_until='load')  # ACCEPTANCE FIXTURE FIX: review=1 required for simulatePayment (see O01 reviewMode)
    f.page.wait_for_timeout(500)
    pay(f)
    pending = f.ls(ORDER_KEY) or {}
    assert pending.get('status') == 'PENDING_PAYMENT', pending
    old = wallet(f).get('CPN-001', {})
    assert old.get('status') == 'LOCKED', old
    u01(f, *UNIT_A, 12)
    f.page.click('#couponChangeV1')
    f.page.wait_for_load_state('load')
    geometry = f.page.evaluate("""() => ['.coupon-bottom','#auto','#none'].map(s=>{
      const e=document.querySelector(s), r=e.getBoundingClientRect();
      return {selector:s,x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:r.width,
        visible:r.x>=-0.5&&r.right<=innerWidth+0.5&&r.y>=0&&r.bottom<=innerHeight+0.5,
        transform:getComputedStyle(e).transform};})""")
    assert all(r['visible'] for r in geometry), geometry
    assert geometry[0]['transform'] == 'none', geometry
    f.shot(mode + '_C02_full_buttons')
    f.page.click('#none' if mode == 'NO_COUPON' else '[data-id="CPN-002"]')
    f.page.wait_for_load_state('load')
    f.page.wait_for_timeout(600)
    url = f.click_nav('#confirm')
    f.page.goto(url + '&demoAutoAgree=1', wait_until='load')
    f.page.wait_for_timeout(500)
    # A changed-price recovery must pass through the real acknowledgement UI.
    reprice = f.page.locator('#orderResumeReprice')
    if reprice.count() and reprice.is_visible():
        f.click_nav('#orderResumeReprice')
        ack = f.page.locator('#requoteAck')
        if ack.count() and ack.is_visible():
            ack.click()
        url = f.click_nav('#confirm')
        f.page.goto(url + '&demoAutoAgree=1', wait_until='load')
        f.page.wait_for_timeout(500)
    before = f.page.locator('#payableTotal').inner_text()
    assert pay(f) is not False
    settled = f.ls(ORDER_KEY) or {}
    assert settled.get('status') == 'PAID', settled
    assert settled.get('order_no') == pending.get('order_no'), (pending, settled)
    assert qs(f.page.url).get('orderNo') == settled['order_no']
    rows = wallet(f)
    assert rows['CPN-001']['status'] == 'INVALID', rows
    assert not rows['CPN-001'].get('locked_order_id'), rows
    if mode == 'NO_COUPON':
        assert not settled.get('user_coupon_id'), settled
        assert rows['CPN-002']['status'] == 'INVALID', rows
    else:
        assert settled.get('coupon_id') == 'CPN-002', settled
        assert rows['CPN-002']['status'] == 'REDEEMED', rows
    assert rows['CPN-003']['status'] == 'INVALID', rows
    f.shot(mode + '_O02_paid')
    f.page.reload(wait_until='load')
    f.page.wait_for_timeout(400)
    assert wallet(f) == rows
    result = {'mode': mode, 'layout': geometry, 'order_no': settled['order_no'],
              'o01_payable': before, 'paid_amount': settled.get('payable_total'), 'wallet': rows}
    f.page.close()
    return result

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    root = Path(__file__).resolve().parents[1]
    port = free_port(4191)
    server = start_server(root, port)
    console, results = [], {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for width, height in [(375, 812), (390, 844)]:
                label = f'{width}x{height}'
                ctx = browser.new_context(viewport={'width': width, 'height': height},
                                          device_scale_factor=2, is_mobile=True, has_touch=True)
                results[label] = [run_case(ctx, f'http://127.0.0.1:{port}', out, label, mode, console)
                                  for mode in ['NO_COUPON', 'SWITCH_COUPON']]
                ctx.close()
            browser.close()
        assert not any('PAGEERROR:' in line or '] error:' in line for line in console), console
        (out / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
        print('PASS dual-size layout / no-coupon / switched-coupon settlement')
    finally:
        server.terminate()
        (out / 'browser_console.log').write_text('\n'.join(console))

if __name__ == '__main__':
    main()
