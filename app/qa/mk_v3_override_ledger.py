#!/usr/bin/env python3
"""Task 02B — override ledger (pre-registration) + post-implementation computed-style diff check.

Part 1  build   : parse the three layered mk-v3 CSS files; for every (selector, property) emit a ledger row and look the
                  property up in the legacy sources that can style the same element on O01 / S01 (inline <style> blocks of the
                  two pages, every linked legacy stylesheet, and the <style> injected by mini_storage_global_support_v274.js).
                  Legacy match = a legacy rule whose selector shares the last class of the new selector and declares the
                  same property (longhand or its shorthand).  -> docs/visual/mk_v3_override_ledger.csv
Part 2  check   : compare probe.json(before) with probe.json(after) for every probed selector / property and classify each
                  difference with the live page (Playwright): direct (a mk-v3 layered rule matching the element sets it),
                  inherited (an ancestor matched a mk-v3 rule setting an inherited property), alias (a legacy rule on the element
                  references a custom property aliased by mk-v3-tokens.css), layout (rect / size consequence), unexpected.
                  -> <after>/ledger_diff.json ; exit 1 if any unexpected difference remains.
Usage: python3 qa/mk_v3_override_ledger.py build
       python3 qa/mk_v3_override_ledger.py check --before outputs/mk_v3_pilot/before/probe.json --after outputs/mk_v3_pilot/after/probe.json
"""
import re, sys, json, csv, argparse, subprocess, time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; P = ROOT / 'prototype'
NEW = [P / 'mk-v3-components.css', P / 'mk-v3-page-o01.css', P / 'mk-v3-page-s01.css', P / 'mk-v3-help-entry.css']
PAGES = {'O01': P / 'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html', 'S01': P / 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'}
REASON = {  # ledger reason codes -> Task 02A doc 1 / doc 2 items
    'header': 'G-2 §4.11', 'store': 'G-3/S-1 §4.4', 'section': 'G-3/O-1', 'estore-list-card': 'S-8', 'badge': 'G-6 §4.5', 'tag': 'G-6/S-3 §4.5',
    'quick-store-filters': 'G-6/S-6 §4.5', 'pill': 'G-6 §4.5', 'price-number': 'G-7/S-4 §4.7', 'payable-hero': 'G-7/O-4 §4.7', 'primary': 'G-4 §4.2',
    'secondary': 'G-4 §4.2', 'sheet-confirm': 'G-4 §4.2', 'bottombar': 'G-5/O-8 §4.3', 'compact-filter-btn': 'G-6/S-5 §4.6', 'controls': 'S-5 §4.6',
    'tabbar': 'G-9/S-9 §4.8', 'tab': 'G-9/S-9 §4.8', 'mini-global-support': 'G-8 §4.9 / 02B-3', 'mini-support-launcher': 'G-8 §4.9 / 02B-3', 'mini-support-actions': 'G-8 §4.9 / 02B-3', 'mini-support-sheet': 'G-8 §4.9 / 02B-3', 'mk-v3-help-open': '02B-3 R2', 'mk-v3-help-float': '02B-3 R5', 'mk-v3-help-nudged': '02B-3 R5', 'row': 'O-3 §4.7',
    'order-card': 'O-2', 'unit': 'O-2', 'meta': 'O-2', 'pay-after': 'O-5', 'storage-notice': 'O-5', 'agreement': 'O-5/O-9', 'date-input': 'O-7(deferred)',
    'location-unified-box': 'S-11', 'current-location': 'S-11', 'location-search-entry': 'S-11', 'placeholder': 'S-11', 'estimate-strip': 'S-7',
    'store-photo': 'S-12', 'moreline': 'S-13', 'page': 'G-2/§3', 'shell': 'G-2', 'fact': 'S-2 §4.4', 'name': 'S-2', 'area': 'S-2', 'route': 'S-2',
}
def strip_comments(css): return re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), css, flags=re.S)
def split_top(css):
    out, i, n, depth, start, buf = [], 0, len(css), 0, 0, 0; prelude = ''
    while i < n:
        ch = css[i]
        if ch in '"\'':
            q = ch; i += 1
            while i < n and css[i] != q:
                if css[i] == '\\': i += 1
                i += 1
        elif ch == '{':
            if depth == 0: prelude = css[buf:i].strip(); start = i + 1
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: out.append((prelude, css[start:i])); buf = i + 1
        i += 1
    return out
