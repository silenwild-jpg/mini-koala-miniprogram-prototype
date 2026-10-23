#!/usr/bin/env python3
"""Task 02B-3 — help-entry (global support) functional + collision probe for O01 / S01 (read-only, real Chromium, local HTTP).

Usage: python3 qa/mk_v3_help_entry_probe.py --base http://127.0.0.1:8831/prototype/ --out outputs/mk_v3_02b3/help_after [--label after]

For 375x812 and 390x844 (DPR 2, WeChat UA, zh-CN), pages S01 (browse after 允许 location, estimated) and O01 (U01 → 继续租用):
  placement : parent / mode / launcher rect, overlap with header title text, capsule placeholder, back button
  hit-test  : document.elementFromPoint at the launcher centre must resolve to the launcher (not covered by anything)
  samples   : first screen, every 120px scroll step, bottom, after resize, after filter / quick chip / pagination (S01),
              after sheet open/close (O01): hidden? launcher rect stable? elementFromPoint ok? overlap with content targets
              (legacy geometric check, informational for docked mode)
  expanded  : real mouse click on the launcher; actions visible, inside the viewport, hit-testable; wrapper never hidden;
              phone click runs the legacy handler (menu collapses, handler source contains tel:), chat opens the sheet,
              知道了 closes it, outside tap and Escape close the menu
  bottom    : last content bottom vs bottom bar / tab bar top at max scroll (page bottom clearance)
  float mode: same pages with the fallback forced (?mkv3help=float / window.MK_V3_HELP_MODE) — hidden-sample count,
              visible collisions, longest consecutive hidden run, nudge usage, expanded-never-hidden
  errors    : pageerror / console error / requestfailed
Nothing in the prototype is modified. Output: <out>/help_probe.json + PNG files."""
import argparse, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

S01 = 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'
U01 = ('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'
       '?store=MK_BJ_2CDB7BEE&unit=BJ0112S01A009&sizeOption=MK_BJ_2CDB7BEE__4.72&target=4.8&term=6')
UA = ('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) '
      'Mobile/15E148 MicroMessenger/8.0.49')
VIEWPORTS = [(375, 812), (390, 844)]
TARGETS_S01 = ['.estore-list-badge', '.estore-list-link', '.estore-list-title', '.price-number', '.price-unit', '.price-start', '.store-demo-tags .tag',
               '.card-open-chevron', '.store .name', '.store .badge', '.store .route', '.tab', '.moreline', '.browse-stock-line strong', '.fact .label',
               '.quick-store-filters button', '.compact-filter-btn', '.estore-list-points span', '.estore-list-note', '.distance-recovery', '.loc-empty button',
               '.loc-empty .search', '.empty-results button']
TARGETS_O01 = ['#managementFee', '#depositFee', '#rentFee', '#monthlyText', '#payableTotal', '#endDateText', '#termText', '.payable-hero span', '.row span',
               '.row b', '.order-rules button', '.order-rules span', '#prohibitedOpen', '#contractOpen', '.agreement label', '.agreement>div', '.bottombar .primary',
               '.bottombar .secondary', '.coupon-v1-inline-row', '.pay-after .item', '.storage-notice span', '.hint', '.section h2', '.date-input']

