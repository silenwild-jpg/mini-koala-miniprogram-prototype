#!/usr/bin/env python3
# 第 2 步方向稿：六张静态稿（375 宽）。只出稿，不动运行时代码。
import os
D = os.path.dirname(os.path.abspath(__file__))
I = '/srv/dt/product/tmp/wx_main/wx-native/miniprogram/assets/icons/'
T = '/srv/dt/product/tmp/wx_main/wx-native/miniprogram/assets/tabbar/'
P = '/srv/dt/product/tmp/step2/img/'
L = '/srv/dt/product/tmp/step2/illus/'
ITEM = '/srv/dt/product/tmp/wx_main/wx-native/design-frozen/assets/estimate/items/'

def ic(n, c='ic', st=''):
    return f'<img class="{c}" src="{I}{n}.svg" style="{st}">'

def page(name, body, css='', cls='', nav=None, fold=True):
    navh = f'<div class="nav">{ic("down-ink","back")}{nav}</div>' if nav else ''
    html = f'''<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="base.css"><style>{css}</style>
<div class="page {cls}"><div class="stamp">方向稿 · 静态示意 · 非微信渲染</div>{navh}{body}{'<div class="fold"></div>' if fold else ''}</div>'''
    open(os.path.join(D, name + '.html'), 'w').write(html)

def tabbar(on):
    items = [('home', '首页'), ('stores', '附近门店'), ('orders', '订单'), ('me', '我的')]
    return '<div class="tabbar">' + ''.join(
        f'<div class="{"on" if k == on else ""}"><img src="{T}tab-{k}{"-on" if k == on else ""}.png">{t}</div>' for k, t in items) + '</div>'

chev = ic('chev-brand', 'ic', 'width:12px;height:12px')
SCENES = [('moving', '搬家过渡'), ('renovation', '装修暂存'), ('luggage', '行李寄存'), ('seasonal', '换季收纳'), ('collection', '兴趣收藏'), ('household', '闲置物品')]

def scenes_row():
    return '<div class="scn">' + ''.join(
        f'<div class="scn-i"><div class="scn-p"><img src="{P}scene-{k}.png"></div><div class="t13">{t}</div></div>' for k, t in SCENES) + '</div>'

def brand_block(dark=False):
    proofs = [('proof1', '高新技术企业'), ('proof2', '媒体报道'), ('proof3', '行业标准')]
    return f'''
<div class="bz">
  <div class="row"><div class="bz-logo"></div><div class="h2">迷你考拉仓</div><div class="sp"></div><span class="link">了解迷你考拉仓{chev}</span></div>
  <div class="bz-n">
    <div><b class="num">14年</b><span>稳定运营</span></div>
    <div><b class="num">590+</b><span>直营门店</span></div>
    <div><b class="num">30万+</b><span>累计服务用户</span></div>
  </div>
  <div class="bz-c">{ic('pin-sub')}<span>覆盖 5 城：</span><em>北京</em><em>上海</em><em>深圳</em><em>杭州</em><em>广州</em></div>
  <div class="bz-p">{''.join(f'<div><img src="{P}{k}.jpg"><span>{t}</span></div>' for k, t in proofs)}</div>
  <div class="bz-w">资质配图为历史模拟图，占位示意，待换正式件</div>
</div>'''

COMMON = '''
.scn{display:flex;gap:10px;padding:0 16px;overflow:hidden}
.scn-i{flex:none;width:84px;text-align:center}
.scn-p{width:84px;height:84px;border-radius:12px;background:var(--sunk);display:flex;align-items:center;justify-content:center;margin-bottom:6px}
.scn-p img{width:66px;height:66px;object-fit:contain}
.bz{padding:20px 16px 8px}
.bz-logo{width:18px;height:18px;border-radius:5px;background:var(--g);margin-right:8px}
.bz-n{display:flex;margin-top:14px}
.bz-n div{flex:1}
.bz-n b{display:block;font-size:18px;font-weight:700;line-height:1.2}
.bz-n span{font-size:12px;color:var(--sub)}
.bz-c{display:flex;align-items:center;margin-top:14px;font-size:12px;color:var(--sub)}
.bz-c img{margin-right:4px}
.bz-c em{font-style:normal;color:var(--ink);background:#fff;box-shadow:inset 0 0 0 1px var(--line);border-radius:4px;padding:1px 7px;margin-right:6px}
.bz-p{display:flex;gap:8px;margin-top:12px}
.bz-p div{flex:1;position:relative}
.bz-p img{width:100%;height:78px;object-fit:cover;border-radius:8px}
.bz-p span{display:block;font-size:12px;color:var(--sub);margin-top:4px;text-align:center}
.bz-w{font-size:10px;color:#b00;margin-top:6px}
.ent{display:flex;align-items:center;gap:12px}
.ent-i{width:40px;height:40px;border-radius:10px;background:var(--tint);display:flex;align-items:center;justify-content:center;flex:none}
'''