def decls(body):
    parts, cur, depth, i = [], '', 0, 0
    while i < len(body):
        ch = body[i]
        if ch in '"\'':
            q = ch; cur += ch; i += 1
            while i < len(body) and body[i] != q: cur += body[i]; i += 1
            cur += body[i] if i < len(body) else ''
        elif ch == '(': depth += 1; cur += ch
        elif ch == ')': depth -= 1; cur += ch
        elif ch == ';' and depth == 0: parts.append(cur); cur = ''
        else: cur += ch
        i += 1
    if cur.strip(): parts.append(cur)
    out = []
    for d in parts:
        if ':' in d:
            k, v = d.split(':', 1); out.append((k.strip().lower(), v.strip()))
    return out
def flatten(rules, media=''):
    for prelude, body in rules:
        if prelude.startswith('@media'):
            for r in flatten(split_top(body), prelude): yield r
        elif prelude.startswith('@layer'):
            for r in flatten(split_top(body), media): yield r
        elif prelude.startswith('@'): continue
        else:
            for sel in re.split(r',(?![^(]*\))', prelude):
                yield (sel.strip(), decls(body), media)
def legacy_sources(page_key):
    """(source name, css text) for everything that can style the page."""
    html = PAGES[page_key].read_text(encoding='utf-8', errors='replace'); out = []
    for i, m in enumerate(re.finditer(r'<style[^>]*>(.*?)</style>', html, re.S)): out.append((f'{page_key}.html inline<style>#{i}', m.group(1)))
    for href in re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"', html):
        if href.startswith('mk-v3-'): continue
        f = P / href
        if f.exists(): out.append((href, f.read_text(encoding='utf-8', errors='replace')))
    gs = P / 'mini_storage_global_support_v274.js'
    if gs.exists():
        js = gs.read_text(encoding='utf-8', errors='replace')
        m = re.search(r'textContent\s*=\s*[`\'"](.*?)[`\'"]\s*;', js, re.S)
        if m: out.append(('global_support_v274.js injected <style>', m.group(1)))
    return out
SHORT = {'border-top-width': ['border', 'border-top', 'border-width'], 'border-top-color': ['border', 'border-top', 'border-color'], 'border-bottom': ['border'], 'border-left': ['border'],
         'border-radius': [], 'background-color': ['background'], 'background-image': ['background'], 'padding-top': ['padding'], 'padding-left': ['padding'], 'padding-right': ['padding'],
         'padding-bottom': ['padding'], 'margin-top': ['margin'], 'margin-bottom': ['margin'], 'font-size': ['font'], 'font-weight': ['font'], 'line-height': ['font'], 'gap': [],
         'min-height': [], 'height': [], 'width': [], 'color': [], 'box-shadow': [], 'display': [], 'position': [], 'bottom': ['inset'], 'right': ['inset'], 'left': ['inset'], 'top': ['inset'],
         'z-index': [], 'letter-spacing': [], 'white-space': [], 'visibility': [], 'border': [], 'padding': [], 'margin': [], 'background': [], 'flex': [], 'align-items': [], 'justify-content': [],
         'overflow': [], 'overflow-x': ['overflow'], 'overflow-y': ['overflow'], 'transform': [], 'border-color': ['border'], 'border-left': ['border'], 'border-bottom': ['border']}