JS_STATE = '''(sels)=>{const q=s=>document.querySelector(s);const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]};
const s=q('#miniGlobalSupport'),l=q('#miniSupportLauncher');if(!s||!l)return {missing:true};
const sc=getComputedStyle(s),lc=getComputedStyle(l);const lr=l.getBoundingClientRect();
const hidden=sc.visibility==='hidden'||lc.visibility==='hidden'||sc.display==='none'||s.classList.contains('mk-v3-support-obstructed');
const ov=(a,b)=>a&&b&&a[0]<b[0]+b[2]&&a[0]+a[2]>b[0]&&a[1]<b[1]+b[3]&&a[1]+a[3]>b[1];
const h1=q('.header h1');let tr=null;if(h1){const rg=document.createRange();rg.selectNodeContents(h1);const r=rg.getBoundingClientRect();tr=[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]}
const L=R(l);const cx=lr.left+lr.width/2,cy=lr.top+lr.height/2;const top=document.elementFromPoint(cx,cy);const topOk=!!(top&&(top===l||l.contains(top)));
const hits=[];for(const sel of sels){for(const el of document.querySelectorAll(sel)){if(el.closest('#miniGlobalSupport'))continue;const r=el.getBoundingClientRect();if(r.width===0||r.height===0)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;if(r.left<lr.right&&r.right>lr.left&&r.top<lr.bottom&&r.bottom>lr.top){const ix=(Math.max(r.left,lr.left)+Math.min(r.right,lr.right))/2,iy=(Math.max(r.top,lr.top)+Math.min(r.bottom,lr.bottom))/2;const t=document.elementFromPoint(ix,iy);hits.push({sel,text:(el.textContent||'').trim().slice(0,24),coveredByHeader:!!(t&&t.closest('.header')),topAtOverlap:t?(t.id||t.className||t.tagName).toString().slice(0,30):null})}}}
const header=q('.header');const hr=R(header);
return {mode:s.getAttribute('data-mk-v3-help'),parent:s.parentElement?(s.parentElement.className||s.parentElement.tagName):null,cls:s.className,inline:s.getAttribute('style'),hidden,visibility:sc.visibility,position:sc.position,launcher:L,insideHeader:!!(hr&&L&&L[1]>=hr[1]&&L[1]+L[3]<=hr[1]+hr[3]+1),
 overlapTitle:ov(L,tr),overlapCapsule:ov(L,R(q('.wx-capsule-space'))),overlapBack:ov(L,R(q('.header .back'))),titleText:tr,topAtCenter:top?(top.id||top.className||top.tagName):null,topOk,
 hits:hits.slice(0,6),hitCount:hits.length,hitsCoveredByHeader:hits.filter(h=>h.coveredByHeader).length,launcherSpanDisplay:getComputedStyle(l.querySelector('span')).display,launcherIconFont:getComputedStyle(l.querySelector('i')).fontSize,launcherFont:lc.fontSize,
 aria:{expanded:l.getAttribute('aria-expanded'),haspopup:l.getAttribute('aria-haspopup'),controls:l.getAttribute('aria-controls'),label:l.getAttribute('aria-label'),groupRole:(q('#miniSupportActions')||{}).getAttribute?q('#miniSupportActions').getAttribute('role'):null},
 expanded:s.classList.contains('expanded'),nudged:s.classList.contains('mk-v3-help-nudged'),headerZ:header?getComputedStyle(header).zIndex:null,headerOpen:!!(header&&header.classList.contains('mk-v3-help-open'))}}'''
JS_ACTIONS = '''()=>[...document.querySelectorAll('#miniSupportActions button')].map(b=>{const r=b.getBoundingClientRect();const cs=getComputedStyle(b);const c=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);const sp=b.querySelector('span');
 return {id:b.id,text:b.textContent.trim(),label:b.getAttribute('aria-label'),rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],visible:cs.display!=='none'&&cs.visibility!=='hidden'&&r.height>0,inViewport:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,hitOk:!!(c&&(c===b||b.contains(c))),fontSize:sp?getComputedStyle(sp).fontSize:null,iconFont:getComputedStyle(b.querySelector('i')).fontSize,lineClip:sp?(sp.getBoundingClientRect().height<=r.height+1):null}})'''
JS_SCROLL = '''(y)=>{const el=document.querySelector('.page')||document.scrollingElement;el.style.scrollBehavior='auto';el.scrollTop=y;return [el.scrollTop,el.scrollHeight,el.clientHeight]}'''
JS_BOTTOM = '''()=>{const page=document.querySelector('.page');const bar=document.querySelector('.bottombar')||document.querySelector('.tabbar');if(!page||!bar)return null;const br=bar.getBoundingClientRect();
 let maxB=-1e9,who=null;for(const el of page.querySelectorAll('section,.section,.list>*,.store,.estore-list-card,.moreline,.agreement,.hint,.storage-notice,#loadMore')){if(el.closest('.bottombar,.tabbar,.header,#miniGlobalSupport,.sheet-mask'))continue;const r=el.getBoundingClientRect();if(r.height===0)continue;if(r.bottom>maxB){maxB=r.bottom;who=(el.id||el.className||el.tagName).toString().slice(0,40)}}
 return {lastContentBottom:Math.round(maxB),barTop:Math.round(br.top),clear:Math.round(br.top-maxB),who,pagePaddingBottom:getComputedStyle(page).paddingBottom}}'''


