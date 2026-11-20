"""小程序工程静态检查（不依赖微信开发者工具，不能替代编译）。
检查：JSON 合法；app.json 主包与分包的页面四件套齐全；组件路径存在（递归）；WXML 结构良好、标签已注册；
WXML 绑定的事件处理函数在 JS 里存在；JS 里 require 的相对路径存在；分包不引用其它分包；WXSS 不含裸色值（只许用令牌）；
tabBar 图标存在且不超过 40KB；主包与各分包体积不超过 2MB；统计占位页与写死在 WXML 里的中文。
用法：python3 tools/static_check.py <miniprogram 目录>"""
import json, os, re, sys
import xml.dom.minidom as md
root = sys.argv[1]
errs, warns = [], []
J = lambda p: json.load(open(os.path.join(root, p), encoding='utf-8'))
R = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
ex = lambda p: os.path.exists(os.path.join(root, p))
for dp, _, fs in os.walk(root):
    for f in fs:
        if f.endswith('.json'):
            try: json.load(open(os.path.join(dp, f), encoding='utf-8'))
            except Exception as e: errs.append('JSON 不合法 %s: %s' % (os.path.join(dp, f), e))
app = J('app.json')
pages = list(app['pages'])
subroots = []
for sp in app.get('subpackages', []):
    subroots.append(sp['root'])
    pages += [sp['root'] + '/' + p for p in sp['pages']]
if len(pages) != len(set(pages)): errs.append('页面路径重复')
BUILTIN = {'view','text','input','button','scroll-view','slot','block','image','textarea','picker','navigator','swiper','swiper-item','map','checkbox','radio','label','form','switch','rich-text','icon','progress','page-container','root-portal','cover-view','cover-image','template','import','include','wxs','movable-area','movable-view','picker-view','picker-view-column','slider','web-view','official-account','open-data'}
gcomp = app.get('usingComponents') or {}
units, seen = [(p, 'page') for p in pages], set()
def add_comps(conf, owner):
    for n, pth in (conf.get('usingComponents') or {}).items():
        rel = pth.lstrip('/') if pth.startswith('/') else os.path.normpath(os.path.join(os.path.dirname(owner), pth))
        if rel not in seen:
            seen.add(rel); units.append((rel, 'component'))
            if ex(rel + '.json'): add_comps(J(rel + '.json'), rel)
add_comps(app, 'app')
for p in pages:
    if ex(p + '.json'): add_comps(J(p + '.json'), p)
placeholders, hard_cjk, handlers = [], 0, 0
for base, kind in units:
    for ext in ('js', 'json', 'wxml', 'wxss'):
        if not ex(base + '.' + ext): errs.append('缺文件 %s.%s' % (base, ext))
    if not (ex(base + '.wxml') and ex(base + '.js') and ex(base + '.json')): continue
    wxml, js, conf = R(base + '.wxml'), R(base + '.js'), J(base + '.json')
    if kind == 'component' and not conf.get('component'): errs.append('%s.json 缺 "component": true' % base)
    if 'AUTO-PLACEHOLDER' in js: placeholders.append(base)
    x = re.sub(r'\b(wx:else)(?=[\s>/])', r'\1=""', wxml)
    x = re.sub(r'\{\{.*?\}\}', lambda m: m.group(0).replace('<', '&lt;').replace('&&', '&amp;&amp;'), x)
    try: dom = md.parseString(('<root xmlns:wx="wx" xmlns:bind="bind" xmlns:catch="catch">' + x + '</root>').encode('utf-8'))
    except Exception as e: errs.append('WXML 结构错误 %s.wxml: %s' % (base, e)); continue
    local = set((conf.get('usingComponents') or {}).keys()) | set(gcomp.keys())
    for el in dom.getElementsByTagName('*'):
        t = el.tagName
        if t == 'root': continue
        if t not in BUILTIN and t not in local: errs.append('%s.wxml 用了未注册的标签 <%s>' % (base, t))
        for k, v in el.attributes.items():
            if re.match(r'^(bind|catch)(:|[a-z])', k) and '{{' not in v:
                handlers += 1
                if not re.search(r'(^|[\s,{])' + re.escape(v) + r'\s*\(', js): errs.append('%s.wxml 的 %s="%s" 在 JS 里找不到' % (base, k, v))
            if k == 'src' and v.startswith('/') and '{{' not in v and not ex(v.lstrip('/')): errs.append('%s.wxml 图片不存在 %s' % (base, v))
    if wxml.count('{{') != wxml.count('}}'): errs.append('%s.wxml 花括号不成对' % base)
    hard_cjk += len(re.findall(r'[一-鿿]{2,}', re.sub(r'\{\{.*?\}\}|aria-label="[^"]*"', '', re.sub(r'<!--.*?-->', '', wxml, flags=re.S))))
