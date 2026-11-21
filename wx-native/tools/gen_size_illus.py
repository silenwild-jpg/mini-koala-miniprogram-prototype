#!/usr/bin/env python3
"""尺寸示意插画生成器：design-src/size-illus/params.json（画法参数）→
  miniprogram/assets/images/units/size-<档>.svg         底图：仓体（地面、两面里墙）、长宽高尺寸线、1.7m 人形参照，不带箱子
  miniprogram/assets/images/units/size-<档>-front.svg   前景：仓门框与靠近观察者的几条棱，叠在箱子上面
  miniprogram/assets/images/units/size-<档>-carton.svg  一只标准纸箱（与该档底图同一比例）
  miniprogram/assets/images/units/size-<档>-box.svg     合成图：底图 + 几只箱子 + 前景，单张使用（门店详情等）
  miniprogram/core/config-size-illus.js                 每档取的仓位、长宽高、箱位坐标（百分比），容量页的累计箱子层用

用程序画是为了比例准、四档画法完全一致。数据都取自仓库现有来源，这里不写第二份：
  档位与区间   core/config-find.js unitThumbBands
  仓体长宽高   mock/units.js 里 params.tiers.<档>.unit 指定的演示仓位的 dims（长 × 宽 × 高，米）
  纸箱三边     mock/items.js「标准纸箱」说明文字里的 60×40×40cm
  箱位个数     core/config-find.js estimate.stageBoxStepsM3（该档上限容量对应的只数；合成图画的是代表仓位自身容量对应的只数）
  颜色         styles/tokens.wxss
人形高 1.7m 只是比例参照，不是规格。等轴测：长沿右下、宽沿右上、高朝上；敞开的一面（长 × 高）朝左下，品牌绿框表示仓门一侧。
每档各自缩放到占满画面，所以人形在大仓的图里更小——人是尺子，四档之间不要比画面大小，要比人。

用法：python3 tools/gen_size_illus.py [miniprogram 目录] [--check]
  --check 只核对不写文件：磁盘上的生成物与来源不一致、有多余的 size-*.svg、单个文件超过 6KB 时退出码 1。
"""
import json, math, os, re, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith('--')]; check = '--check' in sys.argv
root = os.path.abspath(args[0] if args else os.path.join(here, '..', 'miniprogram'))
P = json.load(open(os.path.join(here, '..', 'design-src', 'size-illus', 'params.json'), encoding='utf8'))
MAX_BYTES = 6 * 1024
errors = []

tok = open(os.path.join(root, 'styles', 'tokens.wxss'), encoding='utf8').read()
def token(name):
    m = re.search(r'--mk-color-' + re.escape(name) + r':\s*(#[0-9A-Fa-f]{6})', tok)
    if not m: sys.exit('tokens.wxss 缺少 --mk-color-' + name)
    return m.group(1).upper()
TONE = {k: token(v) for k, v in P['tones'].items()}

# 档位、箱子只数规则、代表仓位、纸箱说明：用 node 直接读小程序里的模块
_js = ("const r=(p)=>require(require('path').join(%s,p));const CF=r('core/config-find'),U=r('mock/units'),I=r('mock/items');"
       "const box=(I.items||[]).find((x)=>(x.id||x[0])===%s)||{};"
       "console.log(JSON.stringify({bands:CF.unitThumbBands.map((b)=>({key:b.key,max:Number.isFinite(b.maxM3)?b.maxM3:null})),steps:CF.estimate.stageBoxStepsM3,"
       "units:U.map((u)=>({id:u.id,code:u.code,volume:u.volume,dims:u.dims})),carton:String(box.description||'')}))") % (json.dumps(root), json.dumps(P['carton']['item']))
SRC = json.loads(subprocess.run(['node', '-e', _js], capture_output=True, text=True, check=True).stdout)
BANDS, STEPS = SRC['bands'], SRC['steps']
UNITS = {u['id']: u for u in SRC['units']}
m = re.search(r'(\d+)\s*[×xX*]\s*(\d+)\s*[×xX*]\s*(\d+)\s*cm', SRC['carton'])
if not m: sys.exit('mock/items.js 的 %s 说明里找不到「长×宽×高cm」' % P['carton']['item'])
CARTON = [int(g) / 100 for g in m.groups()]            # 米：沿长、沿宽、高
box_count = lambda m3: max(1, sum(1 for s in STEPS if s <= m3 + 1e-9))   # 与 core/estimate-viz.js boxCount 同一口径
def band_of(v):
    for b in BANDS:
        if b['max'] is None or v <= b['max']: return b['key']