REC = [('s1', '安贞·富仁名苑店', '1.2km · 朝阳区', ['特价仓', '近地铁'], '63'),
       ('s2', '建国门外·通用时代店', '4.5km · 朝阳区', ['特价仓'], '57'),
       ('s3', '芍药居北里店', '2.8km · 朝阳区', ['特价仓'], '71')]

def tags(ts):
    out = ''
    for t in ts:
        c = 'promo' if t in ('特价仓', '7折', '满6个月免费运输') else ('warn' if t.startswith('仅剩') else '')
        out += f'<span class="tag {c}">{t}</span>'
    return out

ENT = f'''<div class="card ent">
  <div class="ent-i">{ic('building-brand','ic24')}</div>
  <div style="flex:1"><div class="h2">企业存储</div><div class="t12 sub">灵活空间，满足商家备货与企业存储需求</div></div>
  {ic('chev-mute')}</div>'''

# ───────────────────────── 首页 A 档 ─────────────────────────
home_a_css = COMMON + '''
.hero{height:168px;position:relative;background:url(%shero_home_wide.jpg) center/cover}
.hero:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,92,54,.55) 0%%,rgba(8,92,54,.78) 100%%)}
.top{position:absolute;left:16px;right:16px;top:12px;display:flex;align-items:center;gap:10px;color:#fff}
.top .city{display:flex;align-items:center;font-size:15px;font-weight:600}
.top .srch{flex:1;height:34px;border-radius:17px;background:#fff;display:flex;align-items:center;padding:0 12px;color:var(--mute);font-size:13px;gap:6px}
.w{filter:brightness(0) invert(1)}
.slog{position:absolute;left:16px;top:64px;color:#fff}
.slog b{display:block;font-size:20px;font-weight:700;line-height:1.3}
.slog span{font-size:12px;opacity:.9}
.e1{margin:-40px 16px 0;position:relative;background:#fff;border-radius:12px;box-shadow:0 6px 18px rgba(11,122,72,.14),0 0 0 1px var(--line);padding:16px;display:flex;align-items:center}
.e1 .t{font-size:20px;font-weight:700;line-height:1.3}
.e1 img.il{width:84px;height:84px;object-fit:contain;margin:-6px -4px -6px 0}
.e2{display:flex;gap:10px;margin:10px 16px 0}
.e2 > div{flex:1;background:#fff;border-radius:12px;box-shadow:0 0 0 1px var(--line);padding:12px;display:flex;align-items:center;gap:8px}
.e2 img.il{width:44px;height:44px;object-fit:contain;flex:none}
.rc{display:flex;gap:10px;padding:0 16px;overflow:hidden}
.rc-i{flex:none;width:150px;background:#fff;border-radius:12px;box-shadow:0 0 0 1px var(--line);overflow:hidden}
.rc-i img{width:150px;height:94px;object-fit:cover}
.rc-b{padding:10px}
.rc-b .n{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
''' % P
recs = ''.join(f'''<div class="rc-i"><img src="{P}{k}_wide.jpg"><div class="rc-b"><div class="n">{n}</div><div class="t12 sub">{d}</div>
<div style="margin:6px 0 8px">{tags(t[:1])}</div><div class="price num"><i>¥</i>{p}<small>/m³/月起</small></div></div></div>''' for k, n, d, t, p in REC)
home_a = f'''
<div class="hero">
  <div class="top"><div class="city">{ic('pin-ink','ic w')}北京{ic('down-ink','ic w')}</div>
    <div class="srch">{ic('search-sub')}搜索门店、商圈或区域</div>{ic('bell-ink','ic24 w')}</div>
  <div class="slog"><b>让城市生活更轻松</b><span>家具、行李、闲置物品，找到附近适合的存储空间</span></div>
</div>
<div class="e1"><div style="flex:1"><div class="t">找附近门店</div><div class="t13 sub" style="margin:2px 0 12px">查看门店与仓位</div><span class="btn">查看门店</span></div><img class="il" src="{L}a1_pin.png"></div>
<div class="e2">
  <div><img class="il" src="{L}a2_calc.png"><div><div class="t14 b">估大小算价格</div><div class="t12 sub">不知道租多大？</div></div></div>
  <div><img class="il" src="{L}a5_quick.png"><div><div class="t14 b">立即下单</div><div class="t12 sub">选好门店直接订</div></div></div>
</div>
<div class="sec"><div class="h2">为您推荐</div><span class="link">查看全部门店{chev}</span></div>
<div class="rc">{recs}</div>
<div class="sec"><div class="h2">常见存储场景</div><span class="t12 mute">左右滑动</span></div>
{scenes_row()}
<div style="height:8px"></div>
{ENT}
{brand_block()}
<div style="height:50px"></div>
{tabbar('home')}'''
page('01_home_A', home_a, home_a_css, 'white')

