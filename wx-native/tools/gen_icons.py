#!/usr/bin/env python3
"""图标生成器：design-src/icons.json（唯一来源）→ miniprogram/assets/icons/<名称>-<色调>.svg

为什么要生成：小程序 <image> 里的 SVG 不继承文字颜色，stroke="currentColor" 会渲染成纯黑。
所以每个「图标 × 色调」输出一个写死颜色的文件，颜色从 styles/tokens.wxss 读，令牌改了重跑即可。
只输出代码里实际引用到的组合（扫描 wxml / js / wxss），避免包里带用不到的文件。

用法：python3 tools/gen_icons.py <miniprogram 目录> [--check]
  --check 只核对不写文件：引用了没有的图标、色调，或磁盘文件与来源不一致时退出码 1。
"""
import json, os, re, sys

root = os.path.abspath(sys.argv[1]); check = '--check' in sys.argv
here = os.path.dirname(os.path.abspath(__file__))
src = json.load(open(os.path.join(here, '..', 'design-src', 'icons.json'), encoding='utf8'))
tok = open(os.path.join(root, 'styles', 'tokens.wxss'), encoding='utf8').read()
def token(name):
    m = re.search(r'--mk-color-' + re.escape(name) + r':\s*(#[0-9A-Fa-f]{6})', tok)
    if not m: sys.exit('tokens.wxss 缺少 --mk-color-' + name)
    return m.group(1).upper()
TONES = {k: token(v) for k, v in src['tones'].items()}
ICONS = src['icons']
REF = re.compile(r'assets/icons/([a-z0-9]+(?:-[a-z0-9]+)*)\.svg')
DYN = re.compile(r"'((?:ic-)?[a-z0-9]+-[a-z]+)'")   # 引号里的动态图标名：配置里写名称、页面拼路径；wxml 三元表达式同理

def split(stem):
    name, _, tone = stem.rpartition('-')
    return name, tone

def svg(name, tone):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%s" stroke-width="%s" '
            'stroke-linecap="round" stroke-linejoin="round">%s</svg>\n' % (TONES[tone], src['strokeWidth'], ICONS[name].replace('currentColor', TONES[tone])))

MANIFEST = os.path.join(root, 'pkg-dev', 'lab', 'icons.js')   # 演示工具校准页用的图标清单，由本脚本生成
used, errors = set(), []
for d, _, fs in os.walk(root):
    for f in fs:
        if not f.endswith(('.wxml', '.js', '.wxss', '.json')): continue
        p = os.path.join(d, f)
        if p == MANIFEST: continue
        s = open(p, encoding='utf8').read()
        stems = set(REF.findall(s))
        if f.endswith(('.js', '.wxml')):
            for x in DYN.findall(s):
                if x.startswith('ic-') and x[3:] in ICONS: errors.append('%s 仍在用旧图标名 %s' % (os.path.relpath(p, root), x))
                elif split(x)[0] in ICONS and split(x)[1] in TONES: stems.add(x)
        for st in stems:
            name, tone = split(st)
            if name not in ICONS or tone not in TONES: errors.append('%s 引用了未定义的图标 %s.svg' % (os.path.relpath(p, root), st))
            else: used.add(st)
out = os.path.join(root, 'assets', 'icons'); os.makedirs(out, exist_ok=True)
have = {f[:-4] for f in os.listdir(out) if f.endswith('.svg')}
for st in sorted(used):
    want = svg(*split(st)); p = os.path.join(out, st + '.svg')
    if check:
        if st not in have or open(p, encoding='utf8').read() != want: errors.append('assets/icons/%s.svg 与来源不一致，请重跑 gen_icons.py' % st)
    else: open(p, 'w', encoding='utf8').write(want)
for st in sorted(have - used):
    if check: errors.append('assets/icons/%s.svg 没有被引用' % st)
    else: os.remove(os.path.join(out, st + '.svg'))
want = '// 由 tools/gen_icons.py 生成，勿手改。全站实际用到的图标 × 色调，供演示工具的校准页展示。\nmodule.exports = ' + json.dumps(sorted(used)) + ';\n'
if check:
    if not os.path.exists(MANIFEST) or open(MANIFEST, encoding='utf8').read() != want: errors.append('pkg-dev/lab/icons.js 与来源不一致，请重跑 gen_icons.py')
else: open(MANIFEST, 'w', encoding='utf8').write(want)
print(json.dumps({'icons': len(ICONS), 'tones': TONES, 'files': len(used), 'errors': errors}, ensure_ascii=False, indent=1))
sys.exit(1 if errors else 0)
