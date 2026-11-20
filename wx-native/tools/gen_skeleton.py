"""由《页面索引》生成：services/routes.js、app.json、尚未开发页面的占位四件套。
已手写的页面（js 里没有 AUTO-PLACEHOLDER 标记）不会被覆盖。
用法：python3 tools/gen_skeleton.py <02_Page_Index.csv> <miniprogram 目录>"""
import csv, json, os, re, sys
idx, root = sys.argv[1], sys.argv[2]
NAMES = {'H01':'HOME','S01':'STORES','S02':'STORE_DETAIL','S5':'MATCH','CAP':'CAPACITY','ITEMS':'ITEMS','O01':'CONFIRM','QUICK':'QUICK','O03':'ORDER_DETAIL','OH01':'ORDERS','AGREEMENT':'AGREEMENT','ACC_IDENTITY':'IDENTITY','ACC_ACCESS':'ACCESS','RN01':'RENEW','EX01':'EXIT','DP01':'DEPOSIT','IV01':'INVOICE','ECONTRACT':'ECONTRACT','ACC_MESSAGES':'MESSAGES','M01':'MINE','BOOKING':'BOOKING','BUSINESS':'BUSINESS','ESTORE':'ESTORE','ACC_TRANSPORT':'TRANSPORT','ACC_SUPPORT':'SUPPORT','ACC_NEEDS':'NEEDS','ACC_PROGRESS':'PROGRESS','ACC_FAVORITES':'FAVORITES','ACC_COUPONS':'COUPONS','ACC_PROFILE':'PROFILE','ACC_REFERRAL':'REFERRAL','ACC_BRAND':'BRAND','ENT_CERT':'ENT_CERT','ENT_TITLES':'ENT_TITLES','ENT_BATCH':'ENT_BATCH'}
TITLES = {'H01':'迷你考拉仓','S01':'附近门店','S02':'门店详情','S5':'仓位推荐','CAP':'估算存储空间','ITEMS':'按物品估算','O01':'确认订单','QUICK':'快捷下单','O03':'订单详情','OH01':'订单','AGREEMENT':'协议','ACC_IDENTITY':'实名认证','ACC_ACCESS':'入仓指引','RN01':'续租','EX01':'退仓','DP01':'押金','IV01':'发票','ECONTRACT':'电子合同','ACC_MESSAGES':'消息','M01':'我的','BOOKING':'预约用仓','BUSINESS':'商家 / 企业存储','ESTORE':'考拉E存','ACC_TRANSPORT':'运输与搬运','ACC_SUPPORT':'联系顾问','ACC_NEEDS':'预约用仓','ACC_PROGRESS':'找仓进度','ACC_FAVORITES':'我的收藏','ACC_COUPONS':'优惠与权益','ACC_PROFILE':'个人信息','ACC_REFERRAL':'推荐有礼','ACC_BRAND':'关于迷你考拉','ENT_CERT':'企业认证','ENT_TITLES':'开票抬头','ENT_BATCH':'批量开票'}
rows = list(csv.DictReader(open(idx, encoding='utf-8-sig')))
assert len(rows) == 35, len(rows)
main, subs, table = [], {}, []
for r in rows:
    code, route = r['页面代号'], r['建议小程序路由']
    batch = int(re.match(r'\d', r['开发批次']).group())
    table.append({'code': code, 'name': NAMES[code], 'title': TITLES[code], 'route': '/' + route, 'batch': batch, 'states': int(r['状态数'])})
    if route.startswith('pages/'): main.append(route)
    else:
        pkg, rest = route.split('/', 1); subs.setdefault(pkg, []).append(rest)
tabs = ['pages/home/index', 'pages/stores/index', 'pages/orders/index', 'pages/mine/index']
main = tabs + [p for p in main if p not in tabs]
# routes.js
js = ['// 路由表：由 tools/gen_skeleton.py 按《页面索引》生成，页面里不要手写路径字符串。', 'const R = {']
js += ["  %s: '%s'," % (t['name'], t['route']) for t in table]
js += ['};', 'R.TABLE = ' + json.dumps(table, ensure_ascii=False) + ';', "R.TABS = ['/pages/home/index', '/pages/stores/index', '/pages/orders/index', '/pages/mine/index'];",
       "R.isTab = (url) => R.TABS.indexOf(String(url).split('?')[0]) >= 0;", "// 跳转：tab 页用 switchTab，其余 navigateTo", "R.go = (url) => (R.isTab(url) ? wx.switchTab({ url: String(url).split('?')[0] }) : wx.navigateTo({ url }));", 'module.exports = R;', '']