# ───────────────────────── 首页 B 档 ─────────────────────────
home_b_css = COMMON + '''
.hd{background:var(--gd);padding:12px 16px 76px;color:#fff;position:relative;overflow:hidden}
.hd:after{content:"";position:absolute;right:-60px;top:-70px;width:220px;height:220px;border-radius:50%%;background:rgba(20,174,104,.55)}
.top{display:flex;align-items:center;gap:10px;position:relative;z-index:2}
.top .city{display:flex;align-items:center;font-size:15px;font-weight:600}
.top .srch{flex:1;height:34px;border-radius:17px;background:#fff;display:flex;align-items:center;padding:0 12px;color:var(--mute);font-size:13px;gap:6px}
.w{filter:brightness(0) invert(1)}
.slog{position:relative;z-index:2;margin-top:18px}
.slog b{display:block;font-size:22px;font-weight:700;line-height:1.3}
.slog span{font-size:12px;opacity:.9}
.m1{margin:-60px 16px 0;position:relative;background:#fff;border-radius:16px;box-shadow:0 8px 22px rgba(8,92,54,.16);overflow:hidden}
.m1 .ph{height:112px;background:url(%ss1_wide.jpg) center 40%%/cover;position:relative}
.m1 .ph span{position:absolute;left:10px;bottom:8px;font-size:11px;color:#fff;background:rgba(31,42,36,.55);padding:1px 6px;border-radius:4px}
.m1 .bd{padding:14px 16px 16px;display:flex;align-items:center;gap:12px}
.m1 .t{font-size:20px;font-weight:700;line-height:1.3}
.q2{display:flex;gap:10px;margin:10px 16px 0}
.q2 > div{flex:1;background:var(--tint);border-radius:12px;padding:12px 8px 12px 12px;display:flex;align-items:center;gap:6px}
.q2 img.il{width:46px;height:46px;object-fit:contain;flex:none;mix-blend-mode:multiply}
.vc{margin:0 16px 12px;background:#fff;border-radius:12px;box-shadow:0 0 0 1px var(--line);overflow:hidden}
.vc img{width:343px;height:132px;object-fit:cover}
.vc .bd{padding:12px 14px;display:flex;align-items:flex-end}
.vc .n{font-size:16px;font-weight:600}
.ft{background:var(--tint);margin-top:20px;padding:4px 0 66px}
.ft .card{margin-top:16px}
''' % P
vcs = ''.join(f'''<div class="vc"><img src="{P}{k}_wide.jpg"><div class="bd"><div style="flex:1"><div class="n">{n}</div>
<div class="t12 sub" style="margin:2px 0 6px">{d}</div>{tags(t)}</div><div class="price num"><i>¥</i>{p}<small>/m³/月起</small></div></div></div>''' for k, n, d, t, p in REC[:2])
home_b = f'''
<div class="hd">
  <div class="top"><div class="city">{ic('pin-ink','ic w')}北京{ic('down-ink','ic w')}</div>
    <div class="srch">{ic('search-sub')}搜索门店、商圈或区域</div>{ic('bell-ink','ic24 w')}</div>
  <div class="slog"><b>让城市生活更轻松</b><span>家具、行李、闲置物品，找到附近适合的存储空间</span></div>
</div>
<div class="m1"><div class="ph"><span>门店示意图</span></div>
  <div class="bd"><div style="flex:1"><div class="t">找附近门店</div><div class="t13 sub">查看门店与仓位</div></div><span class="btn lg">查看门店</span></div></div>
<div class="q2">
  <div><img class="il" src="{L}b2_calc.png"><div><div class="t14 b">估大小算价格</div><div class="t12 sub">不知道租多大？</div></div></div>
  <div><img class="il" src="{L}b5_quick.png"><div><div class="t14 b">立即下单</div><div class="t12 sub">选好门店直接订</div></div></div>
</div>
<div class="sec"><div class="h2">为您推荐</div><span class="link">查看全部门店{chev}</span></div>
{vcs}
<div class="sec" style="padding-top:12px"><div class="h2">常见存储场景</div><span class="t12 mute">左右滑动</span></div>
{scenes_row()}
<div class="ft">{ENT}{brand_block()}</div>
{tabbar('home')}'''
page('02_home_B', home_b, home_b_css, 'white')