def build():
    rows = []
    legacy = {k: [(src, list(flatten(split_top(strip_comments(css))))) for src, css in legacy_sources(k)] for k in PAGES}
    for f in NEW:
        rules = list(flatten(split_top(strip_comments(f.read_text(encoding='utf-8')))))
        for sel, ds, media in rules:
            pages = ['O01', 'S01'] if ':is(.koala-o01,.koala-s01)' in sel else (['O01'] if '.koala-o01' in sel else ['S01'])
            classes = re.findall(r'\.([A-Za-z_][\w-]*)', re.sub(r'\[[^\]]*\]|:is\([^)]*\)|::?[\w-]+', '', sel.replace('body.koala-ui-v1', '')))
            key = classes[-1] if classes else ''
            reason = next((v for k, v in REASON.items() if k == key), next((v for k, v in REASON.items() if k in classes), 'G-1/§1 token'))
            for prop, val in ds:
                important = val.endswith('!important')
                found = []
                for pg in pages:
                    for src, lrules in legacy[pg]:
                        for lsel, lds, lmedia in lrules:
                            if key and not re.search(r'\.' + re.escape(key) + r'(?![\w-])', lsel): continue
                            for lp, lv in lds:
                                if lp == prop or lp in SHORT.get(prop, []) or (prop in SHORT.get(lp, [])):
                                    found.append(f'{src} | {lsel[:70]} | {lp}: {lv[:60]}')
                            if len(found) >= 3: break
                        if len(found) >= 3: break
                migration = 'html-only' if any(':has(' in x for x in found) or prop in ('mask', '-webkit-mask', 'mask-image', '-webkit-mask-image') else 'keep-visual'
                rows.append({'new_file': f.name, 'media': media, 'new_selector': sel, 'property': prop, 'new_value': val[:80], 'important': 'yes' if important else 'no',
                             'pages': '+'.join(pages), 'legacy_matches': ' || '.join(found) if found else '(none: new declaration, consequence-only)', 'reason': reason,
                             'migration': migration, 'retire_in_task03': 'yes' if found else 'n/a'})
    out = ROOT / 'docs/visual/mk_v3_override_ledger.csv'
    with out.open('w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    n_leg = sum(1 for r in rows if not r['legacy_matches'].startswith('(none'))
    print(f'ledger rows {len(rows)}; with legacy match {n_leg}; important {sum(1 for r in rows if r["important"]=="yes")}; html-only {sum(1 for r in rows if r["migration"]=="html-only")}')
    print('written', out)
# ---------------------------------------------------------------- check
CSS_NAME = {'fontSize': 'font-size', 'fontWeight': 'font-weight', 'lineHeight': 'line-height', 'color': 'color', 'backgroundColor': 'background-color', 'backgroundImage': 'background-image',
            'borderTopWidth': 'border-top-width', 'borderTopColor': 'border-top-color', 'borderRadius': 'border-radius', 'paddingTop': 'padding-top', 'paddingLeft': 'padding-left',
            'paddingRight': 'padding-right', 'boxShadow': 'box-shadow', 'height': 'height', 'minHeight': 'min-height', 'width': 'width', 'display': 'display', 'position': 'position',
            'bottom': 'bottom', 'right': 'right', 'zIndex': 'z-index', 'gap': 'gap', 'visibility': 'visibility', 'whiteSpace': 'white-space', 'letterSpacing': 'letter-spacing'}
INHERITED = {'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'white-space', 'visibility'}
LAYOUT = {'rect', 'height', 'width', 'min-height', 'bottom', 'right', 'text'}
JS_MATCH = r'''(sels)=>{
  const layerRules=[];const legacyRules=[];
  function walk(rules,inLayer){for(const r of rules){try{if(r instanceof CSSLayerBlockRule){walk(r.cssRules,r.name==='mk-v3'||inLayer);continue}
    if(r instanceof CSSMediaRule){if(!matchMedia(r.conditionText).matches)continue;walk(r.cssRules,inLayer);continue}
    if(r instanceof CSSStyleRule){const props=[];for(let i=0;i<r.style.length;i++)props.push(r.style[i]);const vars={};for(const p of props){const v=r.style.getPropertyValue(p);if(v.includes('var(--'))vars[p]=v}
      (inLayer?layerRules:legacyRules).push({sel:r.selectorText,props,vars,cssText:r.style.cssText||''})}}catch(e){}}}
  for(const ss of document.styleSheets){try{walk(ss.cssRules,false)}catch(e){}}
  function matched(el,rules){const out=[];for(const r of rules){try{if(el.matches(r.sel))out.push(r)}catch(e){}}return out}
  const out={};
  for(const s of sels){let el=null;try{el=document.querySelector(s)}catch(e){}if(!el){out[s]=null;continue}
    const direct=new Set();const directSel=[];for(const r of matched(el,layerRules)){r.props.forEach(p=>direct.add(p));directSel.push(r.sel.slice(0,90))}
    const inherited=new Set();let a=el.parentElement;while(a&&a!==document.documentElement){for(const r of matched(a,layerRules))r.props.forEach(p=>{inherited.add(p);if(/^border-.*-radius$/.test(p))inherited.add('border-radius')});a=a.parentElement}
    const alias=new Set();const inheritKw=new Set();
    for(const r of matched(el,legacyRules)){Object.keys(r.vars).forEach(p=>alias.add(p));for(const m of r.cssText.matchAll(/([\w-]+)\s*:\s*[^;]*var\(--/g))alias.add(m[1]);}
    (function walkAll(rules){for(const r of rules){try{if(r instanceof CSSStyleRule){if(el.matches(r.selectorText)){for(let i=0;i<r.style.length;i++){if(r.style.getPropertyValue(r.style[i])==='inherit')inheritKw.add(r.style[i])}}}else if(r.cssRules){walkAll(r.cssRules)}}catch(e){}}})([].concat(...[...document.styleSheets].map(ss=>{try{return [...ss.cssRules]}catch(e){return []}})));
    const cs=getComputedStyle(el);const btw=cs.borderTopWidth;
    let a2=el.parentElement;while(a2&&a2!==document.documentElement){for(const r of matched(a2,legacyRules))Object.keys(r.vars).forEach(p=>alias.add('inh:'+p));a2=a2.parentElement}
    out[s]={direct:[...direct],directSel:directSel.slice(0,6),inherited:[...inherited],alias:[...alias],inheritKw:[...inheritKw],borderTopWidth:btw}}
  return out}'''
def expand(prop):
    """computed longhand -> names a rule may have used (CSSOM lists longhands, but keep shorthands for safety)."""
    m = {'border-top-width': ['border-top-width', 'border-width', 'border', 'border-top'], 'border-top-color': ['border-top-color', 'border-color', 'border', 'border-top'],
         'border-radius': ['border-radius', 'border-top-left-radius'], 'background-color': ['background-color', 'background'], 'background-image': ['background-image', 'background'],
         'padding-top': ['padding-top', 'padding'], 'padding-left': ['padding-left', 'padding'], 'padding-right': ['padding-right', 'padding'], 'gap': ['gap', 'row-gap', 'column-gap'],
         'min-height': ['min-height', 'height'], 'bottom': ['bottom', 'inset'], 'right': ['right', 'inset'], 'height': ['height', 'min-height'], 'width': ['width', 'flex', 'flex-basis'],
         'white-space': ['white-space', 'white-space-collapse', 'text-wrap-mode', 'text-wrap'], 'letter-spacing': ['letter-spacing']}
    return m.get(prop, [prop])
def check(before, after, port):
    from playwright.sync_api import sync_playwright
    B = json.loads(Path(before).read_text(encoding='utf-8')); A = json.loads(Path(after).read_text(encoding='utf-8'))
    sys.path.insert(0, str(ROOT / 'qa')); import mk_v3_pilot_probe as PR
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.2)
    base = f'http://127.0.0.1:{port}/prototype/'
    report = {'summary': {}, 'unexpected': [], 'byPage': {}}
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            for vp in ['375x812', '390x844']:
                w, h = map(int, vp.split('x'))
                for name in ['S01_browse', 'S01_estimated', 'S01_unlocated', 'O01']:
                    if name not in B['viewports'][vp] or name not in A['viewports'][vp]: continue
                    bs, as_ = B['viewports'][vp][name].get('styles') or {}, A['viewports'][vp][name].get('styles') or {}
                    c = PR.new_ctx(b, w, h); pg = c.new_page()
                    if name == 'O01':
                        pg.goto(base + PR.U01); pg.wait_for_timeout(1500); pg.get_by_text('继续租用', exact=True).first.click(); pg.wait_for_timeout(1500); sels = PR.O01_SEL
                    else:
                        st = name.split('_')[1]; pg.goto(base + PR.S01 + PR.S01_STATES[st]); pg.wait_for_timeout(1500)
                        if st != 'unlocated': PR.allow_location(pg)
                        sels = PR.S01_SEL
                    info = pg.evaluate(JS_MATCH, sels); c.close()
                    counts = {'direct': 0, 'inherited': 0, 'alias': 0, 'layout': 0, 'consequence': 0, 'unexpected': 0, 'appeared': 0, 'disappeared': 0}
                    for s in sels:
                        bv, av = bs.get(s), as_.get(s)
                        if bv is None and av is None: continue
                        if bv is None: counts['appeared'] += 1; continue
                        if av is None: counts['disappeared'] += 1; report['unexpected'].append({'vp': vp, 'page': name, 'sel': s, 'prop': '(element)', 'before': 'present', 'after': 'missing', 'class': 'disappeared'}); continue
                        m = info.get(s) or {'direct': [], 'inherited': [], 'alias': [], 'inheritKw': [], 'borderTopWidth': ''}
                        color_changed = bv.get('color') != av.get('color')
                        fs_changed = bv.get('fontSize') != av.get('fontSize')
                        for k in bv:
                            if bv[k] == av[k]: continue
                            cssk = CSS_NAME.get(k, k)
                            if k in ('rect', 'text') or cssk in LAYOUT and not any(x in m['direct'] for x in expand(cssk)):
                                cls = 'layout'
                            elif any(x in m['direct'] for x in expand(cssk)): cls = 'direct'
                            elif cssk in INHERITED and any(x in m['inherited'] for x in expand(cssk)): cls = 'inherited'
                            elif cssk in m['alias'] or any(x in m['alias'] for x in expand(cssk)) or (cssk in INHERITED and any(('inh:' + x) in m['alias'] for x in expand(cssk))): cls = 'alias'
                            elif cssk == 'border-top-color' and color_changed and (m.get('borderTopWidth') in ('0px', '')): cls = 'consequence'   # currentColor on a 0-width border
                            elif cssk == 'letter-spacing' and fs_changed: cls = 'consequence'   # em-relative legacy value, font-size changed
                            elif any(x in m.get('inheritKw', []) for x in expand(cssk)) and any(x in m['inherited'] for x in expand(cssk)): cls = 'inherited'   # legacy rule says `inherit`, parent changed by a direct rule
                            else: cls = 'unexpected'
                            counts.setdefault(cls, 0); counts[cls] += 1
                            if cls == 'unexpected': report['unexpected'].append({'vp': vp, 'page': name, 'sel': s, 'prop': cssk, 'before': str(bv[k])[:60], 'after': str(av[k])[:60]})
                    report['byPage'][f'{vp}/{name}'] = counts
            b.close()
    finally:
        srv.terminate()
    tot = {}
    for v in report['byPage'].values():
        for k, n in v.items(): tot[k] = tot.get(k, 0) + n
    report['summary'] = tot
    out = Path(after).parent / 'ledger_diff.json'; out.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    print('ledger diff', json.dumps(tot)); print('written', out)
    for u in report['unexpected'][:40]: print('  UNEXPECTED', u)
    return 0 if tot.get('unexpected', 0) == 0 else 1
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('mode', choices=['build', 'check']); ap.add_argument('--before'); ap.add_argument('--after'); ap.add_argument('--port', type=int, default=8821)
    a = ap.parse_args()
    if a.mode == 'build': build()
    else: sys.exit(check(a.before, a.after, a.port))
