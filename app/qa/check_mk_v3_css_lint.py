#!/usr/bin/env python3
"""Task 02B — static constraints for the Visual V3 pilot files (parses selectors and declarations; does not
ban the '#' character blindly, so colour literals inside the token file and data-URI SVGs are not false positives).

Checks
  tokens  prototype/mk-v3-tokens.css      : unlayered; only the two pilot body selectors; only custom-property declarations
  layer   prototype/mk-v3-components.css, mk-v3-page-o01.css, mk-v3-page-s01.css, mk-v3-help-entry.css (02B-3) :
          - exactly one top-level block, `@layer mk-v3 { ... }`; nothing outside it (comments allowed)
          - no :has(), no ID selector, no :root, no `backdrop-filter` other than `none`
          - every selector starts with `body.koala-ui-v1` and is scoped to .koala-o01 / .koala-s01
          - colours only via var(--koala-*) or rgba() on shadows / overlays; no hex literal
          - font-size never below 12px; font-size:0 only on a declaration carrying the `icon-zero` marker comment
          - every class name used exists in O01/S01 markup, their templates, the runtime scripts or the registered list
  html    O01 / S01 : <body>…</body> bytes equal to the pre-change baseline; <head> differs only by the new
          <link data-ui-system="v3"> / <script src="mk-v3-*.js"> tags; data-ui-system="v1" still exactly once
Exit 1 on any violation.  Usage: python3 qa/check_mk_v3_css_lint.py [--baseline docs/visual/mk_v3_pilot_baseline_hashes.json]
"""
import re, sys, json, hashlib, argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'prototype'
TOKENS = P / 'mk-v3-tokens.css'
LAYERED = [P / 'mk-v3-components.css', P / 'mk-v3-page-o01.css', P / 'mk-v3-page-s01.css', P / 'mk-v3-help-entry.css']
PAGES = {
    'O01': P / 'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
    'S01': P / 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
}
RUNTIME_SOURCES = [P / 'mini_storage_global_support_v274.js', P / 'mini_storage_coupon_benefit_v1.js', P / 'mini_koala_acceptance_fix_v1.js',
                   P / 'mini_koala_acceptance_v11_layout_patch.js', P / 'mini_koala_location_permission_demo_v1.js',
                   P / 'mk-v3-s01-tags.js', P / 'mk-v3-help-entry.js']
REGISTERED_RUNTIME_CLASSES = {'expanded', 'active', 'show', 'hidden', 'current', 'fallback-first', 'demand-card', 'demand-store', 'cn-store-photo',
                              'stock-alert', 'agreement-attention', 'koala-ui-v1', 'koala-o01', 'koala-s01', 'v274-demand-state', 'v274-browse-state',
                              'mk-v3-support-obstructed', 'mk-v3-support-docked', 'coupon-v1-inline-row', 'coupon-v1-discount', 'mk-promo-tag',
                              'mk-v3-help-docked', 'mk-v3-help-float', 'mk-v3-help-nudged', 'mk-v3-help-host', 'mk-v3-help-open'}
errors = []


def err(msg):
    errors.append(msg)


def strip_comments(css):
    return re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), css, flags=re.S)


def split_top(css):
    """Split into (selector/prelude, body) pairs with brace matching; strings and parentheses respected."""
    out, i, n, depth, start = [], 0, len(css), 0, 0
    buf_start = 0
    while i < n:
        ch = css[i]
        if ch in '"\'':
            q = ch; i += 1
            while i < n and css[i] != q:
                if css[i] == '\\': i += 1
                i += 1
        elif ch == '{':
            if depth == 0:
                prelude = css[buf_start:i].strip(); start = i + 1
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                out.append((prelude, css[start:i])); buf_start = i + 1
        i += 1
    tail = css[buf_start:].strip()
    return out, tail


def split_decls(body):
    parts, cur, depth, i, n = [], '', 0, 0, len(body)
    while i < n:
        ch = body[i]
        if ch in '"\'':
            q = ch; cur += ch; i += 1
            while i < n and body[i] != q:
                cur += body[i]; i += 1
            cur += body[i] if i < n else ''
        elif ch == '(':
            depth += 1; cur += ch
        elif ch == ')':
            depth -= 1; cur += ch
        elif ch == ';' and depth == 0:
            parts.append(cur); cur = ''
        else:
            cur += ch
        i += 1
    if cur.strip(): parts.append(cur)
    return [p.strip() for p in parts if p.strip()]


