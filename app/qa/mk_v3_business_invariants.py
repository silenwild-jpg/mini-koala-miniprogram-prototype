#!/usr/bin/env python3
"""Task 02B-4 (v2: geometry / FAB / style keys dropped by name pattern, see GEOM) — business-invariant comparison between two mk_v3_pilot_probe.py runs (read-only).
Drops every style / geometry / environment field from both probe.json files and compares what is left:
S01 head texts (location, placeholder, travel, sort/distance/service labels, quick chips, coverage, estimate strip, demand,
recommendation, recovery, empty states, load-more, tab labels, state class), every card (kind / id / name / badges / area /
route / tags / facts / price / suffix / photo kind / e-store), interaction outcomes (panel items, applied / cancelled lists,
quick-chip lists, pagination counts), permission sheet texts, O01 texts (title, meta, term, dates, payable, rent, monthly,
deposit, management, coupon rows, pay label, sections, rows, gate), sheet titles / confirm labels / closed, pay-without-agree
toast, phone-auth buttons, reachedO02, chat mask open / close, phone handler source, error counts.
Usage: python3 qa/mk_v3_business_invariants.py --before <probe.json> --after <probe.json> --out <diff.json>"""
import json, argparse, re
STYLE_KEYS = {'vars', 'styles', 'textAudit', 'overflow', 'fabScan', 'fabVisibleHits', 'fabExpanded', 'fabAfterChat', 'bottombar',
              'longAmount', 'agreeStyle', 'stylesheets', 'layers', 'u01Shot', 'resizeFab', 'sortPanelTextAudit', 'distancePanelTextAudit',
              'servicePanelTextAudit', 'height', 'top', 'width', 'tagsClipped', 'tagsRowRect', 'listTop', 'headerBottom', 'rect',
              'confirmHeight', 'confirmFont', 'confirmBg', 'sheetRadius', 'descFont', 'fontSize', 'fontWeight', 'chevron', 'generated_at',
              'chromium', 'env', 'root', 'label', 'url', 'shot', 'screenshot', 'png', 'cls', 'attention'}
RUNTIME = re.compile(r'orderNo=O\d+')
GEOM = re.compile(r'fab|scan|height|gap|style|rect|font|position|docked|hidden|hits|overlap|visib|labelfits|icon|^cls$|^bg$|color|radius|shadow|padding|width|^top$|^left$|scroll|^h$|inbottombar|wrapper|bar$', re.I)
def strip(o):
    if isinstance(o, dict):
        return {k: strip(v) for k, v in o.items() if k not in STYLE_KEYS and not k.endswith('Shot') and not GEOM.search(str(k))}
    if isinstance(o, list): return [strip(x) for x in o]
    if isinstance(o, str): return RUNTIME.sub('orderNo=<runtime>', o)
    return o
def flat(o, p='', out=None):
    out = {} if out is None else out
    if isinstance(o, dict):
        for k, v in o.items(): flat(v, p + '/' + str(k), out)
    elif isinstance(o, list):
        out[p + '/#len'] = len(o)
        for i, v in enumerate(o): flat(v, p + f'[{i}]', out)
    else: out[p] = o
    return out
ap = argparse.ArgumentParser(); ap.add_argument('--before', required=True); ap.add_argument('--after', required=True); ap.add_argument('--out', required=True)
a = ap.parse_args()
B = json.load(open(a.before, encoding='utf-8'))['viewports']; A = json.load(open(a.after, encoding='utf-8'))['viewports']
diffs, n = [], 0
for vp in B:
    for page in B[vp]:
        if page not in A.get(vp, {}): diffs.append([vp, page, '<page missing after>', None, None]); continue
        fb, fa = flat(strip(B[vp][page])), flat(strip(A[vp][page]))
        for k in sorted(set(fb) | set(fa)):
            n += 1
            if fb.get(k) != fa.get(k): diffs.append([vp, page, k, fb.get(k), fa.get(k)])
res = {'fieldsCompared': n, 'businessDifferences': len(diffs), 'differences': diffs}
json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('fields', n, 'differences', len(diffs))
for d in diffs[:40]: print(' ', d)