def attach(pg):
    errs = {'pageerror': [], 'console': [], 'requestfailed': []}
    pg.on('pageerror', lambda e: errs['pageerror'].append(str(e)[:200]))
    pg.on('console', lambda m: errs['console'].append(m.text[:200]) if m.type == 'error' else None)
    pg.on('requestfailed', lambda rq: errs['requestfailed'].append(rq.url[-100:]))
    return errs


def allow_location(pg):
    try:
        btn = pg.get_by_text('允许', exact=True).first
        if btn.is_visible():
            btn.click(); pg.wait_for_timeout(2300); return True
    except Exception:
        pass
    return False


def sample(pg, sels, tag):
    r = pg.evaluate(JS_STATE, sels); r['tag'] = tag; return r


def scan(pg, sels, step=120, limit=5000):
    rows = []; y = 0
    while True:
        st = pg.evaluate(JS_SCROLL, y); pg.wait_for_timeout(120)
        rows.append(sample(pg, sels, f'scroll{st[0]}'))
        if st[0] + st[2] >= st[1] - 2 or y > limit: break
        y += step
    pg.evaluate(JS_SCROLL, 100000); pg.wait_for_timeout(150)
    rows.append(sample(pg, sels, 'bottom'))
    return rows


def summarize(rows):
    hidden = [r for r in rows if r.get('hidden')]
    vis_hits = [r for r in rows if not r.get('hidden') and r.get('hitCount')]
    run, best = 0, 0
    for r in rows:
        run = run + 1 if r.get('hidden') else 0; best = max(best, run)
    rects = {tuple(r['launcher']) for r in rows if r.get('launcher')}
    uncovered = [r for r in vis_hits if r.get('hitCount', 0) > r.get('hitsCoveredByHeader', 0)]
    return {'samples': len(rows), 'hiddenSamples': len(hidden), 'visibleCollisionSamples': len(vis_hits), 'uncoveredCollisionSamples': len(uncovered), 'longestHiddenRun': best,
            'hitTestFailures': sum(1 for r in rows if not r.get('topOk') and not r.get('hidden')), 'launcherRects': [list(x) for x in rects][:4],
            'overlapTitleAny': any(r.get('overlapTitle') for r in rows), 'overlapCapsuleAny': any(r.get('overlapCapsule') for r in rows),
            'overlapBackAny': any(r.get('overlapBack') for r in rows), 'nudgedSamples': sum(1 for r in rows if r.get('nudged'))}


