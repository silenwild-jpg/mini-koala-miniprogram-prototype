"""W27：生成演示导航 demo.html（按旅程排好顺序的状态链接；演示工具页，不属于小程序页面）。
用法：python3 tools/make_demo_index.py [BASE]  给 BASE 时逐个打开核对不是「未知状态」。"""
import os,sys,html,json
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def url(page,st):
    p=page.lower()
    f={'acc':'pages/acc.html?view=','ent':'pages/ent.html?view='}
    if p.startswith('acc_'): base='pages/acc.html?view='+p[4:]
    elif p.startswith('ent_'): base='pages/ent.html?view='+p[4:]
    else: base='pages/'+p+'.html'
    if st is None: return base
    s=st.replace('__sys_','&sys=').replace('__auth_','&auth=').replace('__agreed','&agreed=1').replace('__review','&review=1').replace('__m2','&unit=m2').replace('__offhours','&offhours=1').replace('__','&overlay=')
    key='doc' if p=='agreement' else 'state'
    return base+('&' if '?' in base else '?')+key+'='+s
J=[
('1 首次进入：隐私、定位、用仓位置',[('H01','new','首页 · 新用户'),('H01','new__auth_privacy_loc','隐私与定位合并弹层'),('H01','new__auth_loc_ok','已定位'),('H01','new__auth_loc_nocity','定位到无门店城市，回北京'),('H01','new__auth_search_on','用仓位置面板'),('M01','new__auth_m_guest','「我的」· 未登录')]),
('2 估算：填容量 / 按物品',[('CAP','empty','填容量 · 空'),('CAP','filled','填容量 · 已填'),('CAP','area','按 ㎡ 填写'),('CAP','term_near','下一折扣档提示'),('ITEMS','empty','按物品估算 · 列表'),('ITEMS','selected','已选物品'),('ITEMS','qty','数量直接输入'),('ITEMS','cart','已选清单'),('CAP','from_items','带回填容量页'),('CAP','large','30m³ 及以上交顾问')]),
('3 找仓：推荐、门店列表、门店详情',[('S5','from_items','仓位推荐 · 来自物品估算'),('S5','matched__auth_locked','未登录 · 查看报价'),('S5','matched__auth_phone','登录层'),('S5','matched__auth_phone_ok','登录成功'),('S5','matched','仓位推荐 · 已登录'),('S01','matched','门店列表 · 有需求'),('S01','far_transport','5km 以上 · 免费运输'),('S01','browse','门店列表 · 无需求'),('S02','matched','门店详情'),('S02','route','到店指引'),('S02','advisor_rent','整期满 ¥3,000 顾问卡'),('S5','none','无匹配仓位')]),
('4 下单：实名、签署、支付',[('QUICK','ready','快捷下单'),('O01','unauthorized','确认订单 · 未登录'),('O01','idv_todo','未实名'),('O01','idv_todo__idv','实名认证弹层'),('O01','ready','确认订单'),('O01','term_near','再租 1 个月享下一档'),('O01','full','满额减'),('O01','transport_ok','免费运输已满足'),('O01','ready__protect','物品保障说明'),('O01','ready__agreed__sign','签署使用协议'),('O01','pending__pay','待支付 · 支付弹层'),('O01','paying','支付中'),('O01','payment_failed','支付未成功'),('O01','price_changed','价格变动'),('O01','expired','订单超时')]),
('5 入仓与在租',[('O03','pending&sub=ask','到期提醒订阅授权'),('O03','upcoming','订单详情 · 待起租'),('O03','upcoming&sub=accepted','已开启到期提醒'),('O03','active','订单详情 · 租用中'),('O03','active__unlock','一键开锁（未开通提示）'),('O03','active_full','含满额减的订单'),('ECONTRACT','signed','电子合同'),('ACC_ACCESS','allowed','入仓指引'),('H01','active','首页 · 租用中'),('M01','active','「我的」· 租用中'),('OH01','mixed','订单列表')]),
('6 续租',[('H01','expiring','首页 · 即将到期'),('RN01','form','申请续租'),('RN01','form&sub=ask','续租报价订阅授权'),('RN01','quote_pending','门店确认报价中'),('RN01','quote_ready','续租报价待确认'),('RN01','form_keep','首次续租沿用原折扣'),('RN01','quote_keep','沿用原折扣 · 报价'),('RN01','quote_keep_expired','沿用报价过期，仍沿用'),('RN01','payment_pending__pay','支付续租费用'),('RN01','completed','续租已生效')]),
('7 退仓、押金、发票',[('EX01','form','办理退仓 · 到期'),('EX01','form_early','提前退仓'),('EX01','form_early__confirm','提前退仓确认（按协议结算）'),('EX01','requested&sub=ask','验仓结果订阅授权'),('EX01','waiting','等待门店验仓'),('EX01','failed','验仓未通过'),('EX01','passed','验仓通过'),('DP01','refund_pending','押金退款处理中'),('DP01','refunded','押金已退还'),('DP01','refunded_partial','押金部分退还'),('IV01','filled','申请发票'),('IV01','submitted','发票已提交')]),
('8 预约用仓与企业',[('BOOKING','empty','预约用仓 · 空'),('BOOKING','filled','预约用仓 · 已填'),('BOOKING','filled&sub=ask','预约进度订阅授权'),('BOOKING','success','预约已提交'),('ACC_NEEDS','list','预约记录'),('BUSINESS','empty','企业用仓'),('BUSINESS','filled','企业用仓 · 已填'),('BUSINESS','multi_area','多个用仓区域'),('BUSINESS','step2','第 2 步'),('BUSINESS','success','企业需求已提交'),('ENT_CERT','filled','企业认证'),('ESTORE','default','考拉E存')]),
('9 账户与权益',[('ACC_PROFILE','verified','个人信息'),('ACC_PROFILE','verified__logout','退出登录'),('ACC_PROFILE','verified__privacy','撤回隐私授权'),('ACC_PROFILE','verified__delete','注销账号'),('ACC_COUPONS','available','优惠与权益'),('ACC_MESSAGES','unread','消息'),('ACC_FAVORITES','list','收藏'),('ACC_FAVORITES','list_gone','收藏失效'),('ACC_PROGRESS','quote','找仓进度'),('AGREEMENT','usage','使用协议原文')]),
('10 系统状态',[('S01','loading','加载中'),('H01','active__sys_error','加载失败'),('H01','active__sys_offline','断网'),('S02','matched__sys_unit_gone','仓位已被租出'),('S01','soldout','门店满租'),('S01','nomatch','无匹配门店')]),
]
css="""body{margin:0;font:15px/1.6 -apple-system,"PingFang SC","Noto Sans SC",sans-serif;color:#1F2A24;background:#F6F8F7}
main{max-width:1080px;margin:0 auto;padding:24px 20px 60px}h1{font-size:22px;margin:0 0 4px}p.lead{margin:0 0 20px;color:#5B6660;font-size:14px}
section{background:#fff;border:1px solid #E3E8E5;border-radius:12px;padding:16px 18px;margin:0 0 14px}h2{font-size:16px;margin:0 0 10px;color:#0B7A48}
ol{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
li a{display:flex;gap:8px;align-items:baseline;padding:9px 12px;border:1px solid #E3E8E5;border-radius:8px;color:#1F2A24;text-decoration:none;min-height:26px}
li a:hover{border-color:#14AE68;background:#E6F6EE}li a b{font-weight:500;color:#5B6660;font-size:12px;min-width:20px}li a span{flex:1}li a i{font-style:normal;font-size:12px;color:#5B6660}
.frame{position:fixed;right:20px;top:20px;width:375px;height:812px;border:1px solid #CBD3CE;border-radius:16px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.12);display:none;overflow:hidden}
.frame iframe{width:375px;height:812px;border:0}body.split main{margin:0;max-width:calc(100vw - 440px)}body.split .frame{display:block}
.bar{display:flex;gap:10px;align-items:center;margin:0 0 16px;font-size:14px}.bar button{height:36px;padding:0 14px;border-radius:8px;border:1px solid #0B7A48;background:#fff;color:#0B7A48;font-size:14px;cursor:pointer}
@media(max-width:900px){body.split main{max-width:none}body.split .frame{display:none}}"""
out=['<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>迷你考拉仓小程序设计稿 · 演示导航</title><style>'+css+'</style></head><body><main>',
'<h1>迷你考拉仓小程序设计稿 · 演示导航</h1><p class="lead">按使用顺序排好的画面。页面里的大多数按钮不会跳转，请用这张导航逐个打开；数据为演示数据。本页是演示工具，不属于小程序。</p>',
'<div class="bar"><button type="button" id="t">右侧预览：开</button><span>开启后点击条目在右侧 375 宽窗口里打开；关闭则在新标签页打开。</span></div>']
allu=[]
for title,items in J:
    out.append('<section><h2>'+html.escape(title)+'</h2><ol>')
    for i,(pg,st,lab) in enumerate(items,1):
        u=url(pg,st);allu.append((pg,st,u))
        out.append('<li><a href="'+html.escape(u)+'" target="_blank"><b>'+str(i)+'</b><span>'+html.escape(lab)+'</span></a></li>')
    out.append('</ol></section>')
out.append('</main><div class="frame"><iframe name="pv" title="预览"></iframe></div><script>const b=document.getElementById("t");function set(on){document.body.classList.toggle("split",on);b.textContent="右侧预览："+(on?"开":"关");document.querySelectorAll("li a").forEach(a=>a.target=on?"pv":"_blank");}let on=innerWidth>900;set(on);b.onclick=()=>set(on=!on);</script></body></html>')
open(os.path.join(R,'demo.html'),'w',encoding='utf-8').write(''.join(out))
print('items',len(allu))
if len(sys.argv)>1:
    from playwright.sync_api import sync_playwright
    bad=0
    with sync_playwright() as p:
        b=p.chromium.launch();c=b.new_context(viewport={'width':375,'height':812})
        for pg,st,u in allu:
            x=c.new_page();errs=[];x.on('pageerror',lambda e:errs.append(str(e)));x.goto(sys.argv[1]+'/'+u);x.wait_for_timeout(350)
            t=x.evaluate("document.body.innerText");n=len(t.strip())
            if '未知状态' in t or errs or n<30: bad+=1;print('BAD',pg,st,u,errs[:1],n)
            x.close()
        b.close()
    print('bad',bad)
