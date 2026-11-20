#!/usr/bin/env python3
"""底部导航图标生成器：design-src/tabbar/<名称>[-on].svg（冻结稿 assets/nav 原图）→ miniprogram/assets/tabbar/tab-<名称>[-on].png（81×81）

tabBar 只收 PNG，不能用 SVG，所以要栅格化。生成时把冻结稿里写死的四个颜色换成令牌色，图标和 app.json 里的文字颜色保持一致：
  选中描边 #176949 → brand-text；未选中描边 #78847E → ink-secondary；浅填充 #E3F3E9 → brand-tint；深填充 #B7DEC6 → brand-tintStrong。

用法：python3 tools/gen_tabbar.py <miniprogram 目录>            生成 PNG 并写 design-src/tabbar/manifest.json（需要 playwright）
      python3 tools/gen_tabbar.py <miniprogram 目录> --check    只核对：PNG 与清单里的哈希一致、来源 SVG 没有改过、app.json 引用的文件都在、文字颜色等于令牌（不需要 playwright）
"""
import hashlib, io, json, os, re, sys

root = os.path.abspath(sys.argv[1]); check = '--check' in sys.argv
here = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(here, '..', 'design-src', 'tabbar'); out_dir = os.path.join(root, 'assets', 'tabbar')
manifest_path = os.path.join(src_dir, 'manifest.json')
tok = open(os.path.join(root, 'styles', 'tokens.wxss'), encoding='utf8').read()
def token(name):
    m = re.search(r'--mk-color-' + re.escape(name) + r':\s*(#[0-9A-Fa-f]{6})', tok)
    if not m: sys.exit('tokens.wxss 缺少 --mk-color-' + name)
    return m.group(1).upper()
MAP = {'#176949': token('brand-text'), '#78847E': token('ink-secondary'), '#E3F3E9': token('brand-tint'), '#B7DEC6': token('brand-tintStrong')}
NAMES = ['home', 'stores', 'orders', 'me']; SIZE = 81
sha = lambda b: hashlib.sha256(b).hexdigest()
def source(stem):
    s = open(os.path.join(src_dir, stem + '.svg'), encoding='utf8').read()
    for a, b in MAP.items(): s = re.sub(re.escape(a), b, s, flags=re.I)
    return s.replace('width="24" height="24"', 'width="%d" height="%d"' % (SIZE, SIZE))
stems = [n + suf for n in NAMES for suf in ('', '-on')]

if check:
    errs = []
    man = json.load(open(manifest_path, encoding='utf8')) if os.path.exists(manifest_path) else {}
    for st in stems:
        p = os.path.join(out_dir, 'tab-' + st + '.png'); e = man.get(st)
        if not os.path.exists(p): errs.append('缺少 assets/tabbar/tab-%s.png' % st); continue
        if not e: errs.append('manifest.json 没有 %s，重跑 gen_tabbar.py' % st); continue
        if sha(open(p, 'rb').read()) != e['png']: errs.append('tab-%s.png 与清单不一致（手改过？重跑 gen_tabbar.py）' % st)
        if sha(source(st).encode('utf8')) != e['svg']: errs.append('%s.svg 或令牌色改过但没有重跑 gen_tabbar.py' % st)
    app = json.load(open(os.path.join(root, 'app.json'), encoding='utf8'))['tabBar']
    for it in app['list']:
        for k in ('iconPath', 'selectedIconPath'):
            if not os.path.exists(os.path.join(root, it[k])): errs.append('app.json tabBar 引用了不存在的 ' + it[k])
    if app['color'].upper() != token('ink-secondary'): errs.append('tabBar.color 应等于 ink-secondary ' + token('ink-secondary'))
    if app['selectedColor'].upper() != token('brand-text'): errs.append('tabBar.selectedColor 应等于 brand-text ' + token('brand-text'))
    print(json.dumps({'tabbar': len(stems), 'errors': errs}, ensure_ascii=False, indent=1)); sys.exit(1 if errs else 0)

from playwright.sync_api import sync_playwright
man = {}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': SIZE, 'height': SIZE}, device_scale_factor=1)
    for st in stems:
        svg = source(st)
        pg.set_content('<html><body style="margin:0;background:transparent"><div style="width:%dpx;height:%dpx">%s</div></body></html>' % (SIZE, SIZE, svg))
        png = pg.screenshot(omit_background=True)
        open(os.path.join(out_dir, 'tab-' + st + '.png'), 'wb').write(png)
        man[st] = {'svg': sha(svg.encode('utf8')), 'png': sha(png)}
    b.close()
json.dump(man, open(manifest_path, 'w', encoding='utf8'), indent=1, sort_keys=True)
print(json.dumps({'tabbar': len(stems), 'colors': MAP}, ensure_ascii=False))
