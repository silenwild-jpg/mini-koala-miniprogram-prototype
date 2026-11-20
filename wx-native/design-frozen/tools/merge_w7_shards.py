"""W12：合并 render_w7_all.py 的分片结果（W7_SHARD=i/n）为 evidence/W7_regression.json / .csv / W7_site_inventory.json。"""
import json,os,csv,glob,collections
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.path.join(ROOT,'evidence')
rows=[];inv={k:collections.Counter() for k in ('fontSizes','colors','radii')};per={}
for f in sorted(glob.glob(OUT+'/W7_regression_shard*.json')):rows+=json.load(open(f,encoding='utf-8'))
for f in sorted(glob.glob(OUT+'/W7_site_inventory_shard*.json')):
    d=json.load(open(f,encoding='utf-8'))
    for k in inv:inv[k].update(d['site'][k])
    for pg,v in d['perPage'].items():
        pp=per.setdefault(pg,{k:set() for k in inv})
        for k in inv:pp[k]|=set(v[k])
rows.sort(key=lambda r:(r['vp'],r['idx']))
json.dump(rows,open(OUT+'/W7_regression.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
with open(OUT+'/W7_regression.csv','w',newline='',encoding='utf-8') as f:
    wr=csv.writer(f);wr.writerow(['page','wave','state','viewport','text_nodes','font_lt12','contrast_fail','tap_lt32','overflow_x','console_errors','scroll_height','font_sizes','text_colors','radii','statusbar','topbar','dark_green_blocks'])
    for r in rows:wr.writerow([r['page'],r['wave'],r['state'],r['vp'],r['text'],r['small12'],r['contrast'],r['tap32'],r['overflowX'],r['errors'],r['scrollH'],' '.join(r['fontSizes']),r['colors'],' '.join(r['radii']),int(r['consist']['statusbar']),int(r['consist']['topbar']),r['consist']['darkGreenBlocks']])
json.dump({'site':{k:dict(v) for k,v in inv.items()},'perPage':{k:{kk:sorted(vv) for kk,vv in v.items()} for k,v in per.items()}},open(OUT+'/W7_site_inventory.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
S=lambda k:sum(r[k] for r in rows)
print('runs',len(rows),'small12',S('small12'),'tap32',S('tap32'),'ovx',sum(1 for r in rows if r['overflowX']),'errors',S('errors'),'contrast',S('contrast'),'darkgreen',sum(r['consist']['darkGreenBlocks'] for r in rows),'states',len({(r['page'],r['state']) for r in rows}))
