"""把工程里所有 WXML 解析成 JSON 语法树，供 tools/preview_render.js 使用。用法：python3 tools/wxml_ast.py <miniprogram> <out.json>"""
import json, os, re, sys
import xml.dom.minidom as md
root, out = sys.argv[1], sys.argv[2]
def node(n):
    if n.nodeType == n.TEXT_NODE: return {'t': n.data}
    if n.nodeType != n.ELEMENT_NODE: return None
    return {'tag': n.tagName, 'a': {k: v for k, v in n.attributes.items()}, 'c': [x for x in (node(c) for c in n.childNodes) if x]}
res = {}
for dp, _, fs in os.walk(root):
    for f in fs:
        if not f.endswith('.wxml'): continue
        p = os.path.join(dp, f); s = open(p, encoding='utf-8').read()
        s = re.sub(r'\b(wx:else)(?=[\s>/])', r'\1=""', s)
        s = re.sub(r'\{\{.*?\}\}', lambda m: m.group(0).replace('<', '&lt;').replace('&&', '&amp;&amp;'), s)
        dom = md.parseString(('<root xmlns:wx="wx" xmlns:bind="bind" xmlns:catch="catch">' + s + '</root>').encode('utf-8'))
        res[os.path.relpath(p, root)[:-5]] = node(dom.documentElement)['c']
json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
print('wxml', len(res))