# ───────────────────────── 附近门店 ─────────────────────────
stores_css = '''
.hdr{background:#fff;padding:10px 16px 0}
.srch{flex:1;height:36px;border-radius:18px;background:var(--sunk);display:flex;align-items:center;padding:0 12px;color:var(--mute);font-size:13px;gap:6px;margin-left:12px}
.flt{display:flex;height:44px;align-items:center;font-size:14px}
.flt div{flex:1;display:flex;align-items:center;justify-content:center;gap:2px}
.need{background:var(--tint);margin:12px 16px 0;border-radius:8px;height:40px;display:flex;align-items:center;padding:0 12px;font-size:13px}
.sc{background:#fff;border-radius:12px;box-shadow:0 0 0 1px var(--line);margin:12px 16px 0;padding:12px}
.sc .hd{display:flex;gap:12px}
.sc .th{width:80px;height:80px;border-radius:8px;position:relative;overflow:hidden;flex:none}
.sc .th img{width:80px;height:80px;object-fit:cover}
.sc .n{font-size:16px;font-weight:600;line-height:1.35}
.sc .m{border-top:1px solid var(--line);margin-top:12px;padding-top:12px;display:flex;align-items:center}
.sc .m1{border-top:1px solid var(--line);margin-top:10px;padding-top:10px;display:flex;align-items:baseline;font-size:13px}
.es{margin:12px 16px 0;border-radius:12px;background:linear-gradient(100deg,#0B7A48 0%,#14AE68 100%);color:#fff;padding:14px 16px;display:flex;align-items:center;position:relative;overflow:hidden}
.es .k{display:inline-block;font-size:11px;background:rgba(255,255,255,.2);border-radius:4px;padding:0 6px;margin-bottom:4px}
.es .go{height:30px;padding:0 12px;border-radius:15px;background:#fff;color:var(--gd);font-size:13px;font-weight:600;display:flex;align-items:center;flex:none}
.grp{font-size:12px;color:var(--sub);padding:16px 16px 0}
'''
def scard(img, name, loc, tg, corner=None, big=None, line=None):
    c = f'<div class="corner {"low" if corner == "区域低价" else ""}">{corner}</div>' if corner else ''
    s = f'<div class="sc"><div class="hd"><div class="th"><img src="{P}{img}_sq.jpg">{c}</div><div style="flex:1;min-width:0"><div class="n">{name}</div><div class="t13 sub" style="margin:2px 0 8px">{loc}</div><div>{tags(tg)}</div></div></div>'
    if big:
        unit, price, disc, total = big
        s += f'<div class="m"><div style="flex:1"><div class="t13 sub">{unit}</div><div class="row" style="margin-top:2px"><span class="price num"><i>¥</i>{price}<small>/月</small></span><span class="tag promo" style="margin-left:8px">{disc}</span></div><div class="t12 sub" style="margin-top:2px">{total}</div></div><span class="btn">立即下单</span></div>'
    if line:
        unit, price, total = line
        s += f'<div class="m1"><span class="sub" style="flex:1">{unit}</span><span class="price num" style="font-size:16px"><i>¥</i>{price}<small>/月</small></span><span class="sub t12" style="margin-left:8px">{total}</span></div>'
    return s + '</div>'
stores = f'''
<div class="hdr"><div class="row"><span class="b" style="font-size:15px">北京</span>{ic('down-ink')}<div class="srch">{ic('search-sub')}搜索门店、商圈或区域</div></div>
<div class="flt"><div>综合排序{ic('down-ink')}</div><div>距离{ic('down-ink')}</div><div>服务{ic('down-ink')}</div></div></div>
<div class="need">{ic('cube-brand')}<span style="margin-left:6px">按 <b>约 3.5m³ · 租 6 个月</b> 匹配</span><div class="sp"></div><span class="link">修改{chev}</span></div>
<div class="grp">为您优先推荐</div>
{scard('s3','芍药居北里店','2.8km · 朝阳区 · 芍药居',['仅剩 2 个可租','停车便利'],'距离最近',('B003 · 4m³','315','7折','整期 ¥1,890 · 6 个月'))}
{scard('s2','建国门外·通用时代店','4.5km · 朝阳区 · 建国门外',['特价仓','电梯直达'],'区域低价',('A012 · 4m³','298','特价仓','整期 ¥1,788 · 6 个月'))}
<div class="es"><div style="flex:1"><span class="k">上门取送</span><div class="h2">考拉E存</div><div class="t12" style="opacity:.92">预约上门取件，需要时再送回</div></div><span class="go">了解服务</span></div>
<div class="grp">更多门店</div>
{scard('s5','三元桥·国际村店','8.6km · 朝阳区 · 三元桥',['满6个月免费运输','停车便利'],None,None,('匹配 4m³','329','整期 ¥1,974'))}
{scard('s4','万柳·光大花园店','15km · 海淀区 · 万柳',['特价仓','停车便利'],None,None,('匹配 3.8m³','441','整期 ¥2,646'))}
{scard('s1','回龙观·首开智慧社店','16km · 昌平区 · 回龙观',['特价仓','控温防潮'],None,None,('匹配 4m³','359','整期 ¥2,154'))}
<div style="height:60px"></div>
{tabbar('stores')}'''
page('03_stores', stores, stores_css, '', '附近门店')

