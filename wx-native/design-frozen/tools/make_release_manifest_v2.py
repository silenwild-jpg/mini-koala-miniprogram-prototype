"""DESIGN_RELEASE_MANIFEST.json for the VIS-REDESIGN-01A hi-fi candidate: every design-system / pages / runtime / assets file
with SHA256, runtime parity against the repo snapshot (PR #220 HEAD 1d0dc7f), state inventory per page, gate summary from
evidence/W7_regression.json, open decisions. Usage: python3 tools/make_release_manifest.py"""
import json, os, hashlib, re, collections, datetime
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO='/srv/dt/product/tmp/vis_redesign_01a/repo/app/prototype/parallel/core-journey-fix-01/demo'
sha=lambda p:hashlib.sha256(open(p,'rb').read()).hexdigest()
files={}
for d in ['design-system','pages','runtime','assets','model']:
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
reg=json.load(open(os.path.join(ROOT,'evidence','W7_regression.json'),encoding='utf-8'))
inv=json.load(open(os.path.join(ROOT,'evidence','W7_site_inventory.json'),encoding='utf-8'))
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
 'task':'VIS-REDESIGN-01A','deliverable':'W7 DR1 修订版（v2）· W6 终版 + W7-A～G（34 页，design-system v1.2 增量）','generated_at':datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
 'content_snapshot':{'repo':'silenwild-jpg/mini-koala-miniprogram-prototype','ref':'PR #220 HEAD 1d0dc7f69fb2501d3298be0fb42b704a54460cb0','note':'= main 母版 + #210 已签收演示价格 + 01C 文案候选；本交付不改仓库'},
 'design_system':{'spec':'WP04_Design_System_Spec.md v1.1.1 (D-37 errata) · CONFIRMED by 张坤 2026-11-17','tokens':'tokens.css 93 tokens','spec_delta':'docs/WP04_Design_System_Spec_v1.2_Delta.md','css_layers':css},
 'runtime_parity':parity,
 'pages':pages,
 'gate_totals':{'runs':len(reg),'font_lt12':sum(r['small12'] for r in reg),'tap_lt32':sum(r['tap32'] for r in reg),'overflow_x':sum(int(bool(r['overflowX'])) for r in reg),'console_errors':sum(r['errors'] for r in reg),'contrast_fail_items':sum(r['contrast'] for r in reg),'contrast_fail_kinds':dict(contrast_kinds)},
 'site_inventory':{'font_sizes':sorted(inv['site']['fontSizes'].keys(),key=float),'text_colors':len(inv['site']['colors']),'text_colors_list':sorted(inv['site']['colors'].keys()),'radii':sorted(inv['site']['radii'].keys())},
 'wp02_baseline_for_comparison':{'font_lt12':185,'contrast_fail':213,'font_sizes_runtime':35,'text_colors_runtime':143,'radii_runtime':27,'source_css_colors':858,'source_important':364,'css_layers_index_html':12},
 'not_covered_by_this_candidate':['account.html 评审工具 mine（debug=1）：不设计，移 ?review=1 面板（D-36 A）','微信真机 NOT TESTED（Web 原型，375/390 Chromium）','RESULT 遗留页：退役，映射见 docs/D28_RESULT_Retirement_Spec.md','W1 H01 / S01 的 expired / 长店名等 D-22 真实数据复核'],
 'open_decisions':['见 W7_Report.md 第 5、7 节与 DEV_HANDOFF_v2_W7_Delta.md 第 6 节'],
 'decisions':'D-01～D-106',
 'files':files}
json.dump(manifest,open(os.path.join(ROOT,'DESIGN_RELEASE_MANIFEST_v2.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('files',len(files),'runs',len(reg),'gate',manifest['gate_totals'],'\nfont sizes',manifest['site_inventory']['font_sizes'],'\ncolors',manifest['site_inventory']['text_colors'],manifest['site_inventory']['text_colors_list'],'\nradii',manifest['site_inventory']['radii'])
for k,v in pages.items(): print(k,v['wave'],len(v['states']),v['runs'],'lt12',v['font_lt12'],'tap',v['tap_lt32'],'ovx',v['overflow_x'],'err',v['console_errors'],'contrastMax',v['contrast_fail_max'],'sbMiss',v['statusbar_missing'],'tbMiss',v['topbar_missing'],'dg',v['dark_green_blocks'])
