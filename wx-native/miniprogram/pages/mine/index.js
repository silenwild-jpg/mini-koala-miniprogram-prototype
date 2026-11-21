// 我的 M01（第 4 批）。是登录守卫的落点页之一：从受限页被带过来时打开登录层并提示（D-198）。
// 已做：账户卡（未登录「登录 / 注册」、已登录掩码手机号 +「个人信息」）；任务卡 <mk-task-card>（交易域组件）与需求卡 <mk-need-card>（找仓域组件）；
//       没有订单也没有需求时的「尚未用仓」卡；多处在租时的「我的仓位」（最多 2 处 + 查看全部）；四组入口与角标（收藏数、可用权益数、未读消息数）、「预约用仓 N条记录」；
//       找仓进度副文案按需求原单位；加载 / 失败 / 断网三态；未登录点「押金」「开票抬头」「批量开票」「企业认证」先弹登录层，登录成功后接着进刚才点的那一页（FIX-01 D-18）；
//       「企业认证」一行右侧显示审核中 / 已认证 / 未通过（FIX-01 D-13）。
// 未做：任务卡与需求卡内部各状态由各自组件负责，本页只放位置；找仓进度的「当前方案有效 / 需重新报价」（全站没有保存报价的主题）。
const T = require('../../i18n/zh');
const TA = require('../../i18n/account');
const C = require('../../core/config-account');
const rules = require('../../core/account');
const req = require('../../core/requirement');
const state = require('../../services/state');
const auth = require('../../services/auth');
const routes = require('../../services/routes');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const M = TA.mine;
const LOGIN_FIRST = { ENT_TITLES: 1, ENT_BATCH: 1, ENT_CERT: 1 }; // 涉及个人与企业资料：未登录先弹登录层（押金页是受限页，由 auth.navigate 处理）
const TONE = { paid_before_start: 'ok', active: 'ok', expiring: 'warn', exiting: 'warn', overdue: 'err' };
const demo = require('../../services/demo');
Page({
  data: { T: { mine: M, loginRegister: TA.common.loginRegister }, sys: 'loading', loggedIn: false, headTitle: M.guestTitle, headSub: M.guestSub, showNew: false, assets: [], assetsAll: '', quick: [], groups: [], loginVisible: false, loginTip: '' },
  onLoad() { if (demo.enabled()) this.setData({ demoLabel: '演示工具 · 切换场景与网络' }); },
  onShow() {
    this.sync();
    if (auth.consumePending(this, 'mine')) this.setData({ loginTip: T.login.gateTip });
    this._taskReady = this.refreshTask();
    this.refresh();
  },
  sync() {
    const s = state.get().session, logged = !!s.loggedIn;
    this.setData({ loggedIn: logged, headTitle: logged ? M.signedTitle : M.guestTitle, headSub: logged ? (s.phoneMasked || M.signedSub) : M.guestSub });
    this.setGroups();
  },
  taskCard() { return this.selectComponent ? this.selectComponent('#task') : null; },
  // 返回任务卡这一轮刷新的 Promise（不抛错）：「我的仓位」要等它定下主卡是哪一笔订单，才知道哪一行不用再列（REVIEW-02 D2-01）
  refreshTask() { const c = this.taskCard(); return c && c.refresh ? Promise.resolve(c.refresh()).catch(() => null) : Promise.resolve(null); },
  buildGroups(counts) {
    const r = state.get().requirement;
    const progress = r && req.demandText(r) ? req.demandText(r) + (r.term_months ? ' · ' + r.term_months + M.monthUnit : '') : M.progressNone;
    const row = (it) => ({ k: it.k, icon: '/assets/icons/' + it.icon + '.svg', t: it.t, s: it.k === 'PROGRESS' ? progress : it.k === 'NEEDS' && this._leads > 0 ? this._leads + M.leadsSuffix : it.k === 'ENT_CERT' && this._cert ? M.certStatus[this._cert] || it.s : it.s, count: counts[it.k] || 0 });
    // IMPL-02 M-34：常用入口 5 格（图标 + 名称）。只有消息显示未读徽标；其余格的副文案与数量仍在数据里（朗读用），不画出来
    this._quick = M.quick.map((it) => { const r = row(it); r.badge = it.badge ? r.count : 0; r.label = r.t + (r.badge > 0 ? ' ' + r.badge + M.unreadSuffix : r.s ? ' ' + r.s : ''); return r; });
    return M.groups.map((g) => ({ key: g.key, title: g.title, items: g.items.map(row) }));
  },
  setGroups(extra) { const groups = this.buildGroups(this._counts || {}); this.setData(Object.assign({ groups, quick: this._quick }, extra || {})); },
  refresh() {
    const logged = auth.isLoggedIn();
    // 角标类数据（未读数、预约条数）取不到时按 0 处理，不让整页进失败态；权益与订单取不到才算失败
    // 企业认证状态排在未读数前面取：演示接口在这一步推进审核并写消息，角标同一轮就能算上
    const cert = logged ? api.getEntCert().catch(() => null) : Promise.resolve(null);
    const jobs = [api.getBenefits(), api.getMessagesUnread().catch(() => ({ unread: 0 })), logged ? api.getOrders() : Promise.resolve([]), api.getLeads().catch(() => []), cert, this._taskReady || Promise.resolve(null)];
    return pd.load(this, Promise.all(jobs), (res) => {
      const orders = res[2] || [], assets = rules.activeAssets(orders);
      this._leads = Array.isArray(res[3]) ? res[3].length : 0;
      this._cert = (res[4] && res[4].status) || '';
      this._counts = { FAVORITES: rules.favCount(state.get().favorites), COUPONS: rules.benefitCount(res[0]), MESSAGES: Number(res[1] && res[1].unread) || 0 };
      // REVIEW-02 D2-01：任务卡主卡上那一笔不在「我的仓位」里再列一遍；「查看全部 N处」仍是全部在租仓位数（含主卡那一笔），只在还有没列出来的时候出现
      const tc = this.taskCard(), mainId = (tc && tc.data && tc.data.main && tc.data.main.orderId) || '';
      const rest = assets.filter((o) => o.id !== mainId);
      const rows = assets.length > 1 ? rest.slice(0, C.mineAssetRows).map((o) => ({
        id: o.id, store: o.store.name, tag: M.stage[o.stage] || '', tone: TONE[o.stage] || 'info', unit: o.unit_name,
        // IMPL-01：与订单卡同一写法——仓位编号成标签、与容量同一行；租期与日期拆成两段，不再用分隔符串成一行
        codes: (o.units || []).map((u) => u.code).filter(Boolean), vol: (o.units || []).length ? req.pretty(Number((o.units || []).reduce((n, u) => n + Number(u.volume || 0), 0).toFixed(3))) + 'm³' : '',
        term: o.months + M.assets.monthUnit, span: o.stage === 'paid_before_start' ? M.assets.start + rules.dateText(o.lease.start) : M.assets.until + rules.dateText(o.lease.end)
      })) : []; // 只有一处在租时任务卡已经显示，不重复列
      this.setGroups({ showNew: !orders.length && !state.get().requirement, assets: rows, assetsAll: assets.length > 1 && rest.length > C.mineAssetRows ? M.assets.allPrefix + assets.length + M.assets.allSuffix : '' });
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onHead() { if (this.data.loggedIn) wx.navigateTo({ url: routes.PROFILE }); else { this._afterLogin = ''; this.setData({ loginTip: '' }); auth.openLogin(this); } },
  onItem(e) {
    const k = e.currentTarget.dataset.k, url = routes[k];
    if (!url || typeof url !== 'string') return;
    this.setData({ loginTip: '' });
    // 未登录点需要登录的入口：记下去向，登录成功后接着进（onLoginSuccess）
    if (!auth.isLoggedIn() && (LOGIN_FIRST[k] || auth.isRestricted(url))) { this._afterLogin = url; return auth.openLogin(this); }
    auth.navigate(this, url);
  },
  onDemo() { wx.navigateTo({ url: demo.ROUTE }); },
  onNewCta() { wx.switchTab({ url: routes.STORES }); },
  onAsset(e) { this.setData({ loginTip: '' }); auth.navigate(this, routes.ORDER_DETAIL + '?id=' + e.currentTarget.dataset.id); },
  onAssetsAll() { wx.switchTab({ url: routes.ORDERS }); },
  onLoginClose() { this.setData({ loginVisible: false }); if (!auth.isLoggedIn()) this._afterLogin = ''; }, // 没登录就关掉：不记去向
  onLoginSuccess() {
    const url = this._afterLogin; this._afterLogin = '';
    this.sync(); this._taskReady = this.refreshTask(); this.refresh();
    if (url) auth.navigate(this, url);
  }
});