# ───────────────────────── 门店详情 A 档 ─────────────────────────
detail_css = '''
.hero{height:200px;background:url(%ss1_wide.jpg) center/cover;position:relative}
.hero span{position:absolute;bottom:10px;font-size:11px;color:#fff;background:rgba(31,42,36,.55);padding:1px 7px;border-radius:9px}
.inf{background:#fff;padding:16px}
.k3{display:flex;margin-top:14px;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.k3 div{flex:1}
.k3 div+div{padding-left:12px;border-left:1px solid var(--line)}
.k3 b{display:block;font-size:16px;font-weight:700;line-height:1.3}
.k3 span{font-size:12px;color:var(--sub)}
.a3{display:flex;gap:8px;margin-top:12px}
.a3 div{flex:1;height:40px;border-radius:8px;background:var(--sunk);display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px;font-weight:600}
.a3 div.p{background:var(--tint);color:var(--gd)}
.tabs{display:flex;background:#fff;height:44px;border-top:8px solid var(--sunk);border-bottom:1px solid var(--line);box-sizing:content-box;align-items:center;font-size:15px}
.tabs div{flex:1;text-align:center;color:var(--sub);line-height:44px;position:relative}
.tabs .on{color:var(--gd);font-weight:600}
.tabs .on:after{content:"";position:absolute;left:50%%;bottom:0;width:28px;height:3px;margin-left:-14px;border-radius:2px;background:var(--g)}
.fl{background:#fff;padding:12px 0 12px 16px;display:flex;gap:8px;overflow:hidden}
.blk{background:#fff;padding:0 16px}
.gh{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--sunk);border-radius:8px}
.gh img{width:44px;height:44px;border-radius:6px;object-fit:cover}
.ur{display:flex;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}
.ur .v{font-size:18px;font-weight:700;line-height:1.3}
.st{font-size:16px;font-weight:600;padding:20px 0 12px}
.fg{display:grid;grid-template-columns:repeat(4,1fr);row-gap:16px;padding-bottom:20px}
.fg div{text-align:center;font-size:12px;color:var(--ink)}
.fg img{width:24px;height:24px;margin:0 auto 6px}
.gd{display:flex;padding:12px 0;border-bottom:1px solid var(--line);font-size:14px}
.gd .k{width:88px;color:var(--sub);flex:none;display:flex;gap:6px;align-items:flex-start}
.gd .k img{margin-top:2px}
.demo{font-size:10px;color:#b00;font-weight:400;margin-left:6px}
.note1{display:flex;align-items:center;gap:6px;background:var(--warnBg);color:var(--warn);font-size:13px;border-radius:8px;padding:8px 12px;margin-bottom:4px}
''' % P
def urow(v, code, dim, price, match=False):
    tag = '<span class="tag ok" style="margin-left:8px">符合需求</span>' if match else ''
    return f'''<div class="ur"><div style="flex:1"><div class="row"><span class="v num">{v}m³</span>{tag}</div><div class="t13 sub">{code} · {dim}</div></div>
<div style="text-align:right;margin-right:12px"><div class="price num"><i>¥</i>{price}<small>/月</small></div></div><span class="btn sm {'' if match else 'ghost'}">立即下单</span></div>'''
FAC = [('elev', '电梯直达'), ('temp', '控温防潮'), ('cam', '24 小时监控'), ('lock', '智能门禁'), ('cart', '免费推车'), ('car', '停车卸货'), ('train', '近地铁'), ('shield', '物品保障')]
GUIDE = [('pin', '地址', '北京市朝阳区富仁名苑胜古北里南 28 号楼 B1 层', '导航'),
         ('train', '地铁', '10 号线安贞门站 B 口，步行约 8 分钟', ''),
         ('car', '停车', '小区地面车位，卸货可临停 30 分钟；货车请走北门', ''),
         ('door', '入口', '28 号楼南侧单元门，按「迷你考拉仓」门铃或扫码进入', ''),
         ('elev', '电梯', '货梯直达 B1，出梯右转 20 米', ''),
         ('lock', '开锁', '到店后在订单页点「开锁」，或使用门禁密码', ''),
         ('clock', '存取时间', '09:00–21:00，全年无休', '')]
