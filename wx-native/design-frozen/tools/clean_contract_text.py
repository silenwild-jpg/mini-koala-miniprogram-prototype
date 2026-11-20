import re, sys, json
def load(p):
    t = open(p, encoding='utf-8').read()
    lines = []
    for ln in t.split('\n'):
        s = ln.rstrip()
        if re.match(r'^=====PAGE \d+=====$', s): continue
        if re.match(r'^\s*第\s*\d+\s*页\s*[，,]?\s*共\s*\d+\s*页\s*$', s): continue
        if not s.strip(): continue
        lines.append(s.strip())
    return lines
START = re.compile(r'^(\d{1,2}[、.]\s*|（\d{1,2}）|\(\d{1,2}\)|[一二三四五六七八九十]+、|\d\.\d\s|[a-e]\)\s|附件\s?\d|甲方签署|我已详细阅读|（以下无正文）|其次，甲乙双方不形成|同时，甲乙双方不形成|其中本协议当中|本协议签署前|需要特别说明的：|需要特别注意：|特别提示：|由于乙方存放以上物品|乙方理解地下空间)')
HEAD = re.compile(r'^(迷你考拉用户使用告知书|迷你考拉自助式设备设施使用协议|[一二三四五六七八九]、\s?[^，。；]{2,22}|附件\s?\d[：:\s]?[^，。]{0,20}|2\.\d 迷你考拉[^，。]{2,30}：|\d+[、.]\s?(基础保障服务：|增值保障服务|免责说明：))$')
def paras(lines, width):
    out = []; cur = ''
    for i, s in enumerate(lines):
        if HEAD.match(s) or s.startswith('使用方（乙方'):
            if cur: out.append(cur)
            if HEAD.match(s): out.append('## '+s); cur=''
            else: cur = s
            continue
        # a bare marker line like "3、" or "（1）" joins with the following text
        if cur and START.match(s) and not re.fullmatch(r'(\d{1,2}[、.]|（\d{1,2}）)', cur.strip()):
            out.append(cur); cur = s
        elif not cur:
            cur = s
        else:
            cur += (' ' if re.search(r'[A-Za-z0-9]$', cur) and re.match(r'[A-Za-z]', s) else '') + s
        # short line ending with sentence punctuation => paragraph end
        if len(s) < width * 0.72 and re.search(r'[。：；）]$', s) and not re.fullmatch(r'(\d{1,2}[、.]|（\d{1,2}）)', s):
            out.append(cur); cur = ''
    if cur: out.append(cur)
    return [re.sub(r'\s+', ' ', p).strip() for p in out if p.strip()]
n = paras(load('c1.txt'), 40)
a = paras(load('c2.txt'), 50)
json.dump({'notice': n, 'agreement': a}, open('paras.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(n), len(a))
for p in n[:6]: print('N|', p[:90])
print()
for i, p in enumerate(a): print(i, '|', p[:70], '…', len(p))
