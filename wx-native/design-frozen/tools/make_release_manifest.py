"""DESIGN_RELEASE_MANIFEST.json for the VIS-REDESIGN-01A hi-fi candidate: every design-system / pages / runtime / assets file
with SHA256, runtime parity against the repo snapshot (PR #220 HEAD 1d0dc7f), state inventory per page, gate summary from
evidence/W6_regression.json, open decisions. Usage: python3 tools/make_release_manifest.py"""
import json, os, hashlib, re, collections, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO='/srv/dt/product/tmp/vis_redesign_01a/repo/app/prototype/parallel/core-journey-fix-01/demo'
sha=lambda p:hashlib.sha256(open(p,'rb').read()).hexdigest()
files={}
for d in ['design-system','pages','runtime','assets']:
    for dp,dn,fn in os.walk(os.path.join(ROOT,d)):
        for f in sorted(fn):
            p=os.path.join(dp,f); files[os.path.relpath(p,ROOT)]={'sha256':sha(p),'bytes':os.path.getsize(p)}
parity={}
for f in sorted(os.listdir(os.path.join(ROOT,'runtime'))):
    if not f.endswith('.js'): continue
    r=os.path.join(REPO,f)
    parity[f]='IDENTICAL' if os.path.exists(r) and sha(r)==sha(os.path.join(ROOT,'runtime',f)) else ('VERBATIM_EXTRACT' if not os.path.exists(r) else 'DIFF')
css={}
for f in ['tokens.css','base.css','components.css']:
    s=open(os.path.join(ROOT,'design-system',f),encoding='utf-8').read(); s2=re.sub(r'/\*.*?\*/','',s,flags=re.S)
    css[f]={'bytes':len(s.encode()),'important_outside_comments':s2.count('!important'),'hardcoded_hex':dict(collections.Counter(re.findall(r'#[0-9a-fA-F]{3,8}\b',s2)))}
reg=json.load(open(os.path.join(ROOT,'evidence','W6_regression.json'),encoding='utf-8'))
inv=json.load(open(os.path.join(ROOT,'evidence','W6_site_inventory.json'),encoding='utf-8'))
pages=collections.OrderedDict()
for r in reg:
    p=pages.setdefault(r['page'],{'wave':r['wave'],'states':[],'runs':0,'font_lt12':0,'tap_lt32':0,'overflow_x':0,'console_errors':0,'contrast_fail_max':0,'statusbar_missing':0,'topbar_missing':0,'dark_green_blocks':0})
    if r['state'] not in p['states']: p['states'].append(r['state'])
    p['runs']+=1; p['font_lt12']+=r['small12']; p['tap_lt32']+=r['tap32']; p['overflow_x']+=int(bool(r['overflowX'])); p['console_errors']+=r['errors']; p['contrast_fail_max']=max(p['contrast_fail_max'],r['contrast'])
    p['statusbar_missing']+=int(not r['consist']['statusbar']); p['topbar_missing']+=int(not r['consist']['topbar']); p['dark_green_blocks']+=r['consist']['darkGreenBlocks']
contrast_kinds=collections.Counter()
for r in reg:
    for c in r['contrastItems']:
        t=(c.get('text') or '')[:12]; fg=(c.get('color') or c.get('fg') or ''); bg=(c.get('bg') or c.get('background') or '')
        kind='white-on-brand-btn(D-13)' if ('255, 255, 255' in fg and ('20,174,104' in bg.replace(' ','') or '15,143,85' in bg.replace(' ',''))) else 'placeholder/disabled-grey' if '138, 148, 143' in fg else 'other'
        contrast_kinds[kind]+=1
manifest={
 'task':'VIS-REDESIGN-01A','deliverable':'W6 hi-fi candidate · 第六阶段终版候选 (W1–W6 pages incl. T7 M01 / OH01 / ACC×12, design-system v1.1.1 + W2–W6 sections)','generated_at':datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
 'content_snapshot':{'repo':'silenwild-jpg/mini-koala-miniprogram-prototype','ref':'PR #220 HEAD 1d0dc7f69fb2501d3298be0fb42b704a54460cb0','note':'= main 母版 + #210 已签收演示价格 + 01C 文案候选；本交付不改仓库'},
 'design_system':{'spec':'WP04_Design_System_Spec.md v1.1.1 (D-37 errata) · CONFIRMED by 张坤 2026-11-17','tokens':'tokens.css 91 tokens','css_layers':css},
 'runtime_parity':parity,
 'pages':pages,
 'gate_totals':{'runs':len(reg),'font_lt12':sum(r['small12'] for r in reg),'tap_lt32':sum(r['tap32'] for r in reg),'overflow_x':sum(int(bool(r['overflowX'])) for r in reg),'console_errors':sum(r['errors'] for r in reg),'contrast_fail_items':sum(r['contrast'] for r in reg),'contrast_fail_kinds':dict(contrast_kinds)},
 'site_inventory':{'font_sizes':sorted(inv['site']['fontSizes'].keys(),key=float),'text_colors':len(inv['site']['colors']),'text_colors_list':sorted(inv['site']['colors'].keys()),'radii':sorted(inv['site']['radii'].keys())},
 'wp02_baseline_for_comparison':{'font_lt12':185,'contrast_fail':213,'font_sizes_runtime':35,'text_colors_runtime':143,'radii_runtime':27,'source_css_colors':858,'source_important':364,'css_layers_index_html':12},
 'not_covered_by_this_candidate':['account.html 评审工具 mine（debug=1）：不设计，移 ?review=1 面板（D-36 A）','微信真机 NOT TESTED（Web 原型，375/390 Chromium）','RESULT 遗留页：退役，映射见 docs/D28_RESULT_Retirement_Spec.md','W1 H01 / S01 的 expired / 长店名等 D-22 真实数据复核'],
 'open_decisions':['D-36 已裁定（方案 A，运输需求成页，推荐有礼成页，报价方案 + 最近找仓 → 找仓进度）：docs/D36_My_IA_Final.md；D-63～D-70 见 W6_Report.md §6','D-60 business-bridge.js 移植清单（实施以原文件为准）','D-61 BUSINESS 3 条说明文字删除（见 W5_Report §2.3）','代码侧累计待办：D-10e/D-23 取价基数 0.65、D-42 resumeFailedOrder、D-46 fixtures 场景、D-51 QUICK 起价、D-55 label 键、D-56 lifecycle 场景定价、D-28 RESULT 退役改动 6 项、D-64 account.html 退役 / centralPage 重定向到 M01 子视图、D-69 消息未读字段'],
 'files':files}
json.dump(manifest,open(os.path.join(ROOT,'DESIGN_RELEASE_MANIFEST.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('files',len(files),'runs',len(reg),'gate',manifest['gate_totals'],'\nfont sizes',manifest['site_inventory']['font_sizes'],'\ncolors',manifest['site_inventory']['text_colors'],manifest['site_inventory']['text_colors_list'],'\nradii',manifest['site_inventory']['radii'])
for k,v in pages.items(): print(k,v['wave'],len(v['states']),v['runs'],'lt12',v['font_lt12'],'tap',v['tap_lt32'],'ovx',v['overflow_x'],'err',v['console_errors'],'contrastMax',v['contrast_fail_max'],'sbMiss',v['statusbar_missing'],'tbMiss',v['topbar_missing'],'dg',v['dark_green_blocks'])