detail = f'''
<div class="hero"><span style="left:12px">门店示意图</span><span style="right:12px">1 / 3</span></div>
<div class="inf">
  <div class="row"><div class="h1" style="flex:1">安贞·富仁名苑店</div>{ic('heart-ink','ic20','margin-right:16px')}{ic('share-ink','ic20')}</div>
  <div style="margin-top:8px">{tags(['特价仓','近地铁','电梯直达'])}</div>
  <div class="k3"><div><b class="num">1.2km</b><span>距离</span></div><div><b class="num">09:00–21:00</b><span>存取时间</span></div><div><b class="num">¥63<small style="font-size:11px;font-weight:400;color:var(--sub)">/m³/月起</small></b><span>起价</span></div></div>
  <div class="row t13 sub" style="margin-top:12px">{ic('pin-sub','ic','margin-right:4px')}朝阳区富仁名苑胜古北里南 28 号楼</div>
  <div class="a3"><div>{ic('nav-brand','ic20')}导航</div><div>{ic('phone-brand','ic20')}电话</div><div class="p">{ic('cal-ink','ic20')}预约看仓</div></div>
</div>
<div class="tabs"><div class="on">可选仓位</div><div>服务设施</div><div>到店指引</div></div>
<div class="fl"><span class="chip on">{ic('cube-brand','ic','margin-right:4px')}约 3.5m³ · 6 个月{ic('down-brand','ic','margin-left:2px')}</span><span class="chip">全部</span><span class="chip">迷你仓</span><span class="chip">小型仓</span><span class="chip">中型仓</span></div>
<div class="blk">
  <div class="gh"><img src="{P}unit_small.jpg"><div><div class="t14 b">小型仓 · 1–5m³</div><div class="t12 sub">适合日常闲置与小件家具（尺寸示意待新画）</div></div></div>
  {urow('3.5','A003','1.4×1×2.5m · 1.4㎡','260',True)}
  {urow('5','A004','2×1×2.5m · 2㎡','362')}
  {urow('0.8','A001','0.8×0.5×2m · 上层','117')}
  <div class="gh" style="margin-top:14px"><img src="{P}unit_medium.jpg"><div><div class="t14 b">中型仓 · 5–10m³</div><div class="t12 sub">适合一居室家具（尺寸示意待新画）</div></div></div>
  {urow('8','A005','2×1.6×2.5m · 3.2㎡','500')}
  <div class="row t13 sub" style="height:44px">查看已租出的仓位<div class="sp"></div>{ic('down-ink')}</div>
</div>
<div class="blk" style="margin-top:8px"><div class="st">服务设施<span class="demo">演示数据 · 按信息完整假设</span></div>
  <div class="fg">{''.join(f'<div>{ic(k+"-ink","ic24")}{t}</div>' for k,t in FAC)}</div></div>
<div class="blk" style="margin-top:8px;padding-bottom:12px"><div class="st">到店指引<span class="demo">演示数据 · 按信息完整假设</span></div>
  {''.join(f'<div class="gd"><div class="k">{ic(k+"-ink")}{t}</div><div style="flex:1">{v}</div>' + (f'<span class="link" style="margin-left:8px">{a}{chev}</span>' if a else '') + '</div>' for k,t,v,a in GUIDE)}
</div>'''
page('04_detail_A', detail, detail_css, '', '门店详情')