open(os.path.join(root, 'services/routes.js'), 'w', encoding='utf-8').write('\n'.join(js))
# app.json
ico = lambda n: {'iconPath': 'assets/tabbar/tab-%s.png' % n, 'selectedIconPath': 'assets/tabbar/tab-%s-on.png' % n}
app = {
  'pages': main,
  'subpackages': [{'root': k, 'name': k.replace('pkg-', ''), 'pages': v} for k, v in subs.items()],
  'preloadRule': {'pages/match/index': {'network': 'all', 'packages': ['pkg-trade']}, 'pages/estimate/capacity': {'network': 'all', 'packages': ['pkg-estimate']}, 'pages/orders/index': {'network': 'all', 'packages': ['pkg-trade']}},
  'window': {'navigationBarTitleText': '迷你考拉仓', 'navigationBarBackgroundColor': '#FFFFFF', 'navigationBarTextStyle': 'black', 'backgroundColor': '#F5F7F6', 'backgroundTextStyle': 'dark'},
  'tabBar': {'color': '#5F6B65', 'selectedColor': '#0B7A48', 'backgroundColor': '#FFFFFF', 'borderStyle': 'white', 'list': [
    dict(pagePath=tabs[0], text='首页', **ico('home')), dict(pagePath=tabs[1], text='附近门店', **ico('stores')), dict(pagePath=tabs[2], text='订单', **ico('orders')), dict(pagePath=tabs[3], text='我的', **ico('me'))]},
  'usingComponents': {'mk-sheet': '/components/mk-sheet/index', 'mk-login-sheet': '/components/mk-login-sheet/index', 'mk-term-seg': '/components/mk-term-seg/index', 'mk-sys-state': '/components/mk-sys-state/index', 'mk-price': '/components/mk-price/index', 'mk-advisor-card': '/components/mk-advisor-card/index', 'mk-placeholder': '/components/mk-placeholder/index'},
  'permission': {'scope.userLocation': {'desc': '用于为您查找附近的门店'}},
  'requiredPrivateInfos': ['getLocation'],
  '__usePrivacyCheck__': True, 'lazyCodeLoading': 'requiredComponents', 'style': 'v2', 'sitemapLocation': 'sitemap.json'}
json.dump(app, open(os.path.join(root, 'app.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
# 占位页
made = kept = 0
for t in table:
    base = os.path.join(root, t['route'].lstrip('/'))
    os.makedirs(os.path.dirname(base), exist_ok=True)
    if os.path.exists(base + '.js') and 'AUTO-PLACEHOLDER' not in open(base + '.js', encoding='utf-8').read():
        kept += 1; continue
    depth = t['route'].lstrip('/').count('/')
    up = '../' * depth
    open(base + '.js', 'w', encoding='utf-8').write(
"""// AUTO-PLACEHOLDER：%s（%s）在第 %d 批开发，现在只有路由、标题和登录守卫。开发本页时删掉这一行标记。
const auth = require('%sservices/auth');
const routes = require('%sservices/routes');
Page(auth.guarded(routes.%s, {
  data: { title: '%s', batch: %d },
  onLoad() {}
}));
""" % (t['title'], t['code'], t['batch'], up, up, t['name'], t['title'], t['batch']))
    conf = {'navigationBarTitleText': t['title'], 'usingComponents': {}}
    json.dump(conf, open(base + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(base + '.wxml', 'w', encoding='utf-8').write('<mk-placeholder title="{{title}}" batch="{{batch}}" />\n')
    open(base + '.wxss', 'w', encoding='utf-8').write('/* %s：样式随本页开发补充 */\n' % t['title'])
    made += 1
print('路由 %d，主包页 %d，分包 %s，占位页 %d，保留手写页 %d' % (len(table), len(main), {k: len(v) for k, v in subs.items()}, made, kept))