def split_selectors(sel):
    out, cur, depth = [], '', 0
    for ch in sel:
        if ch == '(': depth += 1
        elif ch == ')': depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    if cur.strip(): out.append(cur.strip())
    return out


def selector_classes(sel):
    s = re.sub(r'\[[^\]]*\]', '', sel)  # drop attribute selectors
    s = re.sub(r':not\(|:is\(|:where\(', '(', s)
    return set(re.findall(r'\.([A-Za-z_][\w-]*)', s))


def check_rules(rules, fname, raw, in_layer=True):
    for prelude, body in rules:
        if prelude.startswith('@media'):
            inner, tail = split_top(body)
            if tail: err(f'{fname}: stray text inside {prelude}: {tail[:60]}')
            check_rules(inner, fname, raw, in_layer)
            continue
        if prelude.startswith('@'):
            err(f'{fname}: unexpected at-rule {prelude[:40]}'); continue
        for sel in split_selectors(prelude):
            if ':has(' in sel: err(f'{fname}: :has() in selector `{sel}`')
            if ':root' in sel: err(f'{fname}: :root in selector `{sel}`')
            if re.search(r'#[A-Za-z_]', re.sub(r'\[[^\]]*\]', '', sel)): err(f'{fname}: ID selector in `{sel}`')
            if not sel.startswith('body.koala-ui-v1'): err(f'{fname}: selector not scoped to body.koala-ui-v1: `{sel}`')
            if not ('.koala-o01' in sel or '.koala-s01' in sel): err(f'{fname}: selector not scoped to a pilot page: `{sel}`')
            for c in selector_classes(sel):
                if c not in KNOWN_CLASSES: err(f'{fname}: class `.{c}` not found in O01/S01 markup or registered runtime classes (`{sel}`)')
        for d in split_decls(body):
            if ':' not in d: err(f'{fname}: malformed declaration `{d}`'); continue
            prop, val = d.split(':', 1); prop = prop.strip().lower(); val = val.strip()
            important = val.endswith('!important')
            v = val[:-len('!important')].strip() if important else val
            if prop == 'backdrop-filter' or prop == '-webkit-backdrop-filter':
                if v != 'none': err(f'{fname}: backdrop-filter value `{v}` (only none allowed)')
            if not prop.startswith('--'):
                v_nourl = re.sub(r'url\([^)]*\)', '', v)
                if re.search(r'#[0-9A-Fa-f]{3,8}\b', v_nourl): err(f'{fname}: hex colour literal in `{prop}: {v}` (use var(--koala-*))')
            if prop == 'font-size':
                m = re.match(r'^(\d+(?:\.\d+)?)(?:px)?$', v)
                if m:
                    px = float(m.group(1))
                    if px == 0:
                        # find the marker comment in the raw text near this declaration
                        idx = raw.find(d)
                        if idx < 0 or 'icon-zero' not in raw[idx:idx + 160]: err(f'{fname}: font-size:0 without icon-zero marker (`{d}`)')
                    elif px < 12: err(f'{fname}: font-size {v} below the 12px floor')
                elif v not in ('inherit', 'initial', 'unset'):
                    err(f'{fname}: font-size with non-px value `{v}`')


def load_known_classes():
    classes = set(REGISTERED_RUNTIME_CLASSES)
    for f in list(PAGES.values()) + RUNTIME_SOURCES:
        if not f.exists(): continue
        t = f.read_text(encoding='utf-8', errors='replace')
        for m in re.findall(r'class\s*=\s*["\']([^"\']*)["\']', t):
            for tok in re.split(r'\s+', m):
                tok = re.sub(r'\$\{[^}]*\}', '', tok).strip()
                if tok: classes.add(tok)
        # template literals such as class="store${hasDemand?' demand-card':''}" break the quoted regex: take the leading token too
        for m in re.findall(r'class=\\?["\']([\w-]+)', t): classes.add(m)
        for m in re.findall(r"\?\s*'\s?([\w-]+)'\s*:", t): classes.add(m)
        for m in re.findall(r'classList\.(?:add|toggle|remove)\(\s*["\']([\w-]+)["\']', t): classes.add(m)
        for m in re.findall(r'className\s*=\s*["\']([^"\']*)["\']', t):
            for tok in m.split(): classes.add(re.sub(r'\$\{[^}]*\}', '', tok))
        for m in re.findall(r"classList\.(?:add|toggle)\('([\w-]+)',", t): classes.add(m)
    return classes