# ───────────────────────── 容量填写 B 档 ─────────────────────────
cap_css = '''
.mv{background:#fff;padding:20px 16px 16px}
.big{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:14px}
.big .pm{width:44px;height:44px;border-radius:22px;background:var(--sunk);display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--gd);line-height:1}
.big .v{font-size:48px;font-weight:700;line-height:1;min-width:120px;text-align:center}
.big .v small{font-size:16px;font-weight:600;margin-left:4px}
.unit{display:flex;justify-content:center;margin-top:10px}
.unit span{font-size:12px;padding:3px 12px;color:var(--sub);background:var(--sunk)}
.unit span:first-child{border-radius:12px 0 0 12px}.unit span:last-child{border-radius:0 12px 12px 0}
.unit .on{background:var(--gd);color:#fff;font-weight:600}
.sl{margin:22px 8px 0;position:relative;height:44px}
.sl .tr{position:absolute;left:0;right:0;top:9px;height:6px;border-radius:3px;background:var(--line)}
.sl .fi{position:absolute;left:0;top:9px;height:6px;border-radius:3px;background:var(--g);width:21%}
.sl .th{position:absolute;left:21%;top:0;width:24px;height:24px;margin-left:-12px;border-radius:12px;background:#fff;box-shadow:0 1px 6px rgba(31,42,36,.25),inset 0 0 0 2px var(--g)}
.sl i{position:absolute;top:26px;font-style:normal;font-size:12px;color:var(--sub);transform:translateX(-50%)}
.ref{margin:16px 0 0;background:var(--tint);border-radius:12px;display:flex;align-items:center;padding:12px 14px 12px 4px}
.ref img{width:128px;height:128px;object-fit:contain;mix-blend-mode:multiply;flex:none}
.ref ul{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;margin-top:8px;font-size:12px;color:var(--sub)}
.ref ul b{color:var(--ink);font-weight:600}
.seg{display:flex;gap:8px;margin-top:12px}
.seg div{flex:1;height:52px;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1px var(--line);text-align:center;padding-top:7px;font-size:14px;line-height:1.3}
.seg div span{display:block;font-size:11px;color:var(--promo)}
.seg .on{background:var(--tint);box-shadow:inset 0 0 0 1.5px var(--g);color:var(--gd);font-weight:600}
.hp{display:flex;gap:10px;margin-top:12px}
.hp div{flex:1;height:44px;border-radius:8px;background:var(--sunk);display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px}
'''
ticks = [(1, 5), (3, 18), (8, 44), (15, 76), (20, 97)]
cap = f'''
<div class="mv">
  <div class="h1">您需要多大空间？</div>
  <div class="big"><div class="pm">−</div><div class="v num">3.5<small>m³</small></div><div class="pm">+</div></div>
  <div class="unit"><span class="on">按体积 m³</span><span>按面积 ㎡</span></div>
  <div class="sl"><div class="tr"></div><div class="fi"></div><div class="th"></div>{''.join(f'<i style="left:{x}%">{v}</i>' for v,x in ticks)}</div>
  <div class="ref"><img src="{L}b4_unit.png"><div style="flex:1"><div class="t12 sub">1.5–5m³ 大致能放</div><div class="h2">日常闲置与小件家具</div>
    <ul><li>标准纸箱 <b>8 个</b></li><li>行李箱 <b>2 个</b></li><li>折叠椅 <b>1 件</b></li><li>收纳箱 <b>2 个</b></li></ul></div></div>
</div>
<div class="mv" style="margin-top:8px;padding-top:16px">
  <div class="h2">租期</div>
  <div class="seg"><div>1 个月<span>8 折</span></div><div>3 个月<span>7.5 折</span></div><div class="on">6 个月<span>7 折</span></div><div>12 个月<span>6.5 折</span></div><div style="padding-top:16px">其他</div></div>
</div>
<div class="mv" style="margin-top:8px;padding-top:16px;padding-bottom:20px">
  <div class="h2">拿不准？</div>
  <div class="hp"><div>{ic('cube-ink','ic20')}按物品估算</div><div>{ic('headset-ink','ic20')}顾问协助</div></div>
  <div class="row t12 mute" style="margin-top:12px">{ic('spark-ink','ic','opacity:.5;margin-right:4px')}AI 估算 · 暂未开放</div>
</div>
<div class="bar"><div style="flex:1"><div class="t12 sub">已选</div><div class="h2 num">3.5m³ · 6 个月</div></div><span class="btn lg">查看仓位报价</span></div>'''
page('05_capacity_B', cap, cap_css, '', '估算存储空间', fold=False)

