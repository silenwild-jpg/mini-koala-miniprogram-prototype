"""量 tools/calib_buttons.js 输出的每个按钮宽度（375 与 390 两个视口）。用法：python3 tools/calib_buttons_measure.py <html目录> <out.csv>"""
import csv, glob, os, sys
from playwright.sync_api import sync_playwright
d, out = sys.argv[1], sys.argv[2]
JS = """() => [...document.querySelectorAll('wx-button')].map(b => { const r=b.getBoundingClientRect(), p=b.parentElement.getBoundingClientRect(), cs=getComputedStyle(b);
 return {src:b.dataset.src, cls:b.className.replace(' wx-button',''), text:b.innerText.trim().slice(0,14), w:Math.round(r.width*10)/10, h:Math.round(r.height*10)/10, pw:Math.round(p.width*10)/10, ml:cs.marginLeft, vis:r.width>0&&r.height>0}; })"""
rows = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for vw in (375, 390):
        pg = b.new_page(viewport={'width': vw, 'height': 812})
        for f in sorted(glob.glob(d + '/*.html')):
            pg.goto('file://' + os.path.abspath(f))
            for i, x in enumerate(pg.evaluate(JS)):
                k = (os.path.basename(f)[:-5], i)
                rows.setdefault(k, dict(state=k[0], idx=i, src=x['src'], cls=x['cls'], text=x['text'], visible=x['vis']))
                rows[k]['w%d' % vw] = x['w']; rows[k]['parent%d' % vw] = x['pw']; rows[k]['h%d' % vw] = x['h']
    b.close()
cols = ['state', 'idx', 'src', 'cls', 'text', 'visible', 'w375', 'parent375', 'h375', 'w390', 'parent390', 'h390']
with open(out, 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.DictWriter(fh, cols, quoting=csv.QUOTE_ALL); w.writeheader()
    for k in sorted(rows): w.writerow({c: rows[k].get(c, '') for c in cols})
vis = [r for r in rows.values() if r['visible']]
locked = [r for r in vis if r.get('w375') == 184 and r.get('w390') == 184]
print('buttons measured: %d, visible: %d, locked at 184 in both widths: %d' % (len(rows), len(vis), len(locked)))