VB, MG = P['viewBox'], P['margin']
C30, S30 = math.cos(math.radians(30)), 0.5
ST, DM, PS = P['stroke'], P['dim'], P['person']
f1 = lambda v: ('%.1f' % v).rstrip('0').rstrip('.') if abs(v) >= 0.05 else '0'
pt = lambda p: f1(p[0]) + ' ' + f1(p[1])
num = lambda v: ('%g' % v) + 'm'

class Scene:
    """一档的全部图元。先按比例 k（每米多少个画面单位）排好，再整体平移到画面里。"""
    def __init__(self, dims, k):
        self.L, self.W, self.H = dims; self.k = k
        self.box = [1e9, 1e9, -1e9, -1e9]
    def pr(self, x, y, z):  # 等轴测投影（画面单位，y 朝下）
        return ((x + y) * C30 * self.k, ((x - y) * S30 - z) * self.k)
    def grow(self, pts, pad=0.0):
        for x, y in pts:
            b = self.box; b[0] = min(b[0], x - pad); b[1] = min(b[1], y - pad); b[2] = max(b[2], x + pad); b[3] = max(b[3], y + pad)
    def poly(self, pts, fill):
        self.grow(pts); return '<path d="M%sZ" fill="%s"/>' % ('L'.join(pt(p) for p in pts), fill)
    def line(self, pts, tone, w, close=False):
        self.grow(pts, w / 2)
        return '<path d="M%s%s" fill="none" stroke="%s" stroke-width="%s"/>' % ('L'.join(pt(p) for p in pts), 'Z' if close else '', tone, f1(w))
    def text(self, p, s, anchor, size, tone):
        w = 0.58 * size * len(s); x0 = p[0] - (w if anchor == 'end' else w / 2 if anchor == 'middle' else 0)
        self.grow([(x0, p[1] - size * 0.8), (x0 + w, p[1] + size * 0.22)])
        return '<text x="%s" y="%s" font-size="%s" text-anchor="%s" fill="%s">%s</text>' % (f1(p[0]), f1(p[1]), f1(size), anchor, tone, s)
    def dim(self, a, b, n, label, anchor, dy):
        o, t, g = DM['offset'], DM['tick'], DM['labelGap']
        a2, b2 = (a[0] + n[0] * o, a[1] + n[1] * o), (b[0] + n[0] * o, b[1] + n[1] * o)
        tick = lambda q: [(q[0] - n[0] * t, q[1] - n[1] * t), (q[0] + n[0] * t, q[1] + n[1] * t)]
        mid = ((a2[0] + b2[0]) / 2 + n[0] * g, (a2[1] + b2[1]) / 2 + n[1] * g + dy)
        return [self.line([a2, b2], TONE['dim'], ST['dim']), self.line(tick(a2), TONE['dim'], ST['dim']), self.line(tick(b2), TONE['dim'], ST['dim']),
                self.text(mid, label, anchor, DM['fontSize'], TONE['text'])]
    def carton(self, x0, y0, z0):
        a, b, h = CARTON; x1, y1, z1 = x0 + a, y0 + b, z0 + h; pr = self.pr; w = ST['box']
        faces = [([pr(x0, y0, z1), pr(x1, y0, z1), pr(x1, y1, z1), pr(x0, y1, z1)], TONE['boxTop']),
                 ([pr(x0, y0, z0), pr(x1, y0, z0), pr(x1, y0, z1), pr(x0, y0, z1)], TONE['boxLeft']),
                 ([pr(x1, y0, z0), pr(x1, y1, z0), pr(x1, y1, z1), pr(x1, y0, z1)], TONE['boxRight'])]
        out = []
        for pts, fill in faces:
            self.grow(pts, w / 2)
            out.append('<path d="M%sZ" fill="%s"/>' % ('L'.join(pt(p) for p in pts), fill))
        return out

