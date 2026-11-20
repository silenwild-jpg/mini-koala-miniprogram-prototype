import json,sys
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8819'
M01=['new','estimated','selected','booking','pending','expired','payment_failed','cancelled','invalidated','identity','upcoming','renewal','expiring','active','returning','lease_expired','refund','ended']
OH01=['empty','single','mixed','ended']
ACC={'needs':['empty','list','withdrawn','edit','withdraw'],'progress':['none','demand','selected','quote','quote_expired','reference'],'favorites':['empty','list'],'coupons':['empty','gate','available','locked','redeemed'],'messages':['empty','unread','read'],'profile':['unverified','verified','contact','contact&overlay=contact','contact_invalid'],'identity':['not_paid','pending','form','invalid','reviewing','reviewing&review=1','result','verified','failed'],'access':['not_paid','identity_required','before_start','allowed','allowed&overlay=unlock','inactive'],'transport':['empty','pick','form','invalid','saved'],'referral':['gate','ready','copied'],'support':['form','order','invalid','saved'],'brand':['default']}
runs=[('pages/m01.html?state='+s) for s in M01]+[('pages/oh01.html?state='+s) for s in OH01]+['pages/acc.html?view=%s&state=%s'%(v,s) for v,ss in ACC.items() for s in ss]
with sync_playwright() as p:
    br=p.chromium.launch();ctx=br.new_context(viewport={'width':375,'height':812},locale='zh-CN')
    bad=0
    for u in runs:
        pg=ctx.new_page();errs=[]
        pg.on('console',lambda m,errs=errs: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror',lambda e,errs=errs: errs.append(str(e)))
        pg.goto(BASE+'/'+u,wait_until='load');pg.wait_for_timeout(300)
        vm=pg.evaluate('window.__W6||null');h=pg.evaluate('document.documentElement.scrollHeight');unk=pg.evaluate("!!document.body.querySelector('p[style*=B42318]')")
        flag='' if (not errs and not unk) else '  <<<<'
        if flag: bad+=1
        print(u.replace('pages/',''),'h=%d'%h,json.dumps(vm,ensure_ascii=False)[:150],flag)
        for e in errs: print('   ERR',e[:300])
        pg.close()
    br.close()
print('bad',bad,'of',len(runs))