def expanded_checks(pg, sels, out, key, pfx, click_real=True, scan_rows=None):
    d = {}
    if scan_rows:
        vis = [r for r in scan_rows if not r.get('hidden') and r['tag'].startswith('scroll')]
        y = int(vis[0]['tag'][6:]) if vis else 0
        d['expandAtScroll'] = y; d['expandPositionVisible'] = bool(vis)
        pg.evaluate(JS_SCROLL, y); pg.wait_for_timeout(250)
        if not vis: click_real = False
    l = pg.locator('#miniSupportLauncher')
    box = l.bounding_box()
    if click_real and box:
        pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    else:
        pg.evaluate("()=>document.querySelector('#miniSupportLauncher').click()")
    pg.wait_for_timeout(350)
    d['afterLauncherClick'] = sample(pg, sels, 'expanded'); d['actions'] = pg.evaluate(JS_ACTIONS)
    pg.screenshot(path=str(out / f'{pfx}_expanded_{key}.png'))
    # scroll while expanded: menu must stay visible
    pg.evaluate(JS_SCROLL, 420); pg.wait_for_timeout(200)
    d['expandedScrolled'] = sample(pg, sels, 'expanded+scroll'); d['expandedScrolledActions'] = pg.evaluate(JS_ACTIONS)
    pg.screenshot(path=str(out / f'{pfx}_expanded_scrolled_{key}.png'))
    pg.evaluate(JS_SCROLL, d.get('expandAtScroll', 0)); pg.wait_for_timeout(200)
    d['beforePhone'] = sample(pg, sels, 'beforePhone')
    # phone: handler collapses the menu; navigation to tel: is not followed by the browser
    d['phoneHandler'] = pg.evaluate("()=>String(document.querySelector('#miniSupportPhone').onclick||'')")[:140]
    pb = pg.locator('#miniSupportPhone').bounding_box()
    if pb: pg.mouse.click(pb['x'] + pb['width'] / 2, pb['y'] + pb['height'] / 2)
    pg.wait_for_timeout(300)
    # 02B-4: the legacy handler sets location.href='tel:…'; headless Chromium reports it as a failed request and, for a few
    # hundred ms, document.querySelector('#miniGlobalSupport') can be null while the navigation attempt is pending.  Wait for
    # the entry to be back (max 3 s) instead of failing on a probe-side race; the state itself is unchanged by the tel: attempt.
    exp = None
    for _ in range(10):
        exp = pg.evaluate("()=>{const s=document.querySelector('#miniGlobalSupport');return s?s.classList.contains('expanded'):null}")
        if exp is not None: break
        pg.wait_for_timeout(300)
    d['afterPhone'] = {'expanded': exp, 'url': pg.url[-60:]}
    # chat: sheet opens, 知道了 closes
    pg.evaluate("()=>document.querySelector('#miniSupportLauncher').click()"); pg.wait_for_timeout(250)
    cb = pg.locator('#miniSupportChat').bounding_box()
    if cb: pg.mouse.click(cb['x'] + cb['width'] / 2, cb['y'] + cb['height'] / 2)
    pg.wait_for_timeout(300)
    d['chatMaskShown'] = pg.evaluate("()=>document.querySelector('#miniSupportMask').classList.contains('show')")
    d['chatSheetStyle'] = pg.evaluate("()=>{const s=document.querySelector('.mini-support-sheet');const h=s.querySelector('h3'),p=s.querySelector('p'),b=s.querySelector('button');return {h3:getComputedStyle(h).fontSize,p:getComputedStyle(p).fontSize,btn:getComputedStyle(b).height,btnFont:getComputedStyle(b).fontSize}}")
    pg.screenshot(path=str(out / f'{pfx}_chat_sheet_{key}.png'))
    pg.click('#miniSupportClose'); pg.wait_for_timeout(250)
    d['chatMaskClosed'] = not pg.evaluate("()=>document.querySelector('#miniSupportMask').classList.contains('show')")
    d['afterChat'] = sample(pg, sels, 'afterChat')
    # outside tap closes, Escape closes
    pg.evaluate("()=>document.querySelector('#miniSupportLauncher').click()"); pg.wait_for_timeout(200)
    pg.mouse.click(30, 400); pg.wait_for_timeout(250)
    d['outsideTapCloses'] = not pg.evaluate("()=>document.querySelector('#miniGlobalSupport').classList.contains('expanded')")
    pg.evaluate("()=>document.querySelector('#miniSupportLauncher').click()"); pg.wait_for_timeout(200)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
    d['escapeCloses'] = not pg.evaluate("()=>document.querySelector('#miniGlobalSupport').classList.contains('expanded')")
    d['launcherStillVisible'] = not sample(pg, sels, 'end')['hidden']
    return d