# ───────────────────────── 确认订单 B 档 ─────────────────────────
cf_css = '''
.stp{background:#fff;display:flex;align-items:center;padding:12px 16px;font-size:12px;color:var(--sub);border-bottom:1px solid var(--line)}
.stp div{display:flex;align-items:center;gap:6px;white-space:nowrap}
.stp em{font-style:normal;width:18px;height:18px;border-radius:9px;background:var(--line);color:var(--sub);font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:600}
.stp .done em{background:var(--tint);color:var(--gd)}
.stp .on{color:var(--ink);font-weight:600}.stp .on em{background:var(--gd);color:#fff}
.stp s{flex:1;height:1px;background:var(--line);margin:0 8px}
.r{display:flex;align-items:center;min-height:44px}
.r .k{width:92px;color:var(--sub);flex:none}
.stepper{display:flex;align-items:center;border-radius:6px;box-shadow:inset 0 0 0 1px var(--line);height:32px}
.stepper span{width:32px;text-align:center;font-size:18px;color:var(--gd)}
.stepper b{width:56px;text-align:center;font-weight:600;border-left:1px solid var(--line);border-right:1px solid var(--line);line-height:32px}
.fee{display:flex;padding:8px 0}
.fee .k{width:92px;flex:none}
.fee .d{flex:1;font-size:12px;color:var(--sub);padding-top:2px}
.fee .v{font-weight:600;text-align:right}
.todo{display:flex;align-items:center;gap:6px;background:var(--warnBg);color:var(--warn);font-size:12px;border-radius:6px;padding:6px 10px;margin-top:8px}
.en{display:flex;align-items:center;gap:12px}
'''
cf = f'''
<div class="stp"><div class="done"><em>✓</em>确认仓位</div><s></s><div class="on"><em>2</em>下单人与实名</div><s></s><div><em>3</em>费用与支付</div></div>
<div class="card">
  <div class="h2">安贞·富仁名苑店</div><div class="t13 sub">1.2km · 朝阳区富仁名苑胜古北里南 28 号楼</div>
  <div class="hr"></div>
  <div class="row"><div style="flex:1"><span class="h2 num">A003 · 3.5m³</span><div class="t13 sub">1.4 × 1 × 2.5m</div></div><span class="link">更换{chev}</span></div>
  <div class="hr"></div>
  <div class="r"><span class="k">租期</span><div class="sp"></div><div class="stepper"><span>−</span><b>6 个月</b><span>+</span></div></div>
  <div class="r"><span class="k">预计用仓时间</span><div class="sp"></div><span class="b num">2026-11-22</span>{ic('cal-ink','ic','margin-left:6px')}</div>
  <div class="t12 sub">预计用仓时间即起租日，租金自当日起计</div>
</div>
<div class="card" style="box-shadow:0 0 0 1.5px var(--g)">
  <div class="h2">下单人</div>
  <div class="r" style="margin-top:4px"><span class="k">联系手机号</span><span class="num">138****8000</span><div class="sp"></div><span class="link">更换{chev}</span></div>
  <div class="r"><span class="k">实名信息</span><span class="tag warn">未认证</span><div class="sp"></div><span class="btn sm ghost">去认证</span></div>
  <div class="todo">{ic('info-ink','ic','opacity:.7')}签署协议前需完成实名认证，认证后回到本页继续</div>
</div>
<div class="card">
  <div class="h2" style="margin-bottom:4px">费用明细</div>
  <div class="fee"><span class="k">整期租金</span><span class="d">¥280/月 × 6 个月<span class="tag promo" style="margin-left:6px">7 折</span></span><span class="v num">¥1,680</span></div>
  <div class="fee"><span class="k">已省</span><span class="d">较月基价 ¥400/月</span><span class="v num brand">−¥720</span></div>
  <div class="fee"><span class="k">优惠券</span><span class="d">暂无适用优惠</span><span class="v mute" style="font-weight:400">—</span></div>
  <div class="fee"><span class="k">押金</span><span class="d">1 个月月租，退仓后退还</span><span class="v num">¥280</span></div>
  <div class="fee"><span class="k">整单管理费</span><span class="d"></span><span class="v num">¥50</span></div>
  <div class="hr" style="margin:8px 0"></div>
  <div class="t12 sub">合计见页面底部「本次应付」。租期折扣按预付整期计算，提前退仓时按协议重新核算。</div>
</div>
<div class="card en">{ic('shield-ink','ic24')}<div style="flex:1"><div class="t14 b">物品保障</div><div class="t12 sub">已含基础保障，可了解增值保障</div></div>{ic('chev-mute')}</div>
<div class="card en">{ic('truck-ink','ic24')}<div style="flex:1"><div class="t14 b">预约运输 / 搬运</div><div class="t12 sub">下单前可预约，由顾问电话确认，不计入本次应付</div></div>{ic('chev-mute')}</div>
<div style="height:96px"></div>
<div class="bar"><div style="flex:1"><div class="t12 sub">本次应付 · <span class="brand">已省 ¥720</span></div><div class="num" style="font-size:22px;font-weight:700;line-height:1.2">¥2,010</div></div><span class="btn lg">实名认证</span></div>'''
page('06_confirm_B', cf, cf_css, '', '确认订单', fold=False)
print('built')