def slots(dims, layers, n):
    """箱位（仓内坐标，米）：靠里墙一排排码，一排码满 layers 层再码靠外的一排；排内从里角往外。这个顺序同时就是由远到近的绘制顺序。"""
    L, W, H = dims; a, b, h = CARTON; g = P['carton']['gapM']
    nx, ny = int((L - g + 1e-9) // (a + g)), int((W - g + 1e-9) // (b + g))
    out = []
    for r in range(ny):
        for z in range(min(layers, int(H // h))):
            for c in range(nx): out.append((g + c * (a + g), W - g - b - r * (b + g), z * h))
    if len(out) < n: sys.exit('箱位不够：需要 %d，仓内只排得下 %d' % (n, len(out)))
    return out[:n]

def build(dims, k, sl, n_drawn):
    """返回 (scene, base, boxes, front)：三组图元（未平移）。"""
    sc = Scene(dims, k); L, W, H = dims; pr = sc.pr
    base = [sc.poly([pr(0, 0, 0), pr(L, 0, 0), pr(L, W, 0), pr(0, W, 0)], TONE['floor']),
            sc.poly([pr(0, 0, 0), pr(0, W, 0), pr(0, W, H), pr(0, 0, H)], TONE['wall']),
            sc.poly([pr(0, W, 0), pr(L, W, 0), pr(L, W, H), pr(0, W, H)], TONE['wall']),
            sc.line([pr(0, 0, 0), pr(0, W, 0), pr(L, W, 0)], TONE['inner'], ST['inner']),
            sc.line([pr(0, W, 0), pr(0, W, H)], TONE['inner'], ST['inner']),
            sc.line([pr(0, 0, H), pr(0, W, H), pr(L, W, H), pr(L, W, 0)], TONE['edge'], ST['main'])]
    # 尺寸线：长（敞开一面的底边，标在左下）、宽（右侧底边，标在右下）、高（左前竖棱，标在左侧）
    base += sc.dim(pr(0, 0, 0), pr(L, 0, 0), (-C30, S30), num(L), 'end', DM['fontSize'] * 0.6)
    base += sc.dim(pr(L, 0, 0), pr(L, W, 0), (C30, S30), num(W), 'start', DM['fontSize'] * 0.6)
    base += sc.dim(pr(0, 0, 0), pr(0, 0, H), (-1, 0), num(H), 'end', DM['fontSize'] * 0.35)
    # 人形参照：站在仓体右侧，脚与右角同一水平
    cx, cy = pr(L, W, 0); gx = cx + PS['clearance'] + PS['torso'][0] * k; hgt = PS['heightM']
    hw, z0, z1, rr = PS['torso']; lx0, lx1, lz, lr = PS['leg']
    rect = lambda x0, x1, zt, zb, r: '<rect x="%s" y="%s" width="%s" height="%s" rx="%s"/>' % (f1(gx + x0 * k), f1(cy - zt * k), f1((x1 - x0) * k), f1((zt - zb) * k), f1(r * k))
    sc.grow([(gx - hw * k, cy - hgt * k), (gx + hw * k, cy)])
    base.append('<g fill="%s"><circle cx="%s" cy="%s" r="%s"/>%s%s%s</g>' % (TONE['person'], f1(gx), f1(cy - (hgt - PS['headR']) * k), f1(PS['headR'] * k),
                rect(-hw, hw, z1, z0, rr), rect(-lx1, -lx0, lz, 0, lr), rect(lx0, lx1, lz, 0, lr)))
    base.append(sc.text((gx, cy - hgt * k - 4), num(hgt), 'middle', DM['personFontSize'], TONE['dim']))
    boxes = [sc.carton(*s) for s in sl[:n_drawn]]
    front = [sc.line([pr(L, 0, 0), pr(L, W, 0)], TONE['edge'], ST['main']), sc.line([pr(L, 0, H), pr(L, W, H)], TONE['edge'], ST['main']),
             sc.line([pr(0, 0, 0), pr(L, 0, 0), pr(L, 0, H), pr(0, 0, H)], TONE['frame'], ST['main'], True)]
    return sc, base, boxes, front

HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" font-family="Helvetica, Arial, sans-serif" stroke-linecap="round" stroke-linejoin="round">'
boxes_g = lambda parts: '<g stroke="%s" stroke-width="%s">%s</g>' % (TONE['boxLine'], f1(ST['box']), ''.join(parts))   # 箱子的描边写在组上，省字节
def wrap(parts, dx, dy, vb=None):
    body = ''.join(parts)
    return (HEAD % (vb or '0 0 %d %d' % (VB, VB))) + ('<g transform="translate(%s %s)">%s</g>' % (f1(dx), f1(dy), body)) + '</svg>\n'

files, data = {}, {}
for band in BANDS:
    key = band['key']; cfg = P['tiers'].get(key)
    if not cfg: sys.exit('params.json 缺少档位 ' + key)
    u = UNITS.get(cfg['unit'])
    if not u or not u.get('dims') or len(u['dims']) != 3: sys.exit('mock/units.js 里找不到仓位 %s 的 dims' % cfg['unit'])
    if band_of(u['volume']) != key: errors.append('%s（%sm³）不在 %s 档的容量区间里' % (u['id'], u['volume'], key))
    dims = u['dims']
    n_slots = len(STEPS) if band['max'] is None else box_count(band['max'])
    n_draw = min(n_slots, box_count(u['volume']))
    sl = slots(dims, cfg['stackLayers'], n_slots)
    # 比例：二分找占满画面的 k（尺寸线与文字是固定大小，不随 k 变）
    lo, hi = 1.0, 400.0
    for _ in range(40):
        k = (lo + hi) / 2; b = build(dims, k, sl, n_slots)[0].box
        if b[2] - b[0] <= VB - 2 * MG and b[3] - b[1] <= VB - 2 * MG: lo = k
        else: hi = k
    k = round(lo, 2)
    sc, base, boxes, front = build(dims, k, sl, n_slots)
    b = sc.box; dx, dy = (VB - (b[2] - b[0])) / 2 - b[0], (VB - (b[3] - b[1])) / 2 - b[1]
    dx, dy = round(dx, 1), round(dy, 1)
    files['size-%s.svg' % key] = wrap(base, dx, dy)
    files['size-%s-front.svg' % key] = wrap(front, dx, dy)
    files['size-%s-box.svg' % key] = wrap(base + [boxes_g(''.join(x) for x in boxes[:n_draw])] + front, dx, dy)
    # 单只纸箱：以箱位 (0,0,0) 的投影为准，取紧包围盒
    one = Scene(dims, k); art = one.carton(0, 0, 0); cb = one.box; pad = 0.5
    cw, ch = cb[2] - cb[0] + 2 * pad, cb[3] - cb[1] + 2 * pad
    files['size-%s-carton.svg' % key] = wrap([boxes_g(art)], round(pad - cb[0], 1), round(pad - cb[1], 1), '0 0 %s %s' % (f1(cw), f1(ch)))
    pct = lambda v: round(v / VB * 100, 2)
    data[key] = {'unit': u['id'], 'code': u['code'], 'volume': u['volume'], 'dims': dims, 'boxes': n_draw,
                 'boxW': pct(cw), 'boxH': pct(ch),
                 'slots': [[pct(sc.pr(*s)[0] + cb[0] - pad + dx), pct(sc.pr(*s)[1] + cb[1] - pad + dy)] for s in sl]}

out_dir = os.path.join(root, 'assets', 'images', 'units')
js = ('// 由 tools/gen_size_illus.py 生成，勿手改（来源：design-src/size-illus/params.json、core/config-find.js、mock/units.js、mock/items.js）。\n'
      '// 尺寸示意插画每档取的演示仓位与长宽高（米），以及容量页累计箱子层的箱位：slots = [[左, 上], …]，boxW / boxH = 一只箱子的宽高，都是占示意图边长的百分比；\n'
      '// 顺序由里到外、由下到上，照这个顺序渲染就是正确的遮挡。boxes = 合成图（size-<档>-box.svg）里画了几只。personM 只是比例参照，不是规格。\n'
      'module.exports = ' + json.dumps({'personM': PS['heightM'], 'cartonM': CARTON, 'tiers': data}, ensure_ascii=False, separators=(', ', ': ')) + ';\n')
targets = {os.path.join(out_dir, f): s for f, s in files.items()}
targets[os.path.join(root, 'core', 'config-size-illus.js')] = js
for p, s in sorted(targets.items()):
    if p.endswith('.svg') and len(s.encode('utf8')) > MAX_BYTES: errors.append('%s 超过 6KB：%d 字节' % (os.path.basename(p), len(s.encode('utf8'))))
    if check:
        if not os.path.exists(p) or open(p, encoding='utf8').read() != s: errors.append('%s 与来源不一致，请重跑 gen_size_illus.py' % os.path.relpath(p, root))
    else:
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf8').write(s)
for f in sorted(os.listdir(out_dir)) if os.path.isdir(out_dir) else []:
    if f.startswith('size-') and f.endswith('.svg') and f not in files:
        if check: errors.append('assets/images/units/%s 不是本脚本的产物' % f)
        else: os.remove(os.path.join(out_dir, f))
print(json.dumps({'tiers': {k: {'unit': v['unit'], 'dims': v['dims'], 'slots': len(v['slots']), 'boxes': v['boxes']} for k, v in data.items()}, 'carton_m': CARTON,
                  'bytes': {f: len(s.encode('utf8')) for f, s in sorted(files.items())}, 'errors': errors}, ensure_ascii=False, indent=1))
sys.exit(1 if errors else 0)