def run(args):
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    base = args.base
    result = {'label': args.label, 'base': base, 'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'), 'viewports': {}}
    with sync_playwright() as p:
        b = p.chromium.launch(); result['chromium'] = b.version
        for (w, h) in VIEWPORTS:
            key = f'{w}x{h}'; R = result['viewports'][key] = {}
            for mode in args.modes.split(','):
                def new_page():
                    c = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, user_agent=UA, locale='zh-CN')
                    if mode == 'float': c.add_init_script("window.MK_V3_HELP_MODE='float';")
                    pg = c.new_page(); return c, pg, attach(pg)
                # ---------------- S01 browse
                c, pg, errs = new_page(); d = {'page': 'S01', 'mode': mode}
                try:
                    pg.goto(base + S01); pg.wait_for_timeout(1500)
                    d['locationAllowed'] = allow_location(pg)
                    d['firstScreen'] = sample(pg, TARGETS_S01, 'first')
                    pg.screenshot(path=str(out / f'S01_{mode}_first_{key}.png'))
                    d['scan'] = scan(pg, TARGETS_S01); d['scanSummary'] = summarize(d['scan'])
                    pg.evaluate(JS_SCROLL, 0); pg.wait_for_timeout(150)
                    d['bottomClearance'] = (pg.evaluate(JS_SCROLL, 100000), pg.wait_for_timeout(150), pg.evaluate(JS_BOTTOM))[2]
                    pg.evaluate(JS_SCROLL, 0); pg.wait_for_timeout(150)
                    # resize
                    pg.set_viewport_size({'width': w + (15 if w == 375 else -15), 'height': h}); pg.wait_for_timeout(400)
                    d['afterResize'] = sample(pg, TARGETS_S01, 'resize')
                    pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(300)
                    # filter update (service multi-select apply), quick chip, pagination
                    pg.click('#filterBtn'); pg.wait_for_timeout(300)
                    d['panelOpen'] = sample(pg, TARGETS_S01, 'servicePanelOpen')
                    pg.click('#filterSheet .pill[data-value="24h"]'); pg.click('#applyFilter'); pg.wait_for_timeout(600)
                    d['afterServiceFilter'] = sample(pg, TARGETS_S01, 'serviceApplied')
                    pg.click('#filterBtn'); pg.wait_for_timeout(250); pg.click('#filterSheet .pill[data-value="24h"]'); pg.click('#applyFilter'); pg.wait_for_timeout(600)
                    pg.click('[data-quick="special"]'); pg.wait_for_timeout(500)
                    d['afterQuickChip'] = sample(pg, TARGETS_S01, 'quickSpecial')
                    pg.click('[data-quick="special"]'); pg.wait_for_timeout(400)
                    lm = pg.evaluate("()=>{const n=document.querySelector('#loadMore');return !!n&&getComputedStyle(n).display!=='none'}")
                    if lm:
                        pg.evaluate(JS_SCROLL, 100000); pg.wait_for_timeout(200); pg.click('#loadMore'); pg.wait_for_timeout(700)
                        d['afterPagination'] = sample(pg, TARGETS_S01, 'paginated'); d['scanAfterPagination'] = summarize(scan(pg, TARGETS_S01, step=160))
                        pg.screenshot(path=str(out / f'S01_{mode}_paginated_bottom_{key}.png'))
                    pg.evaluate(JS_SCROLL, 0); pg.wait_for_timeout(150)
                    d['expanded'] = expanded_checks(pg, TARGETS_S01, out, key, f'S01_{mode}', scan_rows=d['scan'])
                    # estimated state (demand card + recommendation list)
                    pg.goto(base + S01 + '?state=estimated&target=4.8&term=6'); pg.wait_for_timeout(1500); allow_location(pg)
                    d['estimatedFirst'] = sample(pg, TARGETS_S01, 'estimatedFirst'); d['estimatedScan'] = summarize(scan(pg, TARGETS_S01))
                    pg.evaluate(JS_SCROLL, 0); pg.wait_for_timeout(150); pg.screenshot(path=str(out / f'S01_{mode}_estimated_{key}.png'))
                    # mid-page screenshot (browse) for the record
                    pg.goto(base + S01); pg.wait_for_timeout(1200); allow_location(pg); pg.evaluate(JS_SCROLL, 600); pg.wait_for_timeout(200)
                    pg.screenshot(path=str(out / f'S01_{mode}_mid_{key}.png'))
                    pg.evaluate(JS_SCROLL, 100000); pg.wait_for_timeout(200); pg.screenshot(path=str(out / f'S01_{mode}_bottom_{key}.png'))
                except Exception as e:
                    d['exception'] = repr(e)[:300]
                d['errors'] = errs; R[f'S01_{mode}'] = d; c.close()
                # ---------------- O01 real path
                c, pg, errs = new_page(); d = {'page': 'O01', 'mode': mode}
                try:
                    pg.goto(base + U01); pg.wait_for_timeout(1500)
                    pg.evaluate("()=>{const b=[...document.querySelectorAll('button')].find(x=>/继续租用/.test(x.textContent));b.click()}"); pg.wait_for_timeout(1800)
                    d['url'] = pg.url.split('/')[-1][:80]
                    d['firstScreen'] = sample(pg, TARGETS_O01, 'first'); pg.screenshot(path=str(out / f'O01_{mode}_first_{key}.png'))
                    d['scan'] = scan(pg, TARGETS_O01); d['scanSummary'] = summarize(d['scan'])
                    pg.screenshot(path=str(out / f'O01_{mode}_bottom_{key}.png'))
                    d['bottomClearance'] = pg.evaluate(JS_BOTTOM)
                    d['bottombar'] = pg.evaluate("()=>{const q=s=>document.querySelector(s);const R=e=>{const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]};return {bar:R(q('.bottombar')),secondary:R(q('.bottombar .secondary')),primary:R(q('.bottombar .primary')),primaryText:q('.bottombar .primary').textContent.trim(),children:q('.bottombar').children.length,primaryScrollW:q('.bottombar .primary').scrollWidth,primaryClientW:q('.bottombar .primary').clientWidth}}")
                    pg.evaluate(JS_SCROLL, 600); pg.wait_for_timeout(200); pg.screenshot(path=str(out / f'O01_{mode}_mid_{key}.png'))
                    pg.evaluate(JS_SCROLL, 0); pg.wait_for_timeout(150)
                    pg.set_viewport_size({'width': w + (15 if w == 375 else -15), 'height': h}); pg.wait_for_timeout(400)
                    d['afterResize'] = sample(pg, TARGETS_O01, 'resize')
                    pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(300)
                    # sheet open / close (dynamic content update)
                    pg.click('#contractOpen'); pg.wait_for_timeout(300); d['sheetOpen'] = sample(pg, TARGETS_O01, 'contractSheetOpen')
                    pg.click('#contractClose'); pg.wait_for_timeout(300); d['sheetClosed'] = sample(pg, TARGETS_O01, 'contractSheetClosed')
                    d['expanded'] = expanded_checks(pg, TARGETS_O01, out, key, f'O01_{mode}', scan_rows=d['scan'])
                    d['businessText'] = pg.evaluate("()=>({title:document.querySelector('#unitTitle').textContent.trim(),term:document.querySelector('#termText').textContent.trim(),payable:document.querySelector('#payableTotal').textContent.trim(),pay:document.querySelector('#pay').textContent.trim(),edit:document.querySelector('#edit').textContent.trim()})")
                except Exception as e:
                    d['exception'] = repr(e)[:300]
                d['errors'] = errs; R[f'O01_{mode}'] = d; c.close()
        b.close()
    (out / 'help_probe.json').write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding='utf-8')
    for key, R in result['viewports'].items():
        print('==', key)
        for name, d in R.items():
            s = d.get('scanSummary') or {}; f = d.get('firstScreen') or {}; e = d.get('errors') or {}; x = d.get('expanded') or {}
            acts = x.get('actions') or []
            print(f"  {name:12s} mode={f.get('mode')} parent={str(f.get('parent'))[:22]!s:22s} hidden={s.get('hiddenSamples')}/{s.get('samples')} visCollide={s.get('visibleCollisionSamples')} uncovered={s.get('uncoveredCollisionSamples')} longestHidden={s.get('longestHiddenRun')} hitFail={s.get('hitTestFailures')} "
                  f"title/capsule/back={f.get('overlapTitle')}/{f.get('overlapCapsule')}/{f.get('overlapBack')} inHeader={f.get('insideHeader')} actionsOk={all(a.get('visible') and a.get('inViewport') and a.get('hitOk') for a in acts) if acts else None} "
                  f"phoneCollapse={x.get('afterPhone', {}).get('expanded') is False} chat={x.get('chatMaskShown')}/{x.get('chatMaskClosed')} outside={x.get('outsideTapCloses')} esc={x.get('escapeCloses')} "
                  f"clear={(d.get('bottomClearance') or {}).get('clear')} errs={len(e.get('pageerror', []))}/{len(e.get('console', []))}/{len(e.get('requestfailed', []))} {('EXC ' + d['exception']) if d.get('exception') else ''}")
    print('written', out / 'help_probe.json')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True); ap.add_argument('--out', required=True); ap.add_argument('--label', default='probe'); ap.add_argument('--modes', default='header,float')
    run(ap.parse_args())