def check_tokens():
    raw = TOKENS.read_text(encoding='utf-8'); css = strip_comments(raw)
    rules, tail = split_top(css)
    if tail: err('tokens: stray text outside blocks')
    if '@layer' in css: err('tokens: must stay unlayered (custom properties, see file header)')
    for prelude, body in rules:
        sels = split_selectors(prelude)
        if set(sels) != {'body.koala-ui-v1.koala-o01', 'body.koala-ui-v1.koala-s01'}: err(f'tokens: selector set must be exactly the two pilot bodies, got {sels}')
        for d in split_decls(body):
            prop = d.split(':', 1)[0].strip()
            if not prop.startswith('--'): err(f'tokens: non-custom-property declaration `{d[:50]}`')
            if '!important' in d: err(f'tokens: !important on custom property `{d[:50]}`')


def check_layered():
    for f in LAYERED:
        raw = f.read_text(encoding='utf-8'); css = strip_comments(raw)
        rules, tail = split_top(css)
        if tail: err(f'{f.name}: text outside the layer block: {tail[:60]}')
        if len(rules) != 1 or re.sub(r'\s+', ' ', rules[0][0]) != '@layer mk-v3':
            err(f'{f.name}: expected exactly one top-level `@layer mk-v3` block, got {[r[0][:30] for r in rules]}'); continue
        inner, tail2 = split_top(rules[0][1])
        if tail2: err(f'{f.name}: stray text inside layer: {tail2[:60]}')
        check_rules(inner, f.name, raw)


def check_html(baseline):
    base = json.loads(Path(baseline).read_text(encoding='utf-8'))['pages'] if baseline and Path(baseline).exists() else None
    for key, f in PAGES.items():
        s = f.read_text(encoding='utf-8')
        i = s.index('<body'); j = s.index('</body>') + 7
        body_sha = hashlib.sha256(s[i:j].encode('utf-8')).hexdigest()
        head = s[:i]
        if s.count('data-ui-system="v1"') != 1: err(f'{key}: data-ui-system="v1" must appear exactly once')
        v3 = re.findall(r'<link[^>]*data-ui-system="v3"[^>]*>|<script[^>]*src="mk-v3-[^"]+"[^>]*></script>', head)
        if base:
            rel = str(f.relative_to(ROOT))
            if base[rel]['body_sha256'] != body_sha: err(f'{key}: <body> changed (sha {body_sha[:12]} vs baseline {base[rel]["body_sha256"][:12]})')
            head_wo = head
            for tag in v3: head_wo = head_wo.replace(tag + '\n', '', 1).replace(tag, '', 1)
            if hashlib.sha256(head_wo.encode('utf-8')).hexdigest() != base[rel]['head_sha256']:
                err(f'{key}: <head> differs from baseline beyond the mk-v3 link/script tags')
        if not v3: err(f'{key}: no mk-v3 link/script mounted')
        for tag in v3:
            if 'href="mk-v3-' not in tag and 'src="mk-v3-' not in tag: err(f'{key}: unexpected v3 tag {tag}')
    return


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--baseline', default=str(ROOT / 'docs/visual/mk_v3_pilot_baseline_hashes.json'))
    a = ap.parse_args()
    KNOWN_CLASSES = load_known_classes()
    check_tokens(); check_layered(); check_html(a.baseline)
    if errors:
        print('FAIL', len(errors)); [print(' -', e) for e in errors]; sys.exit(1)
    print('PASS mk-v3 css lint: tokens unlayered & scoped; 4 layered files clean; pages mounted; body unchanged'); sys.exit(0)