# require 路径与分包边界
for dp, _, fs in os.walk(root):
    for f in fs:
        if not f.endswith('.js'): continue
        p = os.path.join(dp, f); rel = os.path.relpath(p, root)
        for m in re.finditer(r"require\('([^']+)'\)", open(p, encoding='utf-8').read()):
            tgt = os.path.normpath(os.path.join(os.path.dirname(rel), m.group(1)))
            if not (ex(tgt + '.js') or ex(tgt) or ex(tgt + '.json')): errs.append('%s require 的路径不存在 %s' % (rel, m.group(1)))
            for sr in subroots:
                if tgt.startswith(sr + os.sep) and not rel.startswith(sr + os.sep): errs.append('%s 引用了分包 %s 里的文件' % (rel, sr))
# 样式：只许用令牌
for dp, _, fs in os.walk(root):
    for f in fs:
        if f.endswith('.wxss') and f != 'tokens.wxss':
            p = os.path.join(dp, f); s = re.sub(r'/\*.*?\*/', '', open(p, encoding='utf-8').read(), flags=re.S)
            for m in re.finditer(r'#[0-9a-fA-F]{3,8}\b|rgba?\(', s): errs.append('%s 出现裸色值 %s' % (os.path.relpath(p, root), m.group(0)))
            for m in re.finditer(r'font-size:\s*(\d+)rpx', s):
                if int(m.group(1)) < 24: errs.append('%s 字号小于 24rpx' % os.path.relpath(p, root))
# 组件类名不得与页面 / 全局样式里的类名相同：组件开了 addGlobalClass，页面样式会作用到组件内部
cls = lambda p: set(re.findall(r'\.([a-zA-Z][\w-]*)', re.sub(r'/\*.*?\*/|\{[^}]*\}', ' ', R(p), flags=re.S)))
outer = set()
for p in pages: outer |= cls(p + '.wxss')
for base, kind in units:
    if kind != 'component': continue
    mine = set(c for c in cls(base + '.wxss') if not c.startswith('mk-'))
    for c in sorted(mine & outer): errs.append('%s.wxss 的类名 .%s 与页面样式重名' % (base, c))
    for other, k2 in units:
        if k2 == 'component' and other < base:
            for c in sorted(mine & set(x for x in cls(other + '.wxss') if not x.startswith('mk-'))): errs.append('组件类名重复 .%s：%s 与 %s' % (c, base, other))
for it in app['tabBar']['list']:
    for k in ('iconPath', 'selectedIconPath'):
        if not ex(it[k]): errs.append('tabBar 图标不存在 ' + it[k])
        elif os.path.getsize(os.path.join(root, it[k])) > 40 * 1024: errs.append('tabBar 图标超过 40KB ' + it[k])
    if it['pagePath'] not in app['pages']: errs.append('tabBar 页面不在主包 ' + it['pagePath'])
size = {}
for dp, _, fs in os.walk(root):
    rel = os.path.relpath(dp, root)
    pkg = next((s for s in subroots if rel == s or rel.startswith(s + os.sep)), '主包')
    size[pkg] = size.get(pkg, 0) + sum(os.path.getsize(os.path.join(dp, f)) for f in fs)
for k, v in size.items():
    if v > 2 * 1024 * 1024: errs.append('%s 超过 2MB：%dKB' % (k, v / 1024))
out = {'pages': len(pages), 'components': len(units) - len(pages), 'handlers_checked': handlers, 'placeholders': len(placeholders), 'hard_coded_cjk_in_wxml': hard_cjk, 'size_kb': {k: round(v / 1024) for k, v in size.items()}, 'errors': errs}
print(json.dumps(out, ensure_ascii=False, indent=1))
sys.exit(1 if errs else 0)
